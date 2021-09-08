const request = require('retry-request');
const init = require(__dirname + '/config/init');
const json_mediainfo = require(__dirname + '/lib/mediainfo');
const cw = require(__dirname + '/lib/cworker');
const rar = require(__dirname + '/lib/rar');
const fs = require('fs');
const path = require('path');
const async = require('async');
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;

const url = 'mongodb://127.0.0.1:27017/axabot';

var args = process.argv;

/*
 [
  '/usr/bin/node',
  '/mnt/hgfs/clean_install/axabot/axxe.js',
  '8BCA08A1FC513110E9BDB2AB860D1B637FE37CE5',
  '',
  '/srv/seedbox/downloads/',
  'New.Amsterdam.2018.S02E08.iNTERNAL.480p.x264-mSD[eztv].mkv',
  '1',
  '1',
  '1',
  '1'
 ]
*/
// node axxe.js 8BCA08A1FC513110E9BDB2AB860D1B637FE37CE5 '' '/srv/seedbox/downloads/' 'New.Amsterdam.2018.S02E08.iNTERNAL.480p.x264-mSD[eztv].mkv' '1' '1' '1' '1'

if (args.length < 6) return console.log('some Arguments are Missing....');

args.splice(0, 2);

var hash = args[0];
var label = args[1];
var dirDL = args[2];
var file = args[3];


/*
{ "current" : 3, "available" : 51197, "totalCreated" : 32 }
> db.serverStatus().connections

+1 -> shell mongod
+1 -> adminmongo
+2 -> axabot (app) + session store
*/

var opts = {
  hash: hash,
  label: label,
  dirDL: dirDL,
  file: file
};

var client = null;
var database = null;
var Tasks = null;
var Topics = null;
var ChildTasks = null;
var Torrents = null;
var Logs = null;
var Feeds = null;

MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true }).then(function (client) {
  var db = client.db('axabot');
  Tasks = db.collection('tasks');
  Topics = db.collection('topics');
  ChildTasks = db.collection('childTasks');
  Torrents = db.collection('torrents');
  Logs = db.collection('logs');
  Feeds = db.collection('feeds');
  return;
}).then(function () {
  createTask(opts, function (err, task) {
    if (client) {
      client.close();
      client = null;
      Tasks = null;
      process.exit();
      return;
    } else {
      process.exit();
      return;
    }
  })
}).catch(function (merror) {
  process.exit();
  return;
})

/*
if Directory --> walk over all files and rename them
if File --> renam file
==>
update fullPath

*/

// var walkdir = require('walkdir');

function renamer(opts) {
  opts = opts || {};

  return new Promise(function (resolve, reject) {

    var _hash = opts.hash;

    if (!_hash) return reject("Can't find HASH..");

    var regw = new RegExp(hash, "i");

    var query = {
      "$match": {
        "hash": regw
      }
    };

    Torrents.aggregate([
      query,
      {
        "$project": {
          "ObjId": { "$toObjectId": "$extra._idfeed" }
        }
      },
      {
        $lookup: {
          from: "feeds",
          localField: "ObjId", //  field in aggregate
          foreignField: "_id",// field in `from`
          as: "feed_data"
        }
      }, {
        $unwind: {
          path: "$feed_data",
          "preserveNullAndEmptyArrays": true
        }
      }
      , {
        $project: {
          _id: 0,
          wordlist: {
            $ifNull: ["$feed_data.extra.feed_words_remove", []]
          },
          remove_chars: {
            $ifNull: ["$feed_data.extra.feed_clear_chars", false]
          }
        }
      }
    ]).toArray(function (err, _data) {
      if (err) return resolve({});
      _data = Array.isArray(_data) ? _data[0] : _data;

      var wordlist = _data['wordlist'] || [];
      var remove_chars = _data['remove_chars'] || [];

      return resolve({
        wordlist: wordlist,
        remove_chars: remove_chars
      })
    })
  });
}


