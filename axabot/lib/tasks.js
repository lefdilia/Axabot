const init = require('../config/init');

const Tasks = require('../models/tasks').tasks;
const ChildTasks = require('../models/tasks').childTasks;
const Logs = require('../models/tasks').logs;

const Torrents = require('../models/torrents').torrents;
const Profiles = require('../models/profiles');

const rtorrent = require('./rtorrent');

const _Logs_ = require('./logs');
const UploadCs = require('./upload');

const fs = require('fs');
const path = require('path');
const async = require('async');
const mongoose = require('mongoose');
const _ = require('lodash')

const json_mediainfo = require('./mediainfo');
const cw = require('./cworker');
const rar = require('./rar');

const dir = init.dir_downloads;


var add = function (opts, callback) {
    opts = opts || {};

    var opath = opts.path && !opts.fullPath ? opts.path : opts.fullPath;
    var otopic = opts.topicId;
    var fullPath = opts.fullPath ? opts.fullPath : path.resolve(dir, opath);

    var upload_profile = opts.upload_profile || null;

    var _rid = init.rn(6);

    try {
        fs.stat(fullPath, function (err, fileStats) {
            if (err) return callback(err);

            var time = {
                atime: fileStats.atime,
                mtime: fileStats.mtime,
                ctime: fileStats.ctime
            }

            var isDirectory = fileStats.isDirectory();
            if (isDirectory == true) {
                var basename = path.basename(opath);
            } else {
                var basename = path.basename(opath, path.extname(opath));
            }

            basename = basename ? basename.replace(/\./ig, ' ').trim().replace(/\s+/ig, ' ') : "*";

            var _bsize = fileStats.size;
            var autoUpload = false;

            var query = upload_profile ? {
                "_id": mongoose.Types.ObjectId(upload_profile)
            } : {
                    "status": true
                };

            Profiles.aggregate([{
                "$match": query
            }, {
                $lookup: {
                    from: "topics",
                    pipeline: [{
                        "$match": {
                            "_id": otopic
                        }
                    }],
                    as: "topic_data"
                }
            },
            {
                $unwind: {
                    path: "$topic_docs",
                    "preserveNullAndEmptyArrays": true
                }
            }

                , {
                $project: {
                    settings: "$$ROOT.settings",
                    topic_data: {
                        $ifNull: ["$topic_data", []]
                    }

                }
            }
            ], function (err, result) {
                result = result[0] || [];
                if (err || result.length == 0) return callback('Please, No default profile exists.');

                let bisettings = result.settings ? {
                    '_idProfile_': result._id,
                    ...result.settings
                } : {};

                var _upload_tries = bisettings.uploadTries || 0;

                var filter = /(\.mkv|\.avi|\.mp4|\.flv|\.nfo)$/i;
                walk(fullPath, filter, function (err, reswalk) {
                    if (isDirectory == true && !err) {
                        _bsize = reswalk.size
                    }

                    var file = {
                        name: basename,
                        infos: {
                            topic: otopic,
                            profile: result._id,
                            path: fullPath,
                            isDirectory: isDirectory,
                            size: _bsize, //in Bytes
                            time: time,
                            rid: _rid
                        },
                        options: bisettings
                    }

                    autoUpload = bisettings.startUploadAuto || false;
                    var topic_data = result.topic_data;
                    var TasksInfos = Tasks(file);

                    if (result && result.settings) {
                        file['infos']['template'] = result.settings.stemplates || '';
                        file['infos']['api'] = result.settings.stapi || '';
                    }


                    init.extInfo(basename, function (err, _extInfo) {
                        if (!err) {
                            file['infos']['release_infos'] = {};
                            file['infos']['release_infos']['info'] = _extInfo['info'];
                            file['infos']['release_infos']['season'] = _extInfo['season'];
                            file['infos']['release_infos']['episode'] = _extInfo['episode'];
                            file['infos']['release_infos']['air_episode'] = _extInfo['air_episode'];
                        }
                    })

                    TasksInfos.save(function (err, _result) {
                        if (err) {
                            var ermessage = 'Error Saving Task...';

                            if (err.code == 11000) {
                                ermessage = 'Tasks with same Profile are not supported, and considered as Duplicate';
                            }
                            return callback(ermessage);
                        }

                        var mainTaskId = _result._id;
                        if (!mainTaskId) return callback(null, _result);

                        //Create Log entry for this task
                        //->Start
                        var _Log = Logs({
                            name: file.name,
                            taskId: mainTaskId,
                            ts_infos: file.infos
                        });


                        _Log.save(function (err, _result) {
                            if (err) return callback(null, _result);
                            //->End
                            //Test : Create subtasks here...
                            processffPath({
                                fullPath: fullPath,
                                sett: bisettings,
                                topic_data: topic_data,
                                infos: file.infos,
                                mainTaskId: mainTaskId,
                                rid: _rid
                            }, function (err, rlast) {
                                rlast = Array.isArray(rlast) ? rlast : [];
                                ChildTasks.find({
                                    _id: {
                                        $in: rlast
                                    }
                                }, function (err, _tasks) {
                                    _Logs_.initJobLog(_tasks, function () {
                                        if (autoUpload == true) {
                                            return UploadCs.startTask({
                                                _tasks: _tasks,
                                                upload_tries: _upload_tries
                                            }, callback);
                                        } else {
                                            return callback();
                                        }
                                    })
                                })
                            })
                        })
                    })
                })
            })
        })
    } catch (e) {
        return callback(e);
    }
}



