const init = require('../../config/init');
const Hosts = require('../../models/hosts');
const notifier = require('../notifier');


const fs = require('fs');
const request = require('request');

const Queue = require('bull');
const uploadQueue = new Queue('uploadQueue');

var fileUpload = function (job, io) {
  if (!(this instanceof fileUpload)) return new fileUpload(job, io);

  this.job = job;
  this.io = io || global.io;

  this.uploadServer = "https://api.imgur.com/3/upload";

  this._token = global._token ? global._token['imgur.com'] : (global._token = {});

  this.server = 'imgur.com';
  this.host = 'imgur.com';
  this.userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.12; rv:49.0) Gecko/20100101 Firefox/49.0";
  //Top infos Must be on all Hosts...

  var data = job.data;
  var infos = data.infos;

  this.jobId = job.id;
  this.taskId = data.taskId;

  this.type = infos.type;
  this.filePath = infos.path; 
  this._key = infos._key;
  this.filename = infos.filename;
  this.filenameRD = infos.filenameRD;

  this.size = infos.size;
  this.fileStat = {};

  this.link = infos.link;
  this.error = infos.error;

  this._clientId = null;
  this._clientSecret = null;
  this._username = null;
  this._password = null;

  this.uploaded = 0;
  this.useAccount = true;

  this.time_start = (new Date()).getTime();


  this._mswitch = false; 
  this._tested = false; 

}

fileUpload.prototype.datainit = function () {
  var _this = this;
  return new Promise(function (resolve, reject) {
    Hosts.findOne({
      'server': _this.server
    }, 'data', function (err, _result) {
      if (err || !_result) return reject('Cannot find Host data, Verify the host account.');

      var result = _result.data || {};

      _this._clientId = result.clientid;
      _this._username = result.username;
      _this._password = result.password;

      if (result.use_account == false || !_this._username || !_this._password || !_this._clientId) {
        return reject("Cannot Connect to this Host, Please verify Username, Password, clientid & clientsecret .");
      } else {
        return resolve();
      }

    })
  })
}

fileUpload.prototype._getAuthorizationHeader = function () {
  var _this = this;
  return new Promise(function (resolve, reject) {

    if (_this._token && _this._token !== _this._clientId) {
      return resolve();
    } else if (_this._username && _this._password) {
      var options = {
        uri: 'https://api.imgur.com/oauth2/authorize',
        method: 'GET',
        encoding: 'utf8',
        qs: {
          client_id: _this._clientId,
          response_type: 'token'
        }
      };

      request(options, function (err, res, body) {
        if (err) {
          return reject(err);
        }
        var authorize_token = res.headers['set-cookie'][0].match('(^|;)[\s]*authorize_token=([^;]*)')[2];
        options.method = 'POST';
        options.json = true;
        options.form = {
          username: _this._username,
          password: _this._password,
          allow: authorize_token
        };
        options.headers = {
          Cookie: 'authorize_token=' + authorize_token
        };

        request(options, function (err, res, body) {
          if (err) {
            _this._token = global._token["imgur.com"] = null;
            return reject(err);
          }
          var location = res.headers.location;
          var token = JSON.parse('{"' + decodeURI(location.slice(location.indexOf('#') + 1)).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}');
          _this._token = global._token["imgur.com"] = token.access_token;
          return resolve();
        })
      })

    } else {
      _this._token = global._token["imgur.com"] = _this._clientId;
      return resolve();
    }
  })
}


