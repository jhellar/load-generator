const exec = require('./execute');

async function exposeService(name) {
  try {
    const serviceName = await exec(`oc get services | awk '/^${name}/{print $1}'`);
    await exec(`oc expose service ${serviceName}`);
  } catch (error) {
    console.error(error);
  }
  return await exec(`oc get routes | awk '/^${name}/{print $2}'`);
}

async function deleteRoute(name) {
  try {
    const routeName = await exec(`oc get routes | awk '/^${name}/{print $1}'`);
    await exec(`oc delete route ${routeName}`);
  } catch (error) {
    console.error(error);
  }
}

module.exports = {
  exposeService,
  deleteRoute
};