var removeTasks = function (opts, callback) {
    var _id = opts._id;
    if (!_id) return callback('No task ID provided..');
    _id = mongoose.Types.ObjectId(_id);
    Tasks.deleteOne({
        _id: _id
    }, function (err) {
        ChildTasks.deleteMany({
            taskId: _id
        }, callback);
    });
}

var addTorrentTask = function (opts, callback) {
    opts = opts || {};
    var nillTask = opts.nillTask;

    var hash = opts.hash;
    var regw = new RegExp(hash, "i");

    var upload_profile = opts.upload_profile || '';
    var torrent_title = opts.torrent_title || hash;

    upload_profile = Array.isArray(upload_profile) ? upload_profile.reverse()[0] : upload_profile;

    var query = upload_profile ? {
        "_id": mongoose.Types.ObjectId(upload_profile)
    } : {
            "status": true
        };

    Torrents.aggregate([{
        "$match": {
            hash: regw
        }
    },
    {
        $lookup: {
            from: "topics",
            localField: "hash",
            foreignField: "extra.hashs",
            as: "topic_docs"
        }
    },
    {
        $unwind: {
            path: "$topic_docs",
            "preserveNullAndEmptyArrays": true
        }
    },
    {
        $lookup: {
            from: "profiles",
            let: {
                'upload_profile': upload_profile
            },
            pipeline: [{
                "$match": query
            }],
            as: "profiles_list"
        }
    },
    {
        $unwind: {
            path: "$profiles_list",
            "preserveNullAndEmptyArrays": true
        }
    }, {
        $project: {
            name: {
                $ifNull: ["$$ROOT.title", torrent_title]
            },
            topic: "$topic_docs._id",
            profile: {
                "$toObjectId": "$profiles_list._id"
            },
            settings: {
                $ifNull: ["$profiles_list.settings", {}]
            }
        }
    }
    ])
        /*
        {
           $ifNull: ["$profile_data.settings", {}]
        }
        */
        .exec(function (err, res) {
            res = res ? res[0] : {};

            var topicId = res.topic ? (nillTask == false ? res.topic : null) : null;

            if (!res.profile) return callback('Please, No default profile exists.');

            let bisettings = res.settings ? {
                '_idProfile_': res.profile,
                ...res.settings
            } : {};

            var stats = {
                status: "downloading",
                speed: 0,
                progress: 0,
                uploaded: 0
            }

            var bask = res.name ? res.name.replace(/\./ig, ' ').trim() : null;
            var mquery = { "infos.hash": hash, "infos.profile": res.profile };

            Tasks.findOne(mquery).then(function (result) {
                var _rid = init.rn(6);
                if (!result)
                    return _rid;
                else
                    _rid = result.infos ? result.infos.rid : _rid;
                return _rid;
            }).then(function (_rid) {
                var file = {
                    name: bask,
                    infos: {
                        topic: topicId,
                        hash: hash,
                        profile: res.profile,
                        path: null,
                        isDirectory: false,
                        size: 0, //in Bytes // add torrent size from torrents
                        time: {},
                        rid: _rid
                    },
                    options: bisettings,
                    stats: stats
                }

                if (res && res.settings) {
                    file['infos']['template'] = res.settings.stemplates || '';
                    file['infos']['api'] = res.settings.stapi || '';
                }

                init.extInfo(bask, function (err, _extInfo) {
                    if (!err) {
                        file['infos']['release_infos'] = {};
                        file['infos']['release_infos']['info'] = _extInfo['info'];
                        file['infos']['release_infos']['season'] = _extInfo['season'];
                        file['infos']['release_infos']['episode'] = _extInfo['episode'];
                        file['infos']['release_infos']['air_episode'] = _extInfo['air_episode'];
                    }
                })

                return Tasks.updateMany(mquery, file, { upsert: true, setDefaultsOnInsert: true }, function (err, _result) {

                    Tasks.findOne(mquery, '_id infos', function (err, _res) {
                        if (err || !_res) return callback(err);

                        var mainTaskId = mongoose.Types.ObjectId(_res._id);
                        if (!mainTaskId) return callback(null, _result);

                        var obj = {
                            name: file.name,
                            taskId: mainTaskId,
                            ts_infos: file.infos
                        }

                        return Logs.updateOne({ taskId: mainTaskId }, obj, { upsert: true, setDefaultsOnInsert: true }, callback);
                    })
                });
            }).catch(callback)
        })
}

