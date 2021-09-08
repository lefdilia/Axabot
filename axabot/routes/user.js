const express = require('express');
const router = express.Router();
const csrf = require('csurf');
const mongoose = require('mongoose');
const passport = require('passport');
const { check } = require('express-validator');

var csrfProtection = csrf({ cookie: true });
router.use(csrfProtection);

router.get('/logout', function (req, res, next) {
    mongoose.connection.db.collection('Sessions').updateMany({}, {
        $set: {
            'session.passport': {}
        }
    }, function () {
        res.redirect('/');
    });
});

router.all('*', function (req, res, next) {
    if (!req.isAuthenticated()) {
        next();
    } else {
        res.redirect('/');
    }
});

router.get('/login', function (req, res, next) {
    var messages = req.flash('error');

    res.render('user/login', {
        title: 'Login Page',
        csrfToken: req.csrfToken(),
        layout: 'loginlayout',
        messages: messages,
        hasError: messages.length > 0
    })
});

router.post('/login',
    [
        check('username').isLength({ min: 4 }).withMessage('Username must be at least 4 chars long'),
        check('password').isLength({ min: 4 }).withMessage('Password is too short')
    ],
    passport.authenticate('local.signin', {
        successRedirect: '/',
        failureRedirect: '/user/login',
        failureFlash: true
    }));


module.exports = router;