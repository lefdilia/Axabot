var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var profilesSchema = new Schema({
    name: {
        type: String
    },
    settings: {
        type: Schema.Types.Mixed,
        default: {}
    },
    status: {
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

module.exports = mongoose.model('profiles', profilesSchema);

/*
 var profileSchema = new Schema({
    iduser: { type: Schema.Types.ObjectId, required: true },
    username: String,
    profile: String,
    settings: { type: Object, default: [] },
    created: { type: Date, default: Date.now },
    status: { type: Boolean, enum: [true, false], default: false }
});
*/