function processffPath(opts, callback) {
    opts = opts || {};

    var TaskObject = {
        infos: {},
        extra: {},
        stats: {}
    };

    var fullPath = opts.fullPath;
    var sett = opts.sett;
    var infos = opts.infos;

    var _rid = opts.rid;

    var mainTaskId = opts.mainTaskId;
    var topic_data = opts.topic_data.length > 0 ? opts.topic_data[0] : {};
    //Start here

    TaskObject.infos.time = infos.time;
    TaskObject.infos.isDirectory = infos.isDirectory;
    TaskObject.infos.path = fullPath;

    TaskObject.stats.status = 'pending';
    TaskObject.stats.speed = 0;
    TaskObject.stats.progress = 0;
    TaskObject.stats.uploaded = 0;

    if (infos.isDirectory == true) {
        var processPromise = processDirectory({
            fullPath: fullPath,
            sett: sett,
            rid: _rid
        })
    } else {
        var processPromise = processFiles({
            fullPath: fullPath,
            sett: sett,
            rid: _rid
        })
    }

    processPromise.then(function (data) {
        TaskObject.infos.rec_paths = data.rec_paths;
        TaskObject.infos.size = data.size ? data.size : infos.size;
        TaskObject.extra.nfos = data.nfos ? data.nfos : [];
        TaskObject.extra.sample = data.sample ? data.sample : [];

        TaskObject.infos.mediainfos = data.mediainfos ? data.mediainfos : {};

        return processThumbnail({
            fullPath: fullPath,
            sett: sett
        })

    }).then(function (thumbs) {
        TaskObject.extra.thumbs = thumbs;
    }).then(function () {

        var bPrefix = sett.prefixString && sett.prefixFilename ? sett.prefixString.trim() : '';

        var hosts = Array.isArray(sett.hosts) ? sett.hosts : [];
        var hostImages = Array.isArray(sett.hostImages) ? sett.hostImages : [];
        var hostSample = Array.isArray(sett.hostSample) ? sett.hostSample : [];

        var hostShortners = Array.isArray(sett.shortners) ? sett.shortners : [];

        var uploadNfoImage = sett.uploadNfoImage || false;
        var uploadTopicImage = sett.uploadTopicImage || false;
        var uploadThumbImage = sett.uploadThumbImage || false;
        var sampleEnabled = sett.sampleEnabled || false;

        var poster = topic_data.image || null;

        var extra = TaskObject.extra;
        var nfos = extra.nfos && extra.nfos.length > 0 ? extra.nfos[0] : null;
        var sample = extra.sample && extra.sample.length > 0 ? extra.sample[0] : null;
        var thumbs = extra.thumbs && extra.thumbs.length > 0 ? extra.thumbs : [];

        //['pending', 'aborted', 'running', 'finished']
        var mbstatus = 'pending';

        var subtasks = [];
        var mbStats = {
            status: mbstatus,
            speed: 0,
            progress: 0,
            uploaded: 0
        };

        var istime = {
            created: new Date(),
            started: null,
            finished: null,
        }

        //Create Files Task
        var files = TaskObject.infos.rec_paths;

        var _wordlist = [];

        var promise1 = new Promise(function (resolve, reject) {
            async.forEachOf(files, function (kfile, index, next) {

                var _ext = path.extname(kfile);
                var _BaseName = path.basename(kfile);

                var _rarExt = _BaseName.match(/.part(\d+)\.rar$/ig);
                _rarExt = _rarExt ? _rarExt.toString() : _ext;
                var filenameRD = sett.randomFilename ? init.unifyNames(13, "N", bPrefix) + _rarExt : _BaseName;

                async.each(hosts, function (host, nxt) {

                    var oSubTasks = {
                        taskId: mainTaskId,
                        infos: {
                            type: 'file',
                            path: kfile,
                            _key: 'file',
                            host: host,
                            filename: _BaseName,
                            filenameRD: filenameRD,
                            size: 0,
                            link: null,
                            error: null,
                            shortners: hostShortners
                        },
                        stats: mbStats,
                        istime: istime
                    };

                    subtasks.push(oSubTasks);
                    nxt()
                }, next)
            }, resolve)
        });

        var promise2 = new Promise(function (resolve, reject) {
            async.eachSeries(hostSample, function (host, nxt) {
                if (sampleEnabled == true && sample != null) {
                    var _ext = path.extname(sample);
                    var _BaseName = path.basename(sample);

                    var filenameRD = sett.randomFilename ? init.unifyNames(13, "N", bPrefix) + "_Sample_" + _ext : _BaseName;

                    subtasks.push({
                        taskId: mainTaskId,
                        infos: {
                            type: 'file',
                            path: sample,
                            _key: 'sample',
                            host: host,
                            filename: _BaseName,
                            filenameRD: filenameRD,
                            size: 0,
                            link: null,
                            error: null,
                            shortners: hostShortners
                        },
                        stats: mbStats,
                        istime: istime
                    });
                }
                nxt()
            }, resolve)
        })

        var promise3 = new Promise(function (resolve, reject) {
            async.eachSeries(hostImages, function (host, nxt) {
                //Upload NFO
                if (uploadNfoImage == true && nfos) {

                    var _ext = path.extname(nfos);
                    var _BaseName = path.basename(nfos);

                    var filenameRD = sett.randomFilename ? init.unifyNames(13, "N", bPrefix) + "_NFO_" + _ext : _BaseName;

                    subtasks.push({
                        taskId: mainTaskId,
                        infos: {
                            type: 'image',
                            path: nfos,
                            _key: 'nfo',
                            host: host,
                            filename: _BaseName,
                            filenameRD: filenameRD,
                            size: 0,
                            link: null,
                            error: null
                        },
                        stats: mbStats,
                        istime: istime
                    });
                }

                //Upload Poster
                if (uploadTopicImage == true && poster != null) {

                    var _ext = path.extname(poster);
                    var _BaseName = path.basename(poster);

                    var filenameRD = sett.randomFilename ? init.unifyNames(13, "N", bPrefix) + "_Poster_" + _ext : _BaseName;

                    subtasks.push({
                        taskId: mainTaskId,
                        infos: {
                            type: 'image',
                            path: poster,
                            _key: 'poster',
                            host: host,
                            filename: _BaseName,
                            filenameRD: filenameRD,
                            size: 0,
                            link: null,
                            error: null
                        },
                        stats: mbStats,
                        istime: istime
                    });
                }

                //Upload Thumbnails
                if (uploadThumbImage == true && thumbs.length > 0) {
                    thumbs.map(function (_thubm) {

                        var _ext = path.extname(_thubm);
                        var _BaseName = path.basename(_thubm);

                        var filenameRD = sett.randomFilename ? init.unifyNames(13, "N", bPrefix) + "_Thumbnail_" + _ext : _BaseName;

                        return subtasks.push({
                            taskId: mainTaskId,
                            infos: {
                                type: 'image',
                                path: _thubm,
                                _key: 'thumb',
                                host: host,
                                filename: _BaseName,
                                filenameRD: filenameRD,
                                size: 0,
                                link: null,
                                error: null
                            },
                            stats: mbStats,
                            istime: istime
                        });
                    })
                }
                nxt()
            }, resolve)
        })



        Promise.all([promise1, promise2, promise3]).then(function () {

            var extra = TaskObject.extra;
            var stats = TaskObject.stats;
            var rec_paths = TaskObject.infos.rec_paths;
            var mediainfos = TaskObject.infos.mediainfos;

            Tasks.updateOne({
                "_id": mainTaskId
            }, {
                $set: {
                    "infos.rec_paths": rec_paths,
                    "infos.mediainfos": mediainfos,
                    "extra": extra,
                    "stats": stats
                }
            }, {
                multi: true
            }, function (err, data) {
                if (err) return callback(null, []);

                Logs.updateOne({
                    "taskId": mainTaskId
                }, {
                    $set: {
                        "ts_infos.mediainfos": mediainfos
                    }
                }, function (err, data) {
                    ChildTasks.insertMany(subtasks, {}, function (err, data) {
                        if (err) return callback(null, []);
                        var rtn = Array.isArray(data) ? data.map((item) => {
                            return item._id
                        }) : [];
                        return callback(null, rtn);
                    });
                });
            })

        }).catch(function (err) {
            return callback(null, []);
        });

    }).catch(function (err) {
        return callback(null, []);
    });

}


