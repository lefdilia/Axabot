const init = require('../config/init');

const { eachSeries } = require('async');
const { spawn } = require('child_process');
const { exec } = require('child_process');
const Preferences = require('../models/preferences');
const Statistics = require('../models/statistics');
const Users = require('../models/user');

const path = require('path');
const rimraf = require('rimraf');
const pm2 = require('pm2');

const timeago = require("timeago.js");
const mongoose = require('mongoose');

const { diskinfo } = require('@dropb/diskinfo');
const pidusage = require('pidusage')
const os = require('os')



function systemInfos(opts, done) {
    opts = opts || {};
    var _s = opts._s || '';
    var _sdata = { service: _s };

    var rgx = new RegExp(/[\s+0-9-:]+/, 'ig');

    const service = spawn('systemctl', [
        'show', '--property', 'MainPID,SubState,ActiveState,ActiveEnterTimestamp', '--value', _s
    ]);

    service.stdout.on('data', (data) => {
        data = data ? data.toString() : '';
        data = data.trim();
        data = data.split('\n');

        _sdata['pid'] = data[0] || '0';
        _sdata['type'] = data[1] || 'inactive';
        _sdata['status'] = data[2] || 'dead';
        var adata = data[3] ? data[3].match(rgx).toString().trim() : null;
        _sdata['runtime'] = adata && _sdata['status'] && _sdata['status'] != 'dead' ? timeago.format(new Date(adata)) : '';
    });

    service.on('close', (code) => {
        return done(null, _sdata);
    });
}

var findPreferences = function (callback) {
    Preferences.findOne({}, function (err, result) {
        if (err) return callback(null, []);

        var _extra = result && result['extra'] || {};

        var _obj = {};
        _obj['vsftpd'] = _extra['vsftpd'];
        _obj['rtorrent'] = _extra['rutorrent'];
        _obj['bot'] = _extra['axabot']

        var _mName = init.name || 'AxaBot';

        pm2.describe(_mName, function (err, processDescription) {
            if (err) processDescription = [{}];

            processDescription = Array.isArray(processDescription) ? processDescription[0] : processDescription;

            var _b_pid = processDescription ? processDescription.pid : 0;
            var _b_status = processDescription && processDescription.pm2_env.status ? processDescription.pm2_env.status : 'stopped';
            var _b_runtime = processDescription && processDescription.pm2_env.pm_uptime ? timeago.format(processDescription.pm2_env.pm_uptime) : '';

            _obj['bot'] = { ..._obj['bot'], ...{ service: 'axabot', pid: _b_pid, type: 'active', status: _b_status, runtime: _b_runtime } };

            eachSeries(['rtorrent', 'vsftpd'], function (service, next) {
                systemInfos({ _s: service }, function (err, _sdata) {
                    if (err) return next();
                    _obj[service] = { ..._obj[service], ..._sdata };
                    next()
                })
            }, function () {
                getStatistics(function (err, _stats) {
                    return callback(null, {
                        prefs: _obj,
                        stats: _stats,
                    });
                })

            })
        });
    });
}

var getPassword = function (opts) {
    return new Promise(function (resolve, reject) {
        opts = opts || {};
        var type = opts.type;
        var _lpassword = {};

        Preferences.findOne({}, function (err, result) {
            if (err) return reject('Can\'t Find Password.');

            try {
                var _extra = result.extra;

                if (type == 'ftp') {
                    _lpassword = _extra.vsftpd;
                } else if (type == 'rutorrent') {
                    _lpassword = _extra.rutorrent;
                } else if (type == 'bot') {
                    _lpassword = _extra.axabot;
                }
            } catch (e) {
                _lpassword = {}
                return reject('Can\'t Find Password.');
            }
            return resolve(_lpassword);
        })
    })
}

var resetPassword = function (opts) {
    return new Promise(function (resolve, reject) {
        opts = opts || {};
        var type = opts.type;

        var _KeyT;

        switch (type) {
            case 'ftp':
                _KeyT = 'vsftpd';
                break;

            case 'rutorrent':
                _KeyT = 'rutorrent';
                break;

            case 'bot':
                _KeyT = 'axabot';
                break;

            default:
                _KeyT = null;
                break;
        }

        if (!_KeyT) return reject("Type is missing...");

        var _newPassword = init.randPassword(6, 2);

        Preferences.findOne({}, function (err, prefs) {
            if (err) return reject("Error finding preferences...");

            prefs.extra[_KeyT].password = _newPassword;
            var _nuser = prefs.extra[_KeyT].username;

            prefs.markModified('extra');

            var _updateFunc = null;

            if (_KeyT == 'vsftpd') _updateFunc = updateftpPassword;
            if (_KeyT == 'rutorrent') _updateFunc = updateRutorrentPassword;
            if (_KeyT == 'axabot') _updateFunc = UpdateBotPassword;

            if (!_updateFunc) return reject('Invalid Type...');

            _updateFunc({
                username: _nuser,
                password: _newPassword
            }, function (err) {
                if (err) return reject("Can't reset Password.");

                prefs.save(function (err, doc) {
                    if (err) return reject("Can't reset password...");
                    return resolve(_newPassword);
                })
            })
        })
    })
}

