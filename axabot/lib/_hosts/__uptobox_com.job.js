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

    this._cookies = global._cookies ? global._cookies['uptobox.com'] : (global._cookies = {});
    this.formLogin = "https://uptobox.com/?op=login";

    this.serverSite = 'https://uptobox.com/';
    this.server = 'uptobox.com';
    this.host = 'uptobox.com';
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
    this.link = null;
    this.error = null;
    this.uploadServer = null;
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
                var opts = {
                    method: 'GET',
                    url: _this.serverSite,
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.12; rv:49.0) Gecko/20100101 Firefox/49.0",
                        "Host": _this.host,
                        "Referer": "homepage",
                        "cache-control": "no-cache",
                        "Cookie": ""
                    },
                    followAllRedirects: true
                };

                request(opts, function (err, response, body) {
                    if (err || response.statusCode != 200) {
                        return reject("Cannot Find free server (Use Personal account)")
                    }

                    var uploadServer = body.match(/action=\"(.*?)\"/);
                    _this.uploadServer = uploadServer ? uploadServer[1].replace(/^\/\//ig, 'https://') : null;

                    if (!_this.uploadServer) {
                        return reject("Cannot Find free server (Use Personal account)")
                    } else {
                        return resolve();
                    }
                })
            } else {

                var formData = {
                    login: _this._username,
                    password: _this._password,
                    op: "login"
                };

                //We test first the cookie before parsing new One
                var opts = {
                    method: 'GET',
                    url: _this.serverSite,
                    qs: {
                        op: 'login'
                    },
                    headers: {
                        "cache-control": "no-cache",
                        Cookie: _this._cookies
                    }
                };

                request(opts, function (err, response, body) {
                    if (err) body = "";

                    var userLog = body ? body.match(/\?sess_id/ig) : null;
                    if (userLog) {
                        //Connected
                        var uploadServer = body.match(/action="(.*?)"/);
                        _this.uploadServer = uploadServer ? uploadServer[1].replace(/^\/\//ig, 'https://') : null;
                        return resolve();
                    } else {
                        var j = request.jar();

                        if (!formData || !_this._username || !_this._password) return reject("Please verify Username & Password.");

                        request.post({
                            url: _this.formLogin,
                            formData: formData,
                            headers: {
                                "X-Requested-With": "XMLHttpRequest",
                                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.12; rv:49.0) Gecko/20100101 Firefox/49.0",
                                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                                "Host": _this.host,
                                "Referer": "homepage"
                            },
                            jar: j,
                            followAllRedirects: true
                        }, function optionalCallback(err, httpResponse, body) {
                            if (err) body = null;

                            const cookie_string = j.getCookieString(_this.formLogin); 
                            _this._cookies = global._cookies['uptobox.com'] = cookie_string || {};

                            var userLog = body ? body.match(/\?sess_id/ig) : null;

                            if (userLog) {
                                var uploadServer = body.match(/action=\"(.*?)\"/);
                                _this.uploadServer = uploadServer ? uploadServer[1].replace(/^\/\//ig, 'https://') : null;
                                return resolve();
                            } else {
                                return reject("Cannot Connect to this Host, Please verify Username & Password.");
                            }
                        })
                    }
                })
            }
        })
    })
}


fileUpload.prototype.send = function () {
    var _this = this;
    return new Promise(function (resolve, reject) {

        if (!_this._username || !_this._password) return reject("*Please verify your credentials.");

        var fileStream = fs.createReadStream(_this.filePath);

        var opts = {
            method: 'POST',
            url: _this.uploadServer,
            headers: {
                "Cookie": _this._cookies,
                "User-Agent": _this.userAgent,
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
                        data = data.files ? data.files[0] : {};
                        _this.link = data['url'];
                    } catch (e) {
                        error = "Error parsing Received Data";
                    }

                    if (data['error']) {
                        return reject("Host reject Upload with \"Internal error, please retry\" ");
                    } else if (error) {
                        return reject(error);
                    } else if (_this.link && !_this.link.match(/^(http(s)?):\/\//ig)) {
                        return reject("Invalid Url type..");
                    } else if (_this.link && _this.link.match(/^(http(s)?):\/\//ig)) {
                        return resolve();
                    } else {
                        return reject("Upload link is lost. Please retry after a while.");
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
        _this.est = 0;
        _this.uploaded = 0;
        _this.progress = 0;
        _this.size = 0;
        _this.intID;

        var form = r.form();
        form.append('files[]', fileStream, {
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
            _this.uploaded += data.length;

            var toSoFar = (((new Date()).getTime() - time_start) * 0.001).toFixed(3);
            fspeed = Math.round(_this.uploaded / toSoFar);
            festim = Math.round(((_this.size - _this.uploaded) * toSoFar) / _this.uploaded);
            _this.est = init.convertSeconds(festim);

            if (fspeed > _this.size) {
                fspeed = data.length;
            }

            _this.fspeed = init.bytesToSize(fspeed).all + '/s';
            _this.bulklng = init.bytesToSize(_this.uploaded).all;

            progress = ((_this.uploaded / _this.size) * 100);
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