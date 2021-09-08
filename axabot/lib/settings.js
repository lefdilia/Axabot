const init = require('../config/init');

const Profiles = require('../models/profiles');
const Hosts = require('../models/hosts');
const Preferences = require('../models/preferences');
const Apis = require('../models/apis');
const Templates = require('../models/templates').templates;
const Variables = require('../models/templates').variables;

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const editJsonFile = require("edit-json-file");

const mongoose = require('mongoose');
const request = require('request');

var listVariables = function () {
    return new Promise(function (resolve, reject) {
        var query = { status: true };
        Variables.find(query, function (err, _vars) {
            if (err) return resolve([]);
            _vars = groupBy(_vars, 'parent');
            _vars['TV & Movies'] ? _vars['TV & Movies'].sort(function (a, b) {
                return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
            }) : '';
            return resolve(_vars);
        })
    })
}

const groupBy = (arr, k) => arr.reduce((r, c) => (r[c[k]] = [...r[c[k]] || [], c], r), {});

var rtemplates = function (_id) {
    return new Promise(function (resolve, reject) {

        var data = {
            hosts: [],
            templates: [],
            variables: []
        }

        listHosts().then(function (hosts) {
            var _mhosts = hosts.map(function (_it) {
                return {
                    name: `{${_it.server.replace(/\./ig, '_')}}`, server: _it.server, type: _it.extra.type
                }
            }).filter(function (_obj) {
                return _obj.type != 3;
            })

            _mhosts = groupBy(_mhosts, 'type');
            data['hosts'] = _mhosts;

            return;
        }).then(function () {
            return listVariables();
        }).then(function (variables) {

            data['variables'] = variables;

            var query = _id ? {
                _id: mongoose.Types.ObjectId(_id)
            } : {};

            Templates.find(query).lean().then(function (res) {
                data['templates'] = res;
                return resolve(data);

            }).catch(reject)

        }).catch(reject);
    })
}

var saveTemplate = function (data, callback) {
    /*
        { name: 'Df Movies',
        profile: '5d11ed7563beb097c3331a23',
        type: 'json',
        title: '{grelease}',
        template:
        '{"data":{"release":"{grelease}","type":"{gtype}","size":"{gsize}","infos":{"title":"{movie_title}","year":"{movie_year}","runtime":"{movie_runtime}","genres":"{movie_genres}","summary":"{movie_summary}","stars":"{movie_stars}","rating":"{movie_rating}","source":"{movie_source}"},"poster":{"original":"{movie_poster}","upload":"{gposter}"},"@meta":{"video_size":"{video_size}","video_duration":"{video_duration}","video_infos":"{video_infos}","audio_infos":"{audio_infos}","thumbnail":"{gthumbnail}","nfo":"{gnfo}"}},"links":{"sample":"{gsample}","download_links":"{download_links}"}}' }
    */


    var name = data.name;
    var type = data.type;
    var title = data.title;
    var template = data.template;

    if (type == 'json') {
        template = JSON.parse(template);
    } else {
        template = template;
    }

    var objika = {
        name: name,
        data: {
            type: type,
            title: title,
            template: template
        }
    }

    Templates.updateOne({
        name: name
    }, objika, {
        upsert: true,
        returnNewDocument: true,
        setDefaultsOnInsert: true
    }, function (err, result) {
        if (err) return callback(err);

        return callback(null, {
            status: 'update',
            data: data
        });
    })

}

var saveAPI = function (data, callback) {
    /*
    data  { 
            stname: 'api for hd-download',
            url: 'https://www3.hd-download.com',
            username: '',
            password: '',
            type: 'wordpress',
            profile: '5d11ed7563beb097c3331a23',
            category: '' 
        }
    */

    var name = data.stname;
    var objika = {
        name: name,
        settings: data.settings,
        authorization: data.authorization
    }

    var regw = new RegExp(name, "i");

    Apis.updateOne({
        name: regw
    }, objika, {
        upsert: true,
        returnNewDocument: true,
        setDefaultsOnInsert: true
    }, function (err, result) {
        if (err) return callback(err);

        return callback(null, {
            status: 'update',
            data: data
        });
    })
}

