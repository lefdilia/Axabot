const async = require('async');
const Queue = require('bull');
const notifier = require('./notifier');
const API = require('./api');
//Hosts
const uptobox_com = require('./_hosts/__uptobox_com.job');
const unfichier_com = require('./_hosts/__unfichier_com.job');
const rapidgator_net = require('./_hosts/__rapidgator_net.job');
const nitroflare_com = require('./_hosts/__nitroflare_com.job.js');
const turbobit_net = require('./_hosts/__turbobit_net.job.js');
const uploaded_net = require('./_hosts/__uploaded_net.job');
const rockfile_co = require('./_hosts/__rockfile_co.job');
const mixdrop_co = require('./_hosts/__mixdrop_co.job.js');
const anonfile_com = require('./_hosts/__anonfile_com.job.js');
const keep2share_cc = require('./_hosts/__keep2share_cc.job.js');
const gounlimited_to = require('./_hosts/__gounlimited_to.job.js');
const katfile_com = require('./_hosts/__katfile_com.job.js');
const dropapk_to = require('./_hosts/__dropapk_to.job.js');
const uploadgig_com = require('./_hosts/__uploadgig_com.job.js');
//*
const openload_co = require('./_hosts/__openload_co.job.js');
const streamango_com = require('./_hosts/__streamango_com.job.js');
const vidcloud_co = require('./_hosts/__vidcloud_co.job.js');
const onlystream_tv = require('./_hosts/__onlystream_tv.job.js');
const verystream_com = require('./_hosts/__verystream_com.job.js');
const vidoza_net = require('./_hosts/__vidoza_net.job.js');
const saruch_co = require('./_hosts/__saruch_co.job.js');
const clipwatching_com = require('./_hosts/__clipwatching_com.job.js');
//*
const imgur_com = require('./_hosts/__imgur_com.job');
const imgbox_com = require('./_hosts/__imgbox_com.job');
const pixhost_to = require('./_hosts/__pixhost_to.job');
//*
const Shortner = require('./_hosts/__shortner.job');
//Need PP Class 
const Progress = require('./progress');
const Logs = require('./logs');
const Tasks = require('../models/tasks').tasks;
const ChildTasks = require('../models/tasks').childTasks;
const mongoose = require('mongoose');

//init The queue
var _delay = 500;
var _concurrency = 5;

const uploadQueue = new Queue('uploadQueue', {
    defaultJobOptions: {
        delay: _delay,
        maxRetriesPerRequest: null,//new
        //
        // maxStalledCount: 5,//Max amount of times a stalled job will be re-processed.
        //
        enableReadyCheck: false,//new
        removeOnComplete: true,
        removeOnFail: true
        /*
       True => will help on restart task, because old task is deleted after abort, add task withh add new from DB
       False => will help on retry attempt and not losing task after failure (empty data if retry task {} )
       */
    }, settings: {
        backoffStrategies: {
            'gamabee': function (attemptsMade, err) {
                var _rgxp = new RegExp(/(Upload\s+Cancelled|Aborted\s+By\s+User|The format\s+is\s+not\s+supported)/, 'ig');
                if (_rgxp.test(err)) {
                    return -1;
                } else {
                    attemptsMade = attemptsMade || 1;
                    let mik = (5000 + Math.random() * 500) * attemptsMade;
                    return mik;
                }
            }
        }
    }
});

var fs = require('fs');
const { Console } = require('console');
const output = fs.createWriteStream('/tmp/stdout.log', { flags: 'a' });
const errorOutput = fs.createWriteStream('/tmp/stderr.log', { flags: 'a' });
const logger = new Console(output, errorOutput);
setInterval(function () {
    uploadQueue.getJobCounts().then(function (vcount) {
        logger.log('getJobCounts vcount : ', vcount);
        logger.log('\n');
    })
}, 2000)

uploadQueue.setMaxListeners(0); //Set the max
uploadQueue.isReady().then(() => {
    uploadQueue.clean(0, 'failed');
    uploadQueue.clean(0, 'completed');

    uploadQueue.process(_concurrency, function (job, done) {
        var io = uploadQueue.io || global.io;
        return startUpload({
            job: job,
            io: io
        }, function (err, _res) {

            let _io = uploadQueue.io || global.io;
            checkTaskQueue({ job: job, _getIds: true }, function (_err, _result) {
                if (!_err && _result) {
                    let mainProgess = {
                        taskId: _result._taskId,
                        progress: _result._progress,
                        status: _result.sdstatus
                    }
                    _io.emit('mainprogress', JSON.stringify(mainProgess));
                }
            })
            return done(err, _res);
        });
    })
})

