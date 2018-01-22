const exec = require('./execute');

async function getPodNames(component) {
  return (await exec(`oc get pods | awk '/^${component}/{print $1}'`)).split('\n');
}

module.exports = {
  getPodNames
};