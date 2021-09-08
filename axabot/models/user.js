var bcrypt = require('bcrypt');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userSchema = new Schema({
    username: {
        type: String,
        unique: true,
        required: true
    },
    email: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    created: {
        type: Date,
        default: Date.now
    },
    access: {
        type: Boolean,
        default: false
    },
    data: {
        type: Schema.Types.Mixed,
        default: {}
    }
}, {
    minimize: false
})

var mUserSC = mongoose.model('user_access', userSchema, 'user_access');

module.exports.mUserSC = mUserSC;

exports.updatePassword = function (arr, done) {
    var username = arr.username;
    var password = encryptPassword(arr.password);
    if (!password) return done("Error generating Password...");

    mUserSC.updateOne({ username: username }, {
        $set: {
            password: password
        }
    }, { new: true }, function (err, result) {
        if (err) return done(err);
        return done(null, result);
    })
}


exports.findOne = function (objsrc, done) {

    var field = objsrc ? Object.keys(objsrc)[0] : null;
    var value = objsrc ? objsrc[field] : null;
    if (!field || !value) {
        return done(new Error('Null value passed!!!'));
    }

    mUserSC.find(objsrc, function (err, result) {
        if (err) return done(err);

        done(null, result);
    })
}

exports.encryptPassword = encryptPassword = function (password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(5));
}

exports.validPassword = function (password, cryptedone) {
    return bcrypt.compareSync(password, cryptedone);
}