uploadQueue.on('error', function (error) {
    console.log('*Upload Queue Error : ', error);
})


var getRunnningJobs = function (opts, done) {
    opts = opts || {};

    var _getIds = opts._getIds || false;

    var _job = opts.job;
    var _taskId = _job.data.taskId;

    if (!_taskId) return done('Job not well formed...');
    if (_getIds == false) return done();

    uploadQueue.getJobs().then(function (jobs) { // ['active', 'waiting', 'delayed']
        const ids = jobs.map(function (x) {
            if (!x || !x.data || !x.data.stats || x.data.length == 0) return;
            return { taskId: x.data.taskId, status: x.data.stats.status };
        }).filter(function (_obj) {
            if (!_obj) return;
            return _obj.taskId == _taskId;
        })

        return done(null, ids);
    }).catch(done);
}

var checkTaskQueue = function (opts, done) {
    opts = opts || {};

    var _job = opts.job;

    var _authPost = opts._authPost || false;

    if (!_job) return done('No Job found...');

    var _error = opts.error || '';
    var _taskId = _job.data.taskId;

    if (!_taskId) return done('Job not well formed...');
    // user abort task so we have to cancel the upload
    var _cancelled = /Upload Cancelled/ig.test(_error);

    getRunnningJobs(opts, function (err, _ids) {
        if (err) _ids = null;

        Progress.countTotalProgress({ taskId: _taskId }, function (_err, _res) {
            var ktprogress = _res ? _res.ktprogress : 0;
            var _status = _res ? _res.status : [];

            if (Array.isArray(_ids) && _ids.length == 0) {
                // Ensure Task is finished here...
                _status = _status.map(function (status) {
                    return status == 'running' ? 'finished' : status;
                });

                Progress.mainTaskStatus({
                    taskId: _taskId,
                    status: 'finished'
                }, function (err, res) {
                    // 
                    if (_authPost == true) {
                        let _taskId_ = mongoose.Types.ObjectId(_taskId);

                        Tasks.aggregate([{
                            "$match": {
                                _id: _taskId_
                            }
                        }, {
                            $lookup: {
                                from: "logs",
                                localField: "_id",
                                foreignField: "taskId",
                                as: "_logs_"
                            }
                        }, {
                            $unwind: {
                                path: "$_logs_",
                                "preserveNullAndEmptyArrays": true
                            }
                        }, {
                            $project: {
                                _autopost: "$options.autoPost",
                                _forcedautopost: "$options.forcedAutoPost",
                                _topic: "$infos.topic",
                                _posted: "$_logs_.posted.status"
                            }
                        }
                        ]).exec(function (err, result) {
                            if (err || !result) return done('Error in Queue');
                            result = Array.isArray(result) ? result[0] : result;

                            var _autoPost = result && result._autopost ? Boolean(result._autopost) : false;
                            var _TopicExist = result && result._topic ? Boolean(result._topic) : false;
                            var _forcedautopost = result && result._forcedautopost ? Boolean(result._forcedautopost) : false;
                            var _Posted = result && result._posted ? Boolean(result._posted) : false;

                            Logs._ExportLogs({ _tid: _taskId }, function (err, _result) {
                                if (_autoPost == true && _Posted == false && _cancelled == false) {
                                    if (_TopicExist == true || _forcedautopost == true) {
                                        new API({ taskId: _taskId }).process(function () {
                                            return done(null, {
                                                _taskId: _taskId, _progress: ktprogress, status: _status, sdstatus: 'finished'
                                            });
                                        });
                                    }
                                } else {
                                    return done(null, {
                                        _taskId: _taskId, _progress: ktprogress, status: _status, sdstatus: 'finished'
                                    });
                                }
                            })
                        })
                    } else {
                        return done(null, {
                            _taskId: _taskId, _progress: ktprogress, status: _status, sdstatus: 'finished'
                        });
                    }
                })

            } else {
                return done(null, {
                    _taskId: _taskId, _progress: ktprogress, status: _status, sdstatus: 'running'
                })
            }
        })

    })

}


