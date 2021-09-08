var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var apiSchema = new Schema({
    name: {
        type: String
    },
    settings: {
        type: Schema.Types.Mixed,
        default: {}
    },
    authorization: {
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

module.exports = mongoose.model('apis', apiSchema);