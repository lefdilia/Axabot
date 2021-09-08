const init = require('../config/init');

const Topics = require('../models/topics');
const Torrents = require('../models/torrents').torrents;
const Feeds = require('../models/torrents').feeds;
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const async = require('async');
const request = require('request');
const cheerio = require('cheerio');
const _ = require('lodash');
const {mergeAdvanced} = require("object-merge-advanced");


function imdb(opts, callback) {

    opts = opts || {};

    var title = opts.title;
    var type = opts.type;

    title = title.trim();
    title = title.replace(/\s+/ig, '+');

    switch (type) {
        case 'tv':
            var imdbUrl = `https://www.imdb.com/search/title?title=${title}&title_type=tv_series,tv_special,tv_miniseries,tv_short&sort=moviemeter,asc`;
            break;

        case 'movies':
            var imdbUrl = `https://www.imdb.com/search/title?title=${title}&title_type=feature,tv_movie,documentary,short&sort=moviemeter,asc`;
            break;

        default:
            var imdbUrl = `https://www.imdb.com/search/title?title=${title}&title_type=feature,tv_movie,tv_series,tv_special,tv_miniseries,documentary,short,tv_short&sort=moviemeter,asc`;
            break;
    }

    var headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.13; rv:62.0) Gecko/20100101 Firefox/62.0',
        'Host': 'www.imdb.com',
        'Referer': 'https://www.imdb.com/search/title',
        'Connection': 'keep-alive'
    };

    var options = {
        method: 'GET',
        url: imdbUrl,
        headers: headers,
        timeout: 10000
    };

    request(options, function (err, res, body) {
        if (!body || body.trim() == '') return callback();

        $ = cheerio.load(body, {
            decodeEntities: false
        });

        var dataParsed = [];

        var count = $('div.lister-item.mode-advanced').length;

        if (count == 0) return callback(null, []);

        $('div.lister-item.mode-advanced').each(function (ind, elem) {
            var boxfx = $(this); //DIV Part

            var result = {}

            var title = boxfx.find('.lister-item-header a').first().text();
            title = title ? title.trim() : '';
            result['title'] = title;
            //
            var year = boxfx.find('span.lister-item-year').first().text();

            year = year ? year.match(/[0-9]{4}/) : '';
            year = year ? year.toString() : year;

            year = year ? parseInt(year) : 1800;
            result['year'] = year;
            //
            var frstTag = title.replace(/ & /gi, ' and ').replace(/@/ig, "at").replace(/\/+|\,+|\:+|\(+|\)+|\[+|\]+|\?+|\!+|\'+/gi, '').replace(/\s+/ig, ' ').trim();
            var scdTag = year > 1800 ? `${frstTag} ${year}` : null;
            result['tags'] = title ? [frstTag, scdTag].filter(function (n) {
                return n;
            }) : [];
            //

            //
            var runtime = boxfx.find('span.runtime').first().text();
            runtime = runtime ? runtime.trim() : '';
            result['runtime'] = runtime;
            //
            var genres = boxfx.find('span.genre').first().text().trim();
            genres = genres.split(',').map(function (itm) {
                return itm.trim()
            });
            result['genres'] = genres;
            //
            var itemPart = boxfx.find('.lister-item-content p.text-muted').last()

            var summaryHtml = itemPart.html() 
            var summary = itemPart.text().trim();

            var pltLink = summaryHtml.match(/href\=\"\/title\/(.*?)\"/ig);
            var seeFull = summaryHtml.match(/See full summary/ig);

            summary = summary.replace(/(Add a Plot)/ig, '');
            summary = summary ? summary : '';
            result['summary'] = summary.trim();
            //
            var stars = boxfx.find('.lister-item-content p.sort-num_votes-visible').prev('p').text();

            stars = stars ? stars.replace(/\s+/ig, ' ') : '';
            stars = stars ? stars.replace(/\|+/ig, ',') : '';
            stars = stars ? stars.replace(/\s+[A-Za-z]+\:/ig, ' ') : '';
            stars = stars ? stars.replace(/\s+/ig, ' ') : '';
            stars = stars.trim();
            stars = stars.split(',').map(function (itm) {
                return itm.trim()
            });

            result['stars'] = stars;
            //
            var imagebx = boxfx.find('.lister-item-image a').html();
            var imageOrig = imagebx.match(/loadlate="(.*?)"/i);
            imageOrig = imageOrig ? imageOrig[1] : '';

            var npicture = imageOrig.match(/nopicture/ig);
            npicture = npicture ? npicture.toString() : null;

            // No Picture of IMDB if not found
            //https://m.media-amazon.com/images/G/01/imdb/images/nopicture/large/film-184890147._CB470041630_.png

            var resizedImg = !npicture ? imageOrig.replace(/@\.(.*?)\_\.(jpg|png|gif|jpeg|bmp)/ig, '@._V1_UX500.$2') : '';
            var imageOrig_FIX = !npicture ? imageOrig.replace(/@\.(.*?)\_\.(jpg|png|gif|jpeg|bmp)/ig, '@.$2') : '';

            result['images'] = {};
            result['images']['rs'] = resizedImg;
            result['images']['or'] = imageOrig_FIX;
            //
            var imdbID = imagebx.match(/data-tconst="(.*?)"/i);
            imdbID = imdbID ? imdbID[1] : null;
            var imdbSrc = imdbID ? `https://www.imdb.com/title/${imdbID}/` : '';
            result['source'] = imdbSrc;

            if (pltLink && seeFull) {
                pltLink = pltLink ? `https://www.imdb.com${pltLink.toString().replace(/href\=\"(.*?)\"/ig, "$1")}` : '';

                var opts = {
                    method: 'GET',
                    url: pltLink,
                    headers: headers,
                    timeout: 10000
                };

                request(opts, function (err, res, body) {
                    if (err) body = "";

                    $$ = cheerio.load(body, {
                        decodeEntities: false
                    });

                    var dts = $$("#summaries").next("ul").find('li p').first().text().trim();
                    dts = dts.replace(/(Add a Plot)/ig, '');
                    dts = dts ? dts : '';
                    result['summary'] = dts.trim();

                    dataParsed.push(result);
                    if (!--count) {
                        return callback(null, dataParsed);
                    }
                })
            } else {
                dataParsed.push(result);
                if (!--count) {
                    return callback(null, dataParsed);
                }
            }


        })
    })
};

function tmdb(opts, callback) {

    // /!\ TMDB Current limits are 40 requests every 10 seconds and are limited by IP address
    opts = opts || {};
    var title = opts.title;
    var type = opts.type;

    title = title.trim();
    title = title.replace(/(\s+|\.+)/g, ' ');

    switch (type) {
        case 'movies':
            var tmtype = 'movie';
            break;

        case 'tv':
            var tmtype = 'tv';
            break;

        default:
            var tmtype = 'movie';
            break;
    }

    var base_url = "http://image.tmdb.org/t/p";
    var apiKey = init.keys['tmdb']['key'];
    var mtvUrl = `https://api.themoviedb.org/3/search/${tmtype}?api_key=${apiKey}&language=en-US&query=${title}&page=1&include_adult=false`;

    request.get({
        url: mtvUrl,
        json: true
    }, function (err, res, data) {
        if (err) return cb();

        var requests = data['results'] ? data['results'].map(function (v) {
            return `https://api.themoviedb.org/3/${tmtype}/${v.id}?api_key=${apiKey}&append_to_response=credits,images&include_image_language=en,null`;
        }) : [];

        requests = requests.length > 4 ? requests.splice(0, 4) : requests;

        var dataParsed = [];

        if (type == 'movies') {
            async.eachSeries(requests, function (url, cb) {
                request.get({
                    url: url,
                    json: true
                }, function (err, res, dinfo) {
                    if (!dinfo) return cb();
                    var id = dinfo['id'];

                    var title = dinfo['original_title'] ? dinfo['original_title'] : '';
                    var runtime = dinfo['runtime'] ? dinfo['runtime'] : '';
                    runtime = parseInt(runtime) ? runtime + " min" : '';

                    var year = dinfo && dinfo['release_date'] ? dinfo['release_date'].match(/[0-9]{4}/i) : null;
                    year = year ? year[0] : '';

                    var frstTag = title.replace(/ & /gi, ' and ').replace(/@/ig, "at").replace(/\/+|\,+|\:+|\(+|\)+|\[+|\]+|\?+|\!+|\'+/gi, '').replace(/\s+/ig, ' ').trim();
                    var scdTag = year > 1800 ? `${frstTag} ${year}` : null;
                    var ctags = title ? [frstTag, scdTag].filter(function (n) {
                        return n;
                    }) : [];

                    var imgs = {};

                    imgs['or'] = dinfo['images'] && dinfo['images']['posters'] ? dinfo['images']['posters'].map(function (item) {
                        return `${base_url}/w500${item.file_path}`; //w780
                    }).splice(0, 10) : [];

                    imgs['rs'] = dinfo['images'] && dinfo['images']['posters'] ? dinfo['images']['posters'].map(function (item) {
                        return `${base_url}/w342${item.file_path}`;
                    }).splice(0, 10) : [];

                    var genres = Array.isArray(dinfo['genres']) ? dinfo['genres'].map(function (itm) {
                        return itm.name;
                    }) : [];

                    var summary = dinfo['overview'] ? dinfo['overview'] : '';
                    var source = `https://www.themoviedb.org/movie/${id}`;

                    var stars = dinfo['credits'] && Array.isArray(dinfo['credits']['cast']) ? dinfo['credits']['cast'].map(function (dataic) {
                        return dataic.name;
                    }).slice(0, 7) : [];

                    stars = stars.length == 0 && dinfo && dinfo['credits'] ? (Array.isArray(dinfo['credits']['crew']) ? dinfo['credits']['crew'].map(function (dataic) {
                        return dataic.name;
                    }).slice(0, 7) : []) : stars;

                    if (!title || !year) return cb();

                    dataParsed.push({
                        title: title,
                        year: year,
                        runtime: runtime,
                        genres: genres,
                        summary: summary,
                        stars: stars,
                        images: imgs,
                        source: source,
                        tags: ctags
                    });
                    cb();
                })

            }, function (err) {
                return callback(null, dataParsed);
            })
        } else if (type == 'tv') {
            async.eachSeries(requests, function (url, cb) {

                request.get({
                    url: url,
                    json: true
                }, function (err, res, dinfo) {
                    if (!dinfo) return cb();

                    var id = dinfo['id'];

                    var title = dinfo['original_name'] ? dinfo['original_name'] : dinfo['name'];

                    var image = dinfo['poster_path'] ? base_url + '/w500' + dinfo['poster_path'] : (dinfo['backdrop_path'] ? base_url + '/w500' + dinfo['backdrop_path'] : null);

                    var imagemd = dinfo['poster_path'] ? base_url + '/w342' + dinfo['poster_path'] : (dinfo['backdrop_path'] ? base_url + '/w500' + dinfo['backdrop_path'] : null);

                    var imgs = {};

                    imgs['or'] = dinfo['images'] && Array.isArray(dinfo['images']['posters']) && dinfo['images']['posters'].length > 0 ? dinfo['images']['posters'].map(function (item) {
                        return `${base_url}/w500${item.file_path}`;
                    }).splice(0, 10) : image ? [image] : [];

                    imgs['rs'] = dinfo['images'] && Array.isArray(dinfo['images']['posters']) && dinfo['images']['posters'].length > 0 ? dinfo['images']['posters'].map(function (item) {
                        return `${base_url}/w342${item.file_path}`;
                    }).splice(0, 10) : imagemd ? [imagemd] : [];

                    var premiered = dinfo && dinfo['first_air_date'] ? dinfo['first_air_date'] : dinfo['last_air_date'];
                    var year = premiered ? premiered.match(/[0-9]{4}/i) : null;
                    year = year ? year[0] : '';

                    //
                    var frstTag = title ? title.replace(/ & /gi, ' and ').replace(/@/ig, "at").replace(/\/+|\,+|\:+|\(+|\)+|\[+|\]+|\?+|\!+|\'+/gi, '').replace(/\s+/ig, ' ').trim() : null;
                    var scdTag = year > 1800 && frstTag ? `${frstTag} ${year}` : null;
                    var ctags = title ? [frstTag, scdTag].filter(function (n) {
                        return n;
                    }) : [];
                    //

                    var genres = Array.isArray(dinfo['genres']) ? dinfo['genres'].map(function (itm) {
                        return itm.name;
                    }) : [];

                    var summary = dinfo['overview'] ? dinfo['overview'] : '';
                    var runtime = Array.isArray(dinfo['episode_run_time']) ? dinfo['episode_run_time'][0] : '';
                    runtime = parseInt(runtime) ? runtime + " min" : '';

                    var source = `https://www.themoviedb.org/tv/${id}`;

                    var stars = dinfo['credits'] && Array.isArray(dinfo['credits']['cast']) ? dinfo['credits']['cast'].map(function (dataic) {
                        return dataic.name;
                    }).slice(0, 7) : [];

                    stars = dinfo['credits'] && stars.length == 0 ? (Array.isArray(dinfo['credits']['crew']) ? dinfo['credits']['crew'].map(function (dataic) {
                        return dataic.name;
                    }).slice(0, 7) : []) : stars;

                    if (!title || !year) return cb();

                    var obika = {
                        title: title,
                        year: year,
                        runtime: runtime,
                        genres: genres,
                        summary: summary,
                        stars: stars,
                        images: imgs,
                        source: source,
                        tags: ctags
                    }

                    dataParsed.push(obika);
                    cb();
                })

            }, function (err) {
                return callback(null, dataParsed);
            })
        }
    })
}

function tvmaze(opts, callback) {
    opts = opts || {};

    var title = opts.title;
    var type = opts.type;

    if (type !== 'tv') return callback(null, []);

    title = title.trim();
    title = title.replace(/\s+/ig, '+');

    var tvsearch = "http://api.tvmaze.com/search/shows?q=" + title;

    request.get({
        url: tvsearch,
        json: true
    }, function (err, res, data) {

        var dataParsed = [];

        async.eachSeries(data, function (v, next) {
            if (!v || !v.show) return;

            var id_tv = v.show['id'];

            var title = v.show['name'] ? v.show['name'] : '--';
            var image = v.show['image'] ? v.show['image']['original'] : '';
            var imagemd = v.show['image'] ? v.show['image']['medium'] : '';

            var imgs = {};
            imgs['or'] = image;
            imgs['rs'] = imagemd;

            var premiered = v.show['premiered'] ? v.show['premiered'] : '';

            var year = premiered ? premiered.match(/[0-9]{4}/i) : '';
            year = year ? year[0] : '';

            // 
            var frstTag = title.replace(/ & /gi, ' and ').replace(/@/ig, "at").replace(/\/+|\,+|\:+|\(+|\)+|\[+|\]+|\?+|\!+|\'+/gi, '').replace(/\s+/ig, ' ').trim();
            var scdTag = year > 1800 ? `${frstTag} ${year}` : null;
            var ctags = title ? [frstTag, scdTag].filter(function (n) {
                return n;
            }) : [];
            // 


            var genres = Array.isArray(v.show['genres']) ? v.show['genres'] : [v.show['genres']];
            genres = genres.length == 0 ? (v.show['type'] ? [v.show['type']] : []) : genres;

            var summary = v.show['summary'] ? v.show['summary'].replace(/(<([^>]+)>|\t+)/ig, '').replace(/\s+/ig, ' ').trim() : '';

            var source = v.show['url'] ? v.show['url'] : '';
            var runtime = v.show['runtime'] ? v.show['runtime'] + " min" : '';

            var urlmi = `http://api.tvmaze.com/shows/${id_tv}/cast`;

            request.get({
                url: urlmi,
                json: true
            }, function (err, res, data) {

                var stars = Array.isArray(data) ? data.map(function (ssc) {
                    return ssc['person']['name'];
                }).slice(0, 8) : [];

                dataParsed.push({
                    title: title,
                    year: year,
                    runtime: runtime,
                    genres: genres,
                    summary: summary,
                    stars: stars,
                    images: imgs,
                    source: source,
                    tags: ctags
                });
                next();
            })

        }, function () {
            return callback(null, dataParsed);
        })
    })
}

var Global_Access_Token = null;

function tvdb(opts, callback) {
    opts = opts || {};
    var title = opts.title;
    var type = opts.type;

    if (type !== 'tv') return callback(null, []);

    title = title.trim();
    title = title.replace(/\s+/ig, '+');

    function getToken(cb) {
        Global_Access_Token = null;
        var options = {
            method: 'POST',
            url: 'https://api.thetvdb.com/login',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                "Host": "api.thetvdb.com",
                "Referer": "https://api.thetvdb.com/swagger",
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.13; rv:63.0) Gecko/20100101 Firefox/63.0"
            },
            body: {
                apikey: init.keys['tvdb']['apikey'],
                userkey: init.keys['tvdb']['userkey'],
                username: init.keys['tvdb']['username']
            },
            json: true
        };
        request(options, function (error, response, body) {
            if (error || response.statusCode !== 200) return cb('Error Fetching token...');
            var token = Global_Access_Token = body.token;

            return token ? tvdb(opts, callback) : cb('No Access Token Found...');
        });
    }

    var access_token = Global_Access_Token ? Global_Access_Token : '';

    var options = {
        method: 'GET',
        url: 'https://api.thetvdb.com/search/series',
        qs: {
            name: title
        },
        headers: {
            'Authorization': `Bearer ${access_token}`,
            'Accept': 'application/json',
            "Host": "api.thetvdb.com",
            "Referer": "https://api.thetvdb.com/swagger",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.13; rv:63.0) Gecko/20100101 Firefox/63.0"
        },
        json: true
    };

    ////https://api.thetvdb.com/series/355036/episodes
    function getYear(access_token, serie, SID, callback) {
        var _tvd = {};

        if (!serie || !SID || !access_token) return callback(_tvd);

        if (serie.firstAired) {
            var year = serie.firstAired ? serie.firstAired.match(/[0-9]{4}/i) : null;
            _tvd['year'] = year ? year[0] : '';
            return callback(_tvd);
        } else {
            request.get({
                url: `https://api.thetvdb.com/series/${SID}/episodes`,
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Accept': 'application/json',
                    "Host": "api.thetvdb.com",
                    "Referer": "https://api.thetvdb.com/swagger",
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.13; rv:63.0) Gecko/20100101 Firefox/63.0"
                },
                json: true
            }, function (err, resp, episodes) {
                if (err) return callback(_tvd);

                var _firstAired = episodes['data'] ? episodes['data'][0]['firstAired'] : null;
                var year = _firstAired ? _firstAired.match(/[0-9]{4}/i) : null;
                _tvd['year'] = year ? year[0] : '';

                return callback(_tvd);
            })
        }
    }

    request(options, function (error, response, body) {
        if (error || !body) return callback(null, []);
        if (response.statusCode == 401) return getToken(callback);
        if (body.Error) return callback(null, []);

        dinfo = body['data'] || []; //dinfo  undefined

        var requests = dinfo.map(function (info) {
            return `https://api.thetvdb.com/series/${info.id}`;
        })

        var dataParsed = [];

        requests = requests.length > 8 ? requests.splice(0, 8) : requests;

        async.eachSeries(requests, function (url, next) {

            request.get({
                url: url,
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Accept': 'application/json',
                    "Host": "api.thetvdb.com",
                    "Referer": "https://api.thetvdb.com/swagger",
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.13; rv:63.0) Gecko/20100101 Firefox/63.0"
                },
                json: true
            }, function (err, resp, dnf) {
                if (err || !dnf) return next();

                var serie = dnf.data;
                if (!serie) return next();

                var tvd = {};
                var SID = serie.id;
                var title = serie.seriesName;
                tvd['title'] = title ? title.replace(/\([0-9]{4}\)/ig, "") : title;
                //
                getYear(access_token, serie, SID, function (_tvd) {
                    tvd = { ...tvd, ..._tvd }

                    if (!tvd.year || !tvd.title) return next();

                    var frstTag = title.replace(/ & /gi, ' and ').replace(/@/ig, "at").replace(/\/+|\,+|\:+|\(+|\)+|\[+|\]+|\?+|\!+|\'+/gi, '').replace(/\s+/ig, ' ').trim();
                    var scdTag = tvd.year ? `${frstTag} ${tvd.year}` : null;
                    var ctags = title ? [frstTag, scdTag].filter(function (n) {
                        return n;
                    }) : [];
                    tvd['tags'] = ctags;

                    //
                    tvd['runtime'] = serie.runtime ? `${serie.runtime} min` : '';
                    //
                    tvd['genres'] = serie.genre && Array.isArray(serie.genre) ? serie.genre : [];
                    //
                    tvd['summary'] = serie.overview ? serie.overview : '';
                    //
                    var banner = serie.banner ? `https://www.thetvdb.com/banners/${serie.banner}` : ''; //graphical/295759-g2.jpg
                    //
                    tvd['source'] = serie.slug ? `https://www.thetvdb.com/series/${serie.slug}` : '';

                    var imgs = {};
                    imgs['bn'] = banner;

                    request.get({
                        url: `https://api.thetvdb.com/series/${SID}/actors`,
                        headers: {
                            'Authorization': `Bearer ${access_token}`,
                            'Accept': 'application/json',
                            "Host": "api.thetvdb.com",
                            "Referer": "https://api.thetvdb.com/swagger",
                            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.13; rv:63.0) Gecko/20100101 Firefox/63.0"
                        },
                        json: true
                    }, function (err, resp, actors) {

                        var stars = actors['data'] ? actors['data'].map(function (item) {
                            return item.name;
                        }).splice(0, 8) : [];

                        tvd['stars'] = stars;

                        request.get({
                            url: `https://api.thetvdb.com/series/${SID}/images/query?keyType=poster`,
                            headers: {
                                'Authorization': `Bearer ${access_token}`,
                                'Accept': 'application/json',
                                "Host": "api.thetvdb.com",
                                "Referer": "https://api.thetvdb.com/swagger",
                                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.13; rv:63.0) Gecko/20100101 Firefox/63.0"
                            },
                            json: true
                        }, function (err, resp, images) {

                            if (err || images.Error) {
                                imgs['or'] = '';
                                imgs['rs'] = '';
                            } else {
                                imgs['or'] = images['data'] ? images['data'].map(function (item) {
                                    return `https://www.thetvdb.com/banners/${item.fileName}`;
                                }).splice(0, 10) : [];

                                imgs['rs'] = images['data'] ? images['data'].map(function (item) {
                                    return `https://www.thetvdb.com/banners/${item.fileName}`;
                                }).splice(0, 10) : [];
                            }

                            request.get({
                                url: `https://api.thetvdb.com/series/${SID}/images/query?keyType=series`,
                                headers: {
                                    'Authorization': `Bearer ${access_token}`,
                                    'Accept': 'application/json',
                                    "Host": "api.thetvdb.com",
                                    "Referer": "https://api.thetvdb.com/swagger",
                                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.13; rv:63.0) Gecko/20100101 Firefox/63.0"
                                },
                                json: true
                            }, function (err, resp, images) {

                                if (err || images.Error) {
                                    imgs['banners'] = '';
                                } else {
                                    imgs['banners'] = images['data'] ? images['data'].map(function (item) {
                                        return `https://www.thetvdb.com/banners/${item.fileName}`;
                                    }).splice(0, 10) : [];
                                }

                                tvd['images'] = imgs;

                                dataParsed.push(tvd);
                                next();
                            })
                        })
                    })
                })

            })

        }, function () {
            // dataParsed.sort((a, b) => (a.year > b.year) ? -1 : 1)
            return callback(null, dataParsed);
        })
    });
}

