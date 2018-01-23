const exec = require('./execute');

async function exposeService(name) {
  if (name === 'fh-mbaas') {
    return await exec(`oc get routes | awk '/${name}/{print $2}'`);
  }
  try {
    const serviceName = await exec(`oc get services | awk '/^${name}/{print $1}'`);
    await exec(`oc expose service ${serviceName}`);
  } catch (error) {
    console.error(error);
  }
  return await exec(`oc get routes | awk '/^${name}/{print $2}'`);
}

async function deleteRoute(name) {
  if (name === 'fh-mbaas') {
    return;
  }
  try {
    const routeName = await exec(`oc get routes | awk '/^${name}/{print $1}'`);
    await exec(`oc delete route ${routeName}`);
  } catch (_) {}  // eslint-disable-line no-empty
}

module.exports = {
  exposeService,
  deleteRoute
};