var countChildTasks = function (opts, callback) {
    opts = opts || {};

    var _socket = opts._socket;

    ChildTasks.aggregate([{
        $group: {
            "_id": "$stats.status",
            "_count": {
                $sum: 1
            }
        }
    }
    ], function (err, res) {
        if (err) res = [];
        const resmap = _.reduce(res, function (obj, value) {
            var key = value['_id'];

            if (/(downloading|pending|running)/ig.test(key)) obj["inqueue"] += value['_count'];
            if (/(aborted|finished)/ig.test(key)) obj["finished"] += value['_count'];
            obj["all"] += value['_count'];

            return obj;
        }, { finished: 0, inqueue: 0, all: 0 });

        if (_socket) {
            _socket.emit('tasks_monitor', JSON.stringify(resmap))
        }
        return callback(resmap)
    })
}


var listTasks = function (opts, callback) {

    opts = opts || {};

    const options = {
        page: parseInt(opts.page) || 1,
        limit: opts.limit || 50,
        sort: {
            'mstatus': 1,
            'tprogress': 1,
            'created': -1
        },
        allowDiskUse: true
    };

    var _query;

    switch (opts._st) {
        case 1:
            _query = {}
            break;

        case 2:
            _query = {
                $and: [
                    {
                        "stats.status": {
                            $in: ["downloading", "pending", "running"]
                        }
                    },
                    { "stats.progress": { $lt: 100 } }
                ]
            }
            break;

        case 3:
            _query = {
                $and: [
                    {
                        "stats.status": {
                            $in: ["finished", "aborted"]
                        }
                    }
                ]
            }
            break;
        default:
            _query = {}
    }

    var taskAggregate = Tasks.aggregate([{
        '$match': _query
    },
    {
        $lookup: {
            from: "childTasks",
            localField: "_id",
            foreignField: "taskId",
            as: "child_tasks"
        }
    }, {
        $lookup: {
            from: "topics",
            localField: "infos.topic",
            foreignField: "_id",
            as: "topic_data"
        }
    },
    {
        $unwind: {
            path: "$topic_data",
            "preserveNullAndEmptyArrays": true
        }
    },
    {
        $project: {
            task_name: "$$ROOT.name",
            task_infos: "$$ROOT.infos",
            profile: { "id": "$$ROOT.options._idProfile_", "name": "$$ROOT.options.profileName" },
            task_extra: "$$ROOT.extra",
            task_stats: "$$ROOT.stats",
            child_tasks: {
                $ifNull: ["$child_tasks", []]
            },
            count: {
                $size: "$child_tasks"
            },
            count_finished: {
                "$multiply": [
                    {
                        "$size": {
                            "$filter": {
                                "input": "$child_tasks",
                                "as": "chkali",
                                "cond": { "$eq": ["$$chkali.stats.status", 'finished'] }
                            }
                        }
                    }, 100
                ]
            },
            fullProgress: {
                $sum: "$child_tasks.stats.progress",
            },
            nbstatus: "$child_tasks.stats.status",
            topic_data: {
                $ifNull: ["$topic_data", []]
            },
            created: "$$ROOT.created"
        }
    },
    {
        $project: {
            task_name: 1,
            task_infos: 1,
            task_extra: 1,
            profile: 1,
            task_stats: 1,
            // 
            mstatus:
            {
                $switch: {
                    branches: [
                        { case: { $eq: ['$task_stats.status', 'downloading'] }, then: 0 },
                        { case: { $eq: ['$task_stats.status', 'running'] }, then: 1 },
                        { case: { $eq: ['$task_stats.status', 'pending'] }, then: 2 },
                        { case: { $eq: ['$task_stats.status', 'aborted'] }, then: 3 },
                        { case: { $eq: ['$task_stats.status', 'finished'] }, then: 4 }
                    ],
                    default: 4
                }
            },
            // 
            child_tasks: 1,
            count: 1,
            fullProgress: 1,
            count_finished: 1,
            tprogress:
            {
                $ceil: {
                    $cond: [{ $eq: ["$count", 0] }, 0, {
                        $divide: [
                            "$count_finished",
                            "$count"
                        ]
                    }]
                }
            },
            nbstatus: 1,
            totalScore: 1,
            topic_data: 1,
            created: 1
        }
    }
    ]);

    Tasks.aggregatePaginate(taskAggregate, options, function (err, res) {
        if (err) return callback(null, []);

        return callback(null, res);
    })

}