fileUpload.prototype.send = function () {
  var _this = this;
  return new Promise(function (resolve, reject) {

    if (_this._key == 'thumb') { //Local File
      var fileStream = fs.createReadStream(_this.filePath);
    } else if (_this._key == 'nfo') {//nfo File
      var fileStream = fs.createReadStream(_this.filePath);
    } else if (_this._key == 'poster') {//Remote File
      var fileStream = _this.filePath;
    }

    var opts = {
      method: 'POST',
      url: _this.uploadServer,
      headers: {
        'User-Agent': _this.userAgent,
        'Host': 'api.imgur.com',
        'Content-Type': 'multipart/form-data',
        'Connection': 'Keep-Alive',
        'Authorization': `Bearer ${_this._token}`
      },
      forever: true,
      pool: {
        maxSockets: Infinity
      }
    };

    if (_this._mswitch == true) {
      opts['headers']['Authorization'] = `Client-ID ${_this._clientId}`;
      _this._tested = true;
    }

    var r = request(opts).on('error', function (error) {
      if (error && error.code == 'ENOENT') return reject('File Check Error.');
      if (error && error.code == 'ECONNRESET') return reject('Upload Aborted (Request Closed).'); 
    }).on('end', function () {
      if (_this.intID) {
        clearInterval(_this.intID);
      }
      r.agent.destroy();
    }).on('response', function (response) {
     
      response.on('data', function (received) {
        received = received ? received.toString() : null;

        try {
          received = JSON.parse(received);
        } catch (e) {
          received = {}
        }

        var data = received['data'] || {};

        if (!data || data.length == 0) {
          return reject("Cannot find upload link.");
        } else {
          var error = null;
          try {
            _this.link = data['link'];
          } catch (e) {
            error = "Error parsing Received Data";
          }

          if (data['error']) {
            var error = typeof data['error'] == 'string' ? data['error'] : data['error']['message'];
            error = error || 'Internal error, please retry';
            return reject(`Host reject Upload with \"${error}\" `);
          } else if (error) {
            return reject(error);
          } else if (_this.link && !_this.link.match(/^(http(s)?):\/\//ig)) {
            return reject("Invalid Url type..");
          } else {
            return resolve();
          }
        }

      })
    })

    uploadQueue.getJob(_this.jobId).then(function (_job) {
      if (!_job) {
        r.agent.destroy();
        return reject('Upload Cancelled.');
      }
    })

    var time_start = _this.time_start;
    var fspeed = _this.fspeed = 0;
    var festim = _this.festim = 0;
    var uploaded = _this.uploaded = 0;

    _this.progress = 0;
    _this.size = 0;
    _this.intID;

    var form = r.form();
    form.append('image', fileStream);
    form.append('name', _this.filenameRD);
    form.append('title', _this.filenameRD);

    form.getLength(function (err, size) {
      _this.size = size;
      _this.intID = setInterval(function () {

        let _progress = {
          jobId: _this.jobId,
          taskId: _this.taskId,
          host: _this.host,
          mdoing: 'Uploading....',
          status: 'running',
          progress: _this.progress,
          uploaded: _this.bulklng,
          fspeed: _this.fspeed,
          est: _this.est,
          fullSize: _this.fullSize,
          byteSize: _this.size,
        };

        _this.job.progress(_progress);
      }, init._emitInterval);
    });


    form.on('data', function (data) {
      uploaded += data.length;

      var toSoFar = (((new Date()).getTime() - time_start) * 0.001).toFixed(3);
      fspeed = Math.round(uploaded / toSoFar);
      festim = Math.round(((_this.size - uploaded) * toSoFar) / uploaded);
      _this.est = init.convertSeconds(festim);

      if (fspeed > _this.size) {
        fspeed = data.length;
      }

      _this.fspeed = init.bytesToSize(fspeed).all + '/s';
      _this.bulklng = init.bytesToSize(uploaded).all;

      progress = ((uploaded / _this.size) * 100);
      _this.progress = progress ? progress.toFixed() : 0;

      _this.fullSize = init.bytesToSize(_this.size).all;

    });

    var evntNm = 'abortupload';
    notifier.on(evntNm, function (data) {
      var jobId = data.jobId || '';
      if (jobId && jobId == _this.jobId) {
        r.agent.destroy();
        
        if (_this.intID) clearInterval(_this.intID);
        return reject('Upload Cancelled.');
      }
    })

  })
}

fileUpload.prototype.process = function (callback) {
  var _this = this;
  _this.datainit().then(function () {
    return _this._getAuthorizationHeader();
  }).then(function () {
    return _this.send();
  }).then(function () {

    var _ndupload = {
      jobId: _this.jobId,
      taskId: _this.taskId,
      host: _this.host,
      mdoing: null,
      status: 'finished',
      progress: 100,
      uploaded: _this.bulklng,
      fspeed: _this.fspeed,
      fullSize: _this.fullSize,
      byteSize: _this.size,
      link: _this.link
    };

    _this.job.progress(_ndupload);

    if (_this.intID) {
      clearInterval(_this.intID);
    }

    return callback(null, _ndupload);

  }).catch(function (error) {

    var _errupload = {
      jobId: _this.jobId,
      taskId: _this.taskId,
      host: _this.host,
      mdoing: null,
      status: 'aborted',
      progress: _this.progress,
      uploaded: _this.bulklng,
      fspeed: _this.fspeed,
      fullSize: _this.fullSize,
      byteSize: _this.size,
      error: init.clearErrors(error)
    };

    _this.job.progress(_errupload);

    if (_this.intID) {
      clearInterval(_this.intID);
    }

    return callback(error);
  })
}

module.exports = fileUpload