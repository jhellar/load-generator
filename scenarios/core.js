var lr = require('load-runner')();
const util = require('util');
const exec = util.promisify(require('child_process').exec);

async function run() {
  lr.actStart('fhArt');
  let error;
  try {
    await exec(`\
      docker run \
      -e "PREFIX=${Date.now()}" \
      -e "USERNAME=${process.env.RHMAP_USER}" \
      -e "PASSWORD=${process.env.RHMAP_PASS}" \
      -e "COREHOST=${process.env.RHMAP_HOST}" \
      load-test-fh-art \
      >/dev/null 2>&1 \
      || true \
    `);
  } catch (err) {
    error = err;
  }
  lr.actEnd('fhArt');
  if (error) {
    return lr.checkError(error);
  }
  lr.finish('ok');
}

run();