uploadQueue.on('active', function (job, jobPromise) {

    if (job) {
        let _io = uploadQueue.io || global.io;
        let _taskId = job.data.taskId;

        Progress.mainTaskStatus({
            taskId: _taskId,
            status: 'running'
        }, function (err, res) {
            checkTaskQueue({ job: job }, function (_err, _result) {
                if (!_err && _result) {
                    let _progress = _result._progress || 0;
                    let mainProgess = {
                        taskId: _taskId,
                        progress: _progress,
                        status: 'running'
                    }
                    _io.emit('mainprogress', JSON.stringify(mainProgess));
                }
            })
        })
    }
}).on('removed', function (job) { // Keepit works fine
    uploadQueue.clean(0, 'failed');
    uploadQueue.clean(0, 'completed');

    if (job && job._progress != 0) {
        let _io = uploadQueue.io || global.io;
        checkTaskQueue({ job: job, _getIds: true }, function (_err, _result) {

            if (!_err && _result) {
                let _uprogress = job._progress;
                _uprogress['status'] = 'aborted';
                _uprogress['error'] = 'Task Removed';
                Progress.childProgress(_uprogress, function (err, result) {
                    _io.emit('childprogress', JSON.stringify(_uprogress));
                    if (!_err) {
                        let mainProgess = {
                            taskId: _result._taskId,
                            progress: _result._progress,
                            status: _result.sdstatus
                        }
                        _io.emit('mainprogress', JSON.stringify(mainProgess));
                    }
                })
            }
        })
    }
}).on('completed', function (job, result) {
    uploadQueue.clean(0, 'failed');
    uploadQueue.clean(0, 'completed');

    if (job) {
        let _io = uploadQueue.io || global.io;
        checkTaskQueue({ job: job, _getIds: true, _authPost: true }, function (_err, _result) {

            if (!_err) {
                let mainProgess = {
                    taskId: _result._taskId,
                    progress: _result._progress,
                    status: _result.sdstatus
                }
                Progress.mainTaskStatus({
                    taskId: _result._taskId,
                    status: _result.sdstatus
                }, function (err, res) {
                    _io.emit('mainprogress', JSON.stringify(mainProgess));
                })
            }
        })
    }
}).on('failed', function (job, error) {
    //Prevent some jobs stuck on failed after app crash

    if (job) {
        let _io = uploadQueue.io || global.io;
        if (job._progress && job._progress.status != 'aborted') {
            let mprogress = job._progress || {};
            mprogress['status'] = 'aborted';
            mprogress['error'] = /job stalled/i.test(error.toString()) ? 'Job Freeze more than allowable' : (error.toString() ? error.toString() : 'Job failed');
            job.progress(mprogress);
        } else if (job._progress == 0 || job.data.length == 0) {
            let _progress = {
                jobId: job.id,
                taskId: null,
                host: null,
                mdoing: null,
                status: 'aborted',
                progress: '0',
                fspeed: '--/--',
                est: '00:00:00',
                uploaded: '--',
                fullSize: '--',
                byteSize: '0',
                error: 'Upload Cancelled'
            };
            job.progress(_progress);
        }

        checkTaskQueue({ job: job, error: error, _getIds: true, _authPost: true }, function (_err, _result) {

            if (!_err && _result) {
                let mainProgess = {
                    taskId: _result._taskId,
                    progress: _result._progress,
                    status: _result.sdstatus
                }

                Progress.mainTaskStatus({
                    taskId: _result._taskId,
                    status: _result.sdstatus
                }, function () {
                    _io.emit('mainprogress', JSON.stringify(mainProgess));
                })
            }
        })
    }
}).on('progress', function (job, progress) {
    // A job's progress was updated!
    let _io = uploadQueue.io || global.io;

    Progress.childProgress(progress, function (err, result) {
        _io.emit('childprogress', JSON.stringify(progress));
    })

})


function startTask(opts, callback) {
    //Push to queue
    //Update status to queued / or running..
    opts = opts || {};
    var _tasks = opts._tasks;
    var io = opts.io || global.io;
    var _upload_tries_ = opts.upload_tries || 0;

    if (!_tasks || _tasks.length == 0) return;

    var addedTask = [];

    async.each(_tasks, function (task, next) {
        if (!task) {
            return next();
        } else {
            var _idTask = task._id;
            var _attempts = task.upload_tries ? task.upload_tries : (_upload_tries_ ? _upload_tries_ : 0);

            if (!_idTask) {
                return next();
            } else {
                var _aObj = {
                    jobId: _idTask,
                    delay: _delay,
                    attempts: _attempts,
                    backoff: { type: 'gamabee' }
                };

                uploadQueue.io = io;
                uploadQueue.add(task, _aObj).then(function (job) {

                    if (job.data && job.data.taskId) {
                        let _data = job.data;
                        let _progress = {
                            jobId: _data._id,
                            taskId: _data.taskId,
                            host: _data.infos.host,
                            mdoing: 'Added to Queue....',
                            status: 'pending',
                            progress: '0',
                            fspeed: '--/--',
                            est: '00:00:00',
                            uploaded: '--',
                            fullSize: '--',
                            byteSize: '0'
                        };
                        job.progress(_progress);
                        addedTask.push(job.data.taskId.toString());
                        return next();
                    } else {
                        return next();
                    }
                }).catch(next);
            }
        }
    }, function (err) {
        return callback(null, addedTask);
    });

}