var runCommand = function (opts, callback) {
    opts = opts || {};

    //['pending', 'aborted', 'running', 'finished', 'queued']

    var _main = opts._main;
    var _taskid = opts._taskid;
    var _subid = opts._subid;
    var _dcom = opts._dcom;

    var io, _socket;
    io = _socket = opts.io;

    /*
    @Main-Task commands
******************************
    _dcom  start_task_b
    _dcom  restart_torrent_b
    _dcom  restart_task_b
    _dcom  abort_task_b
    _dcom  delete_task_b
    _dcom  abort_all
    _dcom  clear_completed
*****************************
    @Sub-Task commands
    _dcom  start_m
    _dcom  restart_m
    _dcom  cancel_m
    _dcom  delete_m
    
    
    //for abort only
    _dcom  abort_task_b
    _dcom  cancel_m
    */

    if (_main == true) {
        var taskId = mongoose.Types.ObjectId(_taskid);

        if (_dcom == 'start_task_b') {
            ChildTasks.aggregate([{
                "$match": {
                    $and: [{
                        taskId: taskId
                    }, {
                        "stats.status": {
                            $nin: ["finished"]
                        }
                    }]
                }
            },
            {
                $lookup: {
                    from: "tasks",
                    localField: "taskId",
                    foreignField: "_id",
                    as: "ts_settings"
                }
            },
            {
                $unwind: {
                    path: "$ts_settings",
                    "preserveNullAndEmptyArrays": true
                }
            }
                ,
            {
                $project: {
                    "taskId": 1,
                    "infos": 1,
                    "stats": 1,
                    "istime": 1,
                    "upload_tries": "$ts_settings.options.uploadTries"
                }
            }
            ]).exec(function (err, _tasks) {
                return UploadCs.startTask({
                    _tasks: _tasks,
                    io: io
                }, callback);
            })
        } else if (_dcom == 'restart_torrent_b') {
            Tasks.aggregate([{
                "$match": {
                    _id: taskId
                }
            }, {
                $lookup: {
                    from: "torrents",
                    localField: "infos.hash",
                    foreignField: "hash",
                    as: "torrent_data"
                }
            }, {
                $unwind: {
                    path: "$torrent_data",
                    "preserveNullAndEmptyArrays": true
                }
            }, {
                $lookup: {
                    from: "profiles",
                    localField: "options._idProfile_",
                    foreignField: "_id",
                    as: "opts_profile"
                }
            }, {
                $unwind: {
                    path: "$opts_profile",
                    "preserveNullAndEmptyArrays": true
                }
            }, {
                $project: {
                    hash: "$torrent_data.hash",
                    magnet: "$torrent_data.magnet",
                    newSettings: "$opts_profile.settings",
                    _idProfile_: "$opts_profile._id",
                    stats: "$stats"
                }
            }, {
                $project: {
                    hash: 1,
                    magnet: 1,
                    newSettings: 1,
                    _idProfile_: 1,
                    stats: 1
                }
            }
            ]).exec(function (err, result) {
                result = result ? result[0] : [];

                var _status_ = result['stats']['status'];

                var biSettings;
                if (result['newSettings']) {
                    biSettings = result['newSettings'];
                    biSettings['_idProfile_'] = result['_idProfile_'];
                }

                var magnet = result['magnet'];
                var hash = result['hash'];

                //Update here status to downloading -> downloading
                if (!hash) return callback();

                _queryInsert = {
                    $set: {
                        "stats.status": (_status_ == 'finished' ? "finished" : "downloading")
                    }
                }

                if (biSettings) {
                    _queryInsert['$set']['options'] = biSettings;
                }

                // var regw = new RegExp(hash, "i");
                Tasks.updateMany({
                    // "infos.hash": regw,
                    _id: taskId
                }, _queryInsert, {
                    multi: true
                }).then(function (data) {

                    var _nModified = data['nModified'] || 0;

                    ChildTasks.updateMany({
                        $and: [{
                            taskId: taskId
                        }, {
                            "stats.status": {
                                $nin: ["finished"]
                            }
                        }]
                    }, {
                        "$set": {
                            "infos.error": null,
                            "infos.link": null,
                            "stats.status": "pending",
                            "stats.progress": 0,
                            "stats.speed": "--/--",
                            "stats.uploaded": "--",
                            "istime.started": new Date()
                        }
                    }, function (err, _task) {

                        ChildTasks.find({
                            taskId: taskId
                        }, function (err, _tasks) {
                            return UploadCs.abortTask({
                                _tasks: _tasks,
                                io: io,
                                update: false
                            }, function () {

                                if (_nModified == 1) {
                                    _socket.emit('mainprogress', JSON.stringify({
                                        jobId: null,
                                        taskId: taskId,
                                        status: "downloading"
                                    }))
                                }

                                return rtorrent.send({
                                    magnets: [magnet],
                                    hash: hash
                                }, callback);

                            })
                        });

                    })

                }).catch(callback);
            })

        } else if (_dcom == 'stop_torrent_b') {
            Tasks.findOne({
                '_id': mongoose.Types.ObjectId(taskId)
            }, { '_id': 0, 'infos.hash': 1 }, function (err, _data) {
                var _hashs = _data['infos']['hash'];
                _hashs = _hashs ? [_hashs] : [];
                rtorrent.stop(_hashs, function () {
                    return UploadCs.abortTorrentDownload({
                        taskId: taskId
                    }, callback)
                });
            });
        } else if (_dcom == 'restart_task_b') {
            ChildTasks.aggregate([{
                "$match": {
                    $and: [{
                        taskId: taskId
                    }, {
                        "stats.status": {
                            $nin: ["finished"]
                        }
                    }]
                }
            }, {
                $lookup: {
                    from: "tasks",
                    localField: "taskId",
                    foreignField: "_id",
                    as: "ts_settings"
                }
            }, {
                $unwind: {
                    path: "$ts_settings",
                    "preserveNullAndEmptyArrays": true
                }
            }, {
                $project: {
                    "taskId": 1,
                    "infos": 1,
                    "stats": 1,
                    "istime": 1,
                    "upload_tries": "$ts_settings.options.uploadTries"
                }
            }
            ]).exec(function (err, _tasks) {
                return UploadCs.reStartTask({
                    _tasks: _tasks,
                    io: io
                }, callback);

            })

        } else if (_dcom == 'abort_task_b') {
            //List Running task to abort
            ChildTasks.find({
                taskId: taskId
            }, function (err, _tasks) {
                return UploadCs.abortTask({
                    _tasks: _tasks,
                    io: io
                }, callback);
            })
        } else if (_dcom == 'delete_task_b') {
            ChildTasks.find({
                taskId: taskId
            }, function (err, _tasks) {
                return UploadCs.abortTask({
                    _tasks: _tasks
                }, function () {
                    Tasks.findOneAndRemove({
                        _id: taskId
                    }, function (err, _task) {

                        ChildTasks.deleteMany({
                            taskId: taskId
                        }, function (err, status) {
                            var _ids = _tasks.map(function (ts) {
                                return ts._id;
                            })
                            return callback(null, _ids);
                        })
                    })
                })
            })
        } else if (_dcom == 'delete_subtasks_b') {
            ChildTasks.find({
                taskId: taskId
            }, function (err, _tasks) {
                return UploadCs.abortTask({
                    _tasks: _tasks
                }, function () {
                    ChildTasks.deleteMany({
                        taskId: taskId
                    }, function (err, status) {
                        var _ids = _tasks.map(function (ts) {
                            return ts._id;
                        })
                        return callback(null, _ids);
                    })
                });
            })
        } else if (_dcom == 'delete_alltask_b') {

            ChildTasks.find({}, function (err, _tasks) {
                return UploadCs.abortTask({
                    _tasks: _tasks
                }, function () {
                    Tasks.deleteMany({}, function (err, status) {
                        ChildTasks.deleteMany({}, function (err, status) {
                            var _ids = _tasks.map(function (ts) {
                                return ts._id;
                            })
                            return callback(null, _ids);
                        })
                    });
                });
            })

        } else if (_dcom == 'clear_fn_tasks') {
            let _uploadQueue = UploadCs._uploadQueue || {};

            _uploadQueue.getJobs().then(function (jobs) {
                const _ids = jobs.map(function (x) {
                    if (!x || !x.data || !x.data.stats || x.data.length == 0) return;
                    return mongoose.Types.ObjectId(x.data.taskId);
                }).filter(function (_obj) {
                    if (!_obj) return;
                    return _obj;
                })

                let _mquery = {
                    $and: [
                        { _id: { $nin: _ids } },
                        { "stats.status": { $in: ["finished", "aborted"] } }
                    ]
                }

                Tasks.find(_mquery, function (err, _tasks) {
                    var _tsids = _tasks.map(function (ts) {
                        return mongoose.Types.ObjectId(ts._id);
                    })

                    var _hashs = _tasks.map(function (ts) {
                        return { hash: ts.infos.hash };
                    }).filter(function (_obj) {
                        return _obj.hash;
                    })

                    let _squery = { taskId: { $in: _tsids } };
                    let _lquery = { _id: { $in: _tsids } };

                    ChildTasks.find(_squery, function (err, _chtasks) {
                        return UploadCs.abortTask({
                            _tasks: _chtasks
                        }, function () {
                            rtorrent.erase(_hashs, function () {
                                Tasks.deleteMany(_lquery, function (err, status) {
                                    ChildTasks.deleteMany(_squery, function (err, status) {
                                        return callback(null, _tsids);
                                    })
                                });
                            })
                        });
                    });
                });
            });

        } else if (_dcom == 'abort_all') {

            return UploadCs.abortAllTasks({
                io: io
            }, callback);

        } else if (_dcom == 'start_all') {

            ChildTasks.aggregate([{
                "$match": {
                    "stats.status": {
                        $nin: ["finished"]
                    }
                }

            },
            {
                $lookup: {
                    from: "tasks",
                    localField: "taskId",
                    foreignField: "_id",
                    as: "ts_settings"
                }
            },
            {
                $unwind: {
                    path: "$ts_settings",
                    "preserveNullAndEmptyArrays": true
                }
            }
                ,
            {
                $project: {
                    "taskId": 1,
                    "infos": 1,
                    "stats": 1,
                    "istime": 1,
                    "upload_tries": "$ts_settings.options.uploadTries"
                }
            }
            ]).exec(function (err, _tasks) {
                return UploadCs.startTask({
                    _tasks: _tasks,
                    io: io
                }, callback);
            })

        } else {
            return callback("Running Invalid Command.");
        }
    } else {
        var _subid = mongoose.Types.ObjectId(_subid);
        if (_dcom == 'start_m') {
            ChildTasks.aggregate([{
                "$match": {
                    _id: _subid
                }
            }, {
                $lookup: {
                    from: "tasks",
                    localField: "taskId",
                    foreignField: "_id",
                    as: "ts_settings"
                }
            }, {
                $unwind: {
                    path: "$ts_settings",
                    "preserveNullAndEmptyArrays": true
                }
            }, {
                $project: {
                    "taskId": 1,
                    "infos": 1,
                    "stats": 1,
                    "istime": 1,
                    "upload_tries": "$ts_settings.options.uploadTries"
                }
            }
            ]).exec(function (err, _task) {
                _task = Array.isArray(_task) ? _task[0] : _task;
                return UploadCs.start_miniTask({
                    _task: _task,
                    io: io
                }, callback);
            })
        } else if (_dcom == 'cancel_m') {

            ChildTasks.findOne({
                _id: _subid
            }, function (err, _task) {
                return UploadCs.abort_miniTask({
                    _task: _task
                }, callback);
            })

        } else if (_dcom == 'restart_m') {

            ChildTasks.findOneAndUpdate({
                _id: _subid
            }, {
                $set: {
                    "stats.status": "pending",
                    "stats.speed": 0,
                    "stats.progress": 0,
                    "stats.uploaded": 0,
                    //
                    "infos.link": null,
                    "infos.error": ""
                }
            }, function (err, _task) {
                return UploadCs.abort_miniTask({
                    _task: _task
                }, function () {
                    ChildTasks.aggregate([{
                        "$match": {
                            _id: _subid
                        }
                    }, {
                        $lookup: {
                            from: "tasks",
                            localField: "taskId",
                            foreignField: "_id",
                            as: "ts_settings"
                        }
                    }, {
                        $unwind: {
                            path: "$ts_settings",
                            "preserveNullAndEmptyArrays": true
                        }
                    }, {
                        $project: {
                            "taskId": 1,
                            "infos": 1,
                            "stats": 1,
                            "istime": 1,
                            "upload_tries": "$ts_settings.options.uploadTries"
                        }
                    }
                    ]).exec(function (err, _task) {
                        _task = Array.isArray(_task) ? _task[0] : _task;
                        UploadCs.start_miniTask({
                            _task: _task,
                            io: io
                        }, callback);
                    })
                })
            })

        } else if (_dcom == 'delete_m') {

            ChildTasks.findOneAndRemove({
                _id: _subid
            }, function (err, _task) {
                return UploadCs.abort_miniTask({
                    _task: _task
                }, callback);
            })
        } else {
            return callback("Running Invalid MCommand.");
        }
    }

}


