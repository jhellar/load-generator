const fs = require('fs');

const config = fs.readFileSync('nightwatch.json', 'utf8');
const json = JSON.parse(config);

json['test_settings'].adhoc.globals.host = 'https://' + process.env.COREHOST;
json['test_settings'].adhoc.globals.password = process.env.PASSWORD;
json['test_settings'].adhoc.globals.username = process.env.USERNAME;
json['test_settings'].adhoc.globals.studioEnvironments = ['development'];
delete json['test_settings'].adhoc.globals.mbaasList;

json.selenium['start_process'] = false;

const updated = JSON.stringify(json, null, 2);
fs.writeFileSync('nightwatch.json', updated);