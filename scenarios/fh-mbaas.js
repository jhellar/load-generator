var lr = require('load-runner')();
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const params = require('../temp');

async function run() {
  lr.actStart('mbaasArt');
  let error;
  try {
    await exec(`\
      docker run \
      load-test-mbaas-art \
      grunt art:openshift3 \
      --fhMbaasHost https://${process.argv[2]} \
      --servicekey ${params.serviceKey} \
      --prefix ma-${Date.now()} \
      >/dev/null 2>&1 \
      || true \
    `);
    await exec(`\
      docker run \
      load-test-mbaas-art \
      grunt art-core:core \
      --prefix mac-${Date.now()} \
      --coreruntimes '[{"runtime":"node4","regex": "v4.*"}]' \
      --coreusername ${process.env.RHMAP_USER} \
      --corepassword ${process.env.RHMAP_PASS} \
      --corehost ${process.env.RHMAP_HOST} \
      --environment dev \
      >/dev/null 2>&1 \
      || true \
    `);
  } catch (err) {
    error = err;
  }
  lr.actEnd('mbaasArt');
  if (error) {
    return lr.checkError(error);
  }
  lr.finish('ok');
}

run();