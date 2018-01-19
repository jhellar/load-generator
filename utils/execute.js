const util = require('util');
const exec = util.promisify(require('child_process').exec);

module.exports = async function execute(command) {
  const { stdout } = await exec(command);
  return stdout.slice(0, -1);
};