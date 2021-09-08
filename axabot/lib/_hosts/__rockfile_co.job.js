const init = require('../../config/init');
const Hosts = require('../../models/hosts');
const notifier = require('../notifier');

const fs = require('fs');
const request = require('request');
const parse = require('url').parse;
const cloudscraper = require('cloudscraper');

const Queue = require('bull');
const uploadQueue = new Queue('uploadQueue');


var fileUpload = function (job, io) {
    if (!(this instanceof fileUpload)) return new fileUpload(job, io);

    this.job = job;
    this.io = io || global.io;

    this._cookies = global._cookies ? global._cookies['rockfile.co'] : (global._cookies = {});

    this.ioLogin = "https://rockfile.co/login";
    this.uriServer = "http://rockfile.co";
    this.siteUrl = "https://www.rockfile.co/";

    this.server = 'rockfile.co';
    this.host = 'rockfile.co';
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

    this.uploadServer = null;
    this.sess_id = null;

    this.uploaded = 0;
    this.useAccount = true;

    this._fetchTime = null;
    this._retry = 0;

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

            _this._username = result.username || null;
            _this._password = result.password || null;

            if (!_this._username || !_this._password) return reject("*Please verify Username & Password");

            return _this.initAuth().then(resolve).catch(reject);
        })
    })
}