module.exports.add = add;
module.exports.addTorrentTask = addTorrentTask;
module.exports.removeTasks = removeTasks;
module.exports.countChildTasks = countChildTasks;
module.exports.listTasks = listTasks;
module.exports.runCommand = runCommand;



function processThumbnail(opts) {
    return new Promise(function (resolve, reject) {
        var sett = opts.sett;
        var fullPath = opts.fullPath;
        if (sett.thumbnailEnabled == true) {
            cw.createThumbnail({
                text: sett.thumbnailText,
                file: fullPath,
                cols: sett.thumbnailCols,
                rows: sett.thumbnailRows
            }, function (err, thumbs) {
                if (err) return resolve([]);
                return resolve(thumbs);
            })
        } else {
            return resolve([]);
        }
    })
}

function processSample(opts, callback) {
    var sett = opts.sett;
    var mediaFile = opts.reswalk.files;
    mediaFile = Array.isArray(mediaFile) ? mediaFile : [mediaFile];

    if (sett.sampleEnabled == true && mediaFile && mediaFile.length > 0) {
        var mFile = mediaFile[0];

        cw.createSample({
            file: mFile
        }, function (err, sample) {
            if (err) return callback(null, []);
            return callback(null, sample);
        })
    } else {
        return callback(null, []);
    }
}

