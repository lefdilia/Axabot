const init = require('../config/init');

const express = require('express');
const router = express.Router();

const settings = require('../lib/settings');
const services = require('../lib/services');
const ip = require('ip');

const nodemailer = require('nodemailer');

router.get('/', function (req, res, next) {
    return res.redirect('/settings/services/');
});

router.get('/profiles', function (req, res, next) {
    settings.listSettings(function (err, data) {
        res.render('settings/profiles', {
            title: 'AxaBot - Settings > Profiles',
            query: 'profiles',
            hosts: data['hosts'] || [],
            shortener: data['shortener'] || [],
            imageHosts: data['imageHosts'] || [],
            profiles: data['profiles'] || [],
            templates: data['templates'] || [],
            apis: data['apis'] || [],
            currentPage: 'settings'
        });
    })
});

router.get('/hosts', function (req, res, next) {
    settings.listHostsSettings(function (err, data) {
        res.render('settings/hosts', {
            title: 'AxaBot - Settings > Hosts Accounts',
            query: 'hosts',
            hosts: data['hosts'] || [],
            accounts: data['accounts'] || [],
            currentPage: 'settings'
        });
    })
});

router.get('/services', function (req, res, next) {
    services.findPreferences(function (err, data) {
        var _preferences = data.prefs || [];
        var _stats = data.stats || [];
        res.render('settings/services', {
            title: 'AxaBot - Settings > List of Services',
            query: 'services',
            preferences: _preferences,
            stats: _stats,
            currentPage: 'settings'
        });
    })
});

router.post('/get_password', function (req, res, next) {
    if (!req.body) {
        return res.status(403).send({
            message: "Undefined Body"
        });
    }

    var user = req.user || {};
    if (!user.access) {
        return res.status(403).send({
            message: "Unauthorized Access"
        });
    }

    var body = req.body;
    var type = body.type;

    if (!type) return res.status(500).send("Missing Type.");

    services.getPassword({ type: type }).then(function (lpassword) {
        return res.status(200).send(lpassword);
    }).catch(function () {
        return res.status(500).send("Error getting password.");
    })
})

router.post('/reset_password', function (req, res, next) {
    if (!req.body) {
        return res.status(403).send({
            message: "Undefined Body"
        });
    }

    var user = req.user || {};
    if (!user.access) {
        return res.status(403).send({
            message: "Unauthorized Access"
        });
    }

    var body = req.body;
    var type = body.type;

    if (!type) return res.status(500).send("Missing Type.");

    services.resetPassword({ type: type }).then(function (lpassword) {
        return res.status(200).send(lpassword);
    }).catch(function () {
        return res.status(500).send("Error resetting password.");
    })
})

router.post('/restart_service', function (req, res, next) {
    if (!req.body) {
        return res.status(403).send({
            message: "Undefined Body"
        });
    }

    var user = req.user || {};
    if (!user.access) {
        return res.status(403).send({
            message: "Unauthorized Access"
        });
    }

    var body = req.body;
    var type = body.type;

    if (!type) return res.status(500).send("Missing Type.");

    services.restartService({ type: type }).then(function (result) {
        return res.status(200).send(result);
    }).catch(function () {
        return res.status(500).send("Error restarting service.");
    })
})

router.get('/sites', function (req, res, next) {
    settings.listApis().then(function (apis) {
        res.render('settings/sites', {
            title: 'AxaBot - Settings > Sites & APIS',
            query: 'sites',
            apis: apis,
            currentPage: 'settings'
        });
    });
});

router.get('/templates', function (req, res, next) {
    settings.rtemplates().then(function (data) {

        var _hosts = data['hosts'];
        var _templates = data['templates'];
        var _variables = data['variables'];

        res.render('settings/templates', {
            title: 'AxaBot - Settings > Templates',
            query: 'templates',
            templates: _templates,
            hosts: _hosts,
            variables: _variables,
            currentPage: 'settings'
        });
    });
});

