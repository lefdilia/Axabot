var init = require('../config/init');

const mongoose = require('mongoose');
const async = require('async');
const fs = require('fs-extra')
const path = require('path')
const pretty = require('pretty');
const Logs = require('../models/tasks').logs;
const Template = require('./templates');

const _API = require('./api');

var initJobLog = function (_tasks, callback) {
    _tasks = _tasks || [];
    if (_tasks.length == 0) return callback('*No tasks Found...');

    var taskId = Array.isArray(_tasks) ? _tasks[0].taskId : _tasks.taskId;
    taskId = mongoose.Types.ObjectId(taskId);

    var sets = []
    async.eachSeries(_tasks, function (task, next) {

        var jobId = task._id;
        taskId = !taskId ? mongoose.Types.ObjectId(task.taskId) : taskId;

        if (!taskId || !jobId) return next(); //

        jobId = mongoose.Types.ObjectId(jobId);

        var _info = task.infos;

        if (!_info) return next();

        var _data = {
            jobId: jobId,
            type: _info.type,
            _key: _info._key,
            path: _info.path,
            host: _info.host,
            filename: _info.filename,
            filenameRD: _info.filenameRD,
            size: _info.size
        }
        sets.push(_data);
        next()
    }, function () {
        Logs.updateOne({
            taskId: taskId
        }, {
            $addToSet: {
                ts_links: {
                    $each: sets
                }
            }
        }, callback)
    })
}

var ShortLinkStatus = function (opts) {
    return new Promise(function (resolve, reject) {

        opts = opts || {};

        var _id = opts._id;
        var _status = Boolean(opts._status);

        _status = Boolean(_status);

        if (!_id) return callback('LogID is missing.');

        _id = mongoose.Types.ObjectId(_id);

        Logs.updateOne({
            _id: _id
        }, {
            $set: {
                "ts_infos.hide_links": _status
            }
        }, function (err, result) {
            if (err) return reject({ message: 'Error Update.' });

            return resolve({ message: 'Updated Successfully.' });
        })
    })
}

var saveLogs = function (opts, callback) {

    var jobId = opts.jobId;
    var taskId = opts.taskId;
    var link = opts.link;
    var byteSize = opts.byteSize || 0;

    if (!link) return callback('Link is lost...');
    if (!taskId || !jobId) return callback('Taskid or JobId is missing.');

    jobId = mongoose.Types.ObjectId(jobId);
    taskId = mongoose.Types.ObjectId(taskId);

    var querySet = {
        $set: {
            "ts_links.$.link": link,
            "ts_links.$.size": byteSize,
            "ts_links.$.finished": new Date()
        }
    }

    if (opts && opts['sh_link'] && opts['sh_host']) {

        querySet['$set']['ts_infos.hide_links'] = true;//

        querySet['$set']['ts_links.$.sh_link'] = opts['sh_link'];
        querySet['$set']['ts_links.$.sh_host'] = opts['sh_host'];
    }


    Logs.updateOne({
        "taskId": taskId,
        "ts_links.jobId": jobId
    }, querySet, { upsert: true }, callback);

}