function processNfo(opts) {
    return new Promise(function (resolve, reject) {
        var nfoFile = opts.reswalk.nfo;
        var sett = opts.sett;
        var bbname = opts.bbname

        if (sett.nfoProcess == true && nfoFile && nfoFile.length > 0) {
            var nfo = nfoFile[0];
            cw.convertNFO({
                bbname: bbname,
                file: nfo,
                dark: false
            }, function (err, nfo) {
                return resolve(nfo);
            });
        } else {
            return resolve(null);
        }
    })
}

function processDirectory(opts) {
    return new Promise(function (resolve, reject) {
        var rt = {};
        var fullPath = opts.fullPath;
        var sett = opts.sett;
        var rid = opts.rid;

        var filter = /(\.mkv|\.avi|\.mp4|\.flv|\.nfo)$/i;
        walk(fullPath, filter, function (err, reswalk) {
            if (err) reswalk = {
                files: [],
                nfo: []
            };

            rt.rec_paths = sett.mediaFiles == true ? reswalk.files : [];
            rt.size = reswalk.size;

            var bbname = rt.rec_paths[0] ? rt.rec_paths[0] : '__._';
            bbname = path.basename(bbname, path.extname(bbname));

            processNfo({
                sett: sett,
                bbname: bbname,
                reswalk: reswalk
            }).then(function (nfo) {
                rt.nfos = nfo
                processSample({
                    sett: sett,
                    reswalk: reswalk
                }, function (err, psample) {

                    rt.sample = psample;

                    var mediaFile = Array.isArray(reswalk.files) ? reswalk.files : [reswalk.files];
                    mediaFile = mediaFile[0];
                    json_mediainfo(mediaFile, function (err, mediainfos) {

                        if (err || !mediainfos) {
                            rt.mediainfos = {};
                        } else {
                            rt.mediainfos = mediainfos;
                        }

                        if (sett.mediaFiles == false || (Array.isArray(reswalk.files) && reswalk.files.length == 0)) {
                            grabRecPath({
                                fullPath: fullPath,
                                sett: sett,
                                rid: rid
                            }, function (rec_paths) {
                                rt.rec_paths = rec_paths;
                                return resolve(rt)
                            })
                        } else {
                            return resolve(rt)
                        }

                    })

                })
            })
        })
    })
}

