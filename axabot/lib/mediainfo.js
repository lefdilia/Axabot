const init = require("../config/init");
const { spawn } = require("child_process");
const split = require("split");
const _ = require("underscore");

const fbin = '/usr/bin/ffprobe';

function ffprobe(opts, callback) {
    var file = typeof opts == 'object' ? opts.file : opts;
    var args = [];
    var infos;

    args.push(`-v`);
    args.push(`quiet`);

    args.push(`-show_entries`);
    args.push(`format=size,duration,format_long_name,duration,bit_rate:format_tags=encoder:stream_tags=language,title:stream=sample_rate,codec_type,width,height,codec_name,profile,pix_fmt,field_order,bit_rate,display_aspect_ratio,sample_aspect_ratio,channel_layout,r_frame_rate,sample_fmt`);
    args.push(`-print_format`);
    args.push(`json`);
    args.push(`${file}`);

    var mediaInfo = {};
    var cerror = null;
    var cli = spawn(fbin, args, []);

    // Stream stdout
    cli.stdout.pipe(split(/((?:\r?\n){3})/)).on('data', function (data) {
        try {
            infos = JSON.parse(data);

            if (!infos['streams']) {
                cerror = 'No stream found.';
                return cli.kill();
            }

            delete infos['programs'];

            var streams = _.groupBy(infos['streams'], "codec_type");

            var _format = infos['format'] ? infos['format'] : {};
            var _video = streams['video'] ? streams['video'][0] : {};
            var _audio = streams['audio'] ? streams['audio'][0] : {};
            var _subtitle = streams['subtitle'];

            //Fix format object
            mediaInfo['general'] = {
                format: `${_format.format_long_name ? _format.format_long_name : ''}`,
                duration: `${parseInt(_format.duration) > 0 ? Math.round(_format.duration) : 0}`,//in secondes
                duration_h: `${parseInt(_format.duration) > 0 ? init.forHumans(_format.duration) : ''}`,
                size: `${parseInt(_format.size) > 0 ? init.bytesToSize(_format.size).all : ''}`,
                bitrate: `${parseInt(_format.bit_rate) > 0 ? Math.round(_format.bit_rate / 1000) + ' kb/s' : ''}`,
                encoder: `${_format.tags && _format.tags.encoder ? _format.tags.encoder : (_format.tags.ENCODER ? _format.tags.ENCODER : '')}`,
            }
            //  Fix Video object
            mediaInfo['video'] = {
                codec: `${_video.codec_name ? _video.codec_name.toUpperCase() : ''}${_video.profile ? ' (' + _video.profile + ')' : ''}`,
                pixel_format: `${_video.pix_fmt} ${_video.field_order ? '(' + _video.field_order + ')' : ''}`,
                resolution: `${_video.width}x${_video.height} [SAR ${_video.sample_aspect_ratio ? _video.sample_aspect_ratio : '0:0'} DAR ${_video.display_aspect_ratio ? _video.display_aspect_ratio : '0:0'}]`,
                aspect: `[SAR ${_video.sample_aspect_ratio ? _video.sample_aspect_ratio : '0:0'} - DAR ${_video.display_aspect_ratio ? _video.display_aspect_ratio : '0:0'}]`,
                frame_rate: `${_video.r_frame_rate ? eval(_video.r_frame_rate).toFixed(2) + ' fps' : ''}${_video.tags && _video.tags.language && _video.r_frame_rate ? ' (' + _video.tags.language + ')' : ''}`,
            }
            //  Fix Audio object
            mediaInfo['audio'] = {
                codec: `${_audio.codec_name ? _audio.codec_name.toUpperCase() : ''}${_audio.profile ? ' (' + _audio.profile + ')' : ''}`,
                channel_layout: `${_audio.channel_layout ? _audio.channel_layout : ''}`,
                sample_rate: `${_audio.sample_rate ? _audio.sample_rate / 1000 + ' kHz' : ''}`,
                sample_fmt: `${_audio.sample_fmt ? _audio.sample_fmt : ''}${_audio.tags && _audio.tags.language && _audio.sample_fmt ? ' (' + _audio.tags.language + ')' : ''}`
            }

            var _obj = {
                codecs: [],
                languages: [],
                infos: []
            };

            try {
                //  Fix subtitle object
                mediaInfo['subtitle'] = _subtitle
                    .map(function (sub) {
                        var _lng = sub.tags && sub.tags.title ? sub.tags.title.ucwords() : (sub.tags && sub.tags.language ? sub.tags.language.ucwords() : '');
                        return {
                            "codec": `${sub.codec_name ? sub.codec_name.toUpperCase() : ''}`,
                            "language": `${_lng}`
                        }
                    }).map(function (item) {
                        if (_obj.codecs.indexOf(item.codec) === -1) _obj.codecs.push(item.codec);
                        if (_obj.languages.indexOf(item.language) === -1) _obj.languages.push(item.language);
                        return _obj;
                    }).map(function (_item) {
                        _obj.languages = _item.languages.filter(e => String(e).trim());
                        _obj.infos = `${_obj.codecs.join(' , ')}${_item.languages.length > 0 ? ' [ ' + _item.languages.join(', ') + ' ]' : ''}`;
                        return;
                    })
            } catch (e) {
                mediaInfo['subtitle'] = _obj;
            }

            mediaInfo['subtitle'] = _obj

            mediaInfo['video']['infos'] = Object.values(mediaInfo['video']).filter(function (el) { return el; }).join(', ');
            mediaInfo['audio']['infos'] = Object.values(mediaInfo['audio']).filter(function (el) { return el; }).join(', ');

        } catch (e) {
            cerror = 'Error Parsing Data.';
            return cli.kill();
        }
    });

    cli.on('close', function (code) {
        return callback(cerror, mediaInfo)
    })
}


String.prototype.ucwords = function () {
    str = this.trim();
    return str.replace(/(^([a-zA-Z\p{M}]))|([ -][a-zA-Z\p{M}])/g, function (s) {
        return s.toUpperCase();
    });
};


module.exports = ffprobe;