router.post('/editemplate', function (req, res, next) {
    if (!req.body) {
        return res.status(403).send({
            message: "Undefined Body"
        });
    }

    var user = req.user || {};
    if (!user.access) {
        return res.status(403).send({
            message: "Unauthorized Access"
        });
    }

    var body = req.body;
    var _id = body._id;

    settings.rtemplates(_id).then(function (data) {
        var _templates = data['templates'] || "";
        _templates = Array.isArray(_templates) ? _templates[0] : _templates;

        return res.status(200).send(_templates);
    })

})

router.post('/getprofile', function (req, res, next) {
    if (!req.body) {
        return res.status(403).send({
            message: "Undefined Body"
        });
    }

    var user = req.user || {};
    if (!user.access) {
        return res.status(403).send({
            message: "Unauthorized Access"
        });
    }

    var body = req.body;
    var _id = body._id;

    settings.listProfiles(_id).then(function (data) {
        data = Array.isArray(data) ? data[0] : [];

        return res.status(200).send({
            data: data
        });
    }).catch(function (err) {
        return res.status(500).send({
            message: "Error This Profile does not Exist.",
        });
    })

})

router.post('/alias', function (req, res, next) {
    if (!req.body) {
        return res.status(403).send({
            message: "Undefined Body"
        });
    }

    var user = req.user || {};
    if (!user.access) {
        return res.status(403).send({
            message: "Unauthorized Access"
        });
    }

    var body = req.body;
    var _host = body._h;

    if (!_host) return res.status(500).send("Missing Host.");

    settings.listInputs({ host: _host }).then(function (inputs) {
        return res.status(200).send(inputs);
    }).catch(function () {
        return res.status(500).send("Error getting inputs.");
    })
})


router.post('/getaccount', function (req, res, next) {
    if (!req.body) {
        return res.status(403).send({
            message: "Undefined Body"
        });
    }

    var user = req.user || {};
    if (!user.access) {
        return res.status(403).send({
            message: "Unauthorized Access"
        });
    }

    var body = req.body;
    var _id = body._id;

    var _rt = {};

    settings.listHosts(_id).then(function (result) {

        result = Array.isArray(result) ? result[0] : [];

        var _host = result['server'];

        _rt['init'] = {
            host: _host,
            use_account: result['data']['use_account'] || false,
            info: result['extra']['info'] || ""
        }

        delete result['data']['use_account'];
        _rt['data'] = result['data']

        return _host;

    }).then(function (_host) {
        return settings.listInputs({ host: _host });
    }).then(function (_form) {
        _rt['form'] = _form;
        return res.status(200).send(_rt);
    }).catch(function (err) {
        return res.status(500).send({
            message: "Error This Profile does not Exist.",
        });
    })





    /*     settings.listHosts(_id).then(function (result) {
            result = Array.isArray(result) ? result[0] : [];
    
            var _rt = {};
            _rt['init'] = {
                host: result['server'],
                use_account: result['data']['use_account'] || false,
                info: result['extra']['info'] || ""
            }
    
            delete result['data']['use_account'];
            _rt['data'] = result['data']
    
            return res.status(200).send(_rt);
    
        }).catch(function (err) {
            return res.status(500).send({
                message: "Error This Profile does not Exist.",
            });
        }) */



})

