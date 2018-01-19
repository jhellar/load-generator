const fhc = require('fh-fhc');
const async = require('async');

function init(host, username, password, cb) {
  var cfg = {
    loglevel: 'error',
    json: true,
    feedhenry: host,
    user: username,
    inmemoryconfig: true
  };

  async.waterfall([
    cb => fhc.load(cfg, cb),
    (_, cb) => fhc.target({ _: [host] }, cb),
    (_, cb) => fhc.login({ _: [username, password] }, cb)
  ], cb);
}

module.exports = init;