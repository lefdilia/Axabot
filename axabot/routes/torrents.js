const express = require('express');
const request = require('request');
const fs = require('fs');
const path = require('path');

var router = express.Router();
var torrents = require('../lib/torrents');

router.get('/', function (req, res, next) {

    var page = req.query.page ? req.query.page : 1;
    var limit = 100;

    torrents.listTorrents({
        page: page,
        limit: limit
    }).then(function (data) {

        res.render('torrents/index', {
            title: 'AxaBot - Torrents',
            torrents: data.sresult.docs || [],
            profiles: data.profiles || [],
            cfeed: data.cfeed,
            types: data.types,
            feeds: data.feeds,
            pagin: {
                page: data.sresult.page,
                count: data.sresult.totalDocs,
                nmpages: data.sresult.totalPages
            },
            currentPage: 'torrents'
        });
    })
});


router.get('/img', function (req, res, next) {
    var img = req.query.i;

    var noimage = path.resolve(__dirname, '..', 'public/images/no_image.jpg');
    if (img.match(/no_image/ig) || !img || !img.match(/(http|https)/ig)) return fs.createReadStream(noimage).pipe(res);

    var opts = {
        url: img,
        method: 'GET',
        encoding: null,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.13; rv:62.0) Gecko/20100101 Firefox/62.0',
            'Host': 'www.thetvdb.com'
        }
    };

    request(opts, function (error, response, body) {
        res.set('Content-Type', 'image/jpeg');
        res.send(body);
    });

})

router.post('/addfeed', function (req, res, next) {
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
    var expression = /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi;
    var regex = new RegExp(expression);

    if (!body.feedurl.match(regex))
        return res.status(500).send({
            message: "Feed url is invalid.",
        });

    if (body.feedname.trim() == '')
        return res.status(500).send({
            message: "Feed Name is not valid.",
        });

    opts['feed_name'] = body.feedname.trim();
    opts['feed_type'] = body.feedtype2 && body.feedtype2.trim() != '' ? body.feedtype2 : body.feedtype;
    opts['feed_url'] = body.feedurl;
    opts['feed_exclude'] = body.feed_exclude.split(',');
    opts['feed_include'] = body.feed_include.split(',');

    opts['feed_status'] = Boolean(body.feed_status);

    opts['feed_auto_download'] = Boolean(body.feed_auto_download);
    opts['feed_auto_data'] = Boolean(body.feed_auto_data);
    opts['feed_auto_ping'] = Boolean(body.feed_auto_ping);
    opts['upload_profile'] = body.upload_profile ? body.upload_profile : '';

    opts['feed_words_remove'] = body.feed_words_remove.split(',');
    opts['feed_clear_chars'] = Boolean(body.feed_clear_chars);

    opts['ping_interval'] = body.ping_interval ? body.ping_interval : 5;


    torrents.addFeed(opts, function (error, data) {
        if (error) return res.status(500).send({
            message: error
        });

        var message = data && data.message || '';

        return res.status(200).send({
            data: data,
            message: message
        });
    })
})

router.post('/pingfeed', function (req, res, next) {
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

    torrents.pingFeedIs(_id, function (error, data) {
        if (error) return res.status(500).send({
            message: error
        });

        var message = data && data.message || '';

        return res.status(200).send({
            data: data,
            message: message
        });
    })
})

router.post('/dgrab', function (req, res, next) {
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
    opts['title'] = body.ktitle;
    opts['source'] = body.source;
    opts['type'] = body.type ? body.type.toLowerCase() : body.type;
    opts['_id_'] = body._id_;
    opts['dtopic'] = body.dtopic || '';

    var _profile = body.profile ? body.profile : '';

    if (body && body.tpid) {
        opts['tpid'] = body.tpid;
    }

    torrents.prezSearch(opts, function (error, data) {
        if (error) {
            return res.status(500).send({
                message: error
            });
        }

        return res.status(200).send({
            message: 'success',
            data: data,
            profile: _profile
        });
    })
})