router.post('/profiles', function (req, res, next) {
    if (!req.body) {
        return res.status(403).send({
            message: "Undefined Body"
        });
    }

    var user = req.user || {};
    if (!user.access) {
        return res.status(403).send({
            message: "Unauthorized Access"
        });
    }


    var body = req.body;

    var opts = {
        b: {},
        s: {}
    };

    opts['b']['default_profile'] = Boolean(body.default_profile) || false;

    opts['s'].profileName = body.profile_name || 'ANON__' + Date.now();
    opts['s'].randomFilename = Boolean(body.random_filename) || false;
    opts['s'].prefixFilename = Boolean(body.prefix_filename) || false;
    opts['s'].prefixString = body.prefix_str || '';
    opts['s'].startUploadAuto = Boolean(body.start_upload_auto) || false;

    opts['s'].autoPost = Boolean(body.auto_post) || false;
    opts['s'].forcedAutoPost = Boolean(body.forced_auto_post) || false;

    opts['s'].stemplates = body.stemplates ? body.stemplates.trim() : '';
    opts['s'].stapi = body.stapi ? body.stapi.trim() : '';

    opts['s'].hosts = Array.isArray(body.hosts) ? body.hosts : (body.hosts ? [body.hosts] : []);
    opts['s'].shortners = Array.isArray(body.shortners) ? body.shortners : (body.shortners ? [body.shortners] : []);

    opts['s'].hostImages = Array.isArray(body.host_images) ? body.host_images : (body.host_images ? [body.host_images] : []);
    opts['s'].uploadTopicImage = Boolean(body.upload_t_image) || false; //Upload topic image

    opts['s'].sampleEnabled = Boolean(body.sample_enabled) || false; //Create Sample
    opts['s'].hostSample = Array.isArray(body.host_sample) ? body.host_sample : (body.host_sample ? [body.host_sample] : []);

    opts['s'].rarEnabled = Boolean(body.rar_enabled) || false;
    opts['s'].rarPassword = body.rar_password || false;
    opts['s'].rarComment = body.rar_comment || false;
    opts['s'].rarSplitSize = body.rar_split || false;
    opts['s'].rarEqualParts = Boolean(body.rar_eqpart) || false;

    opts['s'].defaultCrawlers = {
        movies: body.default_movie_cr || false,
        tv: body.default_tv_cr || false
    }

    opts['s'].nfoProcess = Boolean(body.nfo_process) || false;
    opts['s'].uploadNfoImage = Boolean(body.upload_nfo_image) || false;

    opts['s'].mediaFiles = Boolean(body.media_files) || false;

    opts['s'].thumbnailEnabled = Boolean(body.thumbnail_enabled) || false;
    opts['s'].uploadThumbImage = Boolean(body.upload_thumb_image) || false;
    opts['s'].thumbnailCols = body.mtncols || false;
    opts['s'].thumbnailRows = body.mtnrows || false;
    opts['s'].thumbnailText = body.mtntext || '';

    opts['s'].uploadTries = body.upload_tries || false;

    settings.saveProfile(opts, function (err, info) {
        if (err) {
            return res.status(500).send({
                message: "Error Saving Profile.",
            });
        }

        var message = info.status == 'update' ? 'Profile updated successfully.' : 'Profile saved successfully';

        return res.status(200).send({
            message: message,
            data: info.data
        });
    })
})

router.post('/accounts', function (req, res, next) {
    if (!req.body) {
        return res.status(403).send({
            message: "Undefined Body"
        });
    }

    var user = req.user || {};
    if (!user.access) {
        return res.status(403).send({
            message: "Unauthorized Access"
        });
    }

    var body = req.body;
    var opts = {};

    opts.server = body.server || null;
    if (!opts.server) return res.status(500).send({
        message: "Server is missing.",
    });

    opts.use_account = Boolean(body.useac) || false;

    if (body.useac) delete body.useac;
    if (body.server) delete body.server;

    opts._data = Object.entries(body).reduce((a, [k, v]) => (v ? { ...a, [k]: v } : a), {});

    settings.addAccount(opts, function (err, info) {
        if (err) {
            return res.status(500).send({
                message: "Error saving account.",
            });
        }

        return res.status(200).send({
            message: 'Account saved successfully',
            data: info
        });
    })
})

router.post('/preferences', function (req, res, next) {
    if (!req.body) {
        return res.status(403).send({
            message: "Undefined Body"
        });
    }

    var user = req.user || {};
    if (!user.access) {
        return res.status(403).send({
            message: "Unauthorized Access"
        });
    }

    var body = req.body;
    var opts = {};

    opts.torrentTypes = body.torrent_types.split(',');

    opts.feedTypes = body.feed_types.split(',');
    opts.pingInterval = body.ping_interval || 5; // in minutes

    opts.uploadRate = body.upload_rate || 0; // upload_rate
    opts.downloadRate = body.download_rate || 0; // download_rate
    opts.seedTime = body.seed_time || 0;
    opts.maxDownloads = body.max_downloads || 10; // max_downloads_global
    opts.maxUploads = body.max_uploads || 5; //max_uploads_global

    settings.editPreferences(opts, function (err, info) {
        if (err) {
            return res.status(500).send({
                message: "Error saving preferences.",
            });
        }

        return res.status(200).send({
            message: 'Preferences saved successfully',
            data: info
        });
    })

})