function start_miniTask(opts, callback) {
    opts = opts || {};
    var task = opts._task;
    var io = opts.io;

    var _attempts = task.upload_tries ? task.upload_tries : 0;

    if (!task) return console.log('No Task to add.');
    var _idTask = task._id;

    var _aObj = {
        jobId: _idTask,
        delay: _delay,
        attempts: _attempts,
        backoff: { type: 'gamabee' }
    };

    uploadQueue.io = io;
    uploadQueue.add(task, _aObj).then(function (job) {

        if (job.data && job.data.taskId) {
            let _data = job.data;
            let _progress = {
                jobId: _data._id,
                taskId: _data.taskId,
                host: _data.infos.host,
                mdoing: 'Added to Queue....',
                status: 'pending',
                progress: '0',
                fspeed: '--/--',
                est: '00:00:00',
                uploaded: '--',
                fullSize: '--',
                byteSize: '0'
            };
            job.progress(_progress);
        }

        return callback(null, [_idTask]);
    }).catch(function (err) {
        return callback('Can\'t add Task to the queue');
    });
}

function abortTorrentDownload(opts, callback) {
    opts = opts || {};

    var taskId = opts.taskId;
    var io = opts.io || global.io;

    Progress.abortTorrent({
        taskId: taskId,
        io: io
    }, callback)
}

function abortTask(opts, callback) {
    opts = opts || {};
    var _tasks = opts._tasks;
    var aborted = [];

    async.each(_tasks, function (_taks, next) {
        if (!_taks) {
            return next();
        } else {
            var jobId = _taks._id ? _taks._id.toString() : '';
            aborted.push(jobId);

            notifier.emit('abortupload', {
                jobId: jobId
            });

            uploadQueue.getJob(jobId).then(function (_job) {
                if (!_job) {
                    return next();
                } else {
                    _job.moveToCompleted(new Error('Aborted By User'), true, true).then(function () {
                        return _job.remove();
                    }).then(next).catch(next);
                }
            }).catch(next)
        }
    }, function (err) {
        return callback(null, aborted);
    })
}

function abort_miniTask(opts, callback) {
    opts = opts || {};
    var task = opts._task;
    if (!task) return callback('No Task to add.');

    const jobId = task._id ? task._id.toString() : '';

    if (!jobId) return callback('Task cannot be parsed.');
    notifier.emit('abortupload', {
        jobId: jobId
    });

    uploadQueue.getJob(jobId).then(function (_job) {
        if (!_job) throw new Error('No job Found here...');
        _job.moveToCompleted(new Error('Aborted By User'), true, true).then(function () {
            return _job.remove();
        }).then(function () {
            return callback(null, [jobId]);
        }).catch(function () {
            return callback('Task already removed from the queue.');
        });
    }).catch(function () {
        return callback('Task already removed from the queue..');
    });
}

function reStartTask(opts, callback) {
    abortTask(opts, function (err, aborted) {
        return startTask(opts, callback)
    })
}

function abortAllTasks(opts, callback) {
    var _io = opts.io || global.io;

    var aborted = [];
    uploadQueue.getJobs().then(function (jobs) {

        async.each(jobs, function (_job, next) {
            if (!_job) {
                return next();
            } else {
                var jobId = _job.id ? _job.id.toString() : '';

                notifier.emit('abortupload', {
                    jobId: jobId
                });

                aborted.push(jobId);
                _job.moveToCompleted(new Error('Aborted By User'), true, true).then(function () {
                    return _job.remove();
                }).then(next).catch(next);
            }
        }, function (err) {
            Promise.all([
                uploadQueue.clean(0, 'completed'),
                uploadQueue.clean(0, 'wait'),
                uploadQueue.clean(0, 'active'),
                uploadQueue.clean(0, 'delayed'),
                uploadQueue.clean(0, 'failed')
            ]).then(function () {
                Tasks.updateMany({}, {
                    $set: {
                        "stats.status": "finished"
                    }
                }, function (err, _res) {
                    ChildTasks.updateMany({
                        "stats.status": {
                            $nin: ["finished"]
                        }
                    }, {
                        $set: {
                            "stats.status": "aborted"
                        }
                    }, function (err, _res) {
                        _io.emit('_reload', JSON.stringify({
                            source: "abortall"
                        }))
                        return callback(null, aborted);
                    })
                })
            })
        })
    })
}

