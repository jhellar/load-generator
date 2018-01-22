const yargs = require('yargs');
const opn = require('opn');
const chart = require('chart-stream')(opn);
const fs = require('fs');
const path = require('path');
const exec = require('./utils/execute');
const routes = require('./utils/routes');
const oc = require('./utils/oc');

const argv = yargs
  .demandOption(['component'])
  .default('concurrency', 1)
  .default('numUsers', 1)
  .default('rampUp', 1)
  .default('monInterval', 1)
  .default('coreProject', '')
  .alias('c', 'concurrency')
  .alias('n', 'numUsers')
  .alias('r', 'rampUp')
  .alias('i', 'monInterval')
  .alias('p', 'coreProject')
  .describe('component', 'RHMAP component to load test')
  .describe('concurrency', 'Concurrency of Users')
  .describe('numUsers', 'Number of Users (number of total runs)')
  .describe('rampUp', 'Ramp up time to Concurrency of Users (in seconds)')
  .describe('monInterval', 'Monitor interval')
  .describe('coreProject', 'Name of OpenShift project with RHMAP core')
  .argv;

const monitorInterval = argv.monInterval * 1000;

async function getRHMAPCredentials(coreProject) {
  let currentOSProject;
  if (coreProject !== '') {
    currentOSProject = (await exec(`oc project | awk '{print $3}'`)).slice(1, -1);
    await exec(`oc project ${coreProject}`);
  }

  const host = await exec(`oc get routes | awk '/^rhmap/{print $2}'`);
  const millicorePod = (await oc.getPodNames('millicore'))[0];
  const user = await exec(`oc describe pod ${millicorePod} | awk '/FH_ADMIN_USER_NAME/{print $2}'`);
  const pass = await exec(`oc describe pod ${millicorePod} | awk '/FH_ADMIN_USER_PASSWORD/{print $2}'`);

  if (coreProject !== '') {
    await exec(`oc project ${currentOSProject}`);
  }

  return {
    host: host,
    user: user,
    pass: pass
  };
}

function usageCommand(podName, resource) {  // eslint-disable-line no-unused-vars
  // return `oc describe pod ${getPodName} | grep -A 2 Limits | awk '/${resource}/{print $2}'`;
  return `oc exec ${podName} free | awk '/^Mem:/{print $3}'`;
}

async function monitorResources(interval, component) {
  let components;
  if (component === 'all') {
    components = (await exec(`oc get services | grep TCP | awk '{print $1}'`)).split('\n');
  } else {
    components = [component];
  }
  let pods = [];
  for (const component of components) {
    const componentPods = await oc.getPodNames(component);
    pods = pods.concat(componentPods);
  }
  chart.write(pods.join(','));
  const usageHistory = [];
  const monitorId = setInterval(async() => {
    const usage = {};
    for (const pod of pods) {
      try {
        const stdout = await exec(usageCommand(pod, 'memory'));
        usage[`${pod}_memory`] = parseInt(stdout);
        if (isNaN(usage[`${pod}_memory`])) {
          usage[`${pod}_memory`] = 0;
        }
      } catch (_) {
        usage[`${pod}_memory`] = 0;
      }
    }
    const values = pods.map(pod => usage[`${pod}_memory`]);
    chart.write(values.join(','));
    usageHistory.push(usage);
  }, interval);
  return { monitorId, usageHistory };
}

async function startTest(host, rhmap, options) {
  const envs = [
    `RHMAP_HOST=${rhmap.host}`,
    `RHMAP_USER=${rhmap.user}`,
    `RHMAP_PASS=${rhmap.pass}`
  ].join(' ');
  await exec(`\
    ${envs} \
    ./node_modules/.bin/load-runner \
    -s ./scenarios/${options.component}.js \
    -b ./scenarios/${options.component}_before.js \
    -c ${options.concurrency} \
    -n ${options.numUsers} \
    -r ${options.rampUp} \
    -o \
    -- \
    ${host} \
    >/dev/null 2>&1 \
  `);
}

function saveResults(usageHistory) {
  const dir = path.resolve(__dirname, 'results');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  const file = path.resolve(dir, `${Date.now()}`);
  fs.writeFileSync(file + '.json', JSON.stringify(usageHistory, null, 2));
  // // to csv
  // const csv = 'memory\n' + usageHistory.map(usage => usage.memory).join('\n');
  // fs.writeFileSync(file + '.csv', csv);
}

async function run() {
  const rhmap = await getRHMAPCredentials(argv.coreProject);
  let host;
  if (argv.component !== 'all') {
    host = await routes.exposeService(argv.component);
  }
  const { monitorId, usageHistory } = monitorResources(monitorInterval, argv.component);
  await startTest(host, rhmap, argv);
  clearInterval(monitorId);
  if (argv.component !== 'all') {
    await routes.deleteRoute(argv.component);
  }
  saveResults(usageHistory);
  process.exit();
}

run().catch(console.error);
