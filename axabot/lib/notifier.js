let EventEmitter = require('events').EventEmitter;

EventEmitter.prototype._maxListeners = Infinity;

var notifier = new EventEmitter();

module.exports = notifier;
