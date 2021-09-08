const init = require('../../config/init');
const Hosts = require('../../models/hosts');
const notifier = require('../notifier');


const fs = require('fs');
const request = require('request');
const cheerio = require('cheerio');
const Queue = require('bull');
const uploadQueue = new Queue('uploadQueue');

var fileUpload = function (job, io) {
  if (!(this instanceof fileUpload)) return new fileUpload(job, io);

  this.job = job;
  this.io = io || global.io;

  this._cookies = global._cookies ? global._cookies['imgbox.com'] : (global._cookies = {});
  this._token = global._token ? global._token['imgbox.com'] : (global._token = {});

  this.tokenServer = "https://imgbox.com/ajax/token/generate";
  this.uploadServer = "https://imgbox.com/upload/process";

  this.formLogin = "https://imgbox.com/login";
  this._referer = "https://imgbox.com/";

  this.server = "imgbox.com";
  this.host = "imgbox.com";
  this.userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.12; rv:49.0) Gecko/20100101 Firefox/49.0";
  //Top infos Must be on all Hosts...

  this.token_id = null
  this.token_secret = null
  this.gallery_id = null
  this.gallery_secret = null

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

fileUpload.prototype.datainit = function () {
  var _this = this;
  return new Promise(function (resolve, reject) {
    Hosts.findOne({
      'server': _this.server
    }, 'data', function (err, _result) {
      if (err || !_result) return reject('Cannot find Host data, Verify the host account.');

      var result = _result.data || {};

      _this._username = result.username;
      _this._password = result.password;

      if (result.use_account == false || !_this._username || !_this._password) {
        return reject("Cannot Connect to this Host, Please verify Username & Password.");
      } else {
        return _this.initAuth().then(resolve).catch(reject);
      }

    })
  })
}

fileUpload.prototype.initAuth = function () {
  var _this = this;
  return new Promise(function (resolve, reject) {
    if (_this._cookies && _this._token) return resolve();

    var j = request.jar();

    var opts = {
      method: 'GET',
      url: _this.formLogin,
      headers: {
        "cache-control": "no-cache",
        Cookie: _this._cookies
      },
      jar: j,
      followAllRedirects: true
    };

    request(opts, function (err, response, body) {
      if (err) {
        _this._cookies = null;
        _this._token = null;
        return reject(err);
      }

      const $ = cheerio.load(body);

      _this._token = global._token['imgbox.com'] = $('input[name="authenticity_token"]').val();
      _this._utf8 = $('input[name="utf8"]').val();

      if (!_this._token || !_this._username || !_this._password) return reject("Please verify Username & Password.");

      var _opts = {
        url: _this.formLogin,
        formData: {
          "authenticity_token": _this._token,
          "utf8": _this._utf8,
          "user[login]": _this._username,
          "user[password]": _this._password,
        },
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.12; rv:49.0) Gecko/20100101 Firefox/49.0",
          "Content-Type": "application/x-www-form-urlencoded"
        },
        jar: j,
        followAllRedirects: true
      }

      request(_opts, function optionalCallback(err, httpResponse, body) {
        if (err) {
          _this._cookies = null;
          _this._token = null;
          return reject(err);
        } else {
          const cookie_string = j.getCookieString(_this.formLogin); // "key1=value1; key2=value2; ..."
          _this._cookies = global._cookies['imgbox.com'] = cookie_string || {};
          return resolve();
        }
      })
    })
  })
}

fileUpload.prototype.generateToken = function () {
  var _this = this;
  return new Promise(function (resolve, reject) {

    var options = {
      method: 'POST',
      url: _this.tokenServer,
      qs: {
        gallery: true,
        gallery_title: '',
        comments_enabled: 0
      },
      headers:
      {
        'cache-control': 'no-cache',
        'Connection': 'keep-alive',
        'Content-Length': '0',
        'Accept-Encoding': 'gzip, deflate',
        'Host': _this.host,
        'User-Agent': _this.userAgent,
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-CSRF-Token': _this._token,
        'Referer': _this._referer,
        'Cookie': _this._cookies
      }, json: true
    };

    request(options, function (error, response, _json) {
      if (error || !_json || typeof _json != 'object' || _json.ok == false || response.statusCode != 200) {
        _this._cookies = null;
        _this._token = null;
        return reject('Error generate Token..');
      }

      _this.token_id = _json.token_id;
      _this.token_secret = _json.token_secret;
      _this.gallery_id = _json.gallery_id;
      _this.gallery_secret = _json.gallery_secret;

      return resolve();

    })
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
      var fileStream = request(_this.filePath)
    }

    var options = {
      method: 'POST',
      url: _this.uploadServer,
      headers:
      {
        'cache-control': 'no-cache',
        'Cookie': _this._cookies,
      },
      pool: {
        maxSockets: Infinity
      }
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
          var error = null;
          try {
            received = JSON.parse(received);
            var data = received['files'][0] || {};
            _this.link = data['original_url'];

            if (!_this.link || _this.link == "") {
              if (data['error']) {
                error = data['error'] ? data['error'].toString() : null;
                error = error || 'Internal error, please retry';
                return reject(`Host reject Upload with ${error} `);
              } else {
                return reject("Cannot find upload link, Please Retry Later...");
              }
            } else {
              return resolve();
            }
          } catch (e) {
            return reject("Error parsing Received Data");
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
    form.append('files[]', fileStream, {
      filename: _this.filenameRD
    });

    form.append('content_type', 1);
    form.append('authenticity_token', _this._token);
    form.append('utf8', '&#x2713;');
    form.append('token_id', _this.token_id);
    form.append('token_secret', _this.token_secret);
    form.append('gallery_id', _this.gallery_id);
    form.append('gallery_secret', _this.gallery_secret);
    form.append('comments_enabled', 0);
    form.append('thumbnail_size', '100c');


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
  _this.datainit().then(function (data) {
    return _this.generateToken();
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