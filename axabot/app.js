/* 
Axabot - Created by Lefdili Alaoui Ayoub © 2019
*/

const init = require('./config/init');

const http = require('http');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const rimraf = require('rimraf');
const os = require('os');
const fs = require('fs-extra');
const pidusage = require('pidusage');
const lsof = require('lsof');
const ps = require('ps-node');

const expressHbs = require('express-handlebars');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const passport = require('passport');

const compression = require('compression');
const expressMinify = require('express-minify');
const uglifyEs = require("uglify-es");

const minify = require('@node-minify/core');
const cssnano = require('@node-minify/cssnano');
const flash = require('connect-flash');

//Routes
const indexRouter = require('./routes/index');
const kapiRouter = require('./routes/kapi');
const userRouter = require('./routes/user');
const filesRouter = require('./routes/files');
const tasksRouter = require('./routes/tasks');
const logsRouter = require('./routes/logs');
const torrentsRouter = require('./routes/torrents');
const settingsRouter = require('./routes/settings');

global._botInfos = {};

try {
  var _json = require('./changelog.json');
  var _current = Object.keys(_json['releases']);
  _current = _current[0] || '';
  global._botInfos['version'] = _current;
} catch (e) { }

//Update Status
global._botupdate = {
  available: false,
  version: false,
  features: [],
  notified: false,
  running_update: false
};

//File Uploads cookies
global._cookies = {};
global._token = {};
global._retry = {};

//Track in memory
global._serverMonitor = {};
global._bandwidthMonitor = {};

//MongoDB connection configs
const mongodbUri = "mongodb://localhost:27017/axabot";
const options = {
  useNewUrlParser: true,
  useCreateIndex: true,
  useFindAndModify: false,
  poolSize: 15, // Maintain up to 10 OR 15 socket connections
  // If not connected, return errors immediately rather than waiting for reconnect
  bufferMaxEntries: 0,
  family: 4, // Use IPv4, skip trying IPv6
  keepAlive: true,
  keepAliveInitialDelay: 300000,
  useUnifiedTopology: true
};

mongoose.connect(mongodbUri, options);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('axabot Connected..');
  console.log('axabot Start.. at Port > ' + init.port + ' ...');
});

var store = new MongoDBStore({
  uri: mongodbUri,
  collection: 'Sessions'
});

