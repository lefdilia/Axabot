const passport = require('passport');
const Users = require('../models/user');
const LocalStrategy = require('passport-local').Strategy;
const { validationResult } = require('express-validator');
const _ = require('underscore');

passport.serializeUser(function (user, done) {
    var sessionUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        access: user.access
    };
    done(null, sessionUser);
});

passport.deserializeUser(function (sessionUser, done) {
    done(null, sessionUser);
});

passport.use('local.signin', new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password',
    passReqToCallback: true
}, function (req, username, password, done) {

    const errors = validationResult(req).errors;

    if (errors && errors.length > 0 ) {
        var messages = errors.map(function (obj) {
            return obj.msg;
        })
        return done(null, false, req.flash('error', messages));
    }

    Users.findOne({
        'username': username
    }, function (err, user) {
        if (err) return done(err);

        user = user[0] || {};

        if (_.isEmpty(user)) return done(null, false, {
            'message': 'No user Found'
        });
        if (!Boolean(user.access)) return done(null, false, {
            'message': 'User Account is disabled.'
        });

        var cryptedone = user ? user.password : '';
        if (!Users.validPassword(password, cryptedone)) return done(null, false, {
            'message': 'Wrong Password'
        });

        return done(null, user);

    });
}

));