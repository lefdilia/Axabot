var aggregatePaginate = require('mongoose-aggregate-paginate-v2');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var feedSchema = new Schema({
    name: {
        type: String,
        unique: true
    },
    type: {
        type: String
    },
    link: {
        type: String
    },
    extra: {
        type: Schema.Types.Mixed,
        default: {}
    },
    status: {
        type: Boolean,
        default: true
    },
    created: {
        type: Date,
        default: Date.now
    }
}, {
    strict: false,
    minimize: false
});



var validateHash = function (hash) {
    Torrents.findOne({
        hash: hash
    }, function (err, tor) {
        if (err) return false;
        if (!tor) {
            return true;
        } else {
            return false;
        }
    });
};


var torrentsSchema = new Schema({
    hash: {
        type: String,
        unique: true,
        required: true,
        validate: [validateHash, ''],
    },
    title: {
        type: String
    },
    size: {
        type: Number
    },
    magnet: {
        type: String
    },
    info: {
        type: Schema.Types.Mixed,
        default: {}
    },
    extra: {
        type: Schema.Types.Mixed,
        default: {}
    }
}, {
    minimize: false,
    timestamps: { createdAt: 'added', updatedAt: 'updated' }
});


var validaterHash = function (hash) {
    rTorrents.findOne({
        hash: hash
    }, function (err, tor) {
        if (err) return false;
        if (!tor) {
            return true;
        } else {
            return false;
        }
    });
};


var rtorrentsSchema = new Schema({
    hash: {
        type: String,
        unique: true,
        required: true,
        validate: [validaterHash, ''],
    },
    info: {
        type: Schema.Types.Mixed,
        default: {}
    },
    extra: {
        type: Schema.Types.Mixed,
        default: {}
    },
    added: {
        type: Date,
        default: Date.now
    }
}, {
    strict: false,
    minimize: false
});

//Test only for Torrent faster aggregation
torrentsSchema.index({ "hash": 1, "added": 1 }, { name: 'fast_agg' });

rtorrentsSchema.index({ "hash": 1 }, { unique: true });
feedSchema.index({ "name": 1 }, { unique: true, name: 'Feedguard' });

/*
info :     
    ->@String type --> is the category
    ->@String source --> is the feedname
    ->@String name --> is the name inside torrent file

*/

module.exports.feeds = mongoose.model('feeds', feedSchema);

torrentsSchema.plugin(aggregatePaginate);
module.exports.torrents = mongoose.model('torrents', torrentsSchema); //=Torrents=

module.exports.rtorrents = mongoose.model('rtorrents', rtorrentsSchema); //=rTorrents=