function createTask(opts, done) {

  opts = opts || {};

  var TaskObject = {};
  var _initTaskObject = {
    infos: {},
    extra: {},
    stats: {}
  };

  var hash = opts.hash;
  var label = opts.label;
  var dirDL = opts.dirDL;
  var file = opts.file;

  var fullPath = path.resolve(dirDL, file);

  var isDirectory = false;
  var size = 0;
  var time = {}

  fileStat(fullPath).then(function (fileStats) {
    time = {
      atime: fileStats.atime,
      mtime: fileStats.mtime,
      ctime: fileStats.ctime
    }
    isDirectory = fileStats.isDirectory();
    size = fileStats.size;
    _initTaskObject.infos.time = time;
    _initTaskObject.infos.isDirectory = isDirectory;
    _initTaskObject.infos.path = fullPath;

    _initTaskObject.stats.status = 'pending';
    _initTaskObject.stats.speed = 0;
    _initTaskObject.stats.progress = 0;
    _initTaskObject.stats.uploaded = 0;
    return;
  }).then(function () {
    return renamer(opts);
  }).then(function (_cleanme) {
    _initTaskObject.infos._cleanme = _cleanme || {};
    return aggrTask(hash);
  }).then(function (_tasks) {
    //async loop on tasks to create each one base on hash+profile
    async.eachSeries(_tasks, function (res, next) {
      //Temp Object for each task to prevent changing previous stable infos (_initTaskObject) /!\
      TaskObject = _initTaskObject;

      var sett = res.settings || {};
      var mainTaskId = res._id;
      var topic_data = res.topic_data;
      var rid = res.rid || init.rn(6);

      initProcessData({
        fullPath: fullPath, isDirectory: isDirectory, settings: sett, rid: rid
      }).then(function (data) {
        if (!data) throw new Error('No Data, i have to exit.');

        TaskObject.infos.rec_paths = data.rec_paths;
        TaskObject.infos.size = data.size ? data.size : size;
        TaskObject.extra.nfos = data.nfos ? data.nfos : [];
        TaskObject.extra.sample = data.sample ? data.sample : [];
        TaskObject.infos.mediainfos = data.mediainfos ? data.mediainfos : {};

        return processThumbnail({
          fullPath: fullPath,
          sett: sett,
          rid: rid
        })
      }).then(function (thumbs) {
        TaskObject.extra.thumbs = thumbs;
      }).then(function () {
        return dealWithRest({
          mainTaskId: mainTaskId,
          TaskObject: TaskObject,
          sett: sett,
          topic_data: topic_data
        });
      }).then(function () {
        return next()
      }).catch(function (error) {
        return next(error)
      })
    }, function (error) {
      return done();
    })
  }).catch(function (error) {
    return done(error);
  })
}