function internal(opts, callback) {

    var _id = opts._id_;
    var _title = opts.title;
    var _type = opts.type;
    var _dtopic = opts.dtopic;

    if (_dtopic == 'int' && _id) {
        var constquery = Torrents.aggregate([{
            "$match": {
                _id: ObjectId(_id)
            }
        },
        {
            $lookup: {
                from: "topics",
                localField: "hash",
                foreignField: "extra.hashs",
                as: "topic_docs"
            }
        }, {
            $unwind: {
                path: "$topic_docs",
                "preserveNullAndEmptyArrays": true
            }
        }, {
            "$project": {
                "tpid": "$topic_docs._id",
                "data": "$topic_docs.data",
                "hashs": {
                    $ifNull: ["$topic_docs.extra.hashs", []]
                },
                "tags": {
                    $ifNull: ["$topic_docs.extra.tags", []]
                }
            }
        }, {
            "$limit": 5
        }
        ])

    } else {
        var regw = new RegExp("^" + _title + "$", "i");
        var constquery = Topics.aggregate([{
            "$match": {
                "extra.tags": {
                    "$all": [regw]
                }
            }
        }, {
            "$project": {
                "tpid": "$_id",
                "data": "$data",
                "hashs": {
                    $ifNull: ["$extra.hashs", []]
                },
                "tags": {
                    $ifNull: ["$extra.tags", []]
                }
            }
        }, {
            "$limit": 5
        }]);
    }

    constquery.exec(function (err, infi) {
        var _pdata = infi.map(function (_infi) {
            var pdata = _infi && _infi.data ? _infi.data : {};
            if (pdata && pdata.images) {
                var img = pdata.images ? pdata.images : [];
                pdata['images'] = {
                    or: img,
                    rs: img
                };
                pdata['tpid'] = _infi.tpid;
                pdata['hashs'] = _infi.hashs || [];
                pdata['tags'] = _infi.tags || [];
                pdata = [pdata];
            } else {
                pdata = [];
            }
            return pdata
        })

        return callback(null, _pdata);
    })

}


