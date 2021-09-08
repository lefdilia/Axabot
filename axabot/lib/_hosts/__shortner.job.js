const Hosts = require('../../models/hosts');
const request = require('request');

var Shortner = function (_obj) {
    if (!(this instanceof Shortner)) return new Shortner(_obj);

    this._shortner = Array.isArray(_obj._shortners) ? _obj._shortners[0] : null;
    this._res = _obj._res;
    this._link = _obj._res ? _obj._res.link : null;
    this._apitoken;
    this.func;
}

Shortner.prototype.buildFn = function () {
    var _this = this;
    return new Promise(function (resolve, reject) {

        var _shortner = _this._shortner;
        if (!_shortner) return reject('No Shortner Service Found.');

        Hosts.findOne({
            'server': _shortner
        }, 'data', function (err, _result) {
            if (err || !_result) return reject('Cannot find Host data, Verify the host account.');

            var result = _result.data || {};
            _this._apitoken = result.apitoken;

            if (result.use_account == false) {
                return reject("*Please verify provided Token.");
            } else {
                switch (_shortner) {
                    case 'shorte.st':
                        _this.func = _this.shorte_st
                        break;
                }
                return resolve();
            }
        })
    })
}

Shortner.prototype.shorte_st = function () {
    var _this = this;
    return new Promise(function (resolve, reject) {
        if (!_this._link) return reject('No Link to shortify.')
        if (!_this._apitoken) return reject('No Token Provided to use.')

        var options = {
            method: 'PUT',
            url: 'https://api.shorte.st/v1/data/url',
            headers:
            {
                'Connection': 'keep-alive',
                'Host': 'api.shorte.st',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.13; rv:69.0) Gecko/20100101 Firefox/69.0',
                'Content-Type': 'application/x-www-form-urlencoded',
                'public-api-token': _this._apitoken
            },
            form: {
                urlToShorten: _this._link
            },
            json: true
        };

        request(options, function (error, response, body) {
            if (error || !body) return reject(error);
            try {
                var _sh_link = body['shortenedUrl'];

                if (!_sh_link || !_sh_link.match(/^(http(s)?):\/\//ig)) throw new Error("Can't find the link");

                if (_sh_link) {
                    _this._res['sh_link'] = _sh_link;
                    _this._res['sh_host'] = 'shorte.st';
                }
                return resolve();
            } catch (e) {
                return reject('Link can\'t be shorted.');
            }
        });
    })
}

Shortner.prototype.process = function (done) {
    var _this = this;

    _this.buildFn().then(function () {
        return _this.func()
    }).then(function () {
        return done(_this._res);
    }).catch(function (err) {
        return done(_this._res);
    })

}

module.exports = Shortner