var sessionMiddleware = session({
  secret: 'axabot',
  resave: false,
  saveUninitialized: false,
  store: store,
  cookie: {
    expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
});

//Init express
var app = express();

if (process.env.NODE_ENV != 'development') {

  /////Cache-and-static-Part
  app.use(compression());
  app.use(function (req, res, next) {
    if (/\.min\.(css|js)$/.test(req.url)) {//DEV |base\.js
      res.minifyOptions = res.minifyOptions || {};
      res.minifyOptions.minify = false;
    }
    next();
  });

  //// clear cach after server startup
  const _cacheFolder = __dirname + '/_cache';
  fs.ensureDir(_cacheFolder).then(() => {
    rimraf(_cacheFolder + '/*', function () { });
  }).catch(function (Error) {
    console.log('Cannot create cache Folder')
  })
  //// Combine all CSS with cssnano
  minify({
    compressor: cssnano,
    input: [
      "public/css/_fonts.css",
      "public/css/animate.css",
      "public/css/plugins/toastr/toastr.min.css",
      "public/css/plugins/dualListbox/bootstrap-duallistbox.min.css",
      "public/css/plugins/switchery/switchery.css",
      "public/css/plugins/bootstrap-tagsinput/bootstrap-tagsinput.css",
      "public/css/plugins/textSpinners/spinners.css",
      "public/css/plugins/awesome-bootstrap-checkbox/awesome-bootstrap-checkbox.css",
      "public/css/jquery.fancybox.min.css",
      "public/css/jquery.contextMenu.min.css",
      "public/css/plugins/sweetalert/sweetalert.css",
      "public/js/sceditor/themes/square.min.css",
      "public/font-awesome/css/font-awesome.min.css",
      "public/css/style.css",
      "public/css/customd.css"
    ],
    output: 'public/css/customapp.css',
    callback: function (err, min) {
      console.log('Built Now');
    }
  });

  app.use(expressMinify({
    cache: _cacheFolder,
    uglifyJsModule: uglifyEs
  }));

  app.enable('view cache');
}

app.use("/assets", express.static(__dirname + "/public", { maxAge: 31557600 }));//, { maxAge: 31557600 }

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

require('./config/passport');

String.prototype.ucwords = function () {
  str = this.trim();
  return str.replace(/(^([a-zA-Z\p{M}]))|([ -][a-zA-Z\p{M}])/g, function (s) {
    return s.toUpperCase();
  });
};

String.prototype.truncate = function (strLen) {
  if (!this) return;
  if (this.length <= strLen) return this;

  var separator = '...';

  var sepLen = separator.length,
    charsToShow = strLen - sepLen,
    frontChars = Math.ceil(charsToShow / 2),
    backChars = Math.floor(charsToShow / 2);

  return this.substr(0, frontChars) +
    separator +
    this.substr(this.length - backChars);
}

var hbs = expressHbs.create({
  layoutsDir: 'views/layouts',
  partialsDir: 'views/partials',
  defaultLayout: 'layout',
  extname: '.hbs',
  helpers: {
    BOTNAME: function () {
      return init.name;
    },
    BOT_VERSION: function () {
      return global._botInfos['version'] || '';
    },
    hasUpdate: function () {
      // global._botupdate  { available: false, version: false, features: [], notified: false, running_update: false }

      var _botupdate = global._botupdate;
      if (_botupdate.available !== true || _botupdate.notified == true) return;

      var _features = _botupdate['features'].map(function (_ftr) {
        return _ftr.replace(/^\[(.*?)\]/ig, '<b>[$1]</b>');
      }).join('<br>');

      var _stm = `<div class="lead font14 alert alert-success alert-dismissable">`;

      if (_botupdate.running_update == true) {
        _stm += `<center><i class="fa fa-refresh fa-spin fa-fw"></i> Update is currently in progress. Please wait a few moments...`;
      } else {
        _stm += `<button id="dismissupdate" aria-hidden="true" data-dismiss="alert" class="close" type="button">×</button><center><i class="fa fa-exclamation-triangle"></i> New version ${_botupdate.version ? '<a class="alert-link" href="javascript:;" id="showfeatures"><b>' + _botupdate.version + '</b></a>' : ''} available <a class="alert-link" id="updatebot" href="javascript:void(0);">Restart & Update Now</a>`;
        //features
        _stm += `<table>
        <tr>
        <td></td>
        <td><div id="featureslist" style="display:none">
        <br>
          ${_features}
        </div>
        </td>
        <td></td>
        </tr>
        </table>`
      }

      _stm += `</center></div>`;

      return _stm;
    },
    recache: function () {
      return Math.ceil(Math.random() * 10e6); //Date.now();
    },
    ifEquals: function (arg1, arg2, options) {
      return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
    },
    ifCond: function (v1, operator, v2, options) {
      switch (operator) {
        case '==':
          return (v1 == v2) ? options.fn(this) : options.inverse(this);
        case '===':
          return (v1 === v2) ? options.fn(this) : options.inverse(this);
        case '!=':
          return (v1 != v2) ? options.fn(this) : options.inverse(this);
        case '!==':
          return (v1 !== v2) ? options.fn(this) : options.inverse(this);
        case '<':
          return (v1 < v2) ? options.fn(this) : options.inverse(this);
        case '<=':
          return (v1 <= v2) ? options.fn(this) : options.inverse(this);
        case '>':
          return (v1 > v2) ? options.fn(this) : options.inverse(this);
        case '>=':
          return (v1 >= v2) ? options.fn(this) : options.inverse(this);
        case '&&':
          return (v1 && v2) ? options.fn(this) : options.inverse(this);
        case '||':
          return (v1 || v2) ? options.fn(this) : options.inverse(this);
        default:
          return options.inverse(this);
      }
    },
    daterpl: function (datep, ed) {
      var bdate = typeof datep !== 'object' ? new Date(datep).toLocaleString("en-GB", {
        hour12: false
      }) : new Date(datep).toLocaleString("en-GB", {
        hour12: false
      });
      bdate = ed == true ? bdate.replace(/\//ig, '.').replace(/\,/ig, ' - ').replace(/\s+/ig, ' ') : bdate
      return bdate;
    },
    inc: function (value) {
      return parseInt(value) + 1;
    },
    activeTab: function (tab) {
      return this.query == tab ? 'active' : '';
    },
    defaultbe: function () {
      return this.status == true ? '<i class="fa fa-check text-success"></i>' : '–';
    },
    activePage: function (page) {
      if (!this.currentPage || !page) return;
      var stActive = this.currentPage == page ? ' class="active" ' : '';
      return stActive;
    },
    rplabel: function (value) {
      switch (value) {
        case 'sh':
          return 'Shorteners'
          break;

        case 'dl':
          return 'File Hosts'
          break;

        case 'img':
          return 'Image Hosting'
          break;
      }
    },
    acfx: function (api) {
      return !api || api == '' ? '*' : api;
    },
    typefx: function () {
      if (!this.extra) return;
      var type = this.extra.type;

      var pt = '';
      switch (type) {
        case '1':
          pt = '<span class="label label-primary">Files Host</span>';
          break;

        case '2':
          pt = '<span class="label label-warning">Files Host</span>';
          break;

        case '3':
          pt = '<span class="label label-info">Shortener</span>';
          break;

        case '4':
          pt = '<span class="label label-warning">Images Host</span>';
          break;

        default:
          pt = '<span class="label label-primary">Files Host</span>';
          break;
      }
      return pt;
    },
    useAcc: function () {
      if (!this.data) return;
      var account = this.data.use_account;
      return account ? '<i class="fa fa-circle text-navy"></i>' : '<i class="fa fa-circle text-danger"></i>';
    },
    times: function (n, block) {
      var accum = '';
      for (var i = 0; i < n; ++i)
        accum += block.fn(i);
      return accum;
    },
    ifObject: function (item, options) {
      if (typeof item === "object") {
        return options.fn(this);
      } else {
        return options.inverse(this);
      }
    },
    bytesToSize: function (bytes) {
      var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      if (bytes == 0) return '';
      if (bytes <= 1024) bytes = 1024;
      var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
      if (i == 0) return {
        size: bytes + " " + sizes[i]
      };
      return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
    },
    fixDate: function () {
      var added = this.added;
      var mdt = new Date(added).toLocaleString('en-US', {
        hour12: false
      });

      mdt = mdt.replace(/\//ig, '.').replace(/\,/ig, ' - ').replace(/\s+/ig, ' ');
      return mdt;
    },
    TorrentStatus: function () {
      return this.info.private && this.info.private == true ? '<i class="fa fa-circle text-danger"></i>' : '';
    },
    isposted: function () {
      return this.posted && this.posted == true ? '<i class="fa fa-circle text-navyx"></i>' : '';
    },
    ispostedBool: function () {
      return this.posted && this.posted == true ? 'true' : 'false';
    },
    TorrentStatusTXT: function () {
      return this.info && this.info.private && this.info.private == true ? 'YES' : 'NO';
    },
    fixTypeIcon: function () {

      var type = this.info && this.info.type ? this.info.type.toLowerCase() : '';

      switch (type) {
        case 'movies':
          return `<i style="color:#889c88" class="fa fa-film"></i>`;
          break;

        case 'tv':
          return `<i style="color:#889c88" class="fa fa-desktop"></i>`;
          break;

        case 'games':
          return `<i style="color:#889c88" class="fa fa-gamepad"></i>`;
          break;

        case 'music':
          return `<i style="color:#889c88" class="fa fa-music"></i>`;
          break;

        case 'books':
          return `<i style="color:#889c88" class="fa fa-book"></i>`;
          break;

        case 'anime':
          return `<i style="color:#889c88" class="fa fa-superpowers"></i>`;
          break;

        case 'applications':
          return `<i style="color:#889c88" class="fa fa-hdd-o"></i>`;
          break;

        case 'other':
          return `<i style="color:#889c88" class="fa fa-lightbulb-o"></i>`;
          break;

        default:
          return `<i style="color:#889c88" class="fa fa-lightbulb-o"></i>`;
          break;
      }

    },
    pagination: function (route, maxlm) {
      // this --> pagin: { page: 1, count: 52, nmpages: 6 } \:.:.:/
      // this  { page: '1', count: 3261, nmpages: 653 }

      if (!this.pagin) return;

      var adurl = "";
      var kksection = parseInt(this['pagin']['st']);

      switch (kksection) {
        case 1:
          adurl = "&st=1";
          break;

        case 2:
          adurl = "&st=2";
          break;

        case 3:
          adurl = "&st=3";
          break;

        case 4:
          adurl = "&st=4";
          break;

        case 5:
          adurl = "&st=5";
          break;

        default:
          adurl = "";
          break;
      }

      var pageRoute = '/' + route + '/';

      var page = this['pagin']['page'] || 1;
      var count = this['pagin']['count'] || 1;
      var nmpages = this['pagin']['nmpages'] || 1;

      var pght = '<ul class="pagination">';

      pght += page == 1 ? '<li class="active"><a>1</a></li>' : '<li><a href="' + pageRoute + '?page=1' + adurl + '">1</a></li>';
      //****************** */
      var maxLm = parseInt(maxlm) || 5;
      var start = 2;
      var end = parseInt(page) + maxLm; //page 5 + 5

      if (page > maxLm) {
        start = page - maxLm;
        if (start == 1) {
          start++;
        }
      }

      if (end >= nmpages - 1) {
        end = nmpages - 1;
      }

      for (var ind = start; ind <= end; ind++) {
        if (ind == page) {
          pght += '<li class="active"><a>' + ind + '</a></li>';
        } else {
          pght += '<li><a href="' + pageRoute + '?page=' + ind + adurl + '">' + ind + '</a></li>';
        }
      }
      //****************** */
      //To Fix...Fixed_Now
      if (nmpages > 1) {
        pght += page == nmpages ? '<li class="active"><a>' + nmpages + '</a></li>' : '<li><a href="' + pageRoute + '?page=' + nmpages + adurl + '">' + nmpages + '</a></li>';
      } else {
        pght += page == nmpages ? '' : '<li><a href="' + pageRoute + '?page=' + nmpages + adurl + '">' + nmpages + '</a></li>';
      }
      //****************** */
      if (page > 1) {
        pght += '<li class="next"><a href="' + pageRoute + '?page=' + (parseInt(page) - 1) + adurl + '">&laquo; Previous</a></li>';
      } else {
        pght += '<li class="next disabled"><a>&laquo; Previous</a></li>';
      }
      //****************** */
      if (page < nmpages) {
        pght += '<li class="next"><a href="' + pageRoute + '?page=' + (parseInt(page) + 1) + adurl + '">Next &raquo;</a></li>';
      } else {
        pght += '<li class="next disabled"><a>Next &raquo;</a></li>';
      }
      //****************** */
      pght += '</ul>';
      return pght;
    },
    torrent_types: function () {
      if (!this.preferences) return;
      var types = this.preferences['torrent_pref']['types'] || [];
      types = types.join(',')
      return types;
    },
    feed_types: function () {
      if (!this.preferences) return;
      var types = this.preferences['feed_pref']['types'] || [];
      types = types.join(',')
      return types;
    },
    ucwrd: function (tthis) {
      if (!tthis) return;
      tthis = tthis.trim();
      return tthis.ucwords();
    },
    lwrcs: function (tthis) {
      if (!tthis) return;
      tthis = tthis.trim();
      return tthis.toLowerCase();
    },
    torrentDL: function () {
      if (!this || !this.torrent_sts) return;
      var status = this.torrent_sts ? '<i class="fa fa-circle text-navyx"></i>' : '';
      return status;
    },
    autoData: function () {
      if (!this || !this.topic_docs) return;
      var status = this.topic_docs.length > 0 ? '<i class="fa fa-circle text-warning"></i>' : '';
      return status;
    },
    autoDataBool: function () {
      if (!this || !this.topic_docs) return;
      var status = this.topic_docs.length > 0 ? 'true' : 'false';
      return status;
    },
    DataTopic: function () {
      if (!this || !this.topic_docs) return;
      return this.topic_docs.length > 0 ? true : false;
    },
    DataTpid: function () {
      if (!this || !this.topic_docs) return;
      return this.topic_docs.length > 0 ? this.topic_docs[0]._id : '';
    },
    editTopic: function () {
      if (!this || !this.topic_docs) return;
      // return this.topic_docs.length > 0 ? `<a data-tpid="${this.topic_docs[0]._id}" data-toggle="modal" data-target="#editpcc"  class="editpcc text-primary" href="javascript:void(0)"><i class="fa fa-pencil"></i></a>` : ``;
      return;
    },
    statusFeed: function (tthis) {
      return this.status == true ? '<i class="fa fa-check text-navyx"></i>' : '<i class="fa fa-close text-danger"></i>';
    },
    statusFeedOptions: function (tthis) {
      return tthis == true ? '<i class="fa fa-check text-navyx"></i>' : '<i class="fa fa-close text-danger"></i>';
    },
    //Task Functions
    childType: function () {
      if (!this.infos) return;

      var type = this.infos._key;

      switch (type) {
        case 'file':
          var btype = "File";
          break;

        case 'thumb':
          var btype = "Thumbnail";
          break;

        case 'poster':
          var btype = "Poster";
          break;

        case 'sample':
          var btype = "Sample";
          break;

        default:
          var btype = "File";
          break;
      }

      return btype;
    },
    childTaskStatus: function () {
      if (!this.stats) return;

      var stwich = this['stats']['status'];
      var stLabel = '';

      switch (stwich) {
        case 'running':
          stLabel = `<span data-status="Running" class="stsquare"><i title="Running" class="fa fa-square text-primary-b"></i></span>`;
          break;

        case 'pending':
          stLabel = `<span data-status="Pending" class="stsquare"><i title="Pending" class="fa fa-square text-default"></i></span>`;
          break;

        case 'aborted':
          stLabel = `<span data-status="Aborted" class="stsquare"><i title="Aborted" class="fa fa-square text-danger"></i></span>`;
          break;

        case 'finished':
          stLabel = `<span data-status="Finished" class="stsquare"><i title="Finished" class="fa fa-square text-success-b"></i></span>`;
          break;

        default:
          stLabel = `<span class="stsquare"><i title="Unknown status" class="fa fa-square text-default"></i></span>`;
          break;
      }

      return stLabel;
    },
    taskStatus: function () {
      if (!this.task_stats) return;

      var stwich = this['task_stats']['status'];

      var stLabel = '';
      //['pending', 'aborted', 'running', 'finished', 'queued']
      switch (stwich) {
        case 'running':
          stLabel = `<span class="label label-success">Running</span>`;
          break;

        case 'pending':
          stLabel = `<span class="label label-default">Pending</span>`;
          break;

        case 'aborted':
          stLabel = `<span class="label label-danger">Aborted</span>`;
          break;

        case 'finished':
          stLabel = `<span class="label label-primary">Finished</span>`;
          break;

        case 'downloading':
          stLabel = `<span class="label label-downloading">Download<i class="loading"></i></span>`;
          break;

        default:
          stLabel = `<span class="label label-Default">Initiated...</span>`;
          break;
      }

      return stLabel;
    },
    truncate: function (fullStr, strLen) {
      if (!fullStr) return;
      if (fullStr.length <= strLen) return fullStr;

      var separator = '...';

      var sepLen = separator.length,
        charsToShow = strLen - sepLen,
        frontChars = Math.ceil(charsToShow / 2),
        backChars = Math.floor(charsToShow / 2);

      return fullStr.substr(0, frontChars) +
        separator +
        fullStr.substr(fullStr.length - backChars);
    },
    speedApTask: function () {
      if (!this.tprogress) return `0%`;
      var tprogress = parseInt(this.tprogress);
      tprogress = isNaN(tprogress) ? `0%` : `${tprogress}%`;
      return tprogress;
    },
    speedApChildTask: function () {
      if (!this.stats) return;

      var taskStats = this.stats;
      var progress = parseInt(taskStats.progress);
      progress = isNaN(progress) ? `0%` : `${progress}%`;
      return progress;
    },
    dfspeed: function () {
      if (!this.stats) return;

      var taskStats = this.stats;
      var tspeed = taskStats.speed;
      if (parseInt(tspeed) == 0) {
        tspeed = `--/s`;
      } else {
        tspeed = tspeed;
      }
      return tspeed;
    },
    dfuploaded: function () {
      if (!this.stats) return;

      var taskStats = this.stats;
      var msuploaded = taskStats.uploaded;
      if (parseInt(msuploaded) == 0) {
        msuploaded = `--`;
      } else {
        msuploaded = msuploaded;
      }
      return msuploaded;
    },
    dfsize: function () {
      if (!this.infos) return;
      var taskInfos = this.infos;
      var msfsize = taskInfos.size;
      if (parseInt(msfsize) == 0) {
        msfsize = `--`;
      } else {
        msfsize = init.bytesToSize(msfsize).all;
      }
      return msfsize;
    },
    dmsize: function () {
      if (!this.task_infos) return;

      var taskInfos = this.task_infos;
      var msdsize = taskInfos.size;
      if (parseInt(msdsize) == 0) {
        msdsize = ``; //--
      } else {
        msdsize = init.bytesToSize(msdsize).all;
      }
      return msdsize;
    },
    statusBg: function () {
      if (!this.stats) return;

      var taskStats = this.stats;

      var stwich = taskStats.status;
      var cmstyle = '';

      switch (stwich) {
        case 'running':
          cmstyle = ``;
          break;

        case 'pending':
          cmstyle = ``;
          break;

        case 'aborted':
          cmstyle = `background-color:#FFE9E9;`;
          break;

        case 'finished':
          cmstyle = `background-color:#EAF9E3;`;
          break;

        default:
          cmstyle = ``;
          break;
      }

      return cmstyle;
    },
    fixCss: function (part) {
      if (!this.stats) return;

      var taskStats = this.stats;

      var bgRT;
      if (taskStats.status == 'finished') {
        switch (part) {
          case 'tr':
            bgRT = 'background-color:#EAF9E3;';
            break;
          case 'progressClass':
            bgRT = 'progress-success';
            break;
          case 'progressClassBar':
            bgRT = 'progress-bar-primary';
            break;
        }
      } else if (taskStats.status == 'aborted') {
        switch (part) {
          case 'tr':
            bgRT = 'background-color:#FFE9E9;';
            break;
          case 'progressClass':
            bgRT = 'progress-danger';
            break;
          case 'progressClassBar':
            bgRT = 'progress-bar-danger';
            break;
        }
      } else if (taskStats.status == 'running') {
        switch (part) {
          case 'tr':
            bgRT = '';
            break;
          case 'progressClass':
            bgRT = 'progress-striped active';
            break;
          case 'progressClassBar':
            bgRT = 'progress-bar-success';
            break;
        }
      } else if (taskStats.status == 'pending') {
        switch (part) {
          case 'tr':
            bgRT = '';
            break;
          case 'progressClass':
            bgRT = '';
            break;
          case 'progressClassBar':
            bgRT = 'progress-bar-success';
            break;
        }
      }

      return bgRT;
    },
    fixBigCss: function (part) {
      if (!this.task_stats) return;

      var thisStats = this.task_stats;

      var tasstatus = thisStats.status;

      var bgRT;
      if (tasstatus == 'finished') {

        var progress = thisStats.progress;
        // if (progress < 96) {
        //Finished with Errors
        switch (part) {
          case 'progressClass':
            bgRT = 'progress-primary';
            break;
          case 'progressClassBar':
            bgRT = 'progress-bar-primary';
            break;
        }

      } else if (tasstatus == 'aborted') {
        switch (part) {
          case 'progressClass':
            bgRT = 'progress-danger';
            break;
          case 'progressClassBar':
            bgRT = 'progress-bar-danger';
            break;
        }
      } else if (tasstatus == 'running') {
        switch (part) {
          case 'progressClass':
            bgRT = 'progress-striped active';
            break;
          case 'progressClassBar':
            bgRT = 'progress-bar-success';
            break;
        }
      } else if (tasstatus == 'pending') {
        switch (part) {
          case 'progressClass':
            bgRT = '';
            break;
          case 'progressClassBar':
            bgRT = 'progress-bar-primary';
            break;
        }
      }
      return bgRT;
    },
    exTopicYear: function () {
      if (this.topic.length == 0) return;
    }, iconSource: function (source) {
      if (!source) return;

      source = Array.isArray(source) ? source : [source];

      if (source && source.length == 0) return;

      var _icons = source.map(function (_src) {
        var hostname = new URL(_src).hostname;

        var _icon = "";
        if (hostname.match(/themoviedb/i)) {
          _icon = `<a href="${_src}" target="_blank"><img style="max-height: 16px;" src="/assets/img/dgrab/tmdb.png"></a>`;
        } else if (hostname.match(/thetvdb/i)) {
          _icon = `<a href="${_src}" target="_blank"><img style="max-height: 16px;" src="/assets/img/dgrab/tvdb_1.png"></a>`;
        } else if (hostname.match(/imdb/i)) {
          _icon = `<a href="${_src}" target="_blank"><img style="max-height: 16px;" src="/assets/img/dgrab/imdb.png"></a>`;
        } else if (hostname.match(/tvmaze/i)) {
          _icon = `<a href="${_src}" target="_blank"><img style="max-height: 16px;" src="/assets/img/dgrab/tvmaze.png"></a>`;
        } else if (hostname.match(/traktv/i)) {
          _icon = `<a href="${_src}" target="_blank"><img style="max-height: 16px;" src="/assets/img/dgrab/traktv.png"></a>`;
        }
        return _icon
      })

      return Array.from(new Set(_icons)).join(' ');

    }, extractHost: function (_host) {
      if (!_host) return;
      const myURL = new URL(_host);
      return myURL.hostname;
    }, isautopost: function () {
      return this.autopost == true ? '<i class="fa fa-check-circle text-navyx"></i>' : '<i class="fa fa-times text-danger"></i>';
    },
    fxTemplate: function () {
      if (!this) return;
      var template;
      var _type = this.data.type;
      var _template = this.data.template;
      if (_type == 'json') {
        template = JSON.stringify(_template, null, '\t');
      } else {
        template = _template;
      }

      template = template.replace(/\{(.*?)\}/ig, '<code style="color: #ca4440;background-color: #F9F2F4;font-weight:500;font-size:13px;" class="language-html" data-lang="html">{$1}</code>');

      return template;
    },
    servicestatus: function (_status) {
      return _status == 'running' || _status == 'online' || _status == 'launching' ? '<label class="label label-success">Running</label>' : '<label class="label label-danger">Stopped</label>';
    },
    servermonitor: function (_key) {
      /* { "cpu": "2%", "used": "117.1 MB", "total": "2 GB" } */
      if (!_key) return;
      if (!global._serverMonitor) return;
      var _lng = Object.keys(global._serverMonitor).length;
      if (_lng == 0) return;
      return global._serverMonitor[_key];
    },
    bandwidthmonitor: function (_key) {
      /* { rx: '144 kbit/s', tx: '362 kbit/s' } */
      if (!_key) return;
      if (!global._bandwidthMonitor) return;
      var _lng = Object.keys(global._bandwidthMonitor).length;
      if (_lng == 0) return;
      return global._bandwidthMonitor[_key];
    },
    status_posted: function (tthis) {
      return tthis == true ? '<span class="text-navyx"><i class="fa fa-check "></i> <b>Posted</b></span>' : '<span class="text-danger"><i class="fa fa-times"></i> <b>Posted</b></span>';
    },
    vProgressColor: function (progress) {
      if (!progress) return;
      var _progress = parseInt(progress) || 0;
      return _progress > 90 ? 'progress-bar-danger' : 'progress-bar-primary';
    }
  }
})

app.engine('.hbs', hbs.engine);

var staticThumbs = init.dir_thumbnails;
var staticSamples = init.dir_samples;

app.use('/thumbnails', express.static(staticThumbs));
app.use('/samples', express.static(staticSamples));
app.disable('x-powered-by');

///Cache-and-static-Part
var io = require('socket.io')();
app.io = global.io = io;

io.use(function (socket, next) {
  sessionMiddleware(socket.request, {}, next);
})

setTimeout(function () {
  io.emit('reloadApp', JSON.stringify({}))
}, 3000)

//Start Test Live Data
liveCPU({ pid: process.pid, io: io })

function liveCPU(opts) {
  opts = opts || {};

  var _pid = opts.pid;
  var _socket = opts.io;

  var _smemory = {};
  var total_memory = os.totalmem();

  var vcore = os.cpus().length

  var mdInterval;

  if (!_pid || !_socket) {
    clearInterval(mdInterval);
    mdInterval = undefined;
    return;
  }

  /*
  _smemory  { cpu: '1%', used: '118.0 MB', total: '2 GB' }
  */
  mdInterval = setInterval(function () {
    pidusage(_pid, function (err, stats) {
      //test
      var _cpu = parseInt(stats.cpu / vcore) || 0;
      _smemory['cpu'] = `${Math.ceil(_cpu)}%`;
      _smemory['used'] = init.bytesToSize(stats.memory).all;
      _smemory['total'] = init.bytesToSize(total_memory, { ceil: true }).all;

      global._serverMonitor = _smemory;

      if (_socket) {
        _socket.emit('cpu_monitor', JSON.stringify(_smemory));
      }
    })
  }, 2300)
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(sessionMiddleware);
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use(function (req, res, next) {
  res.locals.login = req.isAuthenticated();
  res.locals.session = req.session;
  res.locals.user = req.user;
  next();
});

app.use(cookieParser());

app.use(function (req, res, next) {
  res.locals.login = req.isAuthenticated();
  res.locals.session = req.session;
  res.locals.user = req.user;
  next();
});

app.use(function (req, res, next) {
  if (req.originalUrl != req.baseUrl + req.url) {
    res.redirect(301, req.baseUrl + req.url);
  } else {
    next();
  }
});

app.use('/kapi', kapiRouter);
app.use('/user', userRouter);
app.all('*', function (req, res, next) {
  if (req.isAuthenticated()) {
    next();
  } else {
    res.redirect('/user/login');
  }
});

app.use('/', indexRouter);
app.use('/files', filesRouter);
app.use('/tasks', tasksRouter);
app.use('/logs', logsRouter);
app.use('/torrents', torrentsRouter);
app.use('/settings', settingsRouter);

/**/
//Catch Get Missing Routes
app.get('*', function (req, res) {
  res.status(500).render('error.hbs', {
    title: 'Error',
    layout: 'errorlayout'
  })
});

//Catch POST Missing Routes
app.post('*', function (req, res) {
  res.status(500).render('error.hbs', {
    title: 'Error',
    layout: 'errorlayout'
  })
});

//Catch other Errors (Missing template,...)
app.use(function (err, req, res, next) {

  if (process.env.NODE_ENV == 'development') console.log('Catched Error : ', err)

  res.status(500).render('error.hbs', {
    title: 'Error',
    layout: 'errorlayout'
  }, function (err, html) {
    if (err) {
      res.redirect('/');
    } else {
      res.send(html);
    }
  })
})

const _port = init.port;

process.on("uncaughtException", function (err) {
  if (err && err.code == 'EADDRINUSE') {
    lsof.rawTcpPort(_port, function (data) {
      var _pid = Array.isArray(data) && data.length > 0 ? data[0].pid : null
      if (_pid) {
        ps.kill(_pid, {
          signal: 'SIGKILL',
          timeout: 10,
        }, function () {
          //-Test-> lsof -i:3000 | grep node
          console.log('Port Killed...');
          process.exit(1);
        });
      }
    });
  } else {
    console.log('Error Uncaught Exception  : ', err);
    process.exit(1);
  }
}).on("unhandledRejection", function (_error) {
  console.log('Error Unhandled Rejection  : ', _error.stack);
  process.exit(1);
}).on('SIGTERM', function (_error) {
  console.log('Error SIGTERM  : ', _error);
  server.end();
  process.exit(1);
})

app.set('port', _port);

var server = http.createServer(app);
io.attach(server, {
  pingInterval: 10000,
  pingTimeout: 5000
});

server.listen(_port);