var getDiskUsage = function (opts) {
    return new Promise(function (resolve, reject) {

        opts = opts || {};

        var _path = init.dir_base;
        var _sdisk = {}
        diskinfo(_path).then(function (info) {
            _sdisk['size'] = init.bytesToSize(info.size).all;
            _sdisk['used'] = init.bytesToSize(info.used).all;
            _sdisk['available'] = init.bytesToSize(info.avail).all;
            _sdisk['percent'] = info.pcent;
            return resolve(_sdisk);
        }).catch(function (err) {
            return resolve(_sdisk);
        });
    })
}

var getMemoryUsage = function (opts) {
    return new Promise(function (resolve, reject) {
        opts = opts || {};

        var _pid = opts._pid;
        if (!_pid) return reject('No Process Found');

        var _smemory = {};
        var total_memory = os.totalmem();

        pidusage(_pid, function (err, stats) {

            _smemory['cpu'] = `${Math.ceil(stats.cpu)}%`;
            _smemory['used'] = init.bytesToSize(stats.memory).all;
            _smemory['total'] = init.bytesToSize(total_memory, { ceil: true }).all;

            return resolve(_smemory);
        })
    })
}

/*
TX and RX are abbreviations for Transmit and Receive, respectively.Transmit FROM this server, and Receive TO this server.
Units are in Bytes (not bits)
*
* Vnstat : All traffic values in the output are in KiB
*
*/
var getBandwithUsage = function (opts) {
    return new Promise(function (resolve, reject) {
        opts = opts || {};

        var _month = opts.m ? parseInt(opts.month) : (new Date()).getMonth();
        var _year = opts.y ? parseInt(opts.year) : (new Date).getFullYear();

        var arrMonth = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        var _sdata = {};
        var args = [
            '--json'
        ];

        const service = spawn('vnstat', args);

        var _Data = "";

        service.stdout.on('data', (data) => {
            data = data ? data.toString() : '';
            _Data += data;
        })


        service.on('close', (code) => {

            var data = JSON.parse(_Data);
            data = data['interfaces'];

            data = Array.isArray(data) ? data[0] : data;

            var _obj = {};
            _obj['total'] = data['traffic']['total'];

            var _traffic = data['traffic']['months'];

            _sdata = _traffic.filter(function (_obj) {
                return _obj.date.year == _year && _obj.date.month == (_month + 1)
            }).map(function (_item) {

                var _tx = _item.tx * 1024;
                var _rx = _item.rx * 1024;
                var _bdtotal = (_item.tx + _item.rx) * 1024;

                return {
                    percent: _tx,
                    total: init.bytesToSize(_bdtotal).all,
                    upload: init.bytesToSize(_tx).all,
                    download: init.bytesToSize(_rx).all,
                    _date: `${arrMonth[_month]} ${_year}`,
                    month: arrMonth[_month],
                    year: _year
                }
            })

            _sdata = Array.isArray(_sdata) ? _sdata[0] : _sdata;
            return resolve(_sdata);
        });
    });

}

var getStatistics = function (done) {

    var _rt = {}
    getBandwithUsage().then(function (_sdata) {
        _rt['bandwidth'] = _sdata;
        return getDiskUsage();
    }).then(function (_sdisk) {
        _rt['disk'] = _sdisk;
        return getMemoryUsage({ _pid: process.pid });
    }).then(function (_smemory) {
        _rt['memory'] = _smemory;

        Statistics.findOneAndUpdate({}, {
            $set: {
                bandwidth: {
                    total: _rt['bandwidth'].total,
                    upload: _rt['bandwidth'].upload,
                    download: _rt['bandwidth'].download
                },
                disk: {
                    size: _rt['disk'].size,
                    used: _rt['disk'].used,
                    available: _rt['disk'].available,
                    percent: _rt['disk'].percent
                }
            }
        }, { upsert: true, new: true, setDefaultsOnInsert: true }, function (err, _doc) {

            var _a_total = _doc['bandwidth_max'] ? _doc['bandwidth_max'] : 0;
            var _a_consumed = _rt['bandwidth'] && _rt['bandwidth']['percent'] ? _rt['bandwidth']['percent'] : 0;
            _rt['bandwidth']['percent'] = `${((_a_consumed / _a_total) * 100).toFixed(2)}%`;

            /* (Consumed / Total) * 100 */

            _rt['bandwidth']['bandwidth_max'] = init.bytesToSize(_doc['bandwidth_max'], { fixed: 0 }).all;
            _rt['disk']['disk_max'] = init.bytesToSize(_doc['disk_max'], { fixed: 0 }).all;

            return done(null, _rt);
        })
    })
}


