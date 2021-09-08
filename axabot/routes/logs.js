var express = require('express');
var router = express.Router();

var logs = require('../lib/logs');

router.get('/', function (req, res, next) {

    var limit = 50;
    var page = req.query.page ? req.query.page : 1;
    var taskId = req.query.taskId ? req.query.taskId : null;

    logs.listLogs({
        limit: limit,
        page: page,
        taskId: taskId
    }, function (err, result) {

        var pagin = {
            page: result.page,
            count: result.totalDocs,
            nmpages: result.totalPages
        }

        res.render('logs/index', {
            title: 'AxaBot - Logs',
            currentPage: 'logs',
            data: result.docs,
            pagin: pagin
        });
    })

});


router.post('/shlink', function (req, res, next) {
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
    opts._id = body._id;
    opts._status = body._status == 'true' ? true : false;

    logs.ShortLinkStatus(opts).then(function (data) {
        return res.status(200).send({ message: data.message });
    }).catch(function (err) {
        return res.status(500).send({
            message: "This Log does not Exist.",
        });
    })

})

router.post('/view', function (req, res, next) {
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
    opts._id = body._id;
    opts._type = body._t;

    logs.listLogByID(opts).then(function (data) {
        return res.status(200).send(data);
    }).catch(function (err) {
        return res.status(500).send({
            message: "This Log does not Exist.",
        });
    })

})


router.post('/mcopy', function (req, res, next) {
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
    /*
     { _ti: '5d6c4935b755f47dfd00208c', _ty: 'json', _st: 'main' }
    */

    var opts = {};
    opts._taskid = body._ti;
    opts._subid = body._si;
    opts._type = body._ty;
    opts._st = body._st;

    logs.listMcopyCommand(opts).then(function (data) {
        return res.status(200).send(data);
    }).catch(function (err) {
        return res.status(500).send({
            message: "This Log does not Exist.",
        });
    })

})

router.post('/post_api', function (req, res, next) {
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

    var opts = {};
    var body = req.body;
    /*
     { _ti: '5d6c4935b755f47dfd00208c', _ty: 'json', _st: 'main' }
    */

    opts._tid = body._tid;

    logs.postApi(opts, function (errorme, data) {
        if (errorme) return res.status(500).send({ message: errorme });

        return res.status(200).send({ message: 'Log Posted successfully' });
    })
})

router.post('/export_log', function (req, res, next) {
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

    var opts = {};
    var body = req.body;

    opts._tid = body._tid;

    logs._ExportLogs(opts, function (errorme, data) {
        if (errorme) return res.status(500).send({ message: errorme });

        return res.status(200).send({ message: 'Log Exported successfully' });
    })
})




router.post('/remove_log', function (req, res, next) {
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
    var _id = body._id;

    logs.removeLogByID(_id).then(function (data) {
        return res.status(200).send({ message: "Log removed successfully." });
    }).catch(function (err) {
        return res.status(500).send({
            message: "This Log does not Exist.",
        });
    })

})

//search
router.post('/search', function (req, res, next) {
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
    /*
        {
            keyword: 'king kong',
            pagenm: '1',
            limit: '100' 
        }
    */

    var opts = {};
    opts.limit = parseInt(body.limit) || 50;
    opts.page = body.pagenm || 1;
    opts.keyword = body.keyword || '';

    logs.localsearch(opts, function (error, data) {
        if (error) {
            return res.status(500).send({
                message: "Can't execute a search request, please try in while.."
            });
        }

        return res.status(200).send(data);
    })
})
module.exports = router;