router.post('/saveprez', function (req, res, next) {
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

    var nilltask = Boolean(body.nilltask);
    if (!body.pr_title && nilltask == false) return res.status(500).send({
        message: 'Missing one or more fields.'
    });

    var opts = {};
    opts['_id_'] = body._id_; // /!\ _id of torrent on DB
    opts['type'] = body.type ? body.type.toLowerCase() : body.type; // /!\ Type on Dropdown
    opts['title'] = body.pr_title || '';
    opts['year'] = body.pr_year || new Date().getFullYear();

    if (body && body.pr_runtime) {
        opts['runtime'] = body.pr_runtime || '';
    }
    if (body && body.pr_genres) {
        opts['genres'] = body.pr_genres ? body.pr_genres.split(',') : [];
    }
    if (body && body.pr_stars) {
        opts['stars'] = body.pr_stars ? body.pr_stars.split(',') : [];
    }
    if (body && body.pr_source) {
        opts['source'] = body.pr_source || [];
    }

    opts['summary'] = body.pr_summary || '';
    opts['image'] = body.tgimage && !/no_image\.jpg/ig.test(body.tgimage) ? body.tgimage : '';
    opts['bc_image'] = body.bc_image || '';

    opts['tags'] = body.pr_tags ? body.pr_tags.split(',') : [];

    opts['pptprofiles'] = body.pptprofiles || null;

    if (body.path) {
        opts['path'] = body.path;
    }

    if (body.tpid) {
        opts['tpid'] = body.tpid;
    }

    opts['datatt'] = Boolean(body.datatt);
    opts['nilltask'] = nilltask;

    opts['hashs'] = body.hashs ? body.hashs.split(',') : [];

    torrents.savePrez(opts, function (error, infos) {
        if (error) {
            console.log('error ', error)
            return res.status(500).send({
                message: error
            });
        } else {
            var message = infos && infos.message ? infos.message : 'Created Successfully.';
            var _socket = req.app.io;

            _socket.emit('uploadStatus', JSON.stringify({
                jobId: null,
                taskId: null,
                status: "pending",
                source: "files"
            }))

            return res.status(200).send({
                message: message
            });
        }
    })
})

router.post('/editpcc', function (req, res, next) {
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

    torrents.listTopic(_id).then(function (data) {
        data = Array.isArray(data) ? data[0] : {};

        return res.status(200).send(data);
    }).catch(function (err) {
        return res.status(500).send({
            message: "Error This Feed does not Exist.",
        });
    })

})

router.post('/getfeed', function (req, res, next) {
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

    torrents.listfeeds(_id).then(function (data) {
        data = Array.isArray(data) ? data[0] : [];

        return res.status(200).send({
            data: data
        });
    }).catch(function (err) {
        return res.status(500).send({
            message: "Error This Feed does not Exist.",
        });
    })

})

router.post('/sendtorrents', function (req, res, next) {
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
    opts['ids'] = body["ids[]"] || [];

    torrents.sendTorrent(opts, function (error, data) {
        if (error) return res.status(500).send({
            message: error,
        });

        var message = data && data.message || '';
        return res.status(200).send({
            data: data,
            message: message
        });
    })
})

//removefeed
router.post('/removefeed', function (req, res, next) {
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

    torrents.removeFeed(_id, function (error, data) {
        if (error) {
            return res.status(500).send({
                message: error
            });
        }
        return res.status(200).send({
            message: 'Feed successfully removed.',
            data: data
        });
    })
})

//remove_torrent
router.post('/remove_prez', function (req, res, next) {
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

    torrents.removePrez(_id).then(function (data) {
        return res.status(200).send({
            message: "Topic removed..",
        });
    }).catch(function (err) {
        return res.status(500).send({
            message: "Error This Feed does not Exist.",
        });
    })

})
//remove_torrent
router.post('/remove_torrent', function (req, res, next) {
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
    opts['ids'] = body["ids[]"] || [];

    torrents.removeTorrents(opts, function (error, data) {
        if (error) {
            return res.status(500).send({
                message: error
            });
        }
        return res.status(200).send({
            message: 'Torrents successfully removed.',
            data: data
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
            section: 'all',
            pagenm: '1',
            limit: '100' 
        }
    */

    var opts = {};
    opts.limit = parseInt(body.limit) || 50;
    opts.page = body.pagenm || 1;
    opts.keyword = body.keyword || '';
    opts.section = body.section || '**';

    torrents.localsearch(opts, function (error, data) {
        if (error) {
            return res.status(500).send({
                message: "Can't execute a search request, please try in while.."
            });
        }

        return res.status(200).send(data);
    })
})


module.exports = router;