var listLogs = function (opts, callback) {

    opts = opts || {};

    const options = {
        page: parseInt(opts.page) || 1,
        limit: opts.limit || 1,
        allowDiskUse: true
    };

    if (opts.taskId) {
        let _taskId = mongoose.Types.ObjectId(opts.taskId)

        var _query = {
            "$match": {
                $and: [
                    { "taskId": _taskId }, { "ts_links": { $ne: null } }
                ]
            }
        }
    } else {
        var _query = {
            "$match": { "ts_links": { $ne: null } }
        }
    }

    var logsAggregate = Logs.aggregate([_query,
        {
            $lookup: {
                from: "torrents",
                localField: "ts_infos.hash",
                foreignField: "hash",
                as: "torrent_data"
            }
        },
        {
            $unwind: {
                path: "$torrent_data",
                "preserveNullAndEmptyArrays": true
            }
        },
        {
            $lookup: {
                from: "tasks",
                localField: "taskId",
                foreignField: "_id",
                as: "task_checker"
            }
        },
        {
            $lookup: {
                from: "topics",
                localField: "ts_infos.topic",
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
            $lookup: {
                from: "profiles",
                localField: "ts_infos.profile",
                foreignField: "_id",
                as: "profile_data"
            }
        },
        {
            $unwind: {
                path: "$profile_data",
                "preserveNullAndEmptyArrays": true
            }
        },
        {
            $project: {
                name: "$name",
                taskId: "$taskId",
                task_checker: {
                    $cond: {
                        "if": { $eq: ["$task_checker", []] },
                        "then": true,
                        "else": false
                    }
                },
                ts_infos: "$ts_infos",
                ts_links: "$$ROOT.ts_links",
                links: {
                    $filter: {
                        input: "$ts_links",
                        as: "item",
                        cond: {
                            $and: [
                                { $gt: ["$$item.link", null] },
                                { $eq: ['$$item._key', 'file'] }
                            ]
                        }
                    }
                },
                //
                links_status: {
                    $convert: {
                        input: {
                            $size: {
                                $filter: {
                                    input: "$ts_links",
                                    as: "item",
                                    cond: {
                                        $and: [
                                            { $gt: ['$$item.sh_link', null] }
                                        ]
                                    }
                                }
                            }
                        }, to: "bool"
                    }
                },
                //
                topic: {
                    $ifNull: ["$topic_data", []]
                },
                profile: {
                    $ifNull: ["$profile_data", []]
                },
                torrent: {
                    $ifNull: ["$torrent_data", []]
                },
                hide_links: {
                    $ifNull: ["$ts_infos.hide_links", false]
                },
                created: "$created",
                posted: "$posted"

            }
        },
        {
            $project: {
                name: 1,
                taskId: 1,
                task_checker: 1,
                task_infos: 1,
                ts_count: {
                    $size: "$ts_links"
                },
                "profile": {
                    name: "$profile.name", template: "$ts_infos.template", api: "$ts_infos.api"
                },
                "topic.title": "$topic.data.title",
                "topic.year": "$topic.data.year",
                "topic.source": "$topic.data.source",
                "topic.type": 1,
                "hide_links": "$hide_links",
                "links_status": "$links_status",
                count: {
                    $size: "$links"
                },
                created: 1,
                posted: 1
            }
        }
    ])

    Logs.aggregatePaginate(logsAggregate, options, function (err, res) {
        if (err) return callback(null, []);

        return callback(null, res);
    })

}


var localsearch = function (opts, callback) {

    opts = opts || {};

    var taball = {};
    var _query = {};

    const options = {
        page: parseInt(opts.page) || 1,
        limit: parseInt(opts.limit) || 50,
        allowDiskUse: true
    };

    var keyword = opts.keyword.replace(/\s+/ig, ' ');
    keyword = keyword.trim().split(/\s+/i);

    var ghtarr = keyword.map(function (v) {
        return { "name": { $regex: v + '.*', $options: 'i' } };
    })

    _query = { "$match": { "$and": ghtarr } };
    _query["$match"]["$and"].push({ "ts_links": { $ne: null } });

    var logsAggregate = Logs.aggregate([_query, {
        $lookup: {
            from: "torrents",
            localField: "ts_infos.hash",
            foreignField: "hash",
            as: "torrent_data"
        }
    },
        {
            $unwind: {
                path: "$torrent_data",
                "preserveNullAndEmptyArrays": true
            }
        },
        {
            $lookup: {
                from: "tasks",
                localField: "taskId",
                foreignField: "_id",
                as: "task_checker"
            }
        },
        {
            $lookup: {
                from: "topics",
                localField: "ts_infos.topic",
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
            $lookup: {
                from: "profiles",
                localField: "ts_infos.profile",
                foreignField: "_id",
                as: "profile_data"
            }
        },
        {
            $unwind: {
                path: "$profile_data",
                "preserveNullAndEmptyArrays": true
            }
        },
        {
            $project: {
                name: "$name",
                taskId: "$taskId",
                task_checker: {
                    $cond: {
                        "if": { $eq: ["$task_checker", []] },
                        "then": true,
                        "else": false
                    }
                },
                ts_infos: "$ts_infos",
                ts_links: "$$ROOT.ts_links",
                links: {
                    $filter: {
                        input: "$ts_links",
                        as: "item",
                        cond: {
                            $and: [
                                { $gt: ["$$item.link", null] },
                                { $eq: ['$$item._key', 'file'] }
                            ]
                        }
                    }
                },
                //
                links_status: {
                    $convert: {
                        input: {
                            $size: {
                                $filter: {
                                    input: "$ts_links",
                                    as: "item",
                                    cond: {
                                        $and: [
                                            { $gt: ['$$item.sh_link', null] }
                                        ]
                                    }
                                }
                            }
                        }, to: "bool"
                    }
                },
                //
                topic: {
                    $ifNull: ["$topic_data", []]
                },
                profile: {
                    $ifNull: ["$profile_data", []]
                },
                torrent: {
                    $ifNull: ["$torrent_data", []]
                },
                hide_links: {
                    $ifNull: ["$ts_infos.hide_links", false]
                },
                created: "$created",
                posted: "$posted"

            }
        },
        {
            $project: {
                name: 1,
                taskId: 1,
                task_checker: 1,
                task_infos: 1,
                ts_count: {
                    $size: "$ts_links"
                },
                "profile": {
                    name: "$profile.name", template: "$ts_infos.template", api: "$ts_infos.api"
                },
                "topic.title": "$topic.data.title",
                "topic.year": "$topic.data.year",
                "topic.source": "$topic.data.source",
                "topic.type": 1,
                "hide_links": "$hide_links",
                "links_status": "$links_status",
                count: {
                    $size: "$links"
                },
                created: 1,
                posted: 1
            }
        }
    ])

    Logs.aggregatePaginate(logsAggregate, options, function (err, res) {

        taball['count'] = res.totalDocs;
        taball['list'] = res.docs;

        return callback(null, taball);
    })
}

var removeLogByID = function (_id) {
    return new Promise(function (resolve, reject) {

        if (!_id) return callback('Log Not found.');
        Logs.deleteOne({
            _id: _id
        }, function (err, data) {
            if (err) return reject("Error: Can't remove log.");
            if (data && data.n == 0) return reject("Error: Can't remove this log.");

            return resolve(data);
        })
    })
}

var postApi = function (opts, callback) {
    opts = opts || {};
    var _taskId = opts._tid;
    if (!_taskId) return callback('Task unavailable.');

    return new _API({ taskId: _taskId }).process(callback);
}

var _ExportLogs = function (opts, callback) {
    opts = opts || {};
    var _taskid = opts._tid

    if (!_taskid) return callback("Can't export Log.");

    listLogByID({
        _taskId: _taskid
    }).then(function (_result) {
        var _mtemplate;

        var _release = _result.data.grelease;
        var _template = _result.code;
        var _stype = _result.stype;
        var _rid = _result.TS_RID;

        if (_stype == 'json') {
            try {
                _mtemplate = JSON.stringify(JSON.parse(_template), null, 4);
            } catch (e) {
                _mtemplate = _template;
            }
        } else {
            _template = _template.replace(/((\s+)?<br(\s+)?(\/)?>){2,}/img, '<br><br>');
            _template = _template.replace(/(\n){3,}/ig, '\n')
            _mtemplate = pretty(_template);
        }

        var _dirName = (new Date().toISOString().split('T')[0]).split('-').reverse().join('-');

        const _rFile = `${init.clearRelease(_release, '.')}__${_rid ? '[' + _rid + ']' : ''}.txt`;
        var _ensuredDIR = path.join(init.dir_posts, _dirName);
        var _ensuredFILE = path.join(_ensuredDIR, _rFile);

        fs.ensureDir(_ensuredDIR, 0o2775, function (_err) {
            if (_err) return callback('Error Ensure Directory');

            fs.outputFile(_ensuredFILE, _mtemplate, function (err) {
                if (err) return callback("Can't Export Log File.");

                return callback();
            });
        })

    }).catch(function () {
        return callback("Log Not found.");
    });
}


var listLogByID = function (opts) {
    return new Promise(function (resolve, reject) {
        opts = opts || {};
        var _id = opts._id;
        var _taskId = opts._taskId;
        var _type = opts._type;

        if (!_id && !_taskId) return reject('No Log for this upload');

        if (_taskId) {
            var _query = { taskId: mongoose.Types.ObjectId(_taskId) }
        } else if (_id) {
            var _query = { _id: mongoose.Types.ObjectId(_id) };
        }

        Logs.aggregate([{
            "$match": _query
        },
        {
            $lookup: {
                from: "torrents",
                localField: "ts_infos.hash",
                foreignField: "hash",
                as: "torrent_data"
            }
        },
        {
            $unwind: {
                path: "$torrent_data",
                "preserveNullAndEmptyArrays": true
            }
        },
        {
            $lookup: {
                from: "topics",
                localField: "ts_infos.topic",
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
            $lookup: {
                from: "profiles",
                localField: "ts_infos.profile",
                foreignField: "_id",
                as: "profile_data"
            }
        },
        {
            $unwind: {
                path: "$profile_data",
                "preserveNullAndEmptyArrays": true
            }
        },
        {
            $lookup: {
                from: "templates",
                localField: "ts_infos.template",
                foreignField: "name",
                as: "template"
            }
        },
        {
            $unwind: {
                path: "$template",
                "preserveNullAndEmptyArrays": true
            }
        }, {
            $lookup: {
                from: "apis",
                localField: "ts_infos.api",
                foreignField: "name",
                as: "api_"
            }
        },
        {
            $unwind: {
                path: "$api_",
                "preserveNullAndEmptyArrays": true
            }
        }, {
            $project: {
                name: "$name",
                taskId: "$taskId",
                ts_infos: "$ts_infos",
                mediainfos: "$ts_infos.mediainfos",
                release_infos: "$ts_infos.release_infos",
                ts_links: "$$ROOT.ts_links",
                hide_links: {
                    $ifNull: ["$ts_infos.hide_links", false]
                },
                links: {
                    $filter: {
                        input: "$ts_links",
                        as: "item",
                        cond: {
                            $gt: ["$$item.link", null]
                        }
                    }
                },
                topic_media: {
                    // $ifNull: ["$topic_data.data", []]
                    $ifNull: ["$topic_data", []]
                },
                topic_type: {
                    $ifNull: ["$topic_data.type", ""]
                },
                profile: {
                    $ifNull: ["$profile_data", {}]
                },
                template: {
                    $ifNull: ["$template", {}]
                },
                api_: {
                    $ifNull: ["$api_", {}]
                },
                torrent: {
                    $ifNull: ["$torrent_data", {}]
                },
                created: "$created"
            }
        }, {
            $project: {
                "data": {
                    "TID": "$taskId",
                    "grelease": "$name",
                    "ts_links": {
                        $filter: {
                            input: "$links",
                            as: "item",
                            cond: {
                                $eq: ['$$item._key', 'file']
                            }
                        }
                    },
                    "gtype": "$topic_type",
                    "byte_size": "$ts_infos.size",
                    "gsize": "$ts_infos.size",
                    "gmagnet": "$torrent.magnet",
                    "gthumbnail": {
                        "$map": {
                            "input": {
                                "$filter": {
                                    input: '$links',
                                    as: 't_links',
                                    cond: {
                                        $and: [
                                            { $eq: ['$$t_links._key', 'thumb'] },
                                            { $gt: ["$$t_links.link", null] }
                                        ]
                                    }
                                }
                            },
                            "as": "thumbnails",
                            "in": "$$thumbnails.link"
                        }
                    },
                    "gposter": {
                        "$map": {
                            "input": {
                                "$filter": {
                                    input: '$links',
                                    as: 't_links',
                                    cond: {
                                        $and: [
                                            { $eq: ['$$t_links._key', 'poster'] },
                                            { $gt: ["$$t_links.link", null] }
                                        ]
                                    }
                                }
                            },
                            "as": "posters",
                            "in": "$$posters.link"
                        }
                    },
                    "gnfo": {
                        "$map": {
                            "input": {
                                "$filter": {
                                    input: '$links',
                                    as: 't_links',
                                    cond: {
                                        $and: [
                                            { $eq: ['$$t_links._key', 'nfo'] },
                                            { $gt: ["$$t_links.link", null] }
                                        ]
                                    }
                                }
                            },
                            "as": "nfos",
                            "in": "$$nfos.link"
                        }
                    },

                    // mediainfos
                    "media_format": "$mediainfos.general.format",
                    "media_bitrate": "$mediainfos.general.bitrate",
                    "media_encoder": "$mediainfos.general.encoder",
                    "video_duration": "$mediainfos.general.duration",

                    // //videos
                    "video_codec": "$mediainfos.video.codec",
                    "video_pixel_format": "$mediainfos.video.pixel_format",
                    "video_resolution": "$mediainfos.video.resolution",
                    "video_aspect": "$mediainfos.video.aspect",
                    "video_frame_rate": "$mediainfos.video.frame_rate",
                    "video_infos": "$mediainfos.video.infos",

                    // //experimental only
                    "video_size": "$mediainfos.general.size",

                    // //Audio
                    "audio_codec": "$mediainfos.audio.codec",
                    "audio_channel_layout": "$mediainfos.audio.channel_layout",
                    "audio_sample_rate": "$mediainfos.audio.sample_rate",
                    "audio_sample_fmt": "$mediainfos.audio.sample_fmt",
                    "audio_infos": "$mediainfos.audio.infos",

                    // //subtitle
                    "subtitle_languages": "$mediainfos.subtitle.languages",
                    "subtitle_infos": "$mediainfos.subtitle.infos",

                    // //Media Infos
                    "mt_title": "$topic_media.data.title",
                    "mt_year": "$topic_media.data.year",
                    "mt_runtime": "$topic_media.data.runtime",
                    "mt_genres": "$topic_media.data.genres",
                    "mt_summary": "$topic_media.data.summary",
                    "mt_stars": "$topic_media.data.stars",
                    "mt_source": "$topic_media.data.source",
                    "mt_poster": "$topic_media.image",
                    "mt_poster_original": "$topic_media.image",
                    "mt_rating": "$topic_media.data.rating",

                    // //release_infos
                    "mt_seep_info": "$release_infos.info",
                    "mt_season": "$release_infos.season",
                    "mt_episode": "$release_infos.episode",
                    "mt_air_episode": "$release_infos.air_episode",

                    //Exp Links
                    "gsample": {
                        "$map": {
                            "input": {
                                "$filter": {
                                    input: '$links',
                                    as: 'dl_links',
                                    cond: {
                                        $and: [
                                            { $eq: ['$$dl_links._key', 'sample'] }
                                        ]
                                    }
                                }
                            },
                            "as": "samples",
                            "in": ["$$samples.host",
                                {
                                    $switch: {
                                        branches: [
                                            { case: { $eq: ['$hide_links', true] }, then: '$$samples.sh_link' },
                                            { case: { $eq: ['$hide_links', false] }, then: '$$samples.link' }],
                                        default: '$$samples.link'
                                    }
                                }
                            ]
                        }
                    },
                    "_links_": {
                        "$map": {
                            "input": {
                                "$filter": {
                                    input: '$links',
                                    as: 'dl_links',
                                    cond: {
                                        $and: [
                                            { $eq: ['$$dl_links._key', 'file'] }
                                        ]
                                    }
                                }
                            },
                            "as": "linkiz",
                            "in": ["$$linkiz.host",
                                {
                                    $switch: {
                                        branches: [
                                            { case: { $eq: ['$hide_links', true] }, then: '$$linkiz.sh_link' },
                                            { case: { $eq: ['$hide_links', false] }, then: '$$linkiz.link' }],
                                        default: '$$linkiz.link'
                                    }
                                }, "$$linkiz.filenameRD"
                            ]
                        }
                    },
                    "_shlinks_": {
                        "$map": {
                            "input": {
                                "$filter": {
                                    input: '$links',
                                    as: 'dl_links',
                                    cond: {
                                        $and: [
                                            { $eq: ['$$dl_links._key', 'file'] },
                                            { $gt: ["$$dl_links.sh_link", null] },
                                            { $gt: ["$$dl_links.sh_host", null] },
                                        ]
                                    }
                                }
                            },
                            "as": "linkiz",
                            "in": ["$$linkiz.sh_host", "$$linkiz.sh_link"]
                        }
                    },
                    "_or_links_": {
                        "$map": {
                            "input": {
                                "$filter": {
                                    input: '$links',
                                    as: 'dl_links',
                                    cond: {
                                        $and: [
                                            { $eq: ['$$dl_links._key', 'file'] }
                                        ]
                                    }
                                }
                            },
                            "as": "linkiz",
                            "in": ["$$linkiz.host", "$$linkiz.link"]
                        }
                    },
                    "_or_samples_": {
                        "$map": {
                            "input": {
                                "$filter": {
                                    input: '$links',
                                    as: 'dl_links',
                                    cond: {
                                        $and: [
                                            { $eq: ['$$dl_links._key', 'sample'] }
                                        ]
                                    }
                                }
                            },
                            "as": "samples",
                            "in": ["$$samples.host", "$$samples.link"]
                        }
                    }
                },
                "hide_links": "$hide_links",
                "skin": "$template.data",
                "API_Name": "$api_.name",
                "API_Authorization": "$api_.authorization",
                "API_Settings": "$api_.settings",
                "TS_RID": "$ts_infos.rid",
                "created": 1
            }
        }], function (err, res) {
            if (err) return reject("Can't find This log entry.");
            if (Array.isArray(res) && res.length == 0) return resolve([]);

            res = Array.isArray(res) && res.length > 0 ? res[0] : res;

            Template.toHuman({ res: res, type: _type }).then(function (_res) {
                return resolve(_res);
            }).catch(function (error) {
                return reject(error);
            })
        })
    })
}

var listMcopyCommand = function (opts, callback) {
    return new Promise(function (resolve, reject) {
        opts = opts || {};
        var _taskid = opts._taskid;
        var _subid = opts._subid;

        var _type = opts._type;
        var _st = opts._st;

        if (!_taskid) return reject('No Task found');

        _taskid = mongoose.Types.ObjectId(_taskid);

        if (_st != 'template') {

            var mlinks = [];
            Logs.findOne({ taskId: _taskid }, 'ts_links', function (err, result) {

                var _tsLinks, icheck = false;
                if (_st == 'sub' && _subid) {
                    icheck = true;
                    _tsLinks = result['ts_links'].filter(function (_item) {
                        return _item.jobId == _subid;
                    })
                } else {
                    _tsLinks = result['ts_links'];
                }

                var _links = _tsLinks.filter(function (_item) {
                    if (icheck == true) {
                        return _item.link;
                    } else {
                        return _item.link && _item.type == 'file';
                    }
                })

                if (_type == 'text') {
                    mlinks = _links.map(function (_obj) {
                        return _obj.link;
                    }).join('\n')
                } else if (_type == 'bbcode') {
                    mlinks = _links.map(function (_obj) {
                        return `[URL=${_obj.link}]${_obj.filename}[/URL]`;
                    }).join('\n')
                } else if (_type == 'json') {
                    mlinks = _links.map(function (_obj) {
                        return { name: _obj.filename, link: _obj.link };
                    })
                    mlinks = JSON.stringify(mlinks);
                } else if (_type == 'html') {
                    mlinks = _links.map(function (_obj) {
                        return `<a href="${_obj.link}">${_obj.filename}</a>`;
                    }).join('\n')
                }

                resolve(mlinks)
            })

        } else if (_st == 'template') {
            listLogByID({
                _taskId: _taskid, _type: 2
            }).then(function (_template) {
                _template = _template.code;
                return resolve(_template)
            })
        }

    })
}


module.exports.postApi = postApi;
module.exports._ExportLogs = _ExportLogs;
module.exports.saveLogs = saveLogs;
module.exports.listLogs = listLogs;
module.exports.localsearch = localsearch;
module.exports.removeLogByID = removeLogByID;
module.exports.listLogByID = listLogByID;
module.exports.initJobLog = initJobLog;
module.exports.ShortLinkStatus = ShortLinkStatus;
module.exports.listMcopyCommand = listMcopyCommand;