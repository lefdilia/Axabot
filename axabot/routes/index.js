var init = require('../config/init');
var express = require('express');
var path = require('path');
var fs = require('fs');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
  res.redirect('/files/');
});


router.get('/changelog', function (req, res, next) {
  const _changelog = path.join(__dirname, '..', 'changelog.json');
  fs.access(_changelog, fs.F_OK, (err) => {
    if (err) return res.status(500).send('{}');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    fs.createReadStream(_changelog).pipe(res);
  })
})


router.get('/downloads*', function (req, res) {

  var local_path = req.params ? req.params[0] : null;
  if (!local_path) return '/:';

  const file = path.join(init.dir_downloads, local_path)
  const _mname = path.parse(file).base;

  fs.access(file, fs.F_OK, (err) => {
    if (err || !_mname) return res.status(500).send('File Does not exist');

    res.setHeader('Content-Disposition', 'attachment;filename*=UTF-8\'\'' + encodeURIComponent(_mname));
    res.sendFile(file);
  })
});


router.get('/view*', function (req, res) {

  var local_path = req.params ? req.params[0] : null;
  if (!local_path) return '/:';

  const file = path.join(init.dir_downloads, local_path)
  const _mname = path.parse(file).base;

  fs.access(file, fs.F_OK, (err) => {
    if (err || !_mname) return res.status(500).send('File Does not exist');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    fs.createReadStream(file).pipe(res);
  })
});


router.get('/gallery/*', function (req, res) {

  var local_path = req.params ? req.params[0] : null;

  if (!local_path || local_path == '') return res.status(500).send('Path Does not exist');

  const file = path.join(init.dir_downloads, local_path)

  const _mname = path.parse(file).base;

  fs.access(file, fs.F_OK, (err) => {
    if (err || !_mname) return res.status(500).send('File Does not exist');
    fs.createReadStream(file).pipe(res);
  })
});

module.exports = router;