function swparserForAutoData(_title, callback) {

    var regw = new RegExp("^" + _title + "$", "i");
    var constquery = Topics.aggregate([{
        "$match": {
            "extra.tags": {
                "$all": [regw]
            }
        }
    }, {
        "$project": {
            "data": "$data",
            "hashs": {
                $ifNull: ["$extra.hashs", []]
            },
            "tags": {
                $ifNull: ["$extra.tags", []]
            }
        }
    }, {
        "$limit": 1
    }]);

    constquery.exec(function (err, infi) {
        infi = infi.length > 0 ? infi[0] : {};

        var pdata = infi && infi.data ? infi.data : {};

        if (pdata && pdata.images) {
            var img = Array.isArray(pdata.images) ? pdata.images : pdata.images.toString();

            pdata['images'] = {
                or: img,
                rs: img
            };

            pdata['tpid'] = infi._id;
            pdata['hashs'] = infi.hashs || [];
            pdata['tags'] = infi.tags || [];
            pdata = [pdata];
        } else {
            pdata = [];
        }
        return callback(null, pdata);
    })
}


function autoData(obj, callback) {

    var data = obj.data;
    var defaultCrawlers = obj.defaultCrawlers;
    var autoData = obj.autoData;

    if (autoData == false || data.length == 0) return callback();

    async.eachSeries(data, function (ob, next) {

        var title = cleantitle(ob.title);
        var hash = Array.isArray(ob.hash) ? ob.hash : (ob.hash ? [ob.hash] : []);
        var type = ob.type;

        var dfParse = defaultCrawlers[type];

        switch (dfParse) {
            case 'imdb':
                var swparser = imdb;
                break;

            case 'tmdb':
                var swparser = tmdb;
                break;

            case 'tvmaze':
                var swparser = tvmaze;
                break;

            case 'tvdb':
                var swparser = tvdb;
                break;

            default:
                var swparser = imdb;
                break;
        }

        swparserForAutoData(title, function (err, data) {
            if (data.length > 0) {
                var item = data[0];

                var edimage = item['images']['bn'] ? item['images']['bn'] : item['images']['or'];
                item['images'] = Array.isArray(edimage) ? edimage : [edimage];

                return saveTopic({
                    item: item,
                    hash: hash,
                    type: type
                }, next);
            }

            //Start-test
            //->|/!\| change imdb function to the wanted parser
            swparser({
                title: title,
                type: type
            }, function (err, databi) {
                // /!\ Auto-Data -> first item returned from the parser // before limit options was set
                var item = databi && databi.length > 0 ? databi[0] : null;
                if (!item) return next();

                var edimage = item['images']['bn'] ? item['images']['bn'] : item['images']['or'];
                item['images'] = Array.isArray(edimage) ? edimage : [edimage];

                saveTopic({
                    item: item,
                    hash: hash,
                    type: type
                }, next);
            })
            //End-test
        });
    }, function () {
        return callback();
    })

}


