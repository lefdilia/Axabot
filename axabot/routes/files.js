var init = require('../config/init');
const fs = require('fs');
const path = require('path');
const readdirp = require('readdirp');
const async = require('async');
const _ = require('underscore');
const express = require('express');
const rimraf = require('rimraf');
const router = express.Router();

const Preferences = require('../models/preferences');
const rar = require('../lib/rar');

router.get('/', function (req, res, next) {
    Preferences.findOne({}, function (err, preferences) {
        var types = !err && preferences ? preferences['types'] : [];
        res.render('files/index', {
            title: 'AxaBot - File Manager',
            currentPage: 'files',
            types: types || []
        });
    });
})

var dir = init.dir_downloads;

router.get('/list', function (req, res) {
    var currentDir = dir;
    var query = req.query.path || '';

    var _rx = new RegExp(dir + '/', 'ig')
    query = query.replace(_rx, '');
    query = decodeURIComponent(query);
    if (query) currentDir = path.join(dir, query);
    if (/^\/(srv)?\/?(seedbox)?$/ig.test(query) || query == "") currentDir = dir; // works [stop fetching files without access]

    var _isInternalPath = currentDir == dir;

    var data = [];
    readdirp(currentDir, {
        alwaysStat: true,
        type: 'files_directories',
        fileFilter: ['!.DS_Store'],//'!*.nfo'
        depth: 0
    }).on('data', function (entry) {

        let fileStats = entry.stats;

        let _path = entry.path;
        let _fullPath = entry.fullPath.replace(_rx, '');
        let _basename = entry.basename;

        let isDirectory = fileStats.isDirectory();

        var time = {
            atime: init.daterpl(fileStats.atime),
            mtime: init.daterpl(fileStats.mtime),
            ctime: init.daterpl(fileStats.ctime)
        }

        if (isDirectory) {
            var obj = {
                time: time,
                Name: _path,
                IsDirectory: true,
                Path: _fullPath
            }

            var exp = new RegExp('^(' + init.expt.join('|') + ')$', 'ig');

            if (/Posts/ig.test(_path)) {
                obj['evetxt'] = true;
            }

            if (exp.test(_basename) && _isInternalPath == true) {
                obj['internal'] = true;
                data.unshift(obj);
            } else {
                obj['internal'] = false;
                data.push(obj);
            }

        } else {

            var ext = path.extname(_path);

            var obi = {
                Name: _path,
                Ext: ext,
                time: time,
                Size: init.bytesToSize(fileStats.size).all || '1 KB',
                IsDirectory: false,
                Path: _fullPath
            }

            if (/Thumbnails/ig.test(_fullPath) && (ext == ".png" || ext == ".jpg" || ext == ".jpeg") || (ext == ".png" || ext == ".jpg" || ext == ".jpeg")) {
                obi['eveimg'] = true;
            }

            if (/Posts/ig.test(_fullPath)) {
                obi['evetxt'] = true;
            }

            if (/Compressed/ig.test(_fullPath) && (ext == ".rar" || ext == ".zip")) {
                obi['zip_folder'] = true;
            }

            if (/Samples/ig.test(_fullPath) && (ext == ".mkv" || ext == ".avi" || ext == ".mp4" || ext == ".flv")) {
                obi['evevid'] = true;
            } else {
                obi['evevid_'] = true;
            }

            data.push(obi);
        }
    }).on('end', function () {
        data = _(data).chain().sortBy(function (f) {
            return f.Name.toLowerCase();
        }).sortBy(function (f) {
            return !f.IsDirectory;
        }).sortBy(function (f) {
            return !f.internal;
        }).value();

        return res.json(data);
    });
    /* 
    entry  {
      path: 'Posts/17-11-2019/Naked.News.2019.11.17.WEB.H264.GIMINI__[n2e22o].txt',
      fullPath: '/srv/seedbox/downloads/Posts/17-11-2019/Naked.News.2019.11.17.WEB.H264.GIMINI__[n2e22o].txt',
      basename: 'Naked.News.2019.11.17.WEB.H264.GIMINI__[n2e22o].txt',
      stats: Stats {    
    */

});