var listApis = function (_id) {
    return new Promise(function (resolve, reject) {

        var query = _id ? {
            _id: mongoose.Types.ObjectId(_id)
        } : {};

        Apis.aggregate([{
            '$match': query
        }, {
            $lookup: {
                from: "profiles",
                localField: "settings.profile", // field in aggregate
                foreignField: "_id", // field in `from`
                as: "profile_data"
            }
        }, {
            $unwind: {
                path: "$profile_data",
                "preserveNullAndEmptyArrays": true
            }
        }, {
            $project: {
                name: 1,
                data: 1,
                settings: 1,
                host: "$settings.url",
                profile_name: "$profile_data.name",
                autopost: "$profile_data.settings.autoPost",
                created: 1
            }
        }], function (err, res) {
            if (err) return resolve([]);

            return resolve(res);
        })

    })
}

var saveProfile = function (data, callback) {

    var settings = data.s;
    var base = data.b;

    var profileName = settings.profileName;
    var status = base.default_profile;

    var objika = {
        status: status,
        name: profileName,
        settings: settings
    }

    var regw = new RegExp(profileName, "i");

    Profiles.findOneAndUpdate({
        name: regw
    }, objika, {
        upsert: true,
        returnNewDocument: true
    }, function (err, result) {
        if (err) return callback(err);

        if (status == true) {
            Profiles.updateMany({
                name: {
                    $ne: profileName
                }
            }, {
                $set: {
                    status: false
                }
            }, {
                multi: true
            }).exec();
        }

        return callback(null, {
            status: 'update',
            data: data
        });
    })
}

var listProfiles = function (_id) {
    return new Promise(function (resolve, reject) {
        var query = _id ? {
            _id: _id
        } : {};
        Profiles.find(query).lean().then(function (result) {
            resolve(result);
        }).catch(reject)
    })
}

var listDefaultCrawlers = function (_id, cb) {

    var query = _id ? {
        _id: _id
    } : {
            status: true
        }

    Profiles.findOne(query, 'settings.defaultCrawlers').lean().then(function (result) {
        return cb(null, result);
    }).catch(function(){
        return cb();
    })
}

var listHosts = function (_id, _ignore) {
    return new Promise(function (resolve, reject) {

        if (_ignore !== true) {
            var query = _id ? {
                $and: [
                    { _id: _id },
                    { status: true }
                ]
            } : { status: true };
        } else {
            var query = _id ? {
                $and: [
                    { _id: _id }
                ]
            } : {};
        }

        Hosts.find(query, null, { sort: 'server' }).lean().then(function (result) {
            resolve(result);
        }).catch(function(error){
            reject(error);
        })
    })
}

var listTemplates = function (_id) {
    return new Promise(function (resolve, reject) {
        var query = _id ? {
            $and: [
                { _id: _id },
                { status: true }
            ]
        } : { status: true };

        Templates.find(query).lean().then(function (result) {
            resolve(result);
        }).catch(reject)
    })
}

var listApis = function (_id) {
    return new Promise(function (resolve, reject) {
        var query = _id ? {
            $and: [
                { _id: _id },
                { status: true }
            ]
        } : { status: true };

        Apis.find(query).lean().then(function (result) {
            resolve(result);
        }).catch(reject)
    })
}

/*
1 --> Upload
2 --> streaming
3 --> shortener
4 --> images
*/
var listSettings = function (callback) {
    var data = {};
    listHosts(null, true).then(function (hosts) {
        hosts.filter(function (obj) {
            return obj['extra']['type'] == 4
        })

        data['hosts'] = hosts.filter(function (obj) {
            return obj['extra']['type'] == 1 || obj['extra']['type'] == 2; // upload and streaming
        }).sort(x => x.status ? -1 : 1) || [];

        data['imageHosts'] = hosts.filter(function (obj) {
            return obj['extra']['type'] == 4
        }).sort(x => x.status ? -1 : 1) || [];

        data['shortener'] = hosts.filter(function (obj) {
            return obj['extra']['type'] == 3
        }).sort(x => x.status ? -1 : 1) || [];

        return listProfiles();

    }).then(function (profiles) {
        data['profiles'] = profiles;

        return listTemplates();

    }).then(function (templates) {
        data['templates'] = templates;

        return listApis();

    }).then(function (apis) {
        data['apis'] = apis;

        return callback(null, data);
    }).catch(function (error) {
        return callback(error);
    })

}

var addAccount = function (opts, callback) {

    var data = {};
    var server = opts.server;
    data = opts._data || {};
    data['use_account'] = opts.use_account;

    Hosts.updateMany({
        server: server
    }, {
        $set: {
            data: data
        }
    }, function (error, data) {
        if (error) return callback(error);

        return callback(null, {
            data: data
        });
    })

}

