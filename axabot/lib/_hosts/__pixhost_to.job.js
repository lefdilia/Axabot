const init = require('../../config/init');
const Hosts = require('../../models/hosts');
const notifier = require('../notifier');


const fs = require('fs');
const request = require('request');
const url = require('url');

const Queue = require('bull');
const uploadQueue = new Queue('uploadQueue');

var fileUpload = function (job, io) {
  if (!(this instanceof fileUpload)) return new fileUpload(job, io);

  this.job = job;
  this.io = io || global.io;

  this.uploadServer = "https://api.pixhost.to/images";

  this.server = "pixhost.to";
  this.host = "pixhost.to";
  this.userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.12; rv:49.0) Gecko/20100101 Firefox/49.0";

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

  this._username = null;
  this._password = null;

  this.uploaded = 0;
  this.useAccount = true;

  this.time_start = (new Date()).getTime();
}


fileUpload.prototype.send = function () {
  var _this = this;
  return new Promise(function (resolve, reject) {

    if (_this._key == 'thumb') { //Local File
      var fileStream = fs.createReadStream(_this.filePath);
    } else if (_this._key == 'nfo') {//nfo File
      var fileStream = fs.createReadStream(_this.filePath);
    } else if (_this._key == 'poster') {//Remote File
      var fileStream = request(_this.filePath)
    }

    var options = {
      method: 'POST',
      url: _this.uploadServer,
      headers: {
        'cache-control': 'no-cache',
        'User-Agent': _this.userAgent,
        'Accept': 'application/json',
        'Content-Type': 'multipart/form-data; charset=utf-8'
      },
      forever: true,
      pool: {
        maxSockets: Infinity
      },
      json: true
    };

    var r = request(options).on('error', function (error) {
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

        if (!received) {
          return reject("Cannot find upload link.");
        } else {
          try {
            received = JSON.parse(received);

            var _show_url = received['show_url'];
            var _th_url = received['th_url'];

            if (!_show_url || !_th_url) {
              return reject("Cannot find upload link, Please Retry Later...");
            } else {

              try {
                var _srv = url.parse(_th_url)['host'];
                _srv = _srv.split('.');
                _srv = _srv[0];
                _srv = _srv.match(/\d+/g);
                _srv = `img${_srv.toString()}`;//img36
                var _nurl = _show_url.replace(/\/show\//i, '/images/');
                _nurl = _nurl.replace(/https:\/\/pixhost/i, `https:\/\/${_srv}.pixhost`);
              } catch (e) { }

              if (_nurl.match(/^(http(s)?):\/\//ig)) {
                _this.link = _nurl;
              } else {
                _this.link = _th_url;
              }
              return resolve();
            }
          } catch (e) {
            return reject("Received data is corrupted.");
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
    form.append('img', fileStream, {
      filename: _this.filenameRD
    });

    form.append('content_type', 1);
    form.append('max_th_size', 500);

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

  _this.send().then(function () {
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