var tasks = require('../lib/tasks');
var express = require('express');
var router = express.Router();


//Live tasks_monitor
var _socket;
setInterval(function () {
    tasks.countChildTasks({
        _socket: _socket
    }, function (resmap) {
        if (!_socket) {
            _socket = global.io;
        }
    })
}, 2000)


router.get('/', function (req, res, next) {

    var limit = 70;
    var page = req.query.page ? req.query.page : 1;
    var _st = req.query.st ? parseInt(req.query.st) : 1;

    tasks.listTasks({
        limit: limit,
        page: page,
        _st: _st
    }, function (err, result) {

        var pagin = {
            page: result.page,
            count: result.totalDocs,
            nmpages: result.totalPages,
            st: _st
        }

        tasks.countChildTasks({}, function (mstasks) {
            res.render('tasks/index', {
                title: 'AxaBot - Tasks',
                currentPage: 'tasks',
                data: result.docs,
                mstasks: mstasks,
                pagin: pagin
            });

            if (!_socket) {
                _socket = global.io;
            }
        })
    })

});

/*
posted... { path: 'A Quiet Place (2018) [BluRay] [720p] [YTS.AM]' }
posted... { id: '5b9b8682caebc971ba340ee5',
  username: 'fxuser',
  email: 'immigarf@gmail.com',
  access: true }
*/

router.post('/run', function (req, res, next) {
    if (!req.body) {
        return res.status(403).send({
            message: "Undefined Body"
        });
    }

    var user = req.user || {};
    if (!user.access) {
        return res.status(403).send({
            message: "Unauthorized Access"
        });
    }

    var body = req.body;

    var opts = {};
    opts.io = req.app.io;

    opts._main = Boolean(body._main) || false;
    opts._taskid = body._taskid || null;
    opts._subid = body._subid || null;
    opts._dcom = body._dcom || null;

    tasks.runCommand(opts, function (err, data) {
        if (err) {
            return res.status(500).send({
                message: "Error Command.",
            });
        }

        return res.status(200).send({
            message: "Successfully created..",
            data: data
        });
    })
})

router.post('/add', function (req, res, next) {
    if (!req.body) {
        return res.status(403).send({
            message: "Undefined Body"
        });
    }

    var user = req.user || {};
    if (!user.access) {
        return res.status(403).send({
            message: "Unauthorized Access"
        });
    }

    var body = req.body;
    var opts = {};
    opts.io = req.app.io;
    opts.path = body.path;

    tasks.add(opts, function (err, data) {
        if (err) {
            return res.status(500).send({
                message: "Error Saving to DB.",
            });
        }

        return res.status(200).send({
            message: "Successfully created..",
            data: data
        });
    })

});

router.post('/remove_task', function (req, res, next) {
    if (!req.body) {
        return res.status(403).send({
            message: "Undefined Body"
        });
    }

    var user = req.user || {};
    if (!user.access) {
        return res.status(403).send({
            message: "Unauthorized Access"
        });
    }

    var body = req.body;
    var opts = {};
    opts.io = req.app.io;
    opts._id = body._id;

    tasks.removeTasks(opts, function (err, data) {
        if (err) {
            return res.status(500).send({
                message: "Error removing task.",
            });
        }

        return res.status(200).send({
            message: "Successfully Removed..",
            data: []
        });
    });
});




module.exports = router;