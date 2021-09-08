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

    this._server = "https://api.vidoza.net/v1/upload/http/server";

    this.server = 'vidoza.net';
    this.host = 'vidoza.net';
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
            _this._token = result.token;

            if (result.use_account == false || !_this._token) {
                return reject("*Please verify your credentials.");
            } else {
                _this._getServer().then(resolve).catch(reject);
            }
        })
    })
}


fileUpload.prototype._getServer = function () {
    var _this = this;
    return new Promise(function (resolve, reject) {
        var opts = {
            method: 'GET',
            url: _this._server,
            timeout: 10000,
            headers: {
                'Accept': 'application/json',
                'cache-control': 'no-cache',
                'Authorization': `Bearer ${_this._token}`
            },
            json: true
        };

        request(opts, function (err, response, body) {
            if (!err && response.statusCode !== 200) {
                return reject(`${_this.host} is down!. Server return ${response.statusCode} Status-Code `)
            }

            if (err) {
                return reject(`Please verify ${_this.host} maybe is down!.`)
            }

            if (typeof body !== 'object') {
                return reject(`Please verify your access on ${_this.host}!`)
            }

            try {
                var _data = body['data'];
                var _url = _data['upload_url'];
                var _sess_id = _data['upload_params']['sess_id'];
                var _is_xhr = _data['upload_params']['is_xhr'];

                if (!_url) {
                    return reject(`No server provided by ${_this.host}..`);
                } else if (!_sess_id) {
                    return reject(`No Session found.`);
                } else if (!_url.match(/^(http(s)?):\/\//ig)) {
                    return reject("Invalid Link type..");
                } else {
                    _this.uploadServer = _url;
                    _this._sess_id = _sess_id;
                    _this._is_xhr = _is_xhr;
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

        if (!_this._token) return reject("*Please verify API-Key.");
        if (!_this.uploadServer) {
            return reject('No upload server Found');
        }

        var fileStream = fs.createReadStream(_this.filePath);

        var opts = {
            method: 'POST',
            url: _this.uploadServer,
            headers: {
                "cache-control": "no-cache",
                "Content-Type": "multipart/form-data"
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

                const $ = cheerio.load(_result)
                const _code = $('textarea[name=fn]').val();

                try {
                    if (/500 ERROR/i.test(_result)) {
                        return reject("Vidoza has Internal Server Error.");
                    } else if (!_code || _code == "") {
                        return reject("Invalid Upload Code.");
                    } else {
                        _this.link = `https://vidoza.net/${_code}.html`;
                        return resolve();
                    }
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
        form.append('sess_id', _this._sess_id);
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