//Upload Initial Function
function startUpload(opts, callback) {
    opts = opts || {};
    var job = opts.job;
    var io = opts.io || global.io;

    if (!job || !job.data) return callback('No Task Available.');

    var _data = job.data;
    var _host = _data.infos ? _data.infos.host : null;

    var _shortners = _data.infos ? _data.infos.shortners : null;
    var taskId = _data.taskId;

    if (!_host) {
        job.moveToCompleted(new Error('Aborted By User'), true, true).then(function () {
            return job.remove();
        }).then(function () {
            return callback('Task has invalid Host type.');
        })
    }

    if (!taskId) {
        job.moveToCompleted(new Error('Aborted By User'), true, true).then(function () {
            return job.remove();
        }).then(function () {
            return callback('Task format is Invalid.');
        })
    }

    var func;

    switch (_host) {
        case 'uploaded.net':
            func = uploaded_net(job, io);
            break;

        case 'uptobox.com':
            func = uptobox_com(job, io);
            break;

        case '1fichier.com':
            func = unfichier_com(job, io);
            break;

        case 'rapidgator.net':
            func = rapidgator_net(job, io);
            break;

        case 'nitroflare.com':
            func = nitroflare_com(job, io);
            break;

        case 'turbobit.net':
            func = turbobit_net(job, io);
            break;

        case 'rockfile.co':
            func = rockfile_co(job, io);
            break;

        case 'mixdrop.co':
            func = mixdrop_co(job, io);
            break;

        case 'anonfile.com':
            func = anonfile_com(job, io);
            break;

        case 'keep2share.cc':
            func = keep2share_cc(job, io);
            break;

        case 'gounlimited.to':
            func = gounlimited_to(job, io);
            break;

        case 'katfile.com':
            func = katfile_com(job, io);
            break;

        case 'dropapk.to':
            func = dropapk_to(job, io);
            break;

        case 'uploadgig.com':
            func = uploadgig_com(job, io);
            break;

        //streaming
        case 'openload.co':
            func = openload_co(job, io);
            break;

        case 'streamango.com':
            func = streamango_com(job, io);
            break;

        case 'vidcloud.co':
            func = vidcloud_co(job, io);
            break;

        case 'onlystream.tv':
            func = onlystream_tv(job, io);
            break;

        case 'verystream.com':
            func = verystream_com(job, io);
            break;

        case 'vidoza.net':
            func = vidoza_net(job, io);
            break;

        case 'saruch.co':
            func = saruch_co(job, io);
            break;

        case 'clipwatching.com':
            func = clipwatching_com(job, io);
            break;

        //Images
        case 'imgur.com':
            func = imgur_com(job, io);
            break;

        case 'imgbox.com':
            func = imgbox_com(job, io);
            break;

        case 'pixhost.to':
            func = pixhost_to(job, io);
            break;

    }

    if (func == null) {
        job.moveToCompleted(new Error('Aborted By User'), true, true).then(function () {
            return job.remove();
        }).then(function () {
            return callback('Task format is Invalid.');
        })
    } else {
        func.process(function (err, _res) {
            if (err) {
                return callback(err);
            } else {

                if (_res && _res.taskId) {
                    if (Array.isArray(_shortners) && _shortners.length > 0) {
                        Shortner({ _shortners: _shortners, _res: _res }).process(function (__res) {
                            return Logs.saveLogs(__res, callback);
                        })
                    } else {
                        return Logs.saveLogs(_res, callback);
                    }
                } else {
                    return callback(err, _res);
                }
            }
        })
    }
}


module.exports._uploadQueue = uploadQueue;
module.exports.startTask = startTask;
module.exports.start_miniTask = start_miniTask;
module.exports.abortTorrentDownload = abortTorrentDownload;
module.exports.reStartTask = reStartTask;
module.exports.abortTask = abortTask;
module.exports.abort_miniTask = abort_miniTask;
module.exports.abortAllTasks = abortAllTasks;