var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var templateSchema = new Schema({
    name: {
        type: String,
        unique: true
    },
    profile: {
        type: Schema.Types.ObjectId,
        required: true
    },
    data: {
        type: Schema.Types.Mixed,
        default: {}
    },
    status: {
        type: Boolean,
        default: true
    },
    default: {
        type: Boolean,
        default: false
    },
    created: {
        type: Date,
        default: Date.now
    }
}, {
        strict: false,
        minimize: false
    });

var variablesSchema = new Schema({
    name: {
        type: String,
        unique: true
    },
    parent: {
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

module.exports.templates = mongoose.model('templates', templateSchema);
module.exports.variables = mongoose.model('variables', variablesSchema);