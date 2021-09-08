const init = require('../../config/init');
const Hosts = require('../../models/hosts');
const notifier = require('../notifier');


const fs = require('fs');
var request = require('request');
const cheerio = require('cheerio');

const Queue = require('bull');
const uploadQueue = new Queue('uploadQueue');


var fileUpload = function (job, io) {
    if (!(this instanceof fileUpload)) return new fileUpload(job, io);

    this.job = job;
    this.io = io || global.io;

    this._cookies = global._cookies ? global._cookies['1fichier.com'] : (global._cookies = {});
    this.formLogin = "https://1fichier.com/login.pl";
    this.actionUrl = "http://up2.1fichier.com/upload.cgi?id=";
    this.finishedUrl = "http://up2.1fichier.com/end.pl?xid=";

    this.server = '1fichier.com';
    this.host = '1fichier.com';
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

            var formData = {
                mail: _this._email,
                pass: _this._password,
                lt: "checked",//on
                purge: "checked",//on
                valider: "Send",
            };

            if (!_this._email || !_this._password) return reject("Please verify Username & Password.");

            var j = request.jar();

            request.post({
                url: _this.formLogin,
                formData: formData,
                jar: j,
                followAllRedirects: true
            }, function optionalCallback(err, httpResponse, body) {
                if (err || !body) return reject("Cannot Connect to this Host, Please verify Username & Password.");

                const cookie_string = j.getCookieString(_this.formLogin);
                _this._cookies = global._cookies['1fichier.com'] = cookie_string || {};

                if (cookie_string.match(/SID\=/)) {
                    return resolve();
                } else {
                    return reject("Cannot Connect to this Host, Please verify Username & Password.");
                }
            })
        })
    })
}



fileUpload.prototype.generate = function (len) {
    var pwd = '';
    var con = new Array('b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'w', 'x', 'y', 'z');
    var voc = new Array('a', 'e', 'i', 'o', 'u');

    for (i = 0; i < len / 2; i++) {
        var c = Math.ceil(Math.random() * 1000) % 20;
        var v = Math.ceil(Math.random() * 1000) % 5;
        pwd += con[c] + voc[v];
    }
    return pwd;
};



fileUpload.prototype.send = function () {
    var _this = this;
    return new Promise(function (resolve, reject) {

        if (!_this._email || !_this._password) return reject("*Please verify your credentials.");

        var fileStream = fs.createReadStream(_this.filePath);

        _this.editKey = _this.generate(10);
        _this.uploadServer = _this.actionUrl + _this.editKey;

        var opts = {
            method: 'POST',
            url: _this.uploadServer,
            headers: {
                'Cookie': _this._cookies,
                'X-Requested-With': 'XMLHttpRequest',
                'X-Id': '' + _this.editKey + '',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.12; rv:49.0) Gecko/20100101 Firefox/49.0',
                'Referer': 'https://1fichier.com/',
                'Host': 'up2.1fichier.com',
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
            var finalUrl = _this.finishedUrl + _this.editKey;
            request.get({
                method: 'GET',
                url: finalUrl
            }, function optionalCallback(err, response, data) {
                if (err || response.statusCode != 200) return reject('Maybe Host is Down, can\'t get the Link...');

                $ = cheerio.load(data);

                if (!data) {
                    return reject("Cannot find upload link.");
                } else {
                    var error = null;
                    try {
                        _this.link = $('.premium a').attr('href');
                    } catch (e) {
                        error = "Error parsing Received Data";
                    }

                    if (error) {
                        return reject(error);
                    } else if (_this.link && !_this.link.match(/^(http(s)?):\/\//ig)) {
                        return reject("Invalid Url type..");
                    } else {
                        if (_this.intID) {
                            clearInterval(_this.intID);
                        }
                        r.agent.destroy();
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
        form.append('file[]', fileStream, { filename: _this.filenameRD });
        form.append('submit', "Send");
        form.append('id', "files");

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