function processFiles(opts) {
    return new Promise(function (resolve, reject) {
        var rt = {};
        var fullPath = opts.fullPath;
        var sett = opts.sett;
        var rid = opts.rid;

        var filter = /(\.mkv|\.avi|\.mp4|\.flv)$/i;
        var ext = path.extname(fullPath);
        //TEST
        json_mediainfo(fullPath, function (err, mediainfos) {
            if (err || !mediainfos) {
                rt.mediainfos = {};
            } else {
                rt.mediainfos = mediainfos;
            }
            //TEST
            if (sett.mediaFiles == false && filter.test(ext) == true || sett.rarEnabled == true) {
                grabRecPath({
                    fullPath: fullPath,
                    sett: sett,
                    rid: rid
                }, function (rec_paths) {
                    rt.rec_paths = rec_paths;
                    processSample({
                        sett: sett,
                        reswalk: {
                            files: fullPath
                        }
                    }, function (err, psample) {
                        rt.sample = psample;
                        return resolve(rt)
                    })
                })
            } else {
                rt.rec_paths = [fullPath];
                processSample({
                    sett: sett,
                    reswalk: {
                        files: fullPath
                    }
                }, function (err, psample) {
                    rt.sample = psample;

                    return resolve(rt)
                })
            }
        })
    })
}

function grabRecPath(opts, callback) {
    var fullPath = opts.fullPath;
    var sett = opts.sett;
    var rarEnabled = sett.rarEnabled;

    if (!rarEnabled) { //Compress full file with gzip (Archiver)
        rar.compress({
            file: fullPath
        }, function (err, rec_pi) {
            if (err) rec_pi = []
            return callback(rec_pi);
        })
    } else {
        var ak = {};
        ak.password = sett.rarPassword;
        ak.comment = sett.rarComment;
        ak.spSize = sett.rarSplitSize;
        ak.equal = sett.rarEqualParts;
        //
        ak.rid = opts.rid

        rar.archiver({
            file: fullPath,
            overwrite: true,
            ak: ak
        }, function (err, rec_pi) {
            if (err) rec_pi = []
            return callback(rec_pi);
        })
    }
}

function walk(dir, filter, done) {
    var results = [];
    fs.readdir(dir, function (err, list) {
        if (err) return done(err);
        var i = 0;
        (function next() {
            var file = list[i++];
            if (!file) {
                return done(null, results.filter(function (item) {
                    return filter.test(item.file) || filter.test(item.nfo);
                }).sort(function (a, b) {
                    return b.size - a.size
                }).reduce(function (a, b) {
                    b.file ? a['files'].push(b.file) : '';
                    b.file ? a['size'] += b.size : 0;
                    b.nfo ? a['nfo'].push(b.nfo) : '';
                    return a;
                }, {
                    files: [],
                    size: 0,
                    nfo: []
                }))
            }

            file = path.resolve(dir, file);
            fs.stat(file, function (err, stat) {
                if (stat && stat.isDirectory()) {
                    walk(file, filter, function (err, res) {
                        results = results.concat(res);
                        next();
                    });
                } else {
                    if (path.extname(file) == '.nfo') {
                        results.push({
                            nfo: file,
                            size: stat.size
                        });
                    } else {
                        results.push({
                            file: file,
                            size: stat.size
                        });
                    }
                    next();
                }
            });
        })();
    });
};