router.post('/remove', function (req, res, next) {
    if (!req.body) {
        return res.status(403).send({
            message: "Undefined Body"
        });
    }

    var user = req.user || {};
    if (!user.access) {
        return res.status(403).send({
            message: "Unauthorized Access"
        });
    }

    var body = req.body;
    var _id = body._id;

    settings.removeProfile(_id, function (error, data) {
        if (error) {
            return res.status(500).send({
                message: error
            });
        }
        return res.status(200).send({
            message: 'Profile successfully removed.',
            data: data
        });
    })
})

router.post('/remove_account', function (req, res, next) {
    if (!req.body) {
        return res.status(403).send({
            message: "Undefined Body"
        });
    }

    var user = req.user || {};
    if (!user.access) {
        return res.status(403).send({
            message: "Unauthorized Access"
        });
    }

    var body = req.body;
    var _id = body._id;

    settings.removeAccount(_id, function (error, data) {
        if (error) {
            return res.status(500).send({
                message: error
            });
        }
        return res.status(200).send({
            message: 'Account successfully removed.',
            data: data
        });
    })
})

router.post('/remove_api', function (req, res, next) {
    if (!req.body) {
        return res.status(403).send({
            message: "Undefined Body"
        });
    }

    var user = req.user || {};
    if (!user.access) {
        return res.status(403).send({
            message: "Unauthorized Access"
        });
    }

    var body = req.body;
    var _id = body._id;

    settings.removeAPI(_id, function (error, data) {
        if (error) {
            return res.status(500).send({
                message: error
            });
        }
        return res.status(200).send({
            message: 'API successfully removed.',
            data: data
        });
    })
})

router.post('/remove_template', function (req, res, next) {
    if (!req.body) {
        return res.status(403).send({
            message: "Undefined Body"
        });
    }

    var user = req.user || {};
    if (!user.access) {
        return res.status(403).send({
            message: "Unauthorized Access"
        });
    }

    var body = req.body;
    var _id = body._id;

    settings.removeTemplate(_id, function (error, data) {
        if (error) {
            return res.status(500).send({
                message: error
            });
        }
        return res.status(200).send({
            message: 'Template successfully removed.',
            data: data
        });
    })
})

router.get('/aprofiles', function (req, res, next) {
    settings.listProfiles().then(function (data) {
        var profiles = Array.isArray(data) ? data.map(function (_pr) {
            return { _name: _pr.name, _id: _pr._id, default: _pr.status };
        }) : [];
        return res.status(200).send(profiles)
    }).catch(function () {
        return res.status(200).send([])
    })
});

router.post('/editapi', function (req, res, next) {
    if (!req.body) {
        return res.status(403).send({
            message: "Undefined Body"
        });
    }

    var user = req.user || {};
    if (!user.access) {
        return res.status(403).send({
            message: "Unauthorized Access"
        });
    }


    var body = req.body;
    var _id = body._id;
    if (!_id) return res.status(500).send("No API ID provided.");

    settings.listApis(_id).then(function (api) {
        api = Array.isArray(api) ? api[0] : api;
        return res.status(200).send(api);
    })

})

router.post('/sites', function (req, res, next) {
    if (!req.body) {
        return res.status(403).send({
            message: "Undefined Body"
        });
    }

    var user = req.user || {};
    if (!user.access) {
        return res.status(403).send({
            message: "Unauthorized Access"
        });
    }

    var body = req.body;
    var opts = {};
    opts['authorization'] = {};
    opts['settings'] = {};

    opts['stname'] = body.stname;

    opts['settings']['url'] = body.sturl;
    opts['settings']['type'] = body.sttype;
    opts['settings']['category'] = body.stcategory ? body.stcategory.split(',') : [];

    //reserverd for wordpress
    if (body.sttype && body.sttype == 'wordpress') {
        opts['settings']['poststatus'] = body.stpoststatus || 0;
    }

    opts['authorization']['stAuth'] = body.stAuth || 0;

    if (opts['authorization']['stAuth'] == '1') {
        opts['authorization']['username'] = body.stusername;
        opts['authorization']['password'] = body.stpassword;
    } else if (opts['authorization']['stAuth'] == '2') {
        opts['authorization']['key'] = body.stkey;
        opts['authorization']['value'] = body.stvalue;
    } else if (opts['authorization']['stAuth'] == '3') {
        opts['authorization']['token'] = body.sttoken;
    }

    settings.saveAPI(opts, function (err, info) {
        if (err) {
            return res.status(500).send({
                message: "Error Saving Api.",
            });
        }

        var message = info && info.status == 'update' ? 'API updated successfully.' : 'API saved successfully';

        return res.status(200).send({
            message: message,
            data: info.data
        });
    })
})

