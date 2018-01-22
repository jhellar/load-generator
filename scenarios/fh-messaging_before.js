const fs = require('fs');
const oc = require('../utils/oc');
const exec = require('../utils/execute');

async function run() {
  const supercorePod = (await oc.getPodNames('fh-supercore'))[0];
  console.log(supercorePod);
  let pod;
  if (supercorePod === '') {
    pod = (await oc.getPodNames('fh-mbaas'))[0];
  } else {
    pod = supercorePod;
  }
  console.log(pod);
  const apiKey = (await exec(`oc describe pod ${pod} | awk '/FH_MESSAGING_API_KEY/{print $2}'`)).split('\n')[0];
  fs.writeFileSync('temp.json', JSON.stringify({ apiKey }, null, 2));
}

run();