var lr = require('load-runner')();
const util = require('util');
const exec = util.promisify(require('child_process').exec);

async function run() {
  lr.actStart('fhUart');
  let error;
  try {
    await exec(`\
      docker run \
      -e "USERNAME=${process.env.RHMAP_USER}" \
      -e "PASSWORD=${process.env.RHMAP_PASS}" \
      -e "COREHOST=${process.env.RHMAP_HOST}" \
      -v \`pwd\`/fixtures:/tmp/fixtures \
      load-test-fh-uart \
      /bin/bash -c " \
      node /tmp/fixtures/setup-uart.js; \
      /opt/bin/entry_point.sh >/dev/null 2>&1 & \
      grunt uart:adhoc --group=./tests/000_batch --prefix=fu${Date.now()} \
      " >/dev/null 2>&1 \
      || true \
    `);
  } catch (err) {
    error = err;
  }
  lr.actEnd('fhUart');
  if (error) {
    return lr.checkError(error);
  }
  lr.finish('ok');
}

run();