const init = require('../../config/init');
const Hosts = require('../../models/hosts');
const notifier = require('../notifier');

const fs = require('fs');
const request = require('request');
const sha1 = require('sha1');

const Queue = require('bull');
const uploadQueue = new Queue('uploadQueue');


var fileUpload = function (job, io) {
    if (!(this instanceof fileUpload)) return new fileUpload(job, io);

    this.job = job;
    this.io = io || global.io;

    this._cookies = global._cookies ? global._cookies['uploaded.net'] : (global._cookies = {});

    this.apiUser = "http://uploaded.net/api/user";
    this.uploadserver = "http://uploaded.net/api/uploadserver";
    this.urlmanager = "http://uploaded.net/io/me/list/files";
    this.ioLogin = "http://uploaded.net/io/login";

    this.server = 'uploaded.net';
    this.host = 'uploaded.net';
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

    this.uploaded = 0;
    this.useAccount = true;

    this._fetchTime = null;

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

            _this.authString = '&id=' + _this._username + '&pw=' + sha1(_this._password) || null;

            _this.initAuth().then(resolve).catch(function () {
                var formData = {
                    id: _this._username || "",
                    pw: _this._password || ""
                };

                var j = request.jar();

                request.post({
                    url: _this.ioLogin,
                    formData: formData,
                    jar: j,
                    followAllRedirects: true
                }, function optionalCallback(err, httpResponse, body) {
                    if (err || httpResponse.statusCode != 200) return reject("Cannot Connect to this Host, Please verify Username & Password.");

                    const cookie_string = j.getCookieString(_this.ioLogin); // "key1=value1; key2=value2; ..."
                    _this._cookies = global._cookies['uploaded.net'] = cookie_string || {};

                    if (cookie_string.match(/login=/)) {
                        return resolve();
                    } else {
                        return reject('User credentials not correct');
                    }
                })
            });
        })
    })
}

fileUpload.prototype.initAuth = function () {
    var _this = this;
    return new Promise(function (resolve, reject) {

        if (_this._cookies == null) return reject();

        var opts = {
            method: 'POST',
            url: _this.apiUser,
            headers: {
                "Cookie": _this._cookies,
                'User-Agent': _this.userAgent,
                "Connection": "Keep-Alive"
            },
            forever: true,
            pool: {
                maxSockets: Infinity
            }
        };

        request(opts, function (err, httpResponse, body) {
            if (err) return reject("Error on received Data...");

            try {
                body = JSON.parse(body);
                var _id = body['account']['id']
                if (_id) {
                    return resolve();
                } else {
                    return reject("Cookies are expired");
                }
            } catch (e) {
                return reject("Failed Authentication");
            }
        })
    })
}

fileUpload.prototype.getServer = function () {
    var _this = this;
    return new Promise(function (resolve, reject) {
        request({ uri: _this.uploadserver }, function (err, httpResponse, body) {
            if (err) return reject('Server Unavailable');

            if (httpResponse.statusCode != 200) {
                _fetchTime = setTimeout(function () {
                    return _this.getServer();
                }, 3000)
            } else {
                var _url = body || '';
                if (_url.match(/^(http(s)?):\/\//ig)) {
                    _this.uploadserverURL = _url;
                    resolve(body);
                } else {
                    _fetchTime = setTimeout(function () {
                        return _this.getServer();
                    }, 3000)
                }
            }
        })
    })
}

fileUpload.prototype.fixLink = function (data) {
    var _this = this;
    return data ? 'http://uploaded.net/file/' + data.trim() : null;
};

fileUpload.prototype.send = function () {
    var _this = this;
    return new Promise(function (resolve, reject) {

        if (_this._fetchTime) {
            clearTimeout(_this._fetchTime);
        }

        if (!_this._username || !_this._password) return reject("*Please verify your credentials.");
        var fileStream = fs.createReadStream(_this.filePath);

        var editKey = init.generate(6);
        var folder = "&folder=0";
        var urlUpload = _this.uploadserverURL + "upload?admincode=" + editKey + _this.authString + folder;

        var opts = {
            method: 'POST',
            url: urlUpload,
            headers: {
                'Cookie': _this._cookies,
                'User-Agent': _this.userAgent,
                'X-Requested-With': 'XMLHttpRequest',
                'Host': _this.host,
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
                /*  
                // compressed data as it is received:
                Received ivmehkz8,0
                ******
                */
                if (!data) {
                    return reject("Cannot find upload link.");
                } else if (data == 'forbidden' || data.split(',').length <= 1) {
                    return reject("'Can\'t Find Any Download Link On Response'.");
                } else {
                    var error = null;
                    try {
                        var _id = data.split(',')[0];
                        _this.link = `http://uploaded.net/file/${_id}`;
                    } catch (e) {
                        error = "Error parsing Received Data";
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
        form.append('Filedata', fileStream, { filename: _this.filenameRD });
        form.append('Filename', _this.filenameRD);
        form.append('Upload', "Submit Query");
        form.append('id', "file0");

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
        return _this.getServer();
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