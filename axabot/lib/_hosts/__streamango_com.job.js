const init = require('../../config/init');
const Hosts = require('../../models/hosts');
const notifier = require('../notifier');


const fs = require('fs');
const request = require('request');
const hashFiles = require('hash-files');
const detect = require('detect-file-type');

const Queue = require('bull');
const uploadQueue = new Queue('uploadQueue');


var fileUpload = function (job, io) {
    if (!(this instanceof fileUpload)) return new fileUpload(job, io);

    this.job = job;
    this.io = io || global.io;
    this.uploadInfo = "https://api.fruithosted.net/file/ul";

    this.server = 'streamango.com';
    this.host = 'streamango.com';
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


    this.allowedMime = ['video/x-matroska', 'video/mp4', 'video/x-msvideo', 'video/quicktime', 'video/x-ms-wmv', 'application/x-mpegURL']


    this.uploadServer = null;
    this.SHA1 = null;

    this.uploaded = 0;
    this.useAccount = true;
    this.time_start = (new Date()).getTime();

}

fileUpload.prototype._getServer = function () {
    var _this = this;
    return new Promise(function (resolve, reject) {

        if (!_this.SHA1) return reject('Can\'t fetch server without SHA1.');
        _this.uploadInfo = `${_this.uploadInfo}?login=${_this._apilogin}&key=${_this._apikey}&sha1=${_this.SHA1}`;

        var opts = {
            method: 'GET',
            url: _this.uploadInfo,
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.12; rv:49.0) Gecko/20100101 Firefox/49.0"
            }
        };

        request(opts, function (err, response, body) {
            if (err || response.statusCode != 200) {
                return reject(`Please verify ${_this.host} maybe is down!`)
            }

            try {
                body = JSON.parse(body);

                var _result = body['result'];
                var _url = _result['url'];

                if (body && body.status != 200 || !_result) {
                    return reject(`No server provided by ${_this.host}..`);
                } else if (!_url.match(/^(http(s)?):\/\//ig)) {
                    return reject("Invalid Link type..");
                } else {
                    _this.uploadServer = _url;
                    return resolve();
                }

            } catch (e) {
                return reject(`Invalid Reponse from ${_this.host}...`);
            }

        })
    })
}

// MP4. MP4. FLV. AVI
fileUpload.prototype.initSHA1 = function () {
    var _this = this;
    return new Promise(function (resolve, reject) {
        if (!_this.filePath) return reject('File does not exist..');

        detect.fromFile(_this.filePath, function (err, result) {
            if (err || !result) return reject("Maybe file is corrupted, Can\'t Test File Type.");//allowedMime
            var mime = result.mime || "";
            mime = mime.toLowerCase();

            if (_this.allowedMime.indexOf(mime) == -1) {
                return reject(`File type not allowed on server ${mime}`);
            }

            hashFiles({ files: [_this.filePath] }, function (error, hash) {
                if (error) return reject('Can\'t calculate Sha1 of the file..');
                _this.SHA1 = hash;
                resolve();
            });

        });
    })
}

fileUpload.prototype.datainit = function () {
    var _this = this;
    return new Promise(function (resolve, reject) {
        Hosts.findOne({
            'server': _this.server
        }, 'data', function (err, _result) {
            if (err || !_result) return reject('Cannot find Host data, Verify the host account.');

            var result = _result.data || {};
            _this._apilogin = result.apilogin;
            _this._apikey = result.apikey;

            if (result.use_account == false || !_this._apilogin || !_this._apikey) {
                return reject("*Please verify your credentials.");
            } else {
                _this._getServer().then(resolve).catch(reject);
            }
        })
    })
}

fileUpload.prototype.send = function () {
    var _this = this;
    return new Promise(function (resolve, reject) {

        if (!_this.SHA1) return reject("*Please verify the file you want to upload, SHA1 is missing.");
        if (!_this.uploadServer) {
            return reject('No upload server Found');
        }

        const mUrl = new URL(_this.uploadServer);
        const _host = mUrl.hostname;

        var fileStream = fs.createReadStream(_this.filePath);

        var opts = {
            method: 'POST',
            url: _this.uploadServer,
            headers: {
                'Host': _host,
                'User-Agent': _this.userAgent,
                'Content-Type': 'multipart/form-data',
                'Connection': 'Keep-Alive'
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
                        _result = data['result'];
                        _url = _result['url'];
                    } catch (e) {
                        error = "Error parsing Received Data";
                    }

                    if (data && data['status'] != 200) {
                        return reject("Host reject Upload with 'Internal error, please retry' ");
                    } else if (error) {
                        return reject(error);
                    } else if (!_url || !_url.match(/^(http(s)?):\/\//ig)) {
                        return reject("Invalid Url type..");
                    } else {
                        _this.link = _url;
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
        form.append('file1', fileStream, {
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

    _this.initSHA1().then(function () {
        return _this.datainit();
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