function dealWithRest(opts) {
  return new Promise(function (_resolve, _reject) {
    //
    var sett = opts.sett || {};

    var TaskObject = opts.TaskObject || {};
    var topic_data = opts.topic_data || [];
    var mainTaskId = opts.mainTaskId;
    //

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

    //['pending', 'aborted', 'running', 'finished', 'queued']
    var mbstatus = sett.startUploadAuto == true ? 'pending' : 'pending';

    var subtasks = [];
    var mbStats = {
      status: mbstatus,
      speed: 0,
      progress: 0,
      uploaded: 0,
    };

    var istime = {
      created: new Date(),
      started: null,
      finished: null,
    }

    var _cleanme = TaskObject.infos._cleanme;

    var _wordlist = _cleanme.wordlist;
    var _remove_chars = _cleanme.remove_chars;

    //Create Files Task
    var files = TaskObject.infos.rec_paths;

    var promise1 = new Promise(function (resolve, reject) {
      async.forEachOf(files, function (kfile, index, next) {

        var _ext = path.extname(kfile);
        var _BaseName = path.basename(kfile, _ext);

        if (sett.randomFilename) {
          var filenameRD = init.unifyNames(13, "N", bPrefix) + _ext;
          var _filename = _BaseName + _ext;
        } else {
          var _rgxp = new RegExp(_wordlist.join("|"), 'ig');

          _BaseName = _BaseName.replace(_rgxp, '');
          if (_remove_chars == true)
            _BaseName = _BaseName
              .replace(/[`~!@#$%^&*()|+\-=?;:'.",<>\{\}\[\]\\\/]/gi, ' ')
              .trim()
              .replace(/\s+/g, '.')
              .replace(/\.\_+/ig, '_')
              .replace(/\_+/g, '_');

          var filenameRD = _BaseName + _ext;
          var _filename = _BaseName + _ext;
        }


        async.each(hosts, function (host, nxt) {

          var oSubTasks = {
            taskId: mainTaskId,
            infos: {
              type: 'file',
              path: kfile,
              _key: 'file',
              host: host,
              filename: _filename,
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
          var _BaseName = path.basename(sample, _ext);

          if (sett.randomFilename) {
            var filenameRD = init.unifyNames(13, "N", bPrefix) + "_Sample_" + _ext;
            var _filename = _BaseName + _ext;
          } else {
            var _rgxp = new RegExp(_wordlist.join("|"), 'ig');

            _BaseName = _BaseName.replace(_rgxp, '');
            if (_remove_chars == true)
              _BaseName = _BaseName
                .replace(/[`~!@#$%^&*()|+\-=?;:'.",<>\{\}\[\]\\\/]/gi, ' ')
                .trim()
                .replace(/\s+/g, '.')
                .replace(/\.\_+/ig, '_')
                .replace(/\_+/g, '_');

            var filenameRD = _BaseName + _ext;
            var _filename = _BaseName + _ext;
          }

          subtasks.push({
            taskId: mainTaskId,
            infos: {
              type: 'file',
              path: sample,
              _key: 'sample',
              host: host,
              filename: _filename,
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
          var _BaseName = path.basename(nfos, _ext);

          if (sett.randomFilename) {
            var filenameRD = init.unifyNames(13, "N", bPrefix) + "_NFO_" + _ext;
            var _filename = _BaseName + _ext;
          } else {
            var _rgxp = new RegExp(_wordlist.join("|"), 'ig');

            _BaseName = _BaseName.replace(_rgxp, '');
            if (_remove_chars == true)
              _BaseName = _BaseName
                .replace(/[`~!@#$%^&*()|+\-=?;:'.",<>\{\}\[\]\\\/]/gi, ' ')
                .trim()
                .replace(/\s+/g, '.')
                .replace(/\.\_+/ig, '_')
                .replace(/\_+/g, '_');

            var filenameRD = _BaseName + _ext;
            var _filename = _BaseName + _ext;
          }

          subtasks.push({
            taskId: mainTaskId,
            infos: {
              type: 'image',
              path: nfos,
              _key: 'nfo',
              host: host,
              filename: _filename,
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
        if (uploadTopicImage == true && poster !== null) {

          var _ext = path.extname(poster);
          var _BaseName = path.basename(poster, _ext);

          if (sett.randomFilename) {
            var filenameRD = init.unifyNames(13, "N", bPrefix) + "_Poster_" + _ext;
            var _filename = _BaseName + _ext;
          } else {
            var _rgxp = new RegExp(_wordlist.join("|"), 'ig');

            _BaseName = _BaseName.replace(_rgxp, '');
            if (_remove_chars == true)
              _BaseName = _BaseName
                .replace(/[`~!@#$%^&*()|+\-=?;:'.",<>\{\}\[\]\\\/]/gi, ' ')
                .trim()
                .replace(/\s+/g, '.')
                .replace(/\.\_+/ig, '_')
                .replace(/\_+/g, '_');

            var filenameRD = _BaseName + _ext;
            var _filename = _BaseName + _ext;
          }


          subtasks.push({
            taskId: mainTaskId,
            infos: {
              type: 'image',
              path: poster,
              _key: 'poster',
              host: host,
              filename: _filename,
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
            var _BaseName = path.basename(_thubm, _ext);

            if (sett.randomFilename) {
              var filenameRD = init.unifyNames(13, "N", bPrefix) + "_Thumbnail_" + _ext;
              var _filename = _BaseName + _ext;
            } else {
              var _rgxp = new RegExp(_wordlist.join("|"), 'ig');

              _BaseName = _BaseName.replace(_rgxp, '');
              if (_remove_chars == true)
                _BaseName = _BaseName
                  .replace(/[`~!@#$%^&*()|+\-=?;:'.",<>\{\}\[\]\\\/]/gi, ' ')
                  .trim()
                  .replace(/\s+/g, '.')
                  .replace(/\.\_+/ig, '_')
                  .replace(/\_+/g, '_');

              var filenameRD = _BaseName + _ext;
              var _filename = _BaseName + _ext;
            }

            return subtasks.push({
              taskId: mainTaskId,
              infos: {
                type: 'image',
                path: _thubm,
                _key: 'thumb',
                host: host,
                filename: _filename,
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

      var path = TaskObject.infos.path;
      var rec_paths = TaskObject.infos.rec_paths;
      var isDirectory = TaskObject.infos.isDirectory;
      var size = TaskObject.infos.size;
      var time = TaskObject.infos.time;

      var mediainfos = TaskObject.infos.mediainfos;

      var extra = TaskObject.extra;
      var stats = TaskObject.stats;

      var regw = new RegExp(hash, "i");
      return Tasks.updateMany({
        $and: [
          {
            _id: mainTaskId
          }
          ,
          {
            "stats.status": {
              $nin: ["finished"]
            }
          }, {
            "infos.hash": regw
          }]

      }, {
        $set: {
          "infos.path": path,
          "infos.rec_paths": rec_paths,
          "infos.isDirectory": isDirectory,
          "infos.size": size,
          "infos.time": time,
          "extra": extra,
          "stats": stats
        }
      }, {
        multi: true
      }).then(function (data) {
        Logs.updateMany({
          taskId: mainTaskId
        }, {
          $set: {
            "ts_infos.path": path,
            "ts_infos.rec_paths": rec_paths,
            "ts_infos.isDirectory": isDirectory,
            "ts_infos.size": size,
            "ts_infos.time": time,
            "ts_infos.mediainfos": mediainfos,
            "extra": extra
          }
        }, {
          multi: true
        })
        return data;
      }).then(function (data) {

        ChildTasks.insertMany(subtasks, { ordered: false }, function (err, data) {

          var rtn = data ? data['insertedIds'] : [];

          ChildTasks.find({ taskId: mainTaskId, "stats.status": { $ne: "finished" } }).toArray(function (err, _tasks) {

            initJobLog(_tasks, function (err, result) {
              if (client) {
                client.close();
                client = null;
                Tasks = null;
              }

              /* 
                  function retryStrategy(err, response, body, options) {
                    return !!err || response.statusCode !== 200;
                  }
    
                  request({
                    url: `http://127.0.0.1/kapi/updateStatus/${mainTaskId}`,
                    maxAttempts: 5,   // (default) try 5 times
                    retryDelay: 5000,  // (default) wait for 5s before trying again
                    retryStrategy: retryStrategy // (default) retry on 5xx or network errors
                  }, function (err, response, body) {
                    return _resolve(rtn);
                  }); 
              */


              var originalRequest = require('request').defaults({
                method: 'POST',
                json: true,
                followAllRedirects: true,
                form: { mainTaskId: mainTaskId.toString(), startUploadAuto: sett.startUploadAuto }
              });

              var opts = {
                request: originalRequest,
                retries: 5,
                shouldRetryFn: function (incomingHttpMessage) {
                  let body = incomingHttpMessage.body || {};
                  return body.message !== 'Success' || incomingHttpMessage.statusCode !== 200;
                }
              };

              request(`http://127.0.0.1/kapi/updateStatus/`, opts, function (err, resp, body) {
                return _resolve(rtn);
              });


            })
          })
        })
      }).catch(_reject);
    }).catch(_reject);

  })
}

function initProcessData(opts) {
  return new Promise(function (resolve, reject) {
    var fullPath = opts.fullPath;
    var isDirectory = opts.isDirectory;
    var sett = opts.settings
    var rid = opts.rid

    if (isDirectory == true) {
      return processDirectory({
        fullPath: fullPath,
        sett: sett,
        rid: rid
      }).then(resolve).catch(reject);
    } else {
      return processFiles({
        fullPath: fullPath,
        sett: sett,
        rid: rid
      }).then(resolve).catch(reject);
    }
  })
}

function initJobLog(_tasks, callback) {
  _tasks = _tasks || [];
  if (_tasks.length == 0) return callback('*No tasks Found...');

  var taskId = _tasks[0].taskId;
  taskId = new ObjectID(taskId);

  var sets = []
  async.eachSeries(_tasks, function (task, next) {

    var jobId = task._id;
    taskId = !taskId ? new ObjectID(task.taskId) : taskId;

    if (!taskId || !jobId) return next(); //

    jobId = new ObjectID(jobId);

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

function fileStat(fullPath) {
  return new Promise(function (resolve, reject) {
    fs.stat(fullPath, function (err, fileStats) {
      if (err) return reject(err);
      return resolve(fileStats);
    })
  })
}

function processThumbnail(opts) {
  return new Promise(function (resolve, reject) {
    var sett = opts.sett;
    var fullPath = opts.fullPath;
    var rid = opts.rid;
    if (sett.thumbnailEnabled == true) {
      cw.createThumbnail({
        file: fullPath,
        cols: sett.thumbnailCols,
        rows: sett.thumbnailRows,
        rid: rid
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
  var rid = opts.rid;
  var mediaFile = opts.reswalk.files;
  mediaFile = Array.isArray(mediaFile) ? mediaFile : [mediaFile];

  if (sett.sampleEnabled == true && mediaFile && mediaFile.length > 0) {
    var mFile = mediaFile[0];

    cw.createSample({
      file: mFile, rid: rid
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
    var rid = opts.rid;

    // if nfoProcess
    if (sett.nfoProcess == true && nfoFile && nfoFile.length > 0) {
      var nfo = nfoFile[0];
      cw.convertNFO({
        bbname: bbname,
        file: nfo,
        dark: false,
        rid: rid
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
        reswalk: reswalk,
        rid: rid
      }).then(function (nfo) {
        rt.nfos = nfo
        processSample({
          sett: sett,
          rid: rid,
          reswalk: reswalk
        }, function (err, psample) {

          rt.sample = psample;
          // get mediaInfos here --> rt.mediainfos = mediainfos
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
                sett: sett
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
            rid: rid,
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
          rid: rid,
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

function aggrTask(hash) {
  return new Promise(function (resolve, reject) {
    var regw = new RegExp(hash, "i");
    Tasks.aggregate([{
      "$match": {
        "infos.hash": regw
      }
    },
    {
      $lookup: {
        from: "profiles",
        localField: "infos.profile",
        foreignField: "_id",
        as: "profile_data"
      }
    }, {
      $unwind: {
        path: "$profile_data",
        "preserveNullAndEmptyArrays": true
      }
    },
    //test go to topic grab posters
    {
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
        name: "$$ROOT.name",
        topic: "$$ROOT.infos.topic",
        hash: "$$ROOT.infos.hash",
        rid: "$$ROOT.infos.rid",
        extra: "$$ROOT.extra",
        stats: "$$ROOT.stats",
        settings: "$$ROOT.options",
        topic_data: {
          $ifNull: ["$topic_data", []]
        }
      }
    }
    ]).toArray(function (err, res) {
      if (err) return reject(err);
      return resolve(res)
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