var listHostsSettings = function (callback) {
    var data = {
        hosts: {}
    };

    listHosts().then(function (hosts) {

        data['hosts']['dl'] = hosts.filter(function (obj) {
            return obj['extra']['type'] == 1 || obj['extra']['type'] == 2;
        }) || [];

        data['hosts']['sh'] = hosts.filter(function (obj) {
            return obj['extra']['type'] == 3
        }) || [];

        data['hosts']['img'] = hosts.filter(function (obj) {
            return obj['extra']['type'] == 4
        }) || [];

        data['accounts'] = hosts.filter(function (obj) {
            var _tmpObject = obj['data'] || {}
            return Object.keys(_tmpObject).length > 0
        }) || [];


    }).then(function () {
        return callback(null, data);
    }).catch(function (error) {
        return callback(error, data);
    })
}

var listInputs = function (opts) {
    return new Promise(function (resolve, reject) {
        opts = opts || {}
        var _host = opts.host;

        var query = {
            server: _host
        }

        Hosts.findOne(query, function (err, result) {
            if (err || !result) reject(err);

            var _inputs = result['extra']['inputs'] || [];

            var _menu = ``;

            _inputs.forEach(function (_obj) {

                var _type = `${_obj.type}`;

                if (_type == 'password') {
                    _menu += `<div class="form-group">
                    <label class="col-sm-2 control-label">${_obj.name} :</label>
                    <div class="col-sm-10">
                        <div class="input-group">
                        <input type="password" placeholder="********" name="${_obj.input}" id="${_obj.input}" class="form-control dyhost">
                            <span class="input-group-btn">
                                <button type="button" class="btn btn-default"
                                    onclick="_showpasswd(${_obj.input})"><i
                                        class="glyphicon icon-eye-open glyphicon-eye-open"></i>
                                </button>
                            </span>
                        </div>
                    </div>
                </div>`;
                } else {
                    _menu += `<div class="form-group">
                    <label class="col-sm-2 control-label">${_obj.name} :</label>
                    <div class="col-sm-10">
                        <input name="${_obj.input}" type="text" class="form-control dyhost" placeholder="${_obj.name}" autocomplete="off">
                    </div>
                </div>`;

                }

            })

            _menu += `<div class="form-group">
            <label class="col-sm-2 control-label">Use Account :</label>
                <div class="col-sm-10">
                    <div class="i-checks">
                        <input name="useac" type="checkbox" checked="">
                    </div>
                </div>
            </div> 
            <div class="hr-line-dashed"></div>
            <div class="form-group">
                <div class="col-sm-4 col-sm-offset-2">
                    <button class="btn btn-success" type="submit">Save changes</button>
                </div>
            </div>`

            return resolve(_menu);
        })
    })
}




var removeProfile = function (_id, callback) {
    if (!_id) return callback('No Profile Available.');

    Profiles.deleteOne({
        _id: _id,
        status: {
            $ne: true
        }
    }, function (err, data) {
        if (err) return callback("Error: Can't remove profile.");
        if (data && data.n == 0) return callback("Error: Can't remove this profile.");

        return callback(null, data);
    })
}

var removeAccount = function (_id, callback) {
    if (!_id) return callback('No Profile Available.');
    Hosts.updateMany({
        _id: _id
    }, {
        $set: {
            data: {}
        }
    }, function (error, data) {
        if (error) return callback(error);

        return callback(null, {
            data: data
        });
    })
}

var removeAPI = function (_id, callback) {
    if (!_id) return callback('No API Available.');

    Apis.deleteOne({
        _id: _id
    }, function (err, data) {
        if (err) return callback("Error: Can't remove API.");
        if (data && data.n == 0) return callback("Error: Can't remove this API.");

        return callback(null, data);
    })

}

var removeTemplate = function (_id, callback) {
    if (!_id) return callback('No Template Available.');

    Templates.deleteOne({
        _id: _id
    }, function (err, data) {
        if (err) return callback("Error: Can't remove Template.");
        if (data && data.n == 0) return callback("Error: Can't remove this Template.");

        return callback(null, data);
    })

}