fileUpload.prototype.initAuth = function () {
    var _this = this;
    return new Promise(function (resolve, reject) {

        if (_this._cookies != null) {
            return _this.grabServers(_this._cookies).then(resolve).catch(reject);
        }

        var j = request.jar();

        var options = {
            uri: _this.ioLogin,
            jar: j,
            followAllRedirects: true
        };

        cloudscraper.get(options).then(function (body) {

            body = body || "";
            var _token = body.match(/token" value="(.*?)"/);
            _this._token = _token ? _token[1] : null;

            var _rand = body.match(/rand" value="(.*?)"/);
            _this._rand = _rand ? _rand[1] : null;

            const cfcookie_string = j.getCookieString(_this.ioLogin);

            if (cfcookie_string.match(/cf_clearance=/)) {

                _this._cookies = global._cookies['cf_rockfile'] = cfcookie_string;

                return _this.grabServers(_this._cookies).then(resolve).catch(reject);
            } else {
                return reject('Cloudflare Block app Access. Please report this problem');
            }

        }).catch(function (error) {
            return reject('Cloudflare Block Access. Please report this problem');
        });
    })
}


fileUpload.prototype.grabServers = function () {
    var _this = this;
    return new Promise(function (resolve, reject) {

        var opit = {
            method: 'GET',
            url: "http://www.rockfile.co/?op=upload_form",
            headers: {
                'Referer': 'http://www.rockfile.co/',
                'Cookie': _this._cookies,
                'User-Agent': _this.userAgent
            }
        }

        request.get(opit, function optionalCallback(err, response, body) {
            if (err || !body) return reject(`Maybe ${_this.host} is down`);

            body = body || "";

            if (body.match(/name=\"sess_id\"/i)) {
                _this._retry = 0;

                var uploadServer = body.match(/id="uploadfile" action="(.*?)"/im);
                _this.uploadServer = uploadServer ? uploadServer[1] : null;

                var sess_id = body.match(/name="sess_id" value="(.*?)"/im);
                _this.sess_id = sess_id ? sess_id[1] : null;

                return resolve();
            } else {

                if (_this._retry >= 3) {
                    _this._fetchTime = setTimeout(function () {
                        _this._retry = 0;
                    }, 10000)
                    return reject(`Please verify username & password, we already tried ${_this._retry} times, wait 10 secondes before retry`);
                }

                _this._retry++;

                return _this.login().then(function () {
                    return _this.grabServers(_this._cookies);
                }).then(resolve).catch(reject)
            }
        })

    })
}

fileUpload.prototype.login = function () {
    var _this = this;
    return new Promise(function (resolve, reject) {

        var formData = {
            login: _this._username,
            password: _this._password,
            token: _this._token || "",
            rand: _this.rand || "",
            op: "login",
            redirect: "http://rockfile.co/"
        };

        var j = request.jar();

        var cookie = request.cookie(_this._cookies);

        j.setCookie(cookie, _this.ioLogin);

        var opts = {
            method: 'POST',
            url: _this.siteUrl,
            formData: formData,
            headers: {
                "User-Agent": _this.userAgent,
                "Connection": "Keep-Alive"
            },
            jar: j,
            forever: true,
            followAllRedirects: true,
            pool: {
                maxSockets: Infinity
            }
        };

        request(opts, function (err, httpResponse, body) {
            if (err) return reject("Error on received Data...");

            var cookie_string = j.getCookieString(_this.siteUrl); 
            cookie_string = cookie_string.replace(/__cfduid\=(.*?);/ig, '');
            cookie_string = cookie_string.trim();

            _this._cookies = global._cookies['rockfile.co'] = cookie_string;

            if (cookie_string.match(/xfss\=/)) {
                return resolve();
            } else {
                return reject("Cookies are Lost");
            }
        })
    })
}


fileUpload.prototype.send = function () {
    var _this = this;
    return new Promise(function (resolve, reject) {

        if (_this._fetchTime) {
            clearTimeout(_this._fetchTime);
        }

        if (!_this._username || !_this._password) return reject("*Please verify your credentials.");
        var fileStream = fs.createReadStream(_this.filePath);

        var _parsedHost = parse(_this.uploadServer).hostname

        var opts = {
            method: 'OPTIONS',
            timeout: 20000,
            url: _this.uploadServer,
            formData: {
                upload_type: 'file',
                utype: 'reg'
            },
            headers: {
                "Host": _this.uploadServer,
                "User-Agent": _this.userAgent,
                "Access-Control-Request-Method": "POST",
                "Origin": _this.uriServer,
                "Host": _parsedHost,
                "Connection": "keep-alive"
            }
        };

        request(opts).on('error', function (error) {
            if (error && error.code == 'ETIMEDOUT') return reject(`Upload Server is down!`);
            if (error && error.code == 'ENOENT') return reject('File Check Error.');
            if (error && error.code == 'ECONNRESET') return reject('Upload Aborted (Request Closed).');
        })

        var opts = {
            method: 'POST',
            url: _this.uploadServer,
            headers: {
                'Cookie': _this._cookies,
                'User-Agent': _this.userAgent,
                'X-Requested-With': 'XMLHttpRequest',
                'Host': _parsedHost,
                'Connection': 'Keep-Alive'
            },
            forever: true,
            pool: {
                maxSockets: Infinity
            }
        };

        var r = request(opts).on('error', function (error) {
            if (error && error.code == 'ENOENT') return reject('File Check Error.');
            if (error && error.code == 'ECONNRESET') return reject('Upload Aborted (Request Closed).'); 
        }).on('end', function () {
            if (_this.intID) {
                clearInterval(_this.intID);
            }
            r.agent.destroy();
        }).on('response', function (response) {
            response.on('data', function (data) {
                data = data ? data.toString() : null;

                if (!data) {
                    return reject("Cannot find upload link.");
                } else {
                    var error = null;
                    try {
                        data = JSON.parse(data);
                        data = data[0];
                        var file_code = data['file_code'] || null;
                        var file_status = data['file_status'] || null;

                        if (!file_code) throw new Error('File code not emited, Error on Upload');
                        if (!file_status) throw new Error('File status Error');
                        if (file_status != "OK") throw new Error(file_status);

                        _this.link = `http://rockfile.co/${file_code}.html`;

                    } catch (_error) {
                        error = _error ? _error.toString() : 'Error Parsing data';
                    }

                    if (error) {
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
        form.append('sess_id', _this.sess_id);//
        form.append('file_1', fileStream, { filename: _this.filenameRD });

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