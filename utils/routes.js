const exec = require('./execute');

async function exposeService(name) {
  try {
    await exec(`oc expose service ${name}`);
  } catch (_) {}  // eslint-disable-line no-empty
  return await exec(`oc get routes | awk '/^${name}/{print $2}'`);
}

async function deleteRoute(name) {
  try {
    const routeName = await exec(`oc get routes | awk '/^${name}/{print $1}'`);
    await exec(`oc delete route ${routeName}`);
  } catch (_) {}  // eslint-disable-line no-empty
}

module.exports = {
  exposeService,
  deleteRoute
};