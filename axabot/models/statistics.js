var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var statisticSchema = new Schema({
    bandwidth: {
        type: Schema.Types.Mixed,
        default: {
            total: 0,
            upload: 0,
            download: 0
        }
    },
    bandwidth_max: {
        type: Number,
        default: 21990232555520
    },
    disk: {
        type: Schema.Types.Mixed,
        default: {
            size: 0,
            used: 0,
            available: 0,
            percent: 0
        }
    },
    disk_max: {
        type: Number,
        default: 1099511627776
    },
    update_track: {
        type: Schema.Types.Mixed,
        default: {
            current_version: 'N/A',
            last_time: {
                type: Date,
                default: Date.now
            }
        }
    },
    extra: {
        type: Schema.Types.Mixed,
        default: {}
    },
    updated: {
        type: Date,
        default: Date.now
    }
}, {
    strict: false,
    minimize: false
});

module.exports = mongoose.model('statistics', statisticSchema);