router.post('/templates', function (req, res, next) {
    if (!req.body) {
        return res.status(403).send({
            message: "Undefined Body"
        });
    }

    var user = req.user || {};
    if (!user.access) {
        return res.status(403).send({
            message: "Unauthorized Access"
        });
    }


    var body = req.body;

    var opts = {};
    opts['name'] = body.name ? body.name.trim() : body.name;
    opts['profile'] = body.profile;
    opts['type'] = body.type;
    opts['title'] = body.title ? body.title.trim() : body.title;
    opts['template'] = body.template;

    settings.saveTemplate(opts, function (err, info) {
        if (err) {
            return res.status(500).send({
                message: "Error Saving Template.",
            });
        }

        var message = info && info.status == 'update' ? 'Template updated successfully.' : 'Template saved successfully';

        return res.status(200).send({
            message: message,
            data: info.data
        });
    })
})

router.post('/send_report', function (req, res, next) {
    if (!req.body) {
        return res.status(403).send({
            message: "Undefined Body"
        });
    }

    var user = req.user || {};

    if (!user.access) {
        return res.status(403).send({
            message: "Unauthorized Access"
        });
    }

    var body = req.body;
    var _report = body._r || null;

    _report = _report.replace(/\n+/ig, '<br>');

    if (!_report) return res.status(500).send({ message: 'Report cannot be empty' });

    var _SERVER = ip.address();

    var _html = '';
    _html += `<br>`;
    _html += `<b>Server :</b> ${_SERVER}<br>`;
    _html += `<b>User :</b> ${req.user.email}<br><br>`;
    _html += `<p>${_report}</p>`;

    const message = {
        to: init.OAuth2.user,
        replyTo: req.user.email,
        subject: '[Bug Report]',
        html: _html
    };

    try {
        var transport = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: init.OAuth2
        });

        transport.sendMail(message, function (error, info) {
            if (error) {
                return res.status(500).send({
                    message: "Error sending Report"
                });
            } else {
                return res.status(200).send({
                    message: "Report has been successfully sent"
                });
            }
        });

    } catch (e) {
        return res.status(500).send({
            message: "Error sending Report"
        });
    }

})

router.post('/check_update', function (req, res, next) {
    if (!req.body) {
        return res.status(403).send({
            message: "Undefined Body"
        });
    }

    var user = req.user || {};
    if (!user.access) {
        return res.status(403).send({
            message: "Unauthorized Access"
        });
    }

    var opts = {};

    settings.check_update(opts, function (err, info) {
        if (err) {
            return res.status(500).send({
                message: "Error updating.",
            });
        }
        return res.status(200).send(info);
    })
})

router.post('/updatebot', function (req, res, next) {

    if (!req.body) {
        return res.status(403).send({
            message: "Undefined Body"
        });
    }

    var user = req.user || {};
    if (!user.access) {
        return res.status(403).send({
            message: "Unauthorized Access"
        });
    }

    var opts = {};

    settings.update_bot(opts, function (err) {
        if (err) {
            return res.status(500).send({
                message: "Error updating.",
            });
        }
        return res.status(200).send({
            message: "Update is Running..."
        });
    })

})

router.post('/dismissupdate', function (req, res, next) {
    if (!req.body) {
        return res.status(403).send({
            message: "Undefined Body"
        });
    }

    var user = req.user || {};
    if (!user.access) {
        return res.status(403).send({
            message: "Unauthorized Access"
        });
    }

    global['_botupdate']['available'] = false;
    global['_botupdate']['version'] = false;
    global['_botupdate']['features'] = [];
    global['_botupdate']['notified'] = true;

    return res.status(200).send();
})


module.exports = router;