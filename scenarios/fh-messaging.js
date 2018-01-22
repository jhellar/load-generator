var lr = require('load-runner')();
var async = require('async');
const params = require('../temp');
const config = {
  apikey: params.apiKey,
  host: process.argv[2],
  port: '80',
  protocol: 'http'
};
console.log(config);
const fhMessaging = require('fh-messaging-client')(config);

async.waterfall([
  function createAppMessage(cb) {
    lr.actStart('createAppMessage');
    const message = {
      'foo': 'bar'
    };
    fhMessaging.createAppMessage('log', message, (err, res) => {
      console.log(err);
      console.log(res);
      lr.actEnd('createAppMessage');
      cb(err);
    });
  },
  function sendMbaasMetrics(cb) {
    lr.actStart('sendMbaasMetrics');
    const data = {
      'foo': 'bar'
    };
    fhMessaging.sendMbaasMetrics(Date.now() - 1000, Date.now(), 'domain', data, (err, res) => {
      console.log(err);
      console.log(res);
      lr.actEnd('sendMbaasMetrics');
      cb(err);
    });
  }
], err => {
  if (err) {
    return lr.checkError(err);
  }
  lr.finish('ok');
});
