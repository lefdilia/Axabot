const Tasks = require('../models/tasks').tasks;
const ChildTasks = require('../models/tasks').childTasks;
const mongoose = require('mongoose');

//Init the running Tasks on restart or Crash
/**/
(function updateCrash() {
  ChildTasks.updateMany({
    "stats.status": {
      $in: ["running"]
    }
  }, {
    "$set": {
      "stats.status": "aborted"
    }
  }, function (err, res) {

    console.log(`${res.n} Child-Tasks Running Updated.. `)

    var _query = {
      $and: [{
        "stats.status": { $in: ["running"] }
      }]
    }

    Tasks.updateMany(_query, {
      "$set": {
        "stats.status": "finished"
      }
    }, function (err, res) {
      console.log(`${res.n} Tasks Running Updated.. `);
    })

  });
})()

/*

function _updateStatus(opts, callback)
|--> If (Func   startTask) ==> {status : pending}
|--> If (Func   abortTask) ==> {status : aborted}
|--> If (Event  progress)  ==> {status:running/aborted/finished, link:xx, size:1234}

*/

// New Function to Implement

function childProgress(uProgress, done) {
  uProgress = uProgress || {};
  var _jobId = uProgress.jobId;
  var _taskId = uProgress.taskId;

  _jobId = mongoose.Types.ObjectId(_jobId);
  _taskId = mongoose.Types.ObjectId(_taskId);

  let _status = uProgress.status;
  let _progress = uProgress.progress;
  let _uploaded = uProgress.uploaded;
  let _fspeed = uProgress.fspeed;
  let _est = uProgress.est;
  let _size = uProgress.byteSize;
  //
  let _error = uProgress.error;
  let _link = uProgress.link;

  var started = new Date();

  let _mobj = {
    "istime.started": started
  }
  if (_size != null) _mobj["infos.size"] = _size;
  if (_error != null) _mobj["infos.error"] = _error;
  if (_link != null) _mobj["infos.link"] = _link;

  if (_status !== 'aborted') _mobj["infos.error"] = null;
  if (_status !== 'finished') _mobj["infos.link"] = null;

  // Stats update
  if (_status != null) _mobj["stats.status"] = _status;
  if (_fspeed != null) _mobj["stats.speed"] = _fspeed;
  if (_est != null) _mobj["stats.remain"] = _est;
  if (_progress != null) _mobj["stats.progress"] = _progress;
  if (_uploaded != null) _mobj["stats.uploaded"] = _uploaded;

  /* 
  {
      "infos.size": _size,
      "infos.error": null,
      "infos.link": null,
      "stats.status": "running",
      "stats.progress": 0,
      "stats.speed": "--/--",
      "istime.started": started
    }
  */
  if (!_jobId) return done('No jobId here...');

  return ChildTasks.updateOne({
    "_id": _jobId
  }, {
    "$set": _mobj
  }, done);


  /* 
  
    ChildTasks.updateOne({
    "_id": jobId
  }, {
    "$set": {
      "stats.status": status,
      "stats.speed": speed,
      "stats.progress": progress,
      "stats.uploaded": uploaded,
    }
  }, callback)
  */

}



function mainTaskStatus(opts, callback) {
  opts = opts || {};

  var _taskId = opts.taskId;
  var _status = opts.status;

  if (!_taskId) return callback('No task provided');
  if (!_status) return callback('No status provided');

  _taskId = mongoose.Types.ObjectId(_taskId);

  return Tasks.updateOne({
    _id: _taskId
  }, {
    $set: {
      "stats.status": _status
    }
  }, callback);
}

function countTotalProgress(opts, callback) {
  opts = opts || {};

  var taskId = opts.taskId;

  if (!taskId) return callback('No task found');

  taskId = mongoose.Types.ObjectId(taskId);

  ChildTasks.aggregate([{
    '$match': {
      "taskId": taskId
    }
  }, {
    $group: {
      _id: "x",
      status: { $addToSet: "$stats.status" },
      sd_status: { $push: "$stats.status" },
      count: {
        $sum: 1
      },
      total: {
        $sum: "$stats.progress"
      }
    }
  },
  {
    $project: {
      _id: 1,
      status: 1,
      sd_status: 1,
      count: 1,
      total: 1,
      count_finished: {
        "$multiply": [
          {
            "$size": {
              "$filter": {
                "input": "$sd_status",
                "as": "chkali",
                "cond": { "$eq": ["$$chkali", 'finished'] }
              }
            }
          }, 100
        ]
      }
    }
  },
  {
    $project: {
      _id: 1,
      status: 1,
      sd_status: 1,
      count: 1,
      total: 1,
      count_finished: 1,
      ktprogress: {
        $ceil: {
          $cond: [{ $eq: ["$count", 0] }, 0, {
            $divide: [
              "$count_finished",
              "$count"
            ]
          }]
        }
      }
    }
  }

  ], function (err, res) {
    if (err) res = []
    res = Array.isArray(res) ? res[0] : res;

    if (!res) return callback();

    let _ktprogress = res.ktprogress || 0;
    let _kcount = res.count || 0;
    var _status = res.status || [];

    //test only
    var _sdstatus;
    let _kstatus = _status.toString();

    if (_status.length <= 1) {
      if (_kstatus == 'finished' || _kstatus == 'aborted') {
        _sdstatus = 'finished';
      } else if (_kstatus == 'running') {
        _sdstatus = 'running';
      } else {
        _sdstatus = '_-_';
      }
    } else {
      if (/running/ig.test(_kstatus)) {
        _sdstatus = 'running';
      } else if (/(finished|aborted)/ig.test(_kstatus)) {
        _sdstatus = 'finished';
      } else {
        _sdstatus = '*_*';
      }
    }
    //test only
    Tasks.updateOne({
      _id: taskId
    }, {
      $set: {
        "stats.progress": _ktprogress
      }
    }, function (err, res) {
      return callback(null, {
        status: _status,
        ktprogress: _ktprogress,
        ktcount: _kcount,
        sdstatus: _sdstatus
      })
    })
  })

}



module.exports.countTotalProgress = countTotalProgress;
module.exports.mainTaskStatus = mainTaskStatus;
module.exports.childProgress = childProgress;
