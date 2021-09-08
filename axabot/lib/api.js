const Logs = require('../models/tasks').logs;
const mongoose = require('mongoose');
const request = require('requestretry');
const wordpress = require("wordpress");

var API = function (opts) {
    if (!(this instanceof API)) return new API(opts);
    opts = opts || {};

    if (!opts.taskId) return reject('TaskID is missing.');

    this.taskId = mongoose.Types.ObjectId(opts.taskId);
    this._retryDelay = 5000;
    this._maxAttempts = 3;
}

API.prototype.listOptions = function () {
    var _this = this;
    return new Promise(function (resolve, reject) {

        if (!_this.taskId) return reject('TaskID is missing.');

        require('./logs').listLogByID({
            _taskId: _this.taskId
        }).then(function (result) {

            result = Array.isArray(result) ? result[0] : result;
            if (!result || !result.API) return reject('No Api Found');

            var _API_ = result.API;

            _this._type = _API_.API_Settings.type;
            _this._url = _API_.API_Settings.url;

            _this.category = _API_.API_Settings.category;
            _this.category = _this.category ? (Array.isArray(_this.category) ? _this.category : [_this.category]) : []
            _this.poststatus = _API_.API_Settings.poststatus || 0; //For Wordpress (Publish/Draft)

            _this.stype = result.stype;
            _this.stitle = result.stitle;
            _this.template = result.code;

            _this.download_links = result.data && result.data.download_links ? result.data.download_links : [];

            var options = {
                method: 'POST',
                url: _this._url,
                followRedirect: true,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.13; rv:69.0) Gecko/20100101 Firefox/69.0'
                }
            };

            if (_API_.API_Authorization.stAuth == "0") {

                _this.sAuth = 0;

            } else if (_API_.API_Authorization.stAuth == "1") {

                _this.sAuth = 1
                _this.username = _API_.API_Authorization.username || '';
                _this.password = _API_.API_Authorization.password || '';

                options['auth'] = { username: _this.username, password: _this.password };

            } else if (_API_.API_Authorization.stAuth == "2") {

                _this.sAuth = 2
                _this.API_key = _API_.API_Authorization.key || '';
                _this.API_value = _API_.API_Authorization.value || '';

                options['headers'][_this.API_key] = _this.API_value;

            } else if (_API_.API_Authorization.stAuth == "3") {

                _this.sAuth = 3
                _this.token = _API_.API_Authorization.token || '';

                options['headers']['Authorization'] = `Bearer ${_this.token}`;
            }

            _this.options = options;
            return resolve()
        }).catch(function () {
            return reject('Task Not Found');
        })
    })
}

API.prototype.sendToAPI = function () {
    var _this = this;
    return new Promise(function (resolve, reject) {
        if (!_this.options) return reject('Request Failed...');

        if (_this.stype == 'json') {
            var json_obj = JSON.parse(_this.template);
            _this.options['headers']['Content-Type'] = "application/json";
            _this.options['form'] = json_obj;
            if (_this.category) {
                _this.options['form']['category'] = _this.category;
            }
        } else {
            _this.options['form'] = { template: _this.template }
            if (_this.category) {
                _this.options['form']['category'] = _this.category;
            }
        }

        function retryStrategy(err, response, body, options) {
            return !!err || response.statusCode !== 200;
        }

        _this.options['maxAttempts'] = _this._maxAttempts;
        _this.options['retryDelay'] = _this._retryDelay;
        _this.options['retryStrategy'] = retryStrategy;

        request(_this.options, function (error, response, body) {
            if (error) return reject(`Error in request. Please try again later...`);
            if (response.statusCode != 200) return reject(`The Endpoint return Status Code ${response.statusCode}`);

            return resolve(body);
        })
    })
}

API.prototype.sendToWordPress = function () {
    var _this = this;
    return new Promise(function (resolve, reject) {

        var _username = _this.username;
        var _password = _this.password;
        var _url = _this._url;

        if (!_password || !_username) return reject('Please verify your credentials. The username or password is missing.');
        if (!_url || !_url.match(/^(http(s)?):\/\//ig)) return reject('Invalid site link.');

        var client = wordpress.createClient({
            url: _url,
            username: _username,
            password: _password,
        });

        var _postStatus = _this.poststatus == 0 ? 'draft' : 'publish';

        var data = {
            title: _this.stitle ? _this.stitle : '',
            content: _this.template,
            status: _postStatus,
            termNames: {
                "category": _this.category
            }
        };

        client.newPost(data, function (error, _id) {
            if (error && error.faultString) return reject(error.faultString);
            if (error && error.code == 'ECONNRESET') return reject('Connection rejected. Please verify the url and try again.');
            if (error && /(username|password)/ig.test(error)) return reject('Incorrect username or password. Please verify your credentials.');

            if (error) return reject(error);

            var _stm = {}
            _stm['link'] = _id ? `${_url}?p=${_id}` : _id;
            _stm['status'] = _postStatus;
            _stm['category'] = _this.category;

            return resolve(_stm);
        });
    })
}
API.prototype.sendToJoomla = function () { }
API.prototype.sendToDrupal = function () { }
API.prototype.sendToPhpBB = function () { }
API.prototype.sendToFluxBB = function () { }
API.prototype.sendToVbulletin = function () { }
API.prototype.sendToDataLife = function () { }
API.prototype.sendToIPB = function () { }


API.prototype.process = function (callback) {
    var _this = this;

    if (!_this.taskId) return callback('No taskID Provided.');

    _this.listOptions().then(function () {
        if (_this._type == 'api') {
            return _this.sendToAPI();
        } else if (_this._type == 'wordpress') {
            return _this.sendToWordPress();
        } else if (_this._type == 'datalife') {
            return
        } else if (_this._type == 'ipb') {
            return
        } else if (_this._type == 'vbulletin') {
            return
        } else if (_this._type == 'fluxbb') {
            return
        } else if (_this._type == 'phpBB') {
            return
        } else if (_this._type == 'drupal') {
            return
        } else if (_this._type == 'joomla') {
            return
        } else {
            return
        }
    }).then(function (_result) {
        //success update logs with (posted == true)
        Logs.updateOne({ taskId: _this.taskId }, {
            $set: {
                "posted.status": true,
                "posted.data": _result
            }
        }, function (err, raw) {
            if (err) return callback("Can't Update Logs DB.");

            return callback(null, raw);
        })
    }).catch(function (err) {
        Logs.updateOne({ taskId: _this.taskId }, {
            $set: {
                "posted.status": false,
                "posted.data": {}
            }
        }, function (_err) {
            return callback(err);
        })
    })
}


module.exports = API;