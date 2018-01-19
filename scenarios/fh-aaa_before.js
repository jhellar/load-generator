const fs = require('fs');
const async = require('async');
const fhc = require('fh-fhc');
const fhcInit = require('../utils/fhc-init');

async.series({
  loginTokens: cb => fhcInit(process.env.RHMAP_HOST, process.env.RHMAP_USER, process.env.RHMAP_PASS, cb),
  user: cb => fhc['admin-users'].read(process.env.RHMAP_USER, cb)
}, (_, results) => fs.writeFileSync('temp.json', JSON.stringify(results, null, 2)));