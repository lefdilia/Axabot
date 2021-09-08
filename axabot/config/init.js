var data = require('./init.json');

var bytesToSize = function (bytes, opts) {
    if (!bytes) return {
        size: 0,
        unit: 'KB',
        all: '0 KB'
    };


    opts = opts || {}

    var _fixed = opts.fixed != undefined ? opts.fixed : 1;
    var _ceil = opts.ceil != undefined ? true : false;

    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes == 0) return 'n/a';
    if (bytes <= 1024) bytes = 1024;
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    if (i == 0) return {
        size: bytes + " " + sizes[i]
    };

    var _fSize = (bytes / Math.pow(1024, i)).toFixed(_fixed);
    _fSize = _ceil == true ? Math.ceil(_fSize) : _fSize;
    var _funit = sizes[i];

    var okba = {
        size: _fSize,
        unit: _funit,
        all: `${_fSize} ${_funit}`,
        bytes: bytes
    };

    return okba;
}

module.exports = {
    env: data.env,
    _updateCode: data.update.code,
    _changeLog: data.update.changelog,
    transport: data.keys.transport,
    OAuth2: data.keys.OAuth2,
    xmlrpc: data.xmlrpc,
    name: data.name,
    version: data.version,
    mtn: data.bin.mtn,
    port: data.port,
    dir_base: data.dir_base,
    dir_incomplete: data.dir_incomplete,
    dir_downloads: data.dir_downloads,
    dir_samples: data.dir_samples,
    dir_compressed: data.dir_compressed,
    dir_thumbnails: data.dir_thumbnails,
    dir_posts: data.dir_posts,
    rctorrent: data.rctorrent,
    nfo_font: "public/fonts/nfo_font_ecr.ttf",
    exclude: ['.DS_Store'],
    expt: data.expt || [],
    keys: data.keys,
    bytesToSize: bytesToSize,
    _emitInterval: 1500,
    reversebytesToSize: function (sizeIString) {
        if (typeof sizeIString !== 'string' || !sizeIString) return 0;
        var numMt = /\d+(\.\d*)?/i;
        var digit = sizeIString.match(numMt) ? sizeIString.match(numMt)[0] : 1;
        digit = digit < 1 ? 1 : digit;

        var units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        var values = [1, 1024, 1048576, 1073741824, 1099511627776];
        var exit;

        units.forEach(function (unit, i) {
            if (sizeIString.toUpperCase().match(unit)) {
                exit = values[i] * digit;
            }
        })
        return exit;
    },
    forHumans: function (seconds) {
        var levels = [
            [Math.floor(seconds / 31536000), 'years'],
            [Math.floor((seconds % 31536000) / 86400), 'days'],
            [Math.floor(((seconds % 31536000) % 86400) / 3600), 'hours'],
            [Math.floor((((seconds % 31536000) % 86400) % 3600) / 60), 'minutes'],
            [((Math.round(seconds % 31536000) % 86400) % 3600) % 60, 'seconds'],
        ];
        var returntext = '';
        for (var i = 0, max = levels.length; i < max; i++) {
            if (levels[i][0] === 0) continue;
            returntext += ' ' + levels[i][0] + ' ' + (levels[i][0] === 1 ? levels[i][1].substr(0, levels[i][1].length - 1) : levels[i][1]);
        };
        return returntext.trim();
    },
    convertSeconds: function (n) {
        if (!n || isNaN(n)) return '00:00:00';
        var sep = ':',
            n = parseFloat(n),
            sss = parseInt((n % 1) * 1000),
            hh = parseInt(n / 3600);
        n %= 3600;
        var mm = parseInt(n / 60),
            ss = parseInt(n % 60);
        return pad(hh, 2) + sep + pad(mm, 2) + sep + pad(ss, 2) + '';

        function pad(num, size) {
            var str = num + "";
            while (str.length < size) str = "0" + str;
            return str;
        }
    },
    time_ago: function (time) {

        switch (typeof time) {
            case 'number':
                break;
            case 'string':
                time = +new Date(time);
                break;
            case 'object':
                if (time.constructor === Date) time = time.getTime();
                break;
            default:
                time = +new Date();
        }
        var time_formats = [
            [60, 'seconds', 1], // 60
            [120, '1 minute ago', '1 minute from now'], // 60*2
            [3600, 'minutes', 60], // 60*60, 60
            [7200, '1 hour ago', '1 hour from now'], // 60*60*2
            [86400, 'hours', 3600], // 60*60*24, 60*60
            [172800, 'Yesterday', 'Tomorrow'], // 60*60*24*2
            [604800, 'days', 86400], // 60*60*24*7, 60*60*24
            [1209600, 'Last week', 'Next week'], // 60*60*24*7*4*2
            [2419200, 'weeks', 604800], // 60*60*24*7*4, 60*60*24*7
            [4838400, 'Last month', 'Next month'], // 60*60*24*7*4*2
            [29030400, 'months', 2419200], // 60*60*24*7*4*12, 60*60*24*7*4
            [58060800, 'Last year', 'Next year'], // 60*60*24*7*4*12*2
            [2903040000, 'years', 29030400], // 60*60*24*7*4*12*100, 60*60*24*7*4*12
            [5806080000, 'Last century', 'Next century'], // 60*60*24*7*4*12*100*2
            [58060800000, 'centuries', 2903040000] // 60*60*24*7*4*12*100*20, 60*60*24*7*4*12*100
        ];
        var seconds = (+new Date() - time) / 1000,
            token = 'ago',
            list_choice = 1;

        if (seconds == 0) {
            return 'Just now'
        }
        if (seconds < 0) {
            seconds = Math.abs(seconds);
            token = 'from now';
            list_choice = 2;
        }
        var i = 0,
            format;
        while (format = time_formats[i++])
            if (seconds < format[0]) {
                if (typeof format[2] == 'string')
                    return format[list_choice];
                else
                    return Math.floor(seconds / format[2]) + ' ' + format[1] + ' ' + token;
            }
        return time;
    },
    generate: function (len) {
        var pwd = '';
        var con = new Array('b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'w', 'x', 'y', 'z');
        var voc = new Array('a', 'e', 'i', 'o', 'u');
        for (i = 0; i < len / 2; i++) {
            var c = Math.ceil(Math.random() * 1000) % 20;
            var v = Math.ceil(Math.random() * 1000) % 5;
            pwd += con[c] + voc[v];
        }
        return pwd;
    },
    randPassword: function (letters, numbers, either) { // randPassword(5,3,2)
        var chars = [
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", // letters
            "0123456789", // numbers
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789" // either
        ];

        return [letters, numbers, either].map(function (len, i) {
            return Array(len).fill(chars[i]).map(function (x) {
                return x[Math.floor(Math.random() * x.length)];
            }).join('');
        }).concat().join('').split('').sort(function () {
            return 0.5 - Math.random();
        }).join('')
    },
    rn: function (len, pr) {
        let s = Math.random().toString(36).substr(2, len);
        return pr ? '_' + s : s;
    },
    daterpl: function (datep) {
        return typeof datep !== 'object' ? new Date(datep).toLocaleString("en-GB", {
            hour12: false
        }) : new Date(datep).toLocaleString("en-GB", {
            hour12: false
        });
    },
    unifyNaEx: function () {
        var element = '';
        for (var ii = 0; ii < arguments.length; ii++) {
            element += arguments[ii];
        }
        return element;
    },
    unifyNames: function (len, an, prefix) {
        an = an && an.toLowerCase();
        var str = "",
            i = 0,
            min = an == "a" ? 10 : 0,
            max = an == "n" ? 10 : 62;
        for (i = 0; i++ < len;) {
            var r = Math.random() * (max - min) + min << 0;
            str += String.fromCharCode(r += r > 9 ? r < 36 ? 55 : 61 : 48);
        }

        if (prefix) {
            return str = prefix + str;
        } else {
            return "__" + str + "_";
        }
    },
    extInfo: function (_release, done) {

        var _RGX = new RegExp(/(s([0-9]{1,2})e?([0-9]{1,2})?|[0-9]{4}(\s+|\.+)[0-9]{2}(\s+|\.+)[0-9]{2})/, 'ig')

        var GValue = _release.match(_RGX);

        if (!GValue) return done('No Match');

        var Info_ = '';
        var Season_ = '';
        var Episode_ = '';
        var Air_Episode_ = '';

        try {
            Info_ = GValue.toString().match(/s([0-9]{1,3})e([0-9]{1,3})/ig);
            Info_ = Info_ ? Info_[0].toString() : '';
        } catch (e) { }

        try {
            Season_ = GValue.toString().match(/s([0-9]{1,3})/ig).toString().match(/\d+/g).toString()
        } catch (e) { }

        try {
            Episode_ = GValue.toString().match(/e([0-9]{1,3})/ig).toString().match(/\d+/g).toString()
        } catch (e) { }

        try {
            Air_Episode_ = GValue && !Season_ && !Episode_ ? GValue.toString() : ''
        } catch (e) { }

        return done(null, {
            info: Info_,
            season: Season_,
            episode: Episode_,
            air_episode: Air_Episode_
        })
    },
    decodeHTMLEntities: function (text) {
        var entities = [
            ['amp', '&'],
            ['apos', '\''],
            ['#x27', '\''],
            ['#x2F', '/'],
            ['#39', '\''],
            ['#47', '/'],
            ['#45', '-'],
            ['lt', '<'],
            ['gt', '>'],
            ['nbsp', ' '],
            ['quot', '"']
        ];

        for (var i = 0, max = entities.length; i < max; ++i)
            text = text.replace(new RegExp('&' + entities[i][0] + ';', 'g'), entities[i][1]);

        return text;
    },
    clearMostTags: function (title) {
        if (!title) return;
        title = title.replace(/\s+/ig, ' ')
        //
        title = title.replace(/\(S\:\d+\/L\:\d+\)/ig, '') //Yggtorrent  (S:18/L:0)

        title = title.trim();
        return title;
    },
    clearRelease: function (_release, rpc) {
        _release = _release.replace(/[`~!@#$%^&*()_|+\-=?°;:'",.<>\{\}\[\]\\\/]/gi, ' ');
        _release = _release.replace(/\s+/ig, ' ');
        _release = _release.trim();

        if (rpc) {
            _release = _release.replace(/\s/ig, rpc);
            var _srpc = new RegExp(`\\${rpc}+`, 'ig');
            _release = _release.replace(_srpc, rpc);
        }

        _release = _release.trim();
        return _release;
    },
    clearErrors: function (_error) {

        console.log('clearErrors ; ', _error)

        _error = _error.replace(/[`~!@#$%^&*()_|+\-=?°;:'",.<>\{\}\[\]\\\/]/gi, ' ');
        _error = _error.replace(/\s+/ig, ' ');
        _error = _error.trim();
        return _error;
    },
}