router.post('/archiveme', function (req, res, next) {
    if (!req.body) {
        var err = new Error('Undefined Body');
        err.status = 404;
        return next(err);
    }

    var user = req.user || {};
    if (!user.access) {
        var err = new Error('Unauthorized Access');
        err.status = 403;
        return next(err);
    }

    var body = req.body;
    var _dpath = decodeURIComponent(body._dpath);

    var fullPath = path.join(init.dir_downloads, _dpath);

    fs.access(fullPath, fs.F_OK, (err) => {
        if (err || !_dpath) return res.status(500).send('File Does not exist.');

        rar.compress({
            file: fullPath
        }, function (err, result) {
            if (err) return res.status(500).send('Error compressing file.');

            return res.status(200).send('');
        })
    })
})


router.post('/trashfiles', function (req, res, next) {
    if (!req.body) {
        var err = new Error('Undefined Body');
        err.status = 404;
        return next(err);
    }

    var user = req.user || {};
    if (!user.access) {
        var err = new Error('Unauthorized Access');
        err.status = 403;
        return next(err);
    }

    var body = req.body;

    var arrpath = body['arrpath[]'] || [];
    arrpath = Array.isArray(arrpath) ? arrpath : [arrpath];

    var _length = arrpath.length;
    if (_length == 0) return res.status(200).send({
        _length: _length
    })

    async.eachSeries(arrpath, function (_dpath, next) {
        if (!_dpath || _dpath == "") return next('File Does not exist');

        var fullPath = path.join(init.dir_downloads, _dpath);

        fs.access(fullPath, fs.F_OK, (err) => {
            if (err) return next('File Does not exist.');
            return rimraf(fullPath, next);
        })

    }, function (err) {
        return res.status(200).send({
            _length: _length
        })
    })
})


router.post('/cleanfd', function (req, res, next) {
    if (!req.body) {
        var err = new Error('Undefined Body');
        err.status = 404;
        return next(err);
    }

    var user = req.user || {};
    if (!user.access) {
        var err = new Error('Unauthorized Access');
        err.status = 403;
        return next(err);
    }

    var fullPath = path.resolve(init.dir_incomplete, '*');

    fs.access(init.dir_incomplete, fs.F_OK, (err) => {
        if (err) return res.status(500).send({ message: 'Can\'t Access Incomplete Folder.' })

        rimraf(fullPath, function (err) {
            if (err) return res.status(500).send({ message: 'Can\'t Clean Incomplete Folder.' })

            return res.status(200).send({ message: 'Incomplete Folder is Clean.' })
        })
    })
})

router.post('/clearfds', function (req, res, next) {
    if (!req.body) {
        var err = new Error('Undefined Body');
        err.status = 404;
        return next(err);
    }

    var user = req.user || {};
    if (!user.access) {
        var err = new Error('Unauthorized Access');
        err.status = 403;
        return next(err);
    }

    var body = req.body;
    var _rpath = body['_rpath'];
    if (!_rpath || _rpath == "") return res.status(500).send({ message: 'Can\'t Access this Folder.' })
    if (!/(Thumbnails|Samples|Posts|Compressed|Downloads)/ig.test(_rpath)) return res.status(500).send({ message: 'Can\'t Access this Folder' })

    if (/^Downloads$/ig.test(_rpath)) {
        var fullPath = init.dir_downloads;
        var _exclude = 'Thumbnails|Samples|Posts|Compressed'
            .split('|')
            .map((_it) => { return path.resolve(init.dir_downloads, `{${_it},${_it}/**}`) })
        var _opts = {
            glob: {
                ignore: _exclude
            }
        }

    } else {
        var fullPath = path.resolve(init.dir_downloads, _rpath);
        var _opts = {};
    }

    fs.access(fullPath, fs.F_OK, (err) => {
        if (err) return res.status(500).send({ message: 'Can\'t Access this Folder.' })

        var _sfullPath = path.resolve(fullPath, '*');

        rimraf(_sfullPath, _opts, function (err) {
            if (err) return res.status(500).send({ message: 'Can\'t empty this Folder.' })
            return res.status(200).send({ message: 'Folder is empty.' })
        })
    })
})

module.exports = router;