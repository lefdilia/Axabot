const init = require('../../config/init');
const Hosts = require('../../models/hosts');
const notifier = require('../notifier');


const fs = require('fs');
const request = require('request');
const mime = require('mime-types')

const Queue = require('bull');
const uploadQueue = new Queue('uploadQueue');

var fileUpload = function (job, io) {
    if (!(this instanceof fileUpload)) return new fileUpload(job, io);

    this.job = job;
    this.io = io || global.io;

    this._videoServer = "https://api.saruch.co/videos";
    this._tokenServer = "https://api.saruch.co/auth/login";

    this.server = 'saruch.co';
    this.host = 'saruch.co';
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

    this.uploadServer = null;
    this.apptype = null;
    this.upload_info = null;

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
            _this._email = result.email;
            _this._password = result.password;

            if (result.use_account == false || !_this._email || !_this._password) {
                return reject("*Please verify your credentials.");
            } else {
                _this.generateToken().then(resolve).catch(reject);
            }
        })
    })
}

fileUpload.prototype.generateToken = function () {
    var _this = this;
    return new Promise(function (resolve, reject) {

        var options = {
            method: 'POST',
            url: _this._tokenServer,
            qs: {
                email: _this._email,
                password: _this._password
            },
            headers:
            {
                'cache-control': 'no-cache',
                'User-Agent': _this.userAgent,
                'Connection': 'keep-alive'
            }, json: true
        };

        request(options, function (error, response, _json) {
            if (error || !_json || typeof _json != 'object' || _json.ok == false || response.statusCode != 200) return reject('Error generate Token..');

            _this._token = _json.access_token;

            return resolve();
        })
    })
}

fileUpload.prototype._createObject = function () {
    var _this = this;
    return new Promise(function (resolve, reject) {

        _this._mimeType = mime.lookup(_this.filePath);
        fs.stat(_this.filePath, function (err, stats) {
            _this._csize = !err ? stats.size : 0;
            return resolve();
        });
    })
}

fileUpload.prototype._createVideo = function () {
    var _this = this;
    return new Promise(function (resolve, reject) {

        var options = {
            method: 'POST',
            url: _this._videoServer,
            qs: {
                name: _this.filenameRD,
                size: _this._csize,
                mime_type: _this._mimeType,
            },
            headers: {
                "Authorization": `Bearer ${_this._token}`
            }
            , json: true
        };

        request(options, function (err, response, body) {

            if (err || response.statusCode != 200) {
                return reject(`Please verify ${_this.host} maybe is down!`)
            }

            if (typeof body !== 'object') {
                return reject(`Please verify your access on ${_this.host}!`)
            }

            try {
                var _id = body['video']['id'];
                var _server = body['server'];

                if (!_id || _id == "") {
                    return reject(`No Video ID created. Please try in a while.`);
                } else if (!_server || _server == "") {
                    return reject(`No Upload Server Found. Please try in a while.`);
                } else {
                    _this.uploadServer = _server;
                    _this._videoID = _id;
                    return resolve();
                }
            } catch (e) {
                return reject(`Invalid Reponse from ${_this.host}...`);
            }

        })
    })
}

fileUpload.prototype.send = function () {
    var _this = this;
    return new Promise(function (resolve, reject) {

        if (!_this._token) return reject("*Can't Find the generated Token. Please verify your Username and Password.");
        if (!_this.uploadServer) return reject('No upload server Found');

        var fileStream = fs.createReadStream(_this.filePath);

        var opts = {
            method: 'POST',
            url: _this.uploadServer,
            headers: {
                "Content-Type": "multipart/form-data",
                "Authorization": `Bearer ${_this._token}`
            },
            forever: true,
            pool: {
                maxSockets: Infinity
            }
        };

        var r = request(opts).on('error', function (error) {
            if (error && error.code == 'ENOENT') return reject('File Check Error.');
            if (error && error.code == 'ECONNRESET') return reject('Upload Aborted (Request Closed).'); 

            //Not Defined Error
            if (error) return reject('Host reject Upload with \"Internal error, please retry\".'); 

        }).on('end', function () {
            if (_this.intID) {
                clearInterval(_this.intID);
            }
            r.agent.destroy();
        }).on('response', function (response) {
           
            response.on('data', function (_result) {
                _result = _result ? _result.toString() : null;

                if (!_result) return reject("Host reject Upload with \"Internal error, please retry\" ");

                try {
                    _result = JSON.parse(_result);
                    var _status = _result['finished'] || 0;
                    if (_status !== 1) return reject("Upload Failed");
                    _this.link = `https://saruch.co/videos/${_this._videoID}/`;
                    return resolve();
                } catch (e) {
                    return reject("Error parsing Received Data");
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
        form.append('video_id', _this._videoID);
        form.append('upload_type', 'resumeable');
        form.append('video', fileStream, {
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

    _this.datainit().then(function () {
        return _this._createObject();
    }).then(function () {
        return _this._createVideo();
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