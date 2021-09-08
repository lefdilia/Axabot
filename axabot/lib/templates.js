
const init = require('../config/init');
const mapKeys = require('lodash').mapKeys;
const cleanDeep = require('clean-deep');


var toHuman = function (opts) {
    return new Promise(function (resolve, reject) {

        opts = opts || {};
        var _type = opts.type || 1;

        //Start-Edit
        var _data = opts.res.data;

        var _hideLinks = opts['res']['hide_links'];

        _data['download_links'] = _data['_links_'].filter(function (_obj) {
            return _obj[1];
        })

        _data['ts_links'] = _data['ts_links'].filter(function (_obj) {
            return _obj.link;
        }).map(function (_obj) {
            return {
                host: _obj.host,
                filename: _obj.filename,
                filenameRD: _obj.filenameRD,
                size: init.bytesToSize(_obj.size).all,
                link: _hideLinks == true && _obj.sh_link ? _obj.sh_link : _obj.link
            }
        })

        _data['links'] = _data['_links_'].map(function ([key, val]) {        // Fixed
            return val;
        }).filter((obj) => obj);

        _data['links_'] = _data['_or_links_'].map(function ([key, val]) {    // Fixed
            return val;
        })

        _data['samples_'] = _data['_or_samples_'].map(function ([key, val]) {    // Fixed
            return val;
        })

        _data['gsample'] = _data['gsample'].filter((_obj) => _obj[1]);

        _data['download_links'] = Array.isArray(_data['download_links']) && _data['download_links'].length == 0 ? _data['_or_links_'] : _data['download_links']

        var bsdlinks = {};
        Object.assign(_data['_links_'].map(([key, val, dal]) => ({ [key]: val }))).forEach(function (_value) {
            var _key = Object.keys(_value);

            if (!_value[_key]) return;

            if (bsdlinks.hasOwnProperty(_key)) {
                bsdlinks[_key] = [_value[_key], bsdlinks[_key]].flat()
            } else {
                bsdlinks[_key] = _value[_key]
            }
        })

        var osdlinks = {};
        Object.assign(_data['_or_links_'].map(([key, val]) => ({ [key]: val }))).forEach(function (_value) {
            var _key = Object.keys(_value);
            if (osdlinks.hasOwnProperty(_key)) {
                osdlinks[_key] = [_value[_key], osdlinks[_key]].flat()
            } else {
                osdlinks[_key] = _value[_key]
            }
        })

        mapKeys(bsdlinks, (value, key) => {
            var _k = key.replace(/\.+/ig, "_");
            _data[_k] = Array.isArray(value) ? value.sort(function (a, b) {
                return a[1] > b[1] ? 1 : -1;
            }) : value;
            return
        })

        //End-Edit
        _data['mt_summary'] = _data['mt_summary'] && typeof _data['mt_summary'] == 'string' ? _data['mt_summary'].replace(/\"/ig, '\\"') : _data['mt_summary'];


        try {
            if (Array.isArray(_data['gposter']) && _data['gposter'].length > 0) {
                _data['mt_poster'] = _data['gposter'][0];
            }
        } catch (e) { }


        _data = mapKeys(_data, (value, key) => {
            return `{${key}}`;
        })

        if (_data['{gsize}']) _data['{gsize}'] = init.bytesToSize(_data['{gsize}']).all;

        replaceVariables({
            result: opts.res,
            data: _data
        }, function (err, result) {
            if (err) result = [];

            var _obj = {};
            _obj['type'] = _type;
            _obj['stype'] = result['stype'];
            _obj['stitle'] = result['stitle'];
            _obj['code'] = result['mt'];

            _data = mapKeys(_data, (value, key) => {
                return key.replace(/\{|\}/ig, '');
            });

            if (_hideLinks !== true) {
                delete _data['links_'];
                delete _data['samples_'];
            }

            _data['download_links'] = _data['links'].filter((obj) => obj);

            _data['gsample'] = _data['gsample'].map(function ([key, val]) {   
                return val;
            }).filter((obj) => obj);

            delete _data['links'];
            delete _data['_links_'];
            delete _data['_shlinks_'];
            delete _data['_or_links_'];
            delete _data['_or_samples_'];

            _obj['data'] = _data;

            _obj['TS_RID'] = opts['res']['TS_RID'];
            _obj['API'] = {
                API_Name: opts['res']['API_Name'],
                API_Settings: opts['res']['API_Settings'],
                API_Authorization: opts['res']['API_Authorization']
            }

            return resolve(_obj);
        })

        /**
         * 
         * 1-Preview  -> will be always html to show the final result /!\
         * 2-Code     -> code of template with data to sahre on website /!\
         * 3-draft    -> will be `_data` variable
         * 
         */

    })

}



function replaceVariables(opts, done) {

    opts = opts || {};

    var _skin = opts.result.skin;

    if (!_skin) return done('Template Not Found...');

    var stype = _skin.type;
    var _tpl = _skin.template;
    var _stitle = _skin.title;

    var _a = opts.data;

    if (stype == 'json') {
        _tpl = JSON.stringify(_tpl);
    } else {
        _tpl = _tpl;
    }


    var rgx = new RegExp(/({[A-Za-z0-9_]+})(\(.*?\))?/, "ig");//Test regex works for all types

    var _btestRgx = new RegExp(/\[\#if\](.*?)\[\/if\]/, "igs");
    var _btest = _tpl.match(_btestRgx);

    if (_btest) {
        _btest.map(function (_val) {

            _val.replace(rgx, function (m, d, c) {

                _t = _a[d] ? _a[d] : null;

                if (Array.isArray(_t)) {
                    _t = _t.length > 0 ? _t : null;
                }

                if (_t == null) {
                    //Escape parentheses
                    var _MRXP = _val.replace(/(\[|\]|\(|\))/ig, '\\$1');
                    //Escape Star (*) gone wrong if exist
                    _MRXP = _MRXP.replace(/\*/g, '\\$&');
                    var _RXP = new RegExp(_MRXP, 'img');
                    _tpl = _tpl.replace(_RXP, '');
                }
            })
            return;
        }).map(function () {
            _tpl = _tpl.replace(/(\[\#if\]|\[\/if\])/img, '');
            return
        })
    }

    if (_stitle && _stitle.match(rgx)) {
        try {
            _stitle = _stitle.replace(rgx, function (m, d, c) {
                var _t;
                _t = _a[d] ? _a[d] : (_stitle ? _stitle : '');
                return _t;
            })

        } catch (e) { }
    }

    try {

        var _mt = _tpl.replace(rgx, function (m, d, c) {
            var _t;
            var _w;
            var _h;
            var _at = ''; 
            var _bt;

            var _Anchor;

            _t = _a[d] ? _a[d] : '';

            if (c) {
                if (c.match(/width\=|height\=/ig)) {
                    _w = c.match(/width=\d+/);

                    _w = _w ? _w.toString().replace(/width\=/i, '') : null;
                    _h = c.match(/height=\d+/);
                    _h = _h ? _h.toString().replace(/height\=/i, '') : null;
                    if (stype == 'bbcode') {
                        _at += _w ? ` width="${_w}" ` : ``;
                        _at += _h ? ` height="${_h}" ` : ``;

                        _at = _at.replace(/\s+/ig, ' ').trim();
                        _at = ` ${_at}`;

                    } else {
                        _bt = `style="`;
                        _bt += _w ? `width:${_w}px;` : ``;
                        _bt += _h ? `height:${_h}px;` : ``;
                        _bt += `"`;
                    }
                }

                //Test image type Ex : (*imgur_com)
                var imatch = c ? c.match(/\*\{?([A-Za-z0-9_]+)\}?/i) : null;
                imatch = imatch ? imatch[1].replace(/\_/i, '.') : null;

                //Links Anchor
                var sdg;
                if (sdg = c.match(/anchor=([A-Za-z0-9\s+\.\_\-\*\,\{\}\[\]\/\<\>]+)/i)) {
                    if (sdg && sdg[1]) {
                        if (sdg[1] == 'host') {
                            _Anchor = 1;
                        } else if (sdg[1] == 'link') {
                            _Anchor = 2;
                        } else {
                            var _match = sdg[1].match(/\{[A-Za-z_]+\}/ig)
                            if (_match) {
                                _Anchor = sdg[1];
                                _match.forEach(function (_tgx) {
                                    var _rgx = new RegExp(_tgx, 'i');

                                    if (_a[_tgx]) _Anchor = _Anchor.replace(_rgx, _a[_tgx]);

                                    _Anchor = _Anchor ? _Anchor.ucwords() : _Anchor;
                                })
                            } else {
                                _Anchor = sdg[1].trim().ucwords();
                            }
                        }
                    }
                }
            }

            //For links only
            try {
                if (_t) {
                    var match_link = Array.isArray(_t) ? _t.find(value => /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9]\.[^\s]{2,})/ig.test(value)) : /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9]\.[^\s]{2,})/ig.test(_t);

                    var match_image = Array.isArray(_t) ? _t.find(value => /\.(jpg|jpeg|png|gif)(\?(.*?))?$/ig.test(value)) : /\.(jpg|jpeg|png|gif)(\?(.*?))?$/ig.test(_t);

                    if (!match_image) {
                        if (match_link && stype == 'html') {

                            _t = Array.isArray(_t) ? _t : [_t];

                            if (d == '{mt_source}') {
                                var _lt = _t.map(function (_link) {
                                    var _anchor = new URL(_link).hostname.ucwords();
                                    if (/\.tvmaze\./i.test(_link)) _anchor = 'TVMaze';
                                    if (/\.thetvdb\./i.test(_link)) _anchor = 'TVDB';
                                    if (/\.themoviedb\./i.test(_link)) _anchor = 'TMDB';
                                    if (/\.imdb\./i.test(_link)) _anchor = 'IMDB';

                                    return `<a href="${_link}" target="_blank">${_anchor}</a>`;
                                }).join(' | ');
                                return _lt;
                            }

                            _t = _t.map(function (_link) {
                                var __Anchor;
                                var __URL;

                                if (Array.isArray(_link)) {

                                    try {
                                        if (_Anchor && _Anchor === 1) {
                                            __Anchor = _link[0].ucwords();
                                            __URL = _link[1];
                                        } else if (_Anchor && _Anchor === 2) {
                                            __Anchor = _link[1];
                                            __URL = _link[1];
                                        } else if (_Anchor && _Anchor.match(/{mt_host}/i)) {
                                            __Anchor = _Anchor.replace(/{mt_host}/ig, _link[0].ucwords());
                                            __URL = _link[1];
                                        } else if (!_Anchor) {
                                            __Anchor = _link[0].ucwords();
                                            __URL = _link[1];
                                        } else {
                                            __Anchor = _Anchor;
                                            __URL = _link[1];
                                        }
                                    } catch (e) {
                                        __Anchor = _link[1];
                                        __URL = _link[1];
                                    }

                                    var tmatch;
                                    if (tmatch = __Anchor.match(/\{[A-Za-z_]+\}/ig)) {
                                        _match.forEach(function (_tgx) {
                                            var _rgx = new RegExp(_tgx, 'i')
                                            __Anchor = __Anchor.replace(_rgx, '').replace(/\s+/ig, ' ');
                                        })
                                    }

                                    if (!__Anchor && _link[0]) {
                                        __Anchor = _link[0].ucwords();
                                    } else if (!__Anchor && !_link[0]) {
                                        __Anchor = __URL;
                                    }

                                    return `<a href="${__URL}" target="_blank">${__Anchor}</a>`;

                                } else {

                                    try {
                                        if (_Anchor === 1) {
                                            __Anchor = new URL(_link).hostname.ucwords();
                                        } else if (_Anchor.match(/{mt_host}/i)) {
                                            let _hostm = new URL(_link).hostname.ucwords();
                                            __Anchor = _Anchor.replace(/{mt_host}/ig, _hostm);
                                        } else if (!_Anchor) {
                                            __Anchor = _link;
                                        } else {
                                            __Anchor = _Anchor;
                                        }
                                    } catch (e) {
                                        __Anchor = _link;
                                    }
                                    return `<a href="${_link}" target="_blank">${__Anchor}</a>`;
                                }
                            }).join('\n');

                        } else if (match_link && stype == 'bbcode') {

                            _t = Array.isArray(_t) ? _t : [_t];

                            if (d == '{mt_source}') {
                                var _lt = _t.map(function (_link) {
                                    var _anchor = new URL(_link).hostname.ucwords();
                                    if (/\.tvmaze\./i.test(_link)) _anchor = 'TVMaze';
                                    if (/\.thetvdb\./i.test(_link)) _anchor = 'TVDB';
                                    if (/\.themoviedb\./i.test(_link)) _anchor = 'TMDB';
                                    if (/\.imdb\./i.test(_link)) _anchor = 'IMDB';

                                    return `[url=${encodeURI(_link)} target="_blank"]${_anchor}[/url]`;
                                }).join('|');
                                return _lt;
                            }

                            _t = _t.map(function (_link) {
                                var __Anchor;
                                var __URL;

                                if (Array.isArray(_link)) {

                                    try {
                                        if (_Anchor && _Anchor === 1) {
                                            __Anchor = _link[0].ucwords();
                                            __URL = _link[1];
                                        } else if (_Anchor && _Anchor === 2) {
                                            __Anchor = _link[1];
                                            __URL = _link[1];
                                        } else if (_Anchor && _Anchor.match(/{mt_host}/i)) {
                                            __Anchor = _Anchor.replace(/{mt_host}/ig, _link[0].ucwords());
                                            __URL = _link[1];
                                        } else if (!_Anchor) {
                                            __Anchor = _link[0].ucwords();
                                            __URL = _link[1];
                                        } else {
                                            __Anchor = _Anchor;
                                            __URL = _link[1];
                                        }
                                    } catch (e) {
                                        __Anchor = _link[1];
                                        __URL = _link[1];
                                    }

                                    var tmatch;
                                    if (tmatch = __Anchor.match(/\{[A-Za-z_]+\}/ig)) {
                                        _match.forEach(function (_tgx) {
                                            var _rgx = new RegExp(_tgx, 'i')
                                            __Anchor = __Anchor.replace(_rgx, '').replace(/\s+/ig, ' ');
                                        })
                                    }

                                    if (!__Anchor && _link[0]) {
                                        __Anchor = _link[0].ucwords();
                                    } else if (!__Anchor && !_link[0]) {
                                        __Anchor = __URL;
                                    }

                                    return `[url=${encodeURI(__URL)} target="_blank"]${__Anchor}[/url]`;

                                } else {
                                    try {
                                        if (_Anchor === 1) {
                                            __Anchor = new URL(_link).hostname.ucwords();
                                        }
                                        //Test
                                        else if (_Anchor === 2) {
                                            __Anchor = _link;
                                        }
                                        // 
                                        else if (_Anchor.match(/{mt_host}/i)) {
                                            let _hostm = new URL(_link).hostname.ucwords();
                                            __Anchor = _Anchor.replace(/{mt_host}/ig, _hostm);
                                        } else if (!_Anchor) {
                                            __Anchor = _link;
                                        } else {
                                            __Anchor = _Anchor;
                                        }
                                    } catch (e) {
                                        __Anchor = _link;
                                    }

                                    return `[url=${encodeURI(_link)} target="_blank"]${__Anchor}[/url]`;
                                }
                            }).join('\n');

                        } else if (match_link && stype == 'json') {
                            var osdlinks = {};
                            _t = Array.isArray(_t) ? _t : [_t];
                            if (_t[0].constructor === Array) {
                                Object.assign(_t.map(([key, val]) => ({ [key]: val }))).forEach(function (_value) {
                                    var _key = Object.keys(_value);
                                    if (osdlinks.hasOwnProperty(_key)) {
                                        osdlinks[_key] = [_value[_key], osdlinks[_key]].flat()
                                    } else {
                                        osdlinks[_key] = _value[_key]
                                    }
                                })
                                _t = JSON.stringify(osdlinks)
                            } else {
                                _t = JSON.stringify(_t);
                            }

                        } else {
                            if (d == '{ts_links}') {
                                _t = JSON.stringify(_t);
                            } else {
                                _t = Array.isArray(_t) ? _t.join(', ') : _t;
                            }
                        }
                    }
                }
            } catch (e) { }

            var _str = "";

            if (_t && /\.(jpg|jpeg|png|gif)(\?(.*?))?$/ig.test(_t) || Array.isArray(_t)) {
                if (stype == 'html') {
                    if (_t && Array.isArray(_t)) {
                        if (imatch) {
                            var _rxp = new RegExp(imatch, 'ig');
                            var _ts = _t.filter(function (_image) {
                                return _rxp.test(_image);
                            })
                            _t = _ts.length > 0 ? _ts : (Array.isArray(_t) ? [_t[0]] : [_t])
                            _str = _t.map(function (_image) {
                                return `<img src="${_image}"${_bt ? _bt : ''}>`;
                            }).join('<br>');
                        } else {
                            _str = (Array.isArray(_t) ? [_t[0]] : [_t]).map(function (_image) {
                                return `<img src="${_image}"${_bt ? _bt : ''}>`;
                            }).join('<br>');
                        }
                    } else {
                        _str = `<img src="${_t}"${_bt ? _bt : ''}>`;
                    }
                } else if (stype == 'bbcode') {
                    if (Array.isArray(_t)) {
                        if (imatch) {
                            var _rxp = new RegExp(imatch, 'ig');
                            var _ts = _t.filter(function (_image) {
                                return _rxp.test(_image);
                            })

                            _t = _ts.length > 0 ? _ts : (Array.isArray(_t) ? [_t[0]] : [_t])
                            _str = _t.map(function (_image) {
                                return `[img${_at}]${_image}[/img]`;
                            }).join('<br>');
                        } else {
                            _str = (Array.isArray(_t) ? [_t[0]] : [_t]).map(function (_image) {
                                return `[img${_at}]${_image}[/img]`;
                            }).join('<br>');
                        }
                    } else {
                        _str = `[img${_at}]${_t}[/img]`;
                    }
                } else if (stype == 'json') {

                    if (_t && Array.isArray(_t)) {
                        if (imatch) {
                            var _rxp = new RegExp(imatch, 'ig');
                            var _ts = _t.filter(function (_image) {
                                return _rxp.test(_image);
                            })
                            _t = _ts.length > 0 ? _ts : (Array.isArray(_t) ? [_t[0]] : [_t])
                            _str = _t.map(function (_image) {
                                return `${_image}`;
                            })
                        } else {
                            _str = (Array.isArray(_t) ? [_t[0]] : [_t]).map(function (_image) {
                                return `${_image}`;
                            })
                        }
                    } else {
                        _str = `${_t}`;
                    }

                } else {
                    _str = `${_t}`;
                }
            } else {
                _str = `${_t}`;
            }

            return _str;
        })

        try {
            //GlobalFix
            if (stype == 'json') {

                /*Manual working Version */
                _mt = _mt.replace(/\"\[\"/ig, "[\"")
                    .replace(/(\r+|\n+)/ig, " ")//new test replace 
                    .replace(/\"\]\"/ig, "\"]")
                    .replace(/\"\[\{/ig, "\[\{")
                    .replace(/\}\]\"/ig, "\}\]")
                    .replace(/\:\"\{/ig, "\:\{")
                    .replace(/\]\}\"/ig, "\]\}")
                    .replace(/\"\}\"/ig, "\"\}")

                _mt = JSON.parse(_mt)
                _mt = cleanDeep(_mt)
                _mt = JSON.stringify(_mt);

            } else if (stype == 'bbcode') {

                //fix (\"|\') on TEXT EX : (..his \"Pokédex\" by..) \"Pokédex\" [Prevnt this Fix on Json stype]
                _mt = _mt.replace(/\\"/img, '"');
                _mt = _mt.replace(/\\'/img, '\'');

                _mt = _mt.replace(/\n{3,}/ig, '\n\n');
                _mt = _mt.replace(/\[\#br\]?/img, '\n');
                _mt = _mt.replace(/\n{4,}/ig, '\n\n\n');

            } else if (stype == 'html') {
                //fix (\"|\') on TEXT EX : (..his \"Pokédex\" by..) \"Pokédex\" [Prevnt this Fix on Json stype]
                _mt = _mt.replace(/\\"/img, '"');
                _mt = _mt.replace(/\\'/img, '\'');

                _mt = _mt.replace(/\[\#br\]?/img, '<br>');
                //For line break after link

                _mt = _mt.replace(/\n+/ig, '<br>');
                //For duplicate (More than 3) <br>
                _mt = _mt.replace(/((\s+)?<br(\s+)?(\/)?>){3,}/igm, '<br><br>');
            }

        } catch (e) { }

        _stitle = _stitle ? _stitle.trim().replace(/\s+/ig, ' ') : null;

        return done(null, { mt: _mt, stype: stype, stitle: _stitle });
    } catch (error) {
        return done(error);
    }

}




module.exports.toHuman = toHuman