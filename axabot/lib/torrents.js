const init = require('../config/init');

const Queue = require('bull');

const settings = require('../lib/settings');
const tasks = require('../lib/tasks');

const async = require('async');
const request = require('request');
const mongoose = require('mongoose');
const parseTorrent = require('parse-torrent');
const decode = require('unescape');

const dgrab = require('../lib/dgrab');
const rtorrent = require('../lib/rtorrent');

const Torrents = require('../models/torrents').torrents;
const Feeds = require('../models/torrents').feeds;
const Preferences = require('../models/preferences');
const Topics = require('../models/topics');
const Tasks = require('../models/tasks').tasks;
const Logs = require('../models/tasks').logs;

function parseFeedTorrents(objFeed, callback) {
    var hashs = [],
        objParsing = [];


    var _idfeed = objFeed['_idfeed'];
    var link = objFeed['link'];
    var type = objFeed['type'];
    var name = objFeed['name'];

    var feed_include = objFeed['extra']['feed_include'] || [];
    var feed_exclude = objFeed['extra']['feed_exclude'] || [];
    var feed_words_remove = objFeed['extra']['feed_words_remove'] || [];
    var feed_clear_chars = objFeed['extra']['feed_clear_chars'] || false;

    var autoData = Boolean(objFeed['extra']['feed_auto_data']);
    var autoDownload = Boolean(objFeed['extra']['feed_auto_download']);
    var uploadProfile = objFeed['extra']['upload_profile'];

    var status = objFeed['status'];

    var options = {
        url: link,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.13; rv:62.0) Gecko/20100101 Firefox/62.0'
        }
    };


    request(options, function (error, response, body) {
        if (error && error.code == 'ECONNRESET') return callback('Feed is DOWN, and cannot be checked.');
        if (!body) return callback('Feed is unavailable or not working properly');

        var items = body ? body.match(/<item>(.*?)<\/item>/isg) : null;
        if (!items) return callback('Feed not working properly');

        var links = items.map(function (item) {
            var title = item.match(/<title>(.*?)<\/title>/ig);
            title = title ? title[0].replace(/<\!\[CDATA\[(.*?)\]{1,2}\>/ig, '$1')
                .replace(/(<\/title>|<title>)/ig, '')
                .trim()
                .replace(/\s+/ig, ' ') : '';

            if (item.match(/<enclosure url=\"(.*?)\"/igm)) {
                return {
                    title: init.decodeHTMLEntities(title),
                    link: item.match(/<enclosure url=\"(.*?)\"/igm).toString().replace(/<enclosure url\=\"(.*?)\"/ig, '$1')
                };
            } else if (item.match(/<link>(.*?)<\/link>/igm)) {
                return {
                    title: init.decodeHTMLEntities(title),
                    link: item.match(/<link>(.*?)<\/link>/igm).toString().replace(/<link>(.*?)<\/link>/ig, '$1')
                };
            } else {
                return;
            }
        })

        links = links.length > 10 ? links.slice(0, 10) : links;

        async.eachSeries(links, function (obj, next) {

            var link = obj.link;
            var title = obj.title;

            //Test options like removechars / include / exclude / remove_words
            var tsi = feed_include.some(word => new RegExp(word, "i").test(title));
            var tse = feed_exclude.some(word => new RegExp(word, "i").test(title));

            // /!\ Include & Exclude torrent that contain words
            if (feed_include[0] && tsi == false) return next(); // if include exist
            if (feed_exclude[0] && tse == true) return next(); // if exclude exist  

            // /!\ Replace words on title
            title = title.replace(new RegExp(feed_words_remove.join("|"), 'gi'), '').trim();
            if (feed_clear_chars == true)
                title = title.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, ' ').replace(/\s+/ig, ' ').trim();

            if (link && link.match(/^magnet\:/)) {

                link = init.decodeHTMLEntities(link);

                var magnet = link;
                var parsedMagnet = parseTorrent(link);

                var hash = parsedMagnet.infoHash;
                var size = 0;

                var _pTitle = (title && title != "" ? title : (parsedMagnet.name || hash));
                _pTitle = init.clearMostTags(_pTitle);

                var _ktitle = _pTitle.replace(/\s+/ig, '.');

                var torrentobj = {
                    hash: hash,
                    title: _pTitle,
                    size: size,
                    magnet: magnet,
                    info: {
                        name: _ktitle,
                        type: type,
                        source: name,
                        private: parsedMagnet.private || false,
                        link: link
                    },
                    extra: {
                        auto_download: autoDownload,
                        auto_data: autoData,
                        upload_profile: uploadProfile,
                        _idfeed: _idfeed
                    }
                }

                //Regx infos
                if (type == 'tv') {
                    init.extInfo(_ktitle, function (err, _extInfo) {
                        if (!err) {
                            torrentobj['info']['season'] = _extInfo['season']
                            torrentobj['info']['episode'] = _extInfo['episode']
                            torrentobj['info']['air_episode'] = _extInfo['air_episode']
                        }
                    })
                }

                var objiz = {
                    title: title,
                    hash: hash,
                    uploadProfile: uploadProfile,
                    magnet: magnet,
                    type: type
                };
                objParsing.push(objiz);

                Torrents.updateOne({
                    hash: hash
                }, torrentobj, {
                    upsert: true
                }, function (err, rsl) {
                    var _inserted = Array.isArray(rsl.upserted);

                    if (_inserted == true) {
                        hashs.push(hash);
                    }
                    next();
                });

            } else if (link && link.match(/^http(s)?\:/)) {

                link = init.decodeHTMLEntities(link);

                request.get(link, function (error, response, body) {
                    if (!body) return next();

                    var cType = response ? response.headers['content-type'] : null;

                    if (cType == 'application/octet-stream' || cType == 'application/x-bittorrent') {

                        parseTorrent.remote(link, function (err, ptor) {
                            if (err) return next();

                            var hash = ptor.infoHash;
                            var magnet = parseTorrent.toMagnetURI(ptor);

                            var _pTitle = (title && title != "" ? title : ptor.name);
                            _pTitle = init.clearMostTags(_pTitle);

                            var torrentobj = {
                                hash: hash,
                                title: _pTitle,
                                size: ptor.length,
                                magnet: magnet,
                                info: {
                                    name: ptor.name,
                                    type: type,
                                    source: name,
                                    private: ptor.private || false,
                                    link: link,
                                },
                                extra: {
                                    auto_download: autoDownload,
                                    auto_data: autoData,
                                    upload_profile: uploadProfile,
                                    // clean_list: feed_words_remove
                                    _idfeed: _idfeed
                                }
                            }

                            //Regx infos
                            if (type == 'tv') {
                                var _ktitle = _pTitle.replace(/\s+/ig, '.');
                                init.extInfo(_ktitle, function (err, _extInfo) {
                                    if (!err) {
                                        torrentobj['info']['season'] = _extInfo['season']
                                        torrentobj['info']['episode'] = _extInfo['episode']
                                        torrentobj['info']['air_episode'] = _extInfo['air_episode']
                                    }
                                })
                            }

                            var objiz = {
                                title: title,
                                hash: hash,
                                uploadProfile: uploadProfile,
                                magnet: magnet,
                                type: type
                            };

                            objParsing.push(objiz);

                            Torrents.updateOne({
                                hash: hash
                            }, torrentobj, {
                                upsert: true
                            }, function (err, rsl) {
                                var _inserted = Array.isArray(rsl.upserted);

                                if (_inserted == true) {
                                    hashs.push(hash);
                                }
                                next();
                            });
                        })
                    } else {
                        next();
                    }
                })
            } else {
                next();
            }
        }, function (err) {
            return callback(null, {
                objParsing: objParsing,
                hashs: hashs
            })
        })
    })
}


var pingFeedIs = function (_id, callback) {

    listfeeds(_id).then(function (mfeeds) {

        mfeeds = Array.isArray(mfeeds) ? mfeeds[0] : mfeeds;
        if (!mfeeds) return callback('No Feed found on DB');

        var bextra = mfeeds.extra;

        var autoData = Boolean(bextra.feed_auto_data);
        var autoDownload = Boolean(bextra.feed_auto_download);
        var uploadProfile = bextra.upload_profile;

        var objFeed = {
            _idfeed: _id,
            name: mfeeds.name,
            type: mfeeds.type,
            link: mfeeds.link,
            extra: bextra,
            status: mfeeds.status
        }

        //Grab profile info
        settings.listDefaultCrawlers(uploadProfile, function (err, sett) {

            if (!err && sett && sett['settings'])
                var defaultCrawlers = sett['settings']['defaultCrawlers'];
            else
                var defaultCrawlers = {
                    "movies": "imdb",
                    "tv": "tvdb"
                };
            parseFeedTorrents(objFeed, function (err, data) {
                if (err) return callback(err);

                var objParsing = data.objParsing;
                var hashs = data.hashs;

                dgrab.autoData({
                    data: objParsing,
                    defaultCrawlers: defaultCrawlers,
                    autoData: autoData
                }, function (err, data) {
                    if (autoDownload == true) {
                        async.eachSeries(objParsing, function (tobj, nxt) {
                            var hash = tobj.hash;
                            var magnet = tobj.magnet;
                            var torrent_title = tobj.title;
                            Logs.findOne({
                                "ts_infos.hash": hash,
                                "ts_infos.profile": mongoose.Types.ObjectId(uploadProfile),
                            }, function (err, result) {
                                if (result != null) {
                                    return nxt(); // review
                                } else {
                                    //* send torrent and then create task 
                                    //some torrent wont be added
                                    rtorrent.send({
                                        magnets: [magnet],
                                        hash: hash
                                    }, function () {
                                        tasks.addTorrentTask({
                                            hash: hash,
                                            nillTask: false,
                                            upload_profile: uploadProfile,
                                            torrent_title: torrent_title
                                        }, nxt);
                                    })
                                }
                            })
                        }, function () {
                            return callback(null, {
                                message: `${hashs.length} Torrents Saved to DB`
                            });
                        })
                    } else {
                        return callback(null, {
                            message: `${hashs.length} Torrents Saved to DB`
                        });
                    }
                });
            })
        })
    }).catch(callback)
}

//Ping Code Start Here
//create queue
var _pinger = new Queue('pinger', {
    defaultJobOptions: {
        maxRetriesPerRequest: null,//
        enableReadyCheck: false,//
        removeOnComplete: true,
        removeOnFail: true
    }
});

_pinger.process('*', (job, done) => {
    var _id = job && job.data ? job.data._id : null;
    if (!_id) return done('Missing ID');
    return pingFeedIs(_id, done);
})

var addFeed = function (opts, callback) {

    var name = opts.feed_name;
    var type = opts.feed_type;
    var link = opts.feed_url;

    var autoData = Boolean(opts.feed_auto_data);
    var autoPing = Boolean(opts.feed_auto_ping);
    var autoDownload = Boolean(opts.feed_auto_download);
    var uploadProfile = opts.upload_profile;

    var ping_interval = opts.ping_interval;

    var feed_exclude = opts.feed_exclude.map(function (str) {
        return str.replace(/([^\w \\])/g, '\\$1')
    }).filter(Boolean);

    var feed_include = opts.feed_include.map(function (str) {
        return str.replace(/([^\w \\])/g, '\\$1')
    }).filter(Boolean);

    var feed_words_remove = opts.feed_words_remove.map(function (str) {
        return str.replace(/([^\w \\])/g, '\\$1')
    }).filter(Boolean);

    var feed_clear_chars = opts.feed_clear_chars;
    var feed_status = Boolean(opts.feed_status);

    var objFeed = {
        name: name,
        type: type,
        link: link,
        extra: {
            feed_include: feed_include,
            feed_exclude: feed_exclude,
            feed_auto_download: autoDownload,
            feed_auto_data: autoData,
            feed_auto_ping: autoPing,
            feed_words_remove: feed_words_remove,
            feed_clear_chars: feed_clear_chars,
            upload_profile: uploadProfile,
            ping_interval: ping_interval
        },
        status: feed_status
    }


    Feeds.findOneAndUpdate({
        name: name
    }, objFeed, {
        upsert: true, new: true
    }, function (err, result, _doc) {
        if (err) return callback('Error saving Feed to database');

        var _id = result._id;
        var _name = result.name;
        if (!_id || !_name) return callback('Error adding Feed to Cron table');

        //https://cronexpressiondescriptor.azurewebsites.net/?expression=*%2F2+*+*+*+*&locale=en
        var _cron = `*/${ping_interval} * * * *`; //In Minutes

        var _odata = {
            _id: _id, name: _name
        };

        if (autoPing == true) {
            removeCronJob(_id, function (err) {
                if (err) return callback(`Can't Update Auto-Ping Interval, Ping is Running.`);

                _pinger.add(`${name}_Feed`, _odata, {
                    repeat: { cron: _cron }
                    , jobId: _odata._id
                }).then(function (_job) {
                    return callback(null, { message: `Feed Saved Successfully` });
                }).catch(function (err) {
                    return callback(null, { message: `Error adding Feed to Cron table` });
                })

            })
        } else {
            removeCronJob(_id, function (err) {
                if (err) return callback(`Can't remove Auto-Ping Interval, Ping is Running.`);
                return callback(null, { message: `Feed Saved Successfully.` });
            })
        }
    })
}


var removeFeed = function (_id, callback) {
    if (!_id) return callback('No feed Available.');
    //Cannot remove default profile
    Feeds.deleteOne({
        _id: _id
    }, function (err, data) {
        if (err) return callback("Error: Can't remove feed.");
        if (data && data.n == 0) return callback("Error: Can't remove this feed.");
        removeCronJob(_id, function () {
            return callback(null, data);
        })
    })
}

var removeCronJob = function (_id, callback) {
    if (!_id) return console.log('Missing _id ', _id)
    _pinger.getRepeatableJobs().then(function (_jobs) {
        async.eachSeries(_jobs, function (_job, next) {
            var _key = _job.key;
            if (_job.id == _id) {
                _pinger.removeRepeatableByKey(_key).then(function () {
                    _pinger.getJobs().then(function (_jobs) {
                        async.eachSeries(_jobs, function (_job, _next) {
                            if (_job.data._id == _id) {
                                _job.remove().then(_next).catch(function (err) {
                                    return _next('Could not remove job repeat');
                                })
                            } else {
                                return _next();
                            }
                        }, next)
                    })
                }).catch(next);
            } else {
                return next();
            }
        }, callback)
    })
}


var savePrez = function (opts, callback) {

    var _id_ = opts._id_;
    var type = opts.type;
    var uploadProfile = opts.pptprofiles;

    var item = {};
    item.title = opts.title;
    item.year = opts.year;
    item.runtime = opts.runtime || '';
    item.genres = opts.genres || [];
    item.summary = opts.summary || '';
    item.stars = Array.isArray(opts.stars) ? opts.stars.map(function (_val) {
        return _val.ucwords();
    }) : (opts.stars ? opts.stars : []);
    item.source = Array.isArray(opts.source) ? opts.source : (opts.source ? [opts.source] : []);

    Array.isArray(opts.tags) ? opts.tags.push(item.title) : '';
    item.tags = Array.isArray(opts.tags) ? opts.tags.map(function (_val) {
        return _val.toLowerCase().ucwords();
    }) : opts.tags;

    var image = item.image = !opts.bc_image ? opts.image : opts.bc_image;

    var nillTask = opts.nilltask;
    var updateData = opts.datatt; 

    var tpid = opts.tpid;

    var _hashs_ = opts.hashs;

    item['images'] = [image];

    if (!_id_) {
        //For Files 
        return dgrab.saveTopic({
            type: type,
            item: item,
            hash: _hashs_
        }, function (err, data) {

            if (updateData == false) {
                var path = opts.path;
                var topicId = data && data._id ? (nillTask == false ? data._id : null) : null;
                tasks.add({
                    path: path,
                    topicId: topicId,
                    upload_profile: uploadProfile
                }, callback)
            } else {
                callback(null, {
                    message: 'Successfully Updated.',
                    data: []
                });
            }

        })

    } else {
        Torrents.findOne({
            _id: _id_
        }, 'hash magnet title', function (err, tor) {
            if (err || !tor) return callback('Torrent Deleted from DB.');

            var hash = tor.hash;
            var magnet = tor.magnet;
            var torrent_title = tor.title;

            var oSave = {};
            //hash to only save in topic
            if (_hashs_.includes(hash) === false) _hashs_.push(hash);
            oSave['hash'] = _hashs_;
            oSave['type'] = type;
            oSave['item'] = item;

            oSave['uploadProfile'] = uploadProfile;
            oSave['tpid'] = tpid ? tpid : null;

            dgrab.saveTopic(oSave, function (err, data) {

                if (data && data._id) {
                    var idTopic = mongoose.Types.ObjectId(data._id);
                    Logs.updateMany({
                        $and: [{
                            "ts_infos.hash": {
                                $in: _hashs_
                            }
                        }, {
                            $or: [
                                { "ts_infos.topic": { $type: 10 } },
                                { "ts_infos.topic": { $exists: false } }
                            ]
                        }]
                    }, { $set: { "ts_infos.topic": idTopic } }).exec();
                    //
                    Tasks.updateMany({
                        $and: [{
                            "infos.hash": {
                                $in: _hashs_
                            }
                        }, {
                            $or: [
                                { "infos.topic": { $type: 10 } },
                                { "infos.topic": { $exists: false } }
                            ]
                        }]
                    }, { $set: { "infos.topic": idTopic } }).exec();
                }

                if (updateData == false) {
                    tasks.addTorrentTask({
                        hash: hash,
                        nillTask: nillTask,
                        torrent_title: torrent_title,
                        upload_profile: uploadProfile
                    }, function (err, result) {
                        if (err) return callback(err);

                        rtorrent.send({
                            magnets: [magnet],
                            hash: hash
                        }, function (error, value) {
                            //check result of returned "value" to wherever to run axxe or not
                            var message = result && result.nModified == 0 ? 'Task Created Successfully.' : 'Task Updated Successfully.';
                            return callback(null, {
                                message: message,
                                data: data
                            });
                        });

                    })
                } else {
                    return callback(null, {
                        message: 'Successfully Updated.',
                        data: data
                    });
                }
            })
        })
    }
}

var listfeeds = function (_id) {
    return new Promise(function (resolve, reject) {
        var query = _id ? {
            _id: _id
        } : {};

        Feeds.find(query).lean().then(function (result) {
            return resolve(result);
        }).catch(function(){
           return resolve({});
        })
    })
}

var listTopic = function (_id) {
    return new Promise(function (resolve, reject) {
        var query = _id ? {
            _id: _id
        } : {};

        Topics.find(query).lean().then(function (result) {
            return resolve(result);
        }).catch(function(){
           return resolve({});
        })
    })
}

var removePrez = function (_id) {
    return new Promise(function (resolve, reject) {
        var query = {
            _id: mongoose.Types.ObjectId(_id)
        }

        Topics.deleteOne(query, function (err, result) {
            if (err) return resolve({});

            return resolve(result);
        })
    })
}

var listTorrents = function (opts) {
    return new Promise(function (resolve, reject) {

        const options = {
            page: parseInt(opts.page) || 1,
            limit: opts.limit || 50,
            sort: {
                'added': -1
            },
            allowDiskUse: true
        };

        Preferences.findOne({}, function (err, preferences) {
            var types = preferences ? preferences['types'] : [];

            var torrentAggregate = Torrents.aggregate([
                {
                    $lookup: {
                        from: "topics",
                        localField: "hash", 
                        foreignField: "extra.hashs",
                        as: "topic_docs"
                    }
                },
                {
                    $lookup: {
                        from: "logs",
                        localField: "hash",
                        foreignField: "ts_infos.hash",
                        as: "logs_data"
                    }
                },
                {
                    $project: {
                        _id: 1,
                        hash: 1,
                        added: 1,
                        extra: 1,
                        info: 1,
                        magnet: 1,
                        size: 1,
                        title: 1,
                        topic_docs: 1,
                        posted: {
                            $ifNull: [{ $arrayElemAt: ['$logs_data.posted.status', 0] }, false]
                        }
                    }
                }
            ])

            Torrents.aggregatePaginate(torrentAggregate, options, function (err, sresult) {
                var feeds = [];
                var cfeed = 0

                listfeeds().then(function (mfeeds) {
                    feeds = mfeeds;
                    cfeed = mfeeds.length;
                    return settings.listProfiles();
                }).then(function (profiles) {

                    resolve({
                        types: types || [],
                        cfeed: cfeed || '',
                        feeds: feeds || [],
                        sresult: sresult || [],
                        profiles: profiles || []
                    })
                })
            })
        })
    })
}

var localsearch = function (opts, callback) {

    opts = opts || {};

    var taball = {};

    const options = {
        page: parseInt(opts.page) || 1,
        limit: opts.limit || 50,
        sort: {
            'added': -1
        },
        allowDiskUse: true
    };

    var keyword = opts.keyword.replace(/\s+/ig, ' ');
    var section = opts.section || '';

    var query = {};

    keyword = keyword.trim().split(/\s+/i);

    var ghtarr = keyword.map(function (v) {
        return { "title": { $regex: v + '.*', $options: 'i' } };
    })

    query = { "$and": ghtarr };

    var arryTypes = ["movies", "tv", "games", "music", "books", "anime", "applications", "miscellaneous", "other"]

    switch (section) {
        case "all":
            query["info.type"] = {
                "$in": arryTypes
            };
            break;

        case "movies":
            query["info.type"] = { "$eq": "movies" };
            break;

        case "tv":
            query["info.type"] = { "$eq": "tv" };
            break;

        case "games":
            query["info.type"] = { "$eq": "games" };
            break;

        case "music":
            query["info.type"] = { "$eq": "music" };
            break;

        case "books":
            query["info.type"] = { "$eq": "books" };
            break;

        case "anime":
            query["info.type"] = { "$eq": "anime" };
            break;

        case "applications":
            query["info.type"] = { "$eq": "applications" };
            break;

        case "miscellaneous":
            query["info.type"] = { "$eq": "miscellaneous" };
            break;

        case "other":
            query["info.type"] = { "$eq": "other" };
            break;
    }

    var torrentAggregate = Torrents.aggregate([
        {
            $match: query
        },
        {
            $lookup: {
                from: "topics",
                localField: "hash", 
                foreignField: "extra.hashs",
                as: "topic_docs"
            }
        }
        // 
        , {
            $lookup: {
                from: "logs",
                localField: "hash",
                foreignField: "ts_infos.hash",
                as: "logs_data"
            }
        },
        {
            $project: {
                _id: 1,
                hash: 1,
                added: 1,
                extra: 1,
                info: 1,
                magnet: 1,
                size: 1,
                title: 1,
                topic_docs: 1,
                posted: {
                    $ifNull: [{ $arrayElemAt: ['$logs_data.posted.status', 0] }, false]
                }
            }
        }
    ]);

    Torrents.aggregatePaginate(torrentAggregate, options, function (err, sresult) {

        taball['count'] = sresult.totalDocs;
        taball['list'] = sresult.docs;
        taball['section'] = query["info.type"]["$eq"] ? query["info.type"]["$eq"] : '';

        return callback(null, taball);
    })
}

var removeTorrents = function (opts, callback) {
    opts = opts || {};
    var ids = Array.isArray(opts.ids) ? opts.ids : [opts.ids];
    ids = ids.map(function (_id) {
        return _id.replace(/tr_/ig, '');
    })

    var query = {
        _id: {
            "$in": ids
        }
    };

    Torrents.find(query, 'hash', function (err, data) {
        if (!data) return callback();
        Torrents.deleteMany(query, function () {

            var _hashs = data.map(function (_obj) {
                return _obj.hash;
            })

            Topics.updateMany({
                "extra.hashs": {
                    $in: _hashs
                }
            }, {
                $pullAll: {
                    "extra.hashs": _hashs
                }
            }, {
                multi: true
            }, function (err, result) {
                return rtorrent.erase(data, callback)
            })
        });
    });
}

var prezSearch = function (opts, callback) {
    return dgrab.search(opts, callback);
}

//Rtorrent stuff
var sendTorrent = function (opts, callback) {
    opts = opts || {};
    var ids = Array.isArray(opts.ids) ? opts.ids : [opts.ids];
    var query = {
        _id: {
            "$in": ids
        }
    };

    Torrents.find(query, 'magnet', function (err, result) {
        if (!result) return callback('No torrent Found...');

        return rtorrent.sendStd({
            magnets: result.map(function (v) {
                return v.magnet;
            })
        }, callback)
    })

}

var rPingTracker = function (opts, callback) {
    opts = opts || {};
    return rtorrent.SaveTracksTorrents(opts, callback);
}





module.exports.listfeeds = listfeeds;
module.exports.listTopic = listTopic;
module.exports.removePrez = removePrez;
module.exports.addFeed = addFeed;
module.exports.pingFeedIs = pingFeedIs;
module.exports.listTorrents = listTorrents;
module.exports.localsearch = localsearch;
module.exports.removeFeed = removeFeed;
module.exports.removeTorrents = removeTorrents;
module.exports.prezSearch = prezSearch;
module.exports.savePrez = savePrez;
module.exports.sendTorrent = sendTorrent;
module.exports.rPingTracker = rPingTracker;