var editPreferences = function (opts, callback) {

    var types = init.types;

    var torrent_pref = {};

    var feed_pref = {};
    feed_pref['pingInterval'] = opts.pingInterval;

    var rtorrent_pref = {};
    rtorrent_pref['uploadRate'] = opts.uploadRate;
    rtorrent_pref['downloadRate'] = opts.downloadRate;
    rtorrent_pref['seedTime'] = opts.seedTime;

    Preferences.deleteMany({}, function (err) {

        var gPreferences = Preferences({
            torrent_pref: torrent_pref,
            feed_pref: feed_pref,
            rtorrent_pref: rtorrent_pref,
            types: types
        })

        gPreferences.save(callback);
    })
}

var findPreferences = function (callback) {
    return Preferences.findOne({}, callback);
}

//UpdateBot
var check_update = function (opts, callback) {
    opts = opts || {};

    var _currentVersion = global._botInfos['version'] || '--';

    if (global['_botupdate'] && global['_botupdate']['running_update'] == true) {
        return callback(null, {
            message: `Update is currently in progress. Please wait a few moments....`
        });
    }

    request({
        method: 'GET',
        json: true,
        uri: init._changeLog,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.96 Safari/537.36',
            'Cache-Control': 'no-cache'
        }
    }, function (err, response, _json) {
        //////Update changelog 
        try {
            let _changelog = path.resolve(__dirname, '..', 'changelog.json');
            let _file = editJsonFile(_changelog, {
                autosave: true
            });

            var _unreleased = _json['unreleased']; // Distant Unreleased
            if (!err && _unreleased && typeof _unreleased == 'object') {
                _file.set("unreleased", _unreleased);
            }
        } catch (_err) { }


        if (err || !_json || _json == '') return callback(null, {
            message: `The server did not respond. Please try again later.`,
            version: _currentVersion
        });

        var _features = [];
        try {
            var _changeLog = Object.keys(_json['releases']);
            _changeLog = _changeLog[0];
            _features = _json['releases'][_changeLog];

        } catch (_err) {
            if (_err || !_changeLog) return callback(null, {
                message: `No Update available, ${_currentVersion} is the latest Version.`,
                version: _currentVersion,
                update: false
            });
        }

        if (_currentVersion && _changeLog && _currentVersion == _changeLog) {

            global['_botupdate']['available'] = false;
            global['_botupdate']['version'] = false;
            global['_botupdate']['features'] = [];
            global['_botupdate']['notified'] = false;

            return callback(null, {
                message: `${_currentVersion} is the latest version.`,
                version: _currentVersion,
                update: false
            });
        } else {

            global['_botupdate']['available'] = true;
            global['_botupdate']['version'] = _changeLog;
            global['_botupdate']['features'] = _features;
            global['_botupdate']['notified'] = false;

            return callback(null, {
                message: `New update Available ${_changeLog}`,
                version: _changeLog,
                update: true
            });
        }
    })
}

if (process.env.NODE_ENV != 'development') {
    setTimeout(function () {
        check_update({}, function () { })
    }, 2000)
}

var update_bot = function (opts, callback) {
    opts = opts || {};

    var _mName = init.name || 'AxaBot';
    var _projectPath = '/opt/axabot/';

    var _args = ['_process_update.js', _projectPath, _mName];

    if (global['_botupdate'] && global['_botupdate']['running_update'] == false) {
        global['_botupdate']['running_update'] = true;
        const ls = spawn('node', _args, {
            stdio: 'inherit',
            detached: true,
            cwd: _projectPath
        })
        ls.on('close', callback);
    } else {
        console.log("Update is currently in progress. Please wait a few moments...");
        return callback();
    }
}



module.exports.listVariables = listVariables;
module.exports.rtemplates = rtemplates;
module.exports.saveTemplate = saveTemplate;
module.exports.saveAPI = saveAPI;
module.exports.listApis = listApis;
module.exports.saveProfile = saveProfile;
module.exports.listHosts = listHosts;
module.exports.listProfiles = listProfiles;
module.exports.listSettings = listSettings;
module.exports.listHostsSettings = listHostsSettings;
module.exports.addAccount = addAccount;
module.exports.removeProfile = removeProfile;
module.exports.removeAccount = removeAccount;
module.exports.removeAPI = removeAPI;
module.exports.removeTemplate = removeTemplate;
module.exports.editPreferences = editPreferences;
module.exports.findPreferences = findPreferences;
module.exports.listDefaultCrawlers = listDefaultCrawlers;
module.exports.listInputs = listInputs;
//
module.exports.check_update = check_update;
module.exports.update_bot = update_bot;