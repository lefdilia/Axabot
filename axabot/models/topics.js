var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var topicSchema = new Schema({
    title: {
        type: String
    },
    year: {
        type: Number
    },
    image: {
        type: String
    },
    type: {
        type: String
    },
    data: {
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


topicSchema.index({
    "title": 1,
    "year": 1
}, {
    unique: true,
    name: 'Topicguard'
});

//Test only for Torrent faster aggregation
topicSchema.index({ "extra.hashs": 1 }, { name: 'fast_agg' });



module.exports = mongoose.model('topics', topicSchema);




/**
 * title : title in imdb
 * Image : is the cover url on IMDB
 * Type : Movies / TV / Music
 * data : other data like summury or tracklist / label for music / original title for movies.....
 * extra : In case i need to store more infos
 */