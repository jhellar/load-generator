const fs = require('fs');
const oc = require('../utils/oc');
const exec = require('../utils/execute');

async function run() {
  const pod = (await oc.getPodNames('fh-mbaas'))[0];
  const serviceKey = await exec(`oc describe pod ${pod} | awk '/FHMBAAS_KEY/{print $2}'`);
  fs.writeFileSync('temp.json', JSON.stringify({ serviceKey }, null, 2));
}

run();