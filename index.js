const yargs = require('yargs');
const opn = require('opn');
const chartStream = require('chart-stream');
const cpuChart = chartStream(opn);
const memChart = chartStream(opn);
const fs = require('fs');
const path = require('path');
const _ = require('underscore');
const exec = require('./utils/execute');
const routes = require('./utils/routes');
const oc = require('./utils/oc');

const argv = yargs
  .demandOption(['component'])
  .array('monitor')
  .default('concurrency', 1)
  .default('numUsers', 1)
  .default('rampUp', 1)
  .default('monInterval', 5)
  .default('coreProject', '')
  .default('monitor', [])
  .alias('c', 'concurrency')
  .alias('n', 'numUsers')
  .alias('r', 'rampUp')
  .alias('i', 'monInterval')
  .alias('p', 'coreProject')
  .alias('m', 'monitor')
  .alias('e', 'expose')
  .describe('component', 'RHMAP component to load test')
  .describe('concurrency', 'Concurrency of Users')
  .describe('numUsers', 'Number of Users (number of total runs)')
  .describe('rampUp', 'Ramp up time to Concurrency of Users (in seconds)')
  .describe('monInterval', 'Monitor interval')
  .describe('coreProject', 'Name of OpenShift project with RHMAP core')
  .describe('monitor', 'Additional components to monitor')
  .describe('expose', 'Expose component')
  .argv;

const monitorInterval = argv.monInterval * 1000;

const maxCpuUsage = {};
const maxMemUsage = {};

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

async function execContainer(container, command) {
  return await exec(`oc exec ${container.pod} -c ${container.name} -- ${command}`);
}

function getCpuUsage(usageHistory, containers) {
  if (usageHistory.length < 2) {
    return;
  }
  const curr = usageHistory[usageHistory.length - 1];
  const prev = usageHistory[usageHistory.length - 2];
  return containers.map(container => {
    const id = `${container.pod}-${container.name}`;
    if (!curr[id] || !prev[id]) {
      return 0;
    }

    const currCpuUsage = curr[id].cpuUsage;
    const currUptime = curr[id].uptime;
    const prevCpuUsage = prev[id].cpuUsage;
    const prevUptime = prev[id].uptime;

    if (isNaN(currCpuUsage) || isNaN(currUptime) || isNaN(prevCpuUsage) || isNaN(prevUptime)) {
      return 0;
    }

    const cpuUsage = currCpuUsage - prevCpuUsage;
    const uptime = (currUptime - prevUptime) * 1000000000;

    const usage = (cpuUsage * 1.0 / uptime) * 1000;
    if (usage && (!maxCpuUsage[id] || maxCpuUsage[id] < usage)) {
      maxCpuUsage[id] = usage;
    }
    return usage;
  });
}

function writeCsvHeader(containers, resourceType) {
  const dir = path.resolve(__dirname, 'results');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  const file = path.resolve(dir, `${resourceType}-${Date.now()}.csv`);
  fs.writeFileSync(file, containers.map(container => `${container.pod}-${container.name}`).join(',') + '\n');
  return file;
}

async function monitorResources(interval, component, additionalComponents) {
  // get pod names
  let pods = [];
  if (additionalComponents.length > 0 && additionalComponents[0] === 'all') {
    pods = (await exec(`oc get pods | awk '{print $1}' | tail -n +2`)).split('\n');
  } else {
    let components = [component];
    components = components.concat(additionalComponents);
    components = _.uniq(components);
    for (const component of components) {
      const componentPods = await oc.getPodNames(component);
      pods = pods.concat(componentPods);
    }
    pods = pods.filter(pod => pod !== '');
  }
  // get container names
  let containers = [];
  for (const pod of pods) {
    const info = await exec(`oc get pod ${pod} -o json`);
    const jsonInfo = JSON.parse(info);
    const containerNames = jsonInfo.spec.containers.map(container => ({
      pod,
      name: container.name
    }));
    containers = containers.concat(containerNames);
  }

  cpuChart.write(containers.map(container => `${container.pod}-${container.name}`).join(','));
  memChart.write(containers.map(container => `${container.pod}-${container.name}`).join(','));
  const cpuCsvFileName = writeCsvHeader(containers, 'cpu');
  const memoryCsvFileName = writeCsvHeader(containers, 'memory');
  const usageHistory = [];
  const monitorId = setInterval(async() => {
    const usage = {};
    for (const container of containers) {
      const id = `${container.pod}-${container.name}`;
      try {
        const uptime = await execContainer(container, 'ps -p 1 -o etimes:1=');
        const cpuUsage = await execContainer(container, 'cat /sys/fs/cgroup/cpuacct,cpu/cpuacct.usage');
        const memUsage = await execContainer(container, 'cat /sys/fs/cgroup/memory/memory.usage_in_bytes');
        usage[id] = {
          uptime: parseInt(uptime),
          cpuUsage: parseInt(cpuUsage),
          memUsage: parseInt(memUsage)
        };
        if (usage[id].memUsage && (!maxMemUsage[id] || maxMemUsage[id] < usage[id].memUsage)) {
          maxMemUsage[id] = usage[id].memUsage;
        }
      } catch (_) { } // eslint-disable-line no-empty
    }
    usageHistory.push(usage);
    const cpuValues = getCpuUsage(usageHistory, containers);
    const memValues = containers.map(container => usage[`${container.pod}-${container.name}`].memUsage);
    if (cpuValues) {
      cpuChart.write(cpuValues.join(','));
      fs.appendFileSync(cpuCsvFileName, cpuValues.join(',') + '\n');
    }
    memChart.write(memValues.join(','));
    fs.appendFileSync(memoryCsvFileName, memValues.join(',') + '\n');
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
}

function printMaxUsage() {
  console.log('Max CPU usage:');
  console.log(JSON.stringify(maxCpuUsage, null, 2));
  console.log('Max memory usage:');
  console.log(JSON.stringify(maxMemUsage, null, 2));
}

async function run() {
  const rhmap = await getRHMAPCredentials(argv.coreProject);
  let host;
  if (argv.expose) {
    host = await routes.exposeService(argv.component);
  }
  const { monitorId, usageHistory } = await monitorResources(monitorInterval, argv.component, argv.monitor);
  await startTest(host, rhmap, argv);
  clearInterval(monitorId);
  if (argv.expose) {
    await routes.deleteRoute(argv.component);
  }
  saveResults(usageHistory);
  printMaxUsage();
  process.exit();
}

run().catch(console.error);
