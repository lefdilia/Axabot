process.setMaxListeners(Infinity);

const init = require('../config/init');
const fs = require('fs');
const path = require('path');

const iconv = require('iconv-lite');
const gd = require('node-gd');
const json_mediainfo = require('./mediainfo');

const {
    exec,
    spawn
} = require('child_process');


var createThumbnail = function (opts, callback) {

    opts = opts || {};

    var file = opts.file;
    if (!file) return callback('File Error..');

    var cols = opts.cols || 3;
    var rows = opts.rows || 4;
    var disabledText = opts.MediaInfos ? `-i -t` : ``; 
    var topText = opts.text ? `\n${opts.text}` : '';
    var thumbDir = init.dir_thumbnails;

    var mtn = init.mtn;
    var stype = Boolean(opts.stype);

    var rId = opts.rid;
    var suffix = rId ? `___Thumb_${rId}.png` : undefined || `__Thumb_.png`;

    var command = `${mtn} -T "${topText}" -B 10.0 -E 10.0 -w 1024 -h 30 -c ${cols} -r ${rows} -b 1 -D 12 ${disabledText} -f /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf -F FFFFFF:11:/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:FFFFFF:000000:10 -k 191919 -O ${thumbDir} -o ${suffix} "${file}"`;

    const child = exec(command);

    var output;
    var thumbs = [];
    child.on('exit', function (code, signal) {
        if (code != 0) return callback(`Error output..${code}`);
        return callback(null, thumbs);
    });

    child.stdout.on('data', (data) => {
        data = data.toString();
        output = data.match(/output\:\s+(.*?)$/im);
        output = output ? thumbs.push(output[1]) : null;
    });

    child.stderr.on('data', (data) => {
        data = data.toString();
        output = data.match(/output\:\s+(.*?)$/im);
        output = output ? thumbs.push(output[1]) : null;
    });

}

var fontPath = path.resolve(__dirname, '..', init.nfo_font)
var convertNFO = function (opts, callback) {
    opts = opts || {};
    var file = opts.file;
    var bbname = opts.bbname;

    if (!file) {
        callback('Error: Nfo File.');
        return;
    }

    var dark = opts.dark || false;
    var rId = opts.rid;
    var output = rId ? `${bbname}___NFO_${rId}.png` : undefined || `${bbname}___NFO.png`;

    var dest = opts.dest || init.dir_thumbnails;
    output = path.resolve(dest, output);

    const resp = fs.createReadStream(file);

    var chunks = [];
    resp.on('data', function (chunk) {
        chunks.push(chunk);
    });
    resp.on('end', function () {
        if (chunks.length > 0) {
            var decoded = iconv.decode(Buffer.concat(chunks), 'cp437');
            var nfo = iconv.encode(decoded, 'utf8').toString();
            //Ncode-Start
            var NFO_FONT_FILE = fontPath;
            var NFO_FONT_HEIGTH = 10; //9; //10;
            var NFO_FONT_WIDTH = 7; //6; //7;
            var NFO_LINE_SPACING = 2;
            var NFO_LINE_HEIGTH = (NFO_FONT_HEIGTH + NFO_LINE_SPACING);
            var NFO_SIDES_SPACING = 20;

            var xmax = 0,
                ymax = 0;

            try {
                nfo = nfo.split("\n").map(function (it) {
                    return it.trimEnd();
                })
            } catch (e) { /*callback here*/
                return callback('/!\\ NFO Convertion Error');
            }

            if (opts.tag) {
                var tag = opts.tag.toString();
                nfo.push('\n[' + tag + ']');
            }

            nfo.forEach(function (line) {
                if (xmax < line.length)
                    xmax = line.length;
            });

            xmax = (NFO_SIDES_SPACING * 2) + (NFO_FONT_WIDTH * xmax);
            ymax = (NFO_SIDES_SPACING * 2) + (NFO_LINE_HEIGTH * nfo.length);

            if (xmax * ymax > 9000000) {
                callback('File too big, try again with a smaller file!');
            }
            // Create blank new image in memory
            gd.createTrueColor(xmax, ymax, function (error, img) {

                var EDC = {};
                if (dark == true) {
                    EDC = {
                        bg: [0, 0, 0],
                        txt: [255, 255, 255],
                        bgw: 400,
                        txtw: 0
                    }
                } else {
                    EDC = {
                        bg: [255, 255, 255],
                        txt: [0, 0, 0],
                        bgw: 400,
                        txtw: 0
                    }
                }

                img.alphaBlending(0);
                var background = img.colorAllocateAlpha(EDC['bg'][0], EDC['bg'][1], EDC['bg'][2], EDC['bgw']);
                img.filledRectangle(0, 0, xmax, ymax, background);
                img.alphaBlending(1);

                var txtColor = img.colorAllocateAlpha(EDC['txt'][0], EDC['txt'][1], EDC['txt'][2], EDC['txtw']);

                var drawy = (NFO_SIDES_SPACING + NFO_LINE_HEIGTH),
                    drawx = NFO_SIDES_SPACING;

                for (let ind = 0; ind < nfo.length; ind++) {
                    var ckline = nfo[ind];

                    img.stringFTEx(txtColor, NFO_FONT_FILE, NFO_FONT_HEIGTH, 0, drawx, drawy, ckline, { // vdpi: 70
                        hdpi: 90
                    });
                    drawy += NFO_LINE_HEIGTH;
                }

                img.savePng(output, 1, function (err) {
                    if (err) return callback('Error Saving Image..');
                    // Destroy image to clean memory
                    img.destroy();
                    return callback(null, [output]);
                });
            });
            //Ncode-End
        } else {
            return callback('Error: No data received');
        }
    });

}

function getFileDuration(file, callback) {
    return new Promise(function (resolve, reject) {
        var duration = 0;
        json_mediainfo(file, function (err, res) {
            if (err || !res) return resolve(duration);
            duration = res['general'] ? res['general']['duration'] : 0;
            resolve(duration);
        })
    })
}

var createSample = function (opts, callback) {
    opts = opts || {};
    var file = opts.file;

    var ext = path.extname(file);
    if (!ext || !file) return;

    var basenm = path.basename(file, ext);
    var rId = opts.rid;
    var outputfs = rId ? `${basenm}_Sample_${rId}${ext}` : undefined || `${basenm}_Sample_${ext}`;

    var dest = opts.dest || init.dir_samples;
    var output = path.resolve(dest, outputfs);

    getFileDuration(file).then(function (duration) {
        if (duration > 300) { // > 5 min
            var start = Math.floor((duration / 1000) / 2); // convert to secondes / 2 
            var command = `/usr/bin/ffmpeg -y -ss ${start} -i "${file}" -t 25 -c:v copy -c:a copy ${output}`;
            const child = exec(command);
            child.on('exit', function (code, signal) {
                if (code != 0) return callback(`Error output.${outputfs}`);
                return callback(null, [output]);
            });
        } else {
            return callback('File Duration is less than 5 min');
        }
    })
}


module.exports.createThumbnail = createThumbnail;
module.exports.convertNFO = convertNFO;
module.exports.createSample = createSample;