const init = require('../config/init');

var fs = require('fs'),
    archiver = require('archiver'),
    util = require('util'),
    path = require('path'),
    _ = require('underscore'),
    exec = require('child_process').exec,
    EventEmitter = require('events').EventEmitter,
    async = require('async')

var rar = function () {
    var _this = this;
    if (!(_this instanceof rar)) return new rar();
    EventEmitter.call(_this);
    switch (process.platform) {
        case 'darwin':
            this.bin = 'rar'; // /usr/local/bin'
            break;
        case 'win32':
            this.bin = process.arch == 'x64' ? '\"C:\\\\Program Files\\\\WinRAR\\\\Rar.exe\"' : '\"C:\\\\Program Files (x86)\\\\WinRAR\\\\Rar.exe\"';
            break;
        case 'linux': //sudo apt-get install rar
            this.bin = '/usr/bin/rar';
            break;
    }
}

util.inherits(rar, EventEmitter);

rar.prototype.getSize = function (dir) {
    var _this = this;

    var walkSync = function (dir, filelist) {
        files = fs.readdirSync(dir);
        filelist = filelist || [];
        files.forEach(function (file) {
            var stats = fs.statSync(path.join(dir, file));
            if (stats.isDirectory()) {
                filelist = walkSync(path.join(dir, file), filelist);
            } else {
                filelist.push(stats.size);
            }
        });
        return filelist;
    };

    return walkSync(dir).reduce(function (a, b) {
        return a + b;
    }, 0);
}


rar.prototype.compress = function (opts, done) {
    var _this = this;

    opts = opts || {};
    _this.file = opts.file;
    opts.compression = opts.compression || 0;
    opts.recrusion = opts.recrusion || false;
    opts.shortcuts = opts.shortcuts || [];
    opts.ADS = opts.ADS || [];
    opts.ignore = opts.ignore || [];

    opts.addit = rn(6);

    // var destSize = 0;
    fs.stat(_this.file, function (err, stats) {
        if (err) return done('File Error.');

        var destName = path.basename(_this.file, path.extname(_this.file));
        destName = destName.replace(/[^a-zA-Z0-9 ]/ig, " ").trim().replace(/\s+/ig, '_');
        destName = (destName.trim() != "" ? destName : '____ANM') + ".zip";

        var dest = path.resolve(init.dir_compressed, destName);

        var output = fs.createWriteStream(dest);
        var archive = archiver('zip', {
            store: true
        });

        output.on('close', function () {
            // destSize = archive.pointer();
            return done(null, [dest])
        });

        //Start HERE
        if (stats.isFile()) {
            archive.pipe(output);
            archive.append(fs.createReadStream(_this.file), {
                name: destName
            });
        } else {
            archive.directory(_this.file, destName, {
                date: new Date()
            });
            archive.pipe(output);

        }

        if (Array.isArray(opts.ADS)) {
            opts.ADS.forEach(function (item) {
                archive.append(item.text, {
                    name: item.name
                });
            })
        }
        archive.finalize();

    })
}


