const init = require('../../config/init');
const Hosts = require('../../models/hosts');
const notifier = require('../notifier');
const md5File = require('md5-file')


const fs = require('fs');
const request = require('request');

const Queue = require('bull');
const uploadQueue = new Queue('uploadQueue');


var fileUpload = function (job, io) {
    if (!(this instanceof fileUpload)) return new fileUpload(job, io);

    this.job = job;
    this.io = io || global.io;

    this._token = global._token['rapidgator.net'];
    this._retry = global._retry['rapidgator.net'] = !global._retry['rapidgator.net'] ? 0 : global._retry['rapidgator.net'];

    this.formLogin = "https://rapidgator.net/api/v2/user/login";
    this.uploadParse = "https://rapidgator.net/api/v2/file/upload";
    this.uploadInfo = "https://rapidgator.net/api/v2/file/upload_info";

    this.server = 'rapidgator.net';
    this.host = 'rapidgator.net';
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
    this.size = 0;
    this.fileStat = {};
    this.link = infos.link;
    this.error = infos.error;
    this._hash = null;
    this.uploadServer = null;
    this.uploaded = 0;
    this.useAccount = true;
    this.time_start = (new Date()).getTime();

    this._aborted = false;

}

fileUpload.prototype.datainit = function () {
    var _this = this;
    return new Promise(function (resolve, reject) {
        Hosts.findOne({
            'server': _this.server
        }, 'data', function (err, _result) {
            if (err || !_result) return reject('Cannot find Host data, Verify the host account.');

            var result = _result.data || {};
            _this._email = result.email;
            _this._password = result.password;

            if (result.use_account == false || !_this._email || !_this._password) {
                return reject("*Please verify your credentials.");
            } else {
                if (_this._token != null) {
                    _this._inUploadData().then(resolve).catch(function () {
                        _this._token = global._token['rapidgator.net'] = null;
                        return _this._inToken().then(function () {
                            return _this._inUploadData();
                        }).then(resolve).catch(reject);
                    });

                } else {
                    if (this._retry >= 3) {
                        setTimeout(function () {
                            this._retry = global._retry['rapidgator.net'] = 0;
                        }, 20000)
                        return reject("Too many wrong passwords. The password brute-force protection will block the IP, wait 20 secondes and retry");
                    } else {
                        _this._inToken().then(function () {
                            return _this._inUploadData();
                        }).then(resolve).catch(reject);
                    }
                }
            }
        })
    })
}

fileUpload.prototype._inUploadData = function () {
    var _this = this;
    return new Promise(function (resolve, reject) {
        var formData = {
            token: _this._token,
            name: _this.filename, 
            hash: _this._hash,
            size: _this.size
        };

        var opts = {
            method: 'POST',
            url: _this.uploadParse,
            formData: formData,
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.12; rv:49.0) Gecko/20100101 Firefox/49.0",
                "Host": "rapidgator.net",
                'cache-control': 'no-cache',
                "Connection": "keep-alive"
            }
        };

        request(opts, function (err, response, body) {
            if (err) return reject('Test Server is down...');

            body = JSON.parse(body);

            if (body && body.status != 200) {
                var _error = body['details'];
                _error = _error.replace(/error(\:)?/i, '');
                return reject(_error);
            }

            try {
                var upl = body['response']['upload'] || {};

                if (upl['state'] == 2) {
                    _this.link = upl['file']['url'];
                    return resolve();
                } else {
                    _this.upload_id = upl['upload_id'];
                    _this.uploadServer = upl['url'];
                    return resolve();
                }
            } catch (e) {
                return reject();
            }
        })
    })
}

