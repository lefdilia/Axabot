const express = require('express');
const router = express.Router();

const mongoose = require('mongoose');
const ChildTasks = require('../models/tasks').childTasks;
const UploadCs = require('../lib/upload');

router.post('/updateStatus/', function (req, res, next) {
    if (!req.body) {
        return res.status(403).send({
            message: "Undefined Body"
        });
    }

    var body = req.body;
    var taskId = body.mainTaskId;
    var startUploadAuto = body.startUploadAuto;

    if (!taskId) return res.status(200).send({
        data: [],
        message: 'Error'
    });;

    var _socket = req.app.io;
    _socket.emit('_reload', JSON.stringify({
        jobId: null,
        taskId: taskId,
        source: "torrent"
    }))

    if (String(startUploadAuto) == "true") {
        let mainTaskId = mongoose.Types.ObjectId(taskId);

        ChildTasks.find({ taskId: mainTaskId, "stats.status": { $ne: "finished" } }, function (err, _tasks) {
            if (_tasks && _tasks.length == 0) return res.status(200).send({ data: [], message: 'Success' });
            UploadCs.reStartTask({
                _tasks: _tasks, io: _socket
            }, function () {
                return res.status(200).send({
                    data: [],
                    message: 'Success'
                });
            });
        })
    } else {
        return res.status(200).send({
            data: [],
            message: 'Success'
        });
    }

})

/*
var torrents = require('../lib/torrents');
router.get('/ping/:hash?', function (req, res, next) {
    var hash = req.params.hash;
    torrents.rPingTracker({
        hash: hash
    }, function (error, data) {
        if (error) return res.status(500).send("");
        return res.status(200).send({
            data: data,
            message: 'Success'
        });
    })
})

*/

/*
router.get('/sendtask/:taskid?', function (req, res, next) {
    var taskId = req.params.taskid;

    if (!taskId) return;

    var io = req.app.io;
    ChildTasks.find({
        $and: [{
            taskId: taskId
        }, {
            "stats.status": {
                $nin: ["finished"]
            }
        }]
    }, function (err, _tasks) {
        UploadCs.startTask({
            _tasks: _tasks,
            io: io
        }, function () {
            return res.status(200).send({
                data: [],
                message: 'Success'
            });
        });
    })
})
*/

module.exports = router;