rar.prototype.archiver = function (opts, done) {
    var _this = this;

    opts = opts || {};

    _this.args = opts.args || [];
    _this.file = opts.file;

    opts.compression = opts.compression || 0;
    opts.part = Number(opts.part) || 1;
    opts.recrusion = opts.recrusion || false;
    opts.shortcuts = opts.shortcuts || [];
    opts.ignore = opts.ignore || [];
    opts.overwrite = opts.overwrite || false;

    var ak = opts.ak;

    opts.addit = ak.rid ? '_' + ak.rid : '';

    var password = parseInt(ak.password);
    var comment = ak.comment;
    var equal = ak.equal;
    var spSize = parseInt(ak.spSize) * 1000 * 1000; //in Mb -> *1000 to convert to KB *1000 to convert to byte
    spSize = !isNaN(spSize) ? spSize : 0;


    var commentTmp = "/tmp/message.txt";
    if (comment)
        fs.writeFileSync(commentTmp, comment)

    fs.stat(_this.file, function (err, stats) {
        if (err) return done(null, []);

        _this.args = ['a'];


        if (!isNaN(password))
            _this.args.push('-p' + password);

        if (comment)
            _this.args.push(`-z${commentTmp}`);

        _this.args.push('-ep1');

        var part = 1;
        if (!opts.recrusion) {
            var sip;
            if (stats.isDirectory()) {
                _this.args.unshift('-r')
                stats.size = _this.getSize(_this.file);

                part = opts.part = (spSize != 0 && spSize) > 1000000 ? Math.ceil(stats.size / spSize) : part;
                part = equal == false ? 1 : part;
                var dataSize = equal == true && spSize != 0 && spSize > 1000000 ? stats.size : spSize;
                sip = formatBytes(dataSize, 10);
                _this.size = '-v' + roundToTwo((sip.size) / part) + sip.unit;
            } else {
                part = opts.part = spSize != 0 && spSize > 1000000 ? Math.ceil(stats.size / spSize) : part;
                sip = formatBytes(stats.size, 10);
                _this.size = '-v' + roundToTwo((sip.size) / part) + sip.unit;
            }
        } else {
            _this.size = "";
        }

        if (Array.isArray(opts.ignore)) {
            opts.ignore.forEach(function (val, i) {
                if (val.match(/^\./)) _this.args.push('-x*' + val + ""); // Extentions
                if (val.match(/^[\w,\s-]+\.[A-Za-z]{3}$/)) _this.args.push("-x*\"" + val + "\""); //Files
                if (val.match(/^[\w,\s-]+\/$/)) _this.args.push("-x" + val + "*"); //Files
            });
        }

        opts.overwrite ? _this.args.push('-o+') : _this.args.push('-o-');
        opts.compression && (opts.compression >= 0 && opts.compression <= 5) ? _this.args.push('-m' + opts.compression) : _this.args.push('-m0');

        opts.part && opts.part > 1 ? _this.args.push(_this.size) : ''; 

        _this.addit = opts.addit;

        var destName = path.basename(_this.file, path.extname(_this.file));
        destName = destName.replace(/[^a-zA-Z0-9 ]/ig, " ").trim().replace(/\s+/ig, '_');
        destName = (destName.trim() != "" ? destName : '____ANM') + _this.addit;

        var bsName = destName + ".rar";
        //
        var dest = path.resolve(init.dir_compressed, bsName);
        //
        _this.args.push("\"" + dest + "\"");
        _this.args.push("\"" + _this.file + "\"");

        if (Array.isArray(opts.shortcuts)) {
            opts.shortcuts.forEach(function (val, i) {
                _this.args.push("\"" + path.join(init.DISKBASE, val) + "\"");
            })
        }

        var cmdExec = _this.bin + " " + _this.args.join(" ");

        var command = exec(cmdExec).on("exit", function () {
            command.kill();

            checkParts({
                part: opts.part,
                destName: destName
            }, done);
        }).on('close', function () {
            command.kill();
            checkParts({
                part: opts.part,
                destName: destName
            }, done);
        })
    })
}


function checkParts(opts, done) {
    opts = opts || {};
    var dir = init.dir_compressed;
    var destName = opts.destName;
    if (!destName) return done('No File found, please reset the task.');
    fs.readdir(dir, function (err, files) {
        var stFinal = files.filter(function (file) {
            return file.includes(destName);
        }).map(function (file) {
            return path.resolve(dir, file);
        })
        return done(null, stFinal);
    })
}

function rn(len) {
    let s = Math.random().toString(36).substr(2, len);
    return '_' + s;
}


function formatBytes(bytes, decimals) {
    //Need this fn to format size of splitted rar parts
    if (bytes == 0) return bytes;
    var k = 1000;
    var dm = decimals + 1 || 3;
    var sizes = ['b', 'k', 'm', 'g'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));

    var _size = (bytes / Math.pow(k, i)).toPrecision(dm);
    var _unit = sizes[i];
    var _fmt = `${_size} ${_unit}`;
    return {
        size: _size,
        unit: _unit,
        fmt: _fmt
    }
};

function mcCleaner(string) {

    string = string.trim();
    string = string.replace(/[&\/\\#,+()$~%'"_;:*?*!<>{}]/g, '_');
    string = string.replace(/[ www.Torrent9.Red ]/ig, ' ');
    string = string.replace(/\s+/g, ' ');
    string = string.replace(/\.+/g, ' ');
    string = string.replace(/\_+/g, ' ');

    string = string.replace(/\.(\s+)?$/, ' ');
    string = string.replace(/^\.(\s+)?/, ' ');

    string = string.trim().replace(/\s+/g, '_');

    return string;
}

function roundToTwo(num) {
    return +(Math.ceil(num + "e+2") + "e-2");
}

module.exports = rar();