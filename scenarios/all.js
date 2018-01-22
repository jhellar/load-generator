const util = require('util');
const exec = util.promisify(require('child_process').exec);

exec(`\
  docker run \
  -e "PREFIX=${Date.now()}" \
  -e "USERNAME=${process.env.RHMAP_USER}" \
  -e "PASSWORD=${process.env.RHMAP_PASS}" \
  -e "COREHOST=${process.env.RHMAP_HOST}" \
  load-test-fh-art \
`);