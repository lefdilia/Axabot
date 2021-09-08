const init = require('../config/init');
const async = require('async');
const childProcess = require('child_process');
const spawn = childProcess.spawn;

const path = require('path');
const ip = require('ip');
const xmlrpc = require('xmlrpc');

const rTorrents = require('../models/torrents').rtorrents;

var client = xmlrpc.createClient({
  host: ip.address(),
  path: "/scgi"
});

function send(opts, callback) {
  opts = opts || {};

  var hash = opts.hash;
  var magnets = Array.isArray(opts.magnets) ? opts.magnets : [opts.magnets];

  var args = [];
  args[0] = "";

  if (opts.label) args[2] = `d.custom1.set=${opts.label}`;

  if (!opts.hash) return;

  async.eachSeries(magnets, function (magnet, next) {
    args[1] = magnet;

    var hashi = hash.trim();
    hashi = hashi.toUpperCase();

    var nmb = 1;
    nmb = nmb.toString();

    client.methodCall('d.multicall2', ["", "main", "d.hash=", "d.custom1=", "d.get_finished_dir=", "d.get_name=", "d.state=", "d.is_active=", "d.is_open=", "d.complete="], function (error, _list) {

      if (!error) {

        var _hash = _list.filter(function (_arr) {
          return _arr[0] == hashi;
        })[0]

        _states_ = _hash ? _hash.slice(4, 8).reduce(function (sum, value) {
          return Number(sum) + Number(value);
        }) : 1;

        if (_states_ == 0) {
          client.methodCall("system.multicall", [
            [{
              'methodName': 'd.hash',
              'params': [hashi]
            },
            {
              'methodName': 'd.start',
              'params': [hashi]
            }
            ]
          ], next)
        } else if (!_hash) {
          client.methodCall('load.start', args, next);
        } else {
          var _p = path.resolve(__dirname, '..', 'axxe.js');
          _hash.unshift(_p);

          const ls = spawn('node', _hash, {
            stdio: 'inherit',
            detached: true
          })
          return next();
        }
      }
    })
  }, callback);
}

function sendStd(opts, callback) {
  opts = opts || {};

  var magnets = Array.isArray(opts.magnets) ? opts.magnets : [opts.magnets];

  var args = [];
  args[0] = "";

  if (opts.label) args[2] = `d.custom1.set=${opts.label}`

  async.eachSeries(magnets, function (magnet, next) {
    args[1] = magnet;
    client.methodCall('load.start', args, next);
  }, callback)

}

function erase(data, callback) {

  async.eachSeries(data, function (v, next) {

    var hash = v.hash.toUpperCase();
    var nmb = 1;
    nmb = nmb.toString();

    client.methodCall("system.multicall", [
      [{
        'methodName': 'd.custom5.set',
        'params': [hash, nmb]
      }, {
        'methodName': 'd.close',
        'params': [hash]
      }, {
        'methodName': 'd.delete_tied',
        'params': [hash]
      }, {
        'methodName': 'd.erase',
        'params': [hash]
      }]
    ], function (error, value) {
      next();
    })
  }, callback);

}

function stop(_hashs, callback) {

  async.eachSeries(_hashs, function (_hash, next) {
    var hash = _hash.toUpperCase();
    var nmb = 1;
    nmb = nmb.toString();

    client.methodCall("system.multicall", [
      [{
        'methodName': 'd.custom5.set',
        'params': [hash, nmb]
      }, {
        'methodName': 'd.close',
        'params': [hash]
      }, {
        'methodName': 'd.delete_tied',
        'params': [hash]
      }, {
        'methodName': 'd.stop',
        'params': [hash]
      }]
    ], function (error, value) {
      next();
    })
  }, callback);

}


function SaveTracksTorrents(opts, callback) {

  client.methodCall('d.multicall2', ["", "main", "d.hash=", "d.name=", "d.data_path=", "d.size_bytes=", "d.state=", "d.is_active=", "d.is_open=", "d.complete=", "d.timestamp.finished=", "d.timestamp.started=", "d.custom1="], function (err, data) {
    /*
       Stopped            => 'State:0', 'Active:0', 'Open:0', 'Finished:0'
       Downloading        => 'State:1', 'Active:1', 'Open:1', 'Finished:0'
       Pausing            => 'State:0', 'Active:0', 'Open:1', 'Finished:0'
       Checking           => 'State:1', 'Active:0', 'Open:1', 'Finished:0'
       Seeding            => 'State:1', 'Active:1', 'Open:1', 'Finished:1' 
       Finished           => 'State:1', 'Active:1', 'Open:1', 'Finished:1'
    */

    var Errors = [];
    async.eachSeries(data, function updateObject(obj, done) {
      var hash = obj[0] ? obj[0].toLowerCase() : null;
      if (!hash) return done();
      rTorrents.updateMany({
        hash: hash
      }, {
        $set: {
          hash: hash,
          info: {
            name: obj[1],
            data_path: obj[2],
            size_bytes: obj[3],
            state: obj[4],
            is_active: obj[5],
            is_open: obj[6],
            finished: obj[7],
            tfinished: obj[8],
            tstarted: obj[9],
            label: obj[10],
          }
        }
      }, {
        upsert: true,
        new: true
      },
        function (err, doc) {
          if (err) Errors.push(err);
          done();
        });
    }, function allDone(err) {
      callback(null, data);
    });

  })
}

module.exports.erase = erase;
module.exports.stop = stop;
module.exports.send = send;
module.exports.sendStd = sendStd;
module.exports.SaveTracksTorrents = SaveTracksTorrents;
