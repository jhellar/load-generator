const yargs = require('yargs');
const opn = require('opn');
const chart = require('chart-stream')(opn);
const fs = require('fs');
const path = require('path');
const exec = require('./utils/execute');
const routes = require('./utils/routes');

const argv = yargs
  .demandOption(['component'])
  .default('concurrency', 1)
  .default('numUsers', 1)
  .default('rampUp', 1)
  .alias('c', 'concurrency')
  .alias('n', 'numUsers')
  .alias('r', 'rampUp')
  .describe('component', 'RHMAP component to load test')
  .describe('concurrency', 'Concurrency of Users')
  .describe('numUsers', 'Number of Users (number of total runs)')
  .describe('rampUp', 'Ramp up time to Concurrency of Users (in seconds)')
  .argv;

const monitorInterval = 1000;

function podNameCommand(component) {
  return `$(oc get pods | awk '/^${component}/{print $1}')`;
}

async function getRHMAPCredentials() {
  const host = await exec(`oc get routes | awk '/^rhmap/{print $2}'`);
  const user = await exec(`oc describe pod ${podNameCommand('millicore')} | awk '/FH_ADMIN_USER_NAME/{print $2}'`);
  const pass = await exec(`oc describe pod ${podNameCommand('millicore')} | awk '/FH_ADMIN_USER_PASSWORD/{print $2}'`);
  return {
    host: host,
    user: user,
    pass: pass
  };
}

function usageCommand(component, resource) {  // eslint-disable-line no-unused-vars
  // return `oc describe pod ${getPodName} | grep -A 2 Limits | awk '/${resource}/{print $2}'`;
  return `oc exec ${podNameCommand(component)} free | awk '/^Mem:/{print $3}'`;
}

function monitorResources(interval, component) {
  chart.write('memory');
  const usageHistory = [];
  const monitorId = setInterval(async() => {
    const usage = {};
    try {
      const stdout = await exec(usageCommand(component, 'memory'));
      usage.memory = parseInt(stdout);
    } catch (_) {
      usage.memory = 0;
    }
    chart.write(`${usage.memory}`);
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
  // to csv
  const csv = 'memory\n' + usageHistory.map(usage => usage.memory).join('\n');
  fs.writeFileSync(file + '.csv', csv);
}

async function run() {
  const rhmap = await getRHMAPCredentials();
  const host = await routes.exposeService(argv.component);
  const { monitorId, usageHistory } = monitorResources(monitorInterval, argv.component);
  await startTest(host, rhmap, argv);
  clearInterval(monitorId);
  await routes.deleteRoute(argv.component);
  saveResults(usageHistory);
  process.exit();
}

run().catch(console.error);
