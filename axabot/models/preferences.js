var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var preferencesSchema = new Schema({
    torrent_pref: {
        type: Schema.Types.Mixed,
        default: {}
    },
    feed_pref: {
        type: Schema.Types.Mixed,
        default: {}
    },
    rtorrent_pref: {
        type: Schema.Types.Mixed,
        default: {}
    },
    types: {
        type: Schema.Types.Mixed,
        default: {}
    },
    extra: {
        type: Schema.Types.Mixed,
        default: {}
    },
    created: {
        type: Date,
        default: Date.now
    }
}, {
    strict: false,
    minimize: false
});

module.exports = mongoose.model('preferences', preferencesSchema);