var updateftpPassword = function (opts, done) {
    opts = opts || {};

    var username = opts.username;
    var newpassword = opts.password;

    if (!newpassword) return done("can't update password...");

    const service = exec(`echo "${username}:${newpassword}" | chpasswd`);

    service.stdout.on('data', (data) => {
        data = data ? data.toString() : '';
    });

    service.on('close', (code) => {
        return done();
    });
}

var updateRutorrentPassword = function (opts, done) {
    opts = opts || {};

    var username = opts.username;
    var newpassword = opts.password;

    if (!newpassword) return done("can't update password...");

    const service = exec(`htpasswd -b -c /var/www/rutorrent/.htpasswd "${username}" "${newpassword}"`);

    service.stdout.on('data', (data) => {
        data = data ? data.toString() : '';
    });

    service.on('close', (code) => {
        return done();
    });
}

var UpdateBotPassword = function (opts, done) {
    opts = opts || {};

    var username = opts.username;
    var newpassword = opts.password;

    if (!username) return done("Username is not provided...");
    if (!newpassword) return done("can't update password...");

    Users.updatePassword(opts, function (err, result) {
        if (err) return done("Can't Update Password.");
        return done();
    })
}

var restartService = function (opts) {
    return new Promise(function (resolve, reject) {
        opts = opts || {};

        var type = opts.type;
        var _KeyT;

        switch (type) {
            case 'ftp':
                _KeyT = 'vsftpd';
                break;

            case 'rutorrent':
                _KeyT = 'rutorrent';
                break;

            case 'bot':
                _KeyT = 'axabot';
                break;

            case 'server':
                _KeyT = 'server';
                break;

            default:
                _KeyT = null;
                break;
        }

        if (!_KeyT) return reject("Type is missing...");

        var _restartFunc = null;

        if (_KeyT == 'vsftpd') _restartFunc = restartftp;
        if (_KeyT == 'rutorrent') _restartFunc = restartRtorrent;
        if (_KeyT == 'axabot') _restartFunc = restartBot;
        if (_KeyT == 'server') _restartFunc = restartServer;

        if (!_restartFunc) return reject('Invalid Type...');

        _restartFunc({}, function (err, result) {
            if (err) return reject("Can't restart Service.");

            return resolve();

        })
    })
}

var restartftp = function (opts, done) {
    opts = opts || {};
    const service = spawn('systemctl', ['restart', 'vsftpd']);

    service.on('close', (code) => {
        return done();
    });
}

var restartRtorrent = function (opts, done) {
    opts = opts || {};

    let _sessionLock = '/home/rtorrent/.session/rtorrent.lock';

    rimraf(_sessionLock, function (_error) {
        const service = spawn('systemctl', ['restart', 'rtorrent']);
        service.on('close', (code) => {
            return done();
        });
    });

}

var restartBot = function (opts, done) {
    opts = opts || {};

    var _app = path.resolve(__dirname, '..', 'app.js');

    pm2.connect(function (err) {
        if (err) {
            console.error('PM2 Connect Error : ', err);
            process.exit(2);
        }

        var _mName = init.name || 'AxaBot';

        pm2.restart({
            script: _app,
            name: _mName
        }, function (err, apps) {
            pm2.disconnect();   
        });
    });
}

var restartServer = function (opts, done) {
    opts = opts || {};
    let _sessionLock = '/home/rtorrent/.session/rtorrent.lock';
    rimraf(_sessionLock, function (_error) {
        require('reboot').reboot();
    })
}



module.exports.findPreferences = findPreferences;
module.exports.getPassword = getPassword;
module.exports.resetPassword = resetPassword;
module.exports.getDiskUsage = getDiskUsage;
module.exports.getMemoryUsage = getMemoryUsage;
module.exports.getBandwithUsage = getBandwithUsage;
module.exports.updateftpPassword = updateftpPassword;
module.exports.updateRutorrentPassword = updateRutorrentPassword;
module.exports.UpdateBotPassword = UpdateBotPassword;
module.exports.restartService = restartService;