fileUpload.prototype._inToken = function () {
    var _this = this;
    return new Promise(function (resolve, reject) {
        var formData = {
            login: _this._email,
            password: _this._password
        };

        var opts = {
            method: 'POST',
            url: _this.formLogin,
            formData: formData,
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.12; rv:49.0) Gecko/20100101 Firefox/49.0",
                "Host": "rapidgator.net",
                'cache-control': 'no-cache',
                "Connection": "keep-alive"
            }
        };

        request(opts, function (err, response, body) {
            if (err || response.statusCode != 200) {
                return reject("Please verify Rapidgator, maybe is down!")
            }

            body = JSON.parse(body);
            _this._token = global._token['rapidgator.net'] = body && body['response'] != null ? body['response']['token'] : null;
            if (!_this._token) {
                this._retry = global._retry['rapidgator.net'] = this._retry++;
                return reject("*Error: Login or password is wrong")
            } else {
                this._retry = global._retry['rapidgator.net'] = 0;
                return resolve();
            }
        })

    })
}

fileUpload.prototype.initMD5 = function () {
    var _this = this;
    return new Promise(function (resolve, reject) {
        if (!_this.filePath) return reject('File does not exist..');
        fs.stat(_this.filePath, function (err, stats) {
            if (err) return reject('Cannot calculate size...');
            _this.size = stats.size;
            md5File(_this.filePath, (err, hash) => { 
                if (err) return reject('Cannot find Hash...');
                _this._hash = hash;
                resolve();
            })
        });
    })
}

fileUpload.prototype._getLink = function () {
    var _this = this;
    return new Promise(function (resolve, reject) {

        var formData = {
            token: _this._token,
            upload_id: _this.upload_id
        };

        var opts = {
            method: 'POST',
            url: _this.uploadInfo,
            headers: {
                'User-Agent': _this.userAgent,
                "Content-Type": "multipart/form-data",
                "Connection": "Keep-Alive"
            },
            formData: formData
        };

        request(opts, function (err, response, body) {
            if (err || response.statusCode != 200) {
                return reject("Can't find link, it's lost, please retry after a while!");
            }

            body = JSON.parse(body);

            var _res = body ? body['response'] : {};
            try {
                var _upload = _res['upload'];
                var _state = _upload['state'];
            } catch (e) {
                var _state = 3;
                var _upload = {};
            }

            if (_state == 1) {
                _this.timeFetch = setTimeout(function () {
                    return _this._getLink().then(resolve).catch(reject);
                }, 8000)
            } else if (_state == 3) {
                return reject("Upload Failed...");
            } else {
                clearTimeout(_this.timeFetch);
                try {

                    _this.link = _upload['file']['url'] || "";
                    if (!_this.link.match(/^(http(s)?):\/\//ig)) {
                        return reject("Invalid Link type..");
                    } else {
                        return resolve();
                    }
                } catch (e) {
                    return reject("Upload Link is Lost, please retry after a while.");
                }
            }
        })
    })
}

fileUpload.prototype.send = function () {
    var _this = this;
    return new Promise(function (resolve, reject) {

        if (_this._aborted == true) return reject('Upload Cancelled.');

        if (!_this._email || !_this._password) return reject("*Please verify your credentials.");

        if (!_this.upload_id && !_this.uploadServer && _this.link) {

            if (_this.intID) {
                clearInterval(_this.intID);
            }
            return resolve();

        } else if (!_this.uploadServer) {
            _this._token = global._token['rapidgator.net'] = null;
            return reject('No upload server Found');
        }

        var fileStream = fs.createReadStream(_this.filePath);

        var opts = {
            method: 'POST',
            url: _this.uploadServer,
            headers: {
                'User-Agent': _this.userAgent,
                "Content-Type": "multipart/form-data",
                "Connection": "Keep-Alive"
            },
            forever: true,
            pool: {
                maxSockets: Infinity
            }
        };


        var r = request(opts).on('error', function (error) {
            if (error && error.code == 'ENOENT') return reject('File Check Error.');
            if (error && error.code == 'ECONNRESET') return reject('Upload Aborted (Request Closed).'); 
        }).on('end', function (data) {
            _this._getLink().then(resolve).catch(reject)
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
        form.append('file', fileStream, {
            filename: _this.filenameRD
        });

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

    _this.initMD5().then(function () {
        return uploadQueue.getJob(_this.jobId);
    }).then(function (_job) {
        if (!_job) {
            _this._aborted = true;
            return;
        } else {
            return _this.datainit();
        }
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