function saveTopic(opts, next) {

    opts = opts || {};

    var item = opts.item;
    var hash = Array.isArray(opts.hash) ? opts.hash : (hash ? [hash] : []);
    var _type = opts.type;

    if (!item || !item.title) return next();

    item.year = typeof item.year == 'string' && item.year != "" ? parseInt(item.year) : item.year; // /!\
    item.title = item.title.trim();

    const tags = [...new Set(item.tags)];

    delete item.tags;
    delete item.hash;
    delete item.hashs;

    var query = {
        $or: [
            { "title": item.title, "year": item.year },
            { "extra.hashs": { "$in": hash } }
        ]
    };

    var tpid = opts.tpid;
    var _dataType = tpid ? '_int' : '_ext';

    if (tpid) {
        query = {
            _id: ObjectId(tpid)
        };
    }

    //Start-Update profile on saving data
    var _uploadProfile = opts.uploadProfile;
    if (_uploadProfile) {
        Torrents.updateMany({
            "hash": hash
        }, {
            "$set": {
                "extra.upload_profile": _uploadProfile
            }
        }).exec();
    }

    //End
    var _nmerged;
    Topics.findOne(query, { '_id': 0, '__v': 0, 'created': 0 }, function (err, _topic) {

        if (_topic && !err) {
            _nmerged = mergeAdvanced(_topic.data, item, {
                cb: (inputArg1, inputArg2, resultAboutToBeReturned, infoObj) => {

                    if (infoObj && infoObj.key == 'summary') {
                        resultAboutToBeReturned = inputArg1.length > inputArg2.length ? inputArg1 : inputArg2;
                    }

                    if (Array.isArray(resultAboutToBeReturned)) {
                        resultAboutToBeReturned = [...new Set(resultAboutToBeReturned)].filter(i => i);
                    }

                    return resultAboutToBeReturned;
                }
            });
        }

        if (_dataType == '_int' && hash.length > 0) {
            var _ntags = tags;
        } else {
            var _ntags = [...new Set([...tags, ...(_topic && _topic['extra'] ? _topic['extra']['tags'] : [])])]
        }

        var _title = _nmerged ? _nmerged.title : (item ? item.title : '');
        var _year = _nmerged ? _nmerged.year : (item ? item.year : '');
        var _image = _nmerged ? _nmerged.image : (item ? item.image : '');

        _image = !_image && item && item.images ? item['images'][0] : _image;

        var lastKPC = {
            title: _title,
            year: _year,
            image: _image,
            type: _type,
            data: _nmerged || item,
            $addToSet: {
                "extra.hashs": { $each: hash },
            }, $set: {
                "extra.tags": _ntags
            }
        }

        if (_dataType == '_int' && hash.length > 0) {
            lastKPC['data']['genres'] = item ? item.genres : [];
            lastKPC['data']['summary'] = item ? item.summary : '';
            lastKPC['data']['runtime'] = item ? item.runtime : '';
            lastKPC['data']['year'] = item ? item.year : '';
        }


        Topics.findOneAndUpdate(query, lastKPC, {
            new: true,
            upsert: true
        }, function (err, result) {

            var _sid = result ? result._id : null;

            if (_sid) {
                //Clean Hash from all topics and leave only one with this hash
                Topics.updateMany({
                    _id: {
                        $ne: _sid
                    }
                }, {
                    $pullAll: {
                        "extra.hashs": hash
                    }
                }, {
                    multi: true
                }).exec()
            }

            if (err && err['code'] == "11000") {
                var query2 = {
                    title: item.title,
                    year: item.year,
                    "extra.hashs": {
                        "$in": hash ? [regw] : []
                    }
                };

                return Topics.findOneAndUpdate(query2, lastKPC, {
                    new: true,
                    upsert: true
                }, function (e, rs) {
                    if (rs && rs._id) {
                        Topics.updateMany({
                            _id: {
                                $ne: rs._id
                            }
                        }, {
                            $pullAll: {
                                "extra.hashs": [hash]
                            }
                        }, {
                            multi: true
                        }).exec(next)
                    }
                });

            } else {
                return next(err, result);
            }
        })
    })
}



function search(opts, callabck) {

    opts = opts || {};
    var source = opts.source;
    var swparser;
    switch (source) {
        case 'imdb':
            swparser = imdb;
            break;

        case 'tmdb':
            swparser = tmdb;
            break;

        case 'tvmaze':
            swparser = tvmaze;
            break;

        case 'tvdb':
            swparser = tvdb;
            break;

        case 'internal':
            swparser = internal;
            break;

        default:
            swparser = null;
            break;
    }

    if (!swparser) return callabck(null, []);
    /* { title: title, type: type } */
    return swparser(opts, callabck);
}

function cleantitle(btitle) {
    if (!btitle) return "";
    try {
        var title = btitle.trim();
        title = title.split(/(S[0-9]{1,3}E?([0-9]{1,3})?|20[0-9]{2}\s+[0-9]{2}\s+[0-9]{2}|[0-9]{4}|\s+(brrip|HDRip|BDRip|720p|1080p|PAL|DVDR|WEB(\s+|\-)DL|XviD|BluRay)\s+)/ig);
        title = title[0].trim().replace(/(\(+|\)+)/ig, " ")
        title = title.trim();
    } catch (e) {
        title = "";
    }
    return title == "" ? btitle : title;
}


module.exports.autoData = autoData;
module.exports.saveTopic = saveTopic;
module.exports.search = search;