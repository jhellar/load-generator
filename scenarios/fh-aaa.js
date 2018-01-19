var lr = require('load-runner')();
var async = require('async');
const config = { protocol: "http", host: process.argv[2] };
const aaaClient = require('fh-aaa-client')(config);

const params = require('../temp');

async.waterfall([
  function canAccess(cb) {
    lr.actStart('canAccess');
    const req = {
      'user-id': params.user.guid,
      'business-objects': { cluster: [ 'rhmapcluster' ] },
      'perm': 'write'
    };
    aaaClient.canAccess(req, err => {
      lr.actEnd('canAccess');
      cb(err);
    });
  },
  function filterList(cb) {
    lr.actStart('filterList');
    const req = {
      'user-id': params.user.guid,
      'business-objects': { cluster: [ 'rhmapcluster' ] },
    };
    aaaClient.filterList(req, err => {
      lr.actEnd('filterList');
      cb(err);
    });
  },
  function getTeam(cb) {
    lr.actStart('getTeam');
    aaaClient.getTeam({ id: params.user.fields.teams[0]._id }, err => {
      lr.actEnd('getTeam');
      cb(err);
    });
  },
], err => {
  if (err) {
    return lr.checkError(err);
  }
  lr.finish('ok');
});
