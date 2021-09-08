const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const url = 'mongodb://127.0.0.1:27017/axabot';

///// Write all Extra code that need to executed directly /!\
var db, bulk, _hosts;

MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true }).then(function (client) {
    db = client.db('axabot');
    _hosts = db.collection('hosts');
    return;
}).then(function () {
    bulk = db.collection('hosts').initializeUnorderedBulkOp();

    var _added = new Date().toISOString();

    bulk.find({
        server: 'uploaded.net'
    }).upsert().updateOne({
        $set: {
            "server": "uploaded.net",
            "link": "http://uploaded.net",
            "shortcuts": [
                "http://uploaded.net",
                "ul.to"
            ],
            "max_upload_size_free": 3221225472,
            "max_upload_size_premium": 6442450944,
            "storage_time": "180 days",
            "status": true,
            "account_support": true,
            "added": _added,
            "extra": {
                "type": 1,
                "inputs": [
                    {
                        "name": "Account-ID",
                        "input": "username",
                        "type": "text"
                    },
                    {
                        "name": "Password",
                        "input": "password",
                        "type": "password"
                    }
                ]
            }

        }
    });


    bulk.find({
        server: '1fichier.com'
    }).upsert().updateOne({
        $set: {
            "server": "1fichier.com",
            "link": "http://1fichier.com",
            "shortcuts": [
                "1fichier.com"
            ],
            "max_upload_size_free": 3221225472,
            "max_upload_size_premium": 6442450944,
            "storage_time": "180 days",
            "status": true,
            "account_support": true,
            "added": _added,
            "extra": {
                "type": 1,
                "inputs": [
                    {
                        "name": "Email",
                        "input": "email",
                        "type": "text"
                    },
                    {
                        "name": "Password",
                        "input": "password",
                        "type": "password"
                    }
                ]
            }
        }
    });

    bulk.find({
        server: 'rapidgator.net'
    }).upsert().updateOne({
        $set: {
            "server": "rapidgator.net",
            "link": "http://rapidgator.net",
            "shortcuts": [
                "rapidgator.net",
                "rg.to"
            ],
            "max_upload_size_free": 3221225472,
            "max_upload_size_premium": 6442450944,
            "storage_time": "180 days",
            "status": true,
            "account_support": true,
            "added": _added,
            "extra": {
                "type": 1,
                "inputs": [
                    {
                        "name": "Email",
                        "input": "email",
                        "type": "text"
                    },
                    {
                        "name": "Password",
                        "input": "password",
                        "type": "password"
                    }
                ]
            }
        }
    });

    bulk.find({
        server: 'rockfile.co'
    }).upsert().updateOne({
        $set: {
            "server": "rockfile.co",
            "link": "http://rockfile.co",
            "shortcuts": [
                "rockfile.co"
            ],
            "max_upload_size_free": 3221225472,
            "max_upload_size_premium": 6442450944,
            "storage_time": "180 days",
            "status": true,
            "account_support": true,
            "added": _added,
            "extra": {
                "type": 1,
                "inputs": [
                    {
                        "name": "Username",
                        "input": "username",
                        "type": "text"
                    },
                    {
                        "name": "Password",
                        "input": "password",
                        "type": "password"
                    }
                ]
            }
        }
    });

    bulk.find({
        server: 'uptobox.com'
    }).upsert().updateOne({
        $set: {
            "server": "uptobox.com",
            "link": "http://uptobox.com",
            "shortcuts": [
                "uptobox.com"
            ],
            "max_upload_size_free": 3221225472,
            "max_upload_size_premium": 6442450944,
            "storage_time": "180 days",
            "status": true,
            "account_support": true,
            "added": _added,
            "extra": {
                "type": 1,
                "inputs": [
                    {
                        "name": "Username",
                        "input": "username",
                        "type": "text"
                    },
                    {
                        "name": "Password",
                        "input": "password",
                        "type": "password"
                    }
                ]
            }
        }
    });

    bulk.find({
        server: 'nitroflare.com'
    }).upsert().updateOne({
        $set: {
            "server": "nitroflare.com",
            "link": "http://nitroflare.com",
            "shortcuts": [
                "nitroflare.com"
            ],
            "max_upload_size_free": 3221225472,
            "max_upload_size_premium": 6442450944,
            "storage_time": "180 days",
            "status": true,
            "account_support": true,
            "added": _added,
            "extra": {
                "type": 1,
                "info": "<i class=\"fa fa-exclamation-triangle\" aria-hidden=\"true\"></i> Nitroflare uses <b>'Hash'</b>, you can get it here : <a target=\"_blank\" href=\"https://nitroflare.com/user-hash\"><b>Hash</b></a>",
                "inputs": [
                    {
                        "name": "Hash",
                        "input": "hash",
                        "type": "password"
                    }
                ]
            }
        }
    });


    bulk.find({
        server: 'turbobit.net'
    }).upsert().updateOne({
        $set: {
            "server": "turbobit.net",
            "link": "http://turbobit.net",
            "shortcuts": [
                "turbobit.net"
            ],
            "max_upload_size_free": 3221225472,
            "max_upload_size_premium": 6442450944,
            "storage_time": "180 days",
            "status": true,
            "account_support": true,
            "added": _added,
            "extra": {
                "type": 1,
                "info": "<i class=\"fa fa-exclamation-triangle\" aria-hidden=\"true\"></i> Turbobit uses <b>'API-Key'</b>, you can get it here : <a target=\"_blank\" href=\"https://turbobit.net/user/settings\"><b>API Key</b></a>",
                "inputs": [
                    {
                        "name": "API Key",
                        "input": "apikey",
                        "type": "password"
                    }
                ]
            }
        }
    });


    bulk.find({
        server: 'openload.co'
    }).upsert().updateOne({
        $set: {
            "server": "openload.co",
            "link": "http://openload.co",
            "shortcuts": [
                "openload.co",
                "openload.io"
            ],
            "max_upload_size_free": 3221225472,
            "max_upload_size_premium": 6442450944,
            "storage_time": "180 days",
            "status": false,
            "account_support": true,
            "added": _added,
            "extra": {
                "type": 2,
                "info": "<i class=\"fa fa-exclamation-triangle\" aria-hidden=\"true\"></i> Use <b><u>'API-Login'</u></b> And <b><u>'API-Key'</u></b> instead of <b><u>'Username'</u></b> And <b><u>'Password'</u></b>, you can get it here : <a target=\"_blank\" href=\"https://openload.co/account#usersettings\"><b>API Login/Key</b></a>",
                "inputs": [
                    {
                        "name": "API-Login",
                        "input": "apilogin",
                        "type": "text"
                    },
                    {
                        "name": "API-Key",
                        "input": "apikey",
                        "type": "password"
                    }
                ]
            }
        }
    });


    bulk.find({
        server: 'imgur.com'
    }).upsert().updateOne({
        $set: {
            "server": "imgur.com",
            "link": "https://imgur.com/",
            "shortcuts": [
                "imgur.com"
            ],
            "max_upload_size_free": 3221225472,
            "max_upload_size_premium": 6442450944,
            "storage_time": "180 days",
            "status": true,
            "account_support": true,
            "added": _added,
            "extra": {
                "type": 4,
                "info": "<i class=\"fa fa-exclamation-triangle\" aria-hidden=\"true\"></i> Use <b><u>'Client ID'</u></b> With <b><u>'Username'</u></b> And <b><u>'Password'</u></b>, you can get it here : <a target=\"_blank\" href=\"https://api.imgur.com/oauth2/addclient\"><b>Client ID/Secret</b></a>&nbsp;&nbsp;&nbsp;<a target=\"_blank\" href=\"/assets/images/register_on_imgur_1.png\"><i class=\"fa fa-picture-o\" aria-hidden=\"true\"></i></a> <a target=\"_blank\" href=\"/assets/images/register_on_imgur_2.png\"><i class=\"fa fa-picture-o\" aria-hidden=\"true\"></i></a>",
                "inputs": [
                    {
                        "name": "Client ID",
                        "input": "clientid",
                        "type": "text"
                    },
                    {
                        "name": "Username",
                        "input": "username",
                        "type": "text"
                    },
                    {
                        "name": "Password",
                        "input": "password",
                        "type": "password"
                    }
                ]
            }
        }
    });


    bulk.find({
        server: 'streamango.com'
    }).upsert().updateOne({
        $set: {
            "server": "streamango.com",
            "link": "http://www.streamango.com",
            "shortcuts": [
                "streamango.com"
            ],
            "max_upload_size_free": 3221225472,
            "max_upload_size_premium": 6442450944,
            "storage_time": "180 days",
            "status": false,
            "account_support": true,
            "added": _added,
            "extra": {
                "type": 2,
                "info": "<i class=\"fa fa-exclamation-triangle\" aria-hidden=\"true\"></i> Use <b><u>'API-Login'</u></b> And <b><u>'API-Key'</u></b> instead of <b><u>'Username'</u></b> And <b><u>'Password'</u></b>, you can get it here : <a target=\"_blank\" href=\"https://streamango.com/account#usersettings\"><b>API Login/Key</b></a>",
                "inputs": [
                    {
                        "name": "API-Login",
                        "input": "apilogin",
                        "type": "text"
                    },
                    {
                        "name": "API-Key",
                        "input": "apikey",
                        "type": "password"
                    }
                ]
            }
        }
    });

    bulk.find({
        server: 'vidcloud.co'
    }).upsert().updateOne({
        $set: {
            "server": "vidcloud.co",
            "link": "http://www.vidcloud.co",
            "shortcuts": [
                "vidcloud.co"
            ],
            "max_upload_size_free": 3221225472,
            "max_upload_size_premium": 6442450944,
            "storage_time": "180 days",
            "status": true,
            "account_support": true,
            "added": _added,
            "extra": {
                "type": 2,
                "info": "<i class=\"fa fa-exclamation-triangle\" aria-hidden=\"true\"></i> Use <b><u>'API-Login'</u></b> And <b><u>'API-Key'</u></b> instead of <b><u>'Username'</u></b> And <b><u>'Password'</u></b>, you can get it here : <a target=\"_blank\" href=\"https://streamango.com/account#usersettings\"><b>API Login/Key</b></a>",
                "inputs": [
                    {
                        "name": "API-Login",
                        "input": "apilogin",
                        "type": "text"
                    },
                    {
                        "name": "API-Key",
                        "input": "apikey",
                        "type": "password"
                    }
                ]
            }
        }
    });


    bulk.find({
        server: 'shorte.st'
    }).upsert().updateOne({
        $set: {
            "server": "shorte.st",
            "link": "https://shorte.st",
            "shortcuts": [
                "shorte.st"
            ],
            "max_upload_size_free": 3221225472,
            "max_upload_size_premium": 6442450944,
            "storage_time": "180 days",
            "status": true,
            "account_support": true,
            "added": _added,
            "extra": {
                "type": 3,
                "info": "<i class=\"fa fa-exclamation-triangle\" aria-hidden=\"true\"></i> Use <b><u>'API token'</u></b> instead of <b><u>'Username'</u></b> And <b><u>'Password'</u></b>, you can get it here : <a target=\"_blank\" href=\"https://shorte.st/tools/api?user-type=new\"><b>API Token</b></a>",
                "inputs": [
                    {
                        "name": "API token",
                        "input": "apitoken",
                        "type": "password"
                    }
                ]
            }
        }
    });


    bulk.find({
        server: 'imgbox.com'
    }).upsert().updateOne({
        $set: {
            "server": "imgbox.com",
            "link": "https://imgbox.com",
            "shortcuts": [
                "imgbox.com"
            ],
            "max_upload_size_free": 3221225472,
            "max_upload_size_premium": 6442450944,
            "storage_time": "180 days",
            "status": true,
            "account_support": true,
            "added": _added,
            "extra": {
                "type": 4,
                "info": "",
                "inputs": [
                    {
                        "name": "Email / Username",
                        "input": "username",
                        "type": "text"
                    },
                    {
                        "name": "Password",
                        "input": "password",
                        "type": "password"
                    }
                ]
            }
        }
    })

    bulk.find({
        server: 'onlystream.tv'
    }).upsert().updateOne({
        $set: {
            "server": "onlystream.tv",
            "link": "https://onlystream.tv",
            "shortcuts": [
                "onlystream.tv"
            ],
            "max_upload_size_free": 3221225472,
            "max_upload_size_premium": 6442450944,
            "storage_time": "180 days",
            "status": true,
            "account_support": true,
            "added": _added,
            "extra": {
                "type": 2,
                "info": "<i class=\"fa fa-exclamation-triangle\" aria-hidden=\"true\"></i> Use <b><u>'API-Key'</u></b> instead of <b><u>'Username'</u></b> And <b><u>'Password'</u></b>, you can get it here : <a target=\"_blank\" href=\"https://onlystream.tv/?op=my_api\"><b>API Key</b></a>",
                "inputs": [
                    {
                        "name": "API-Key",
                        "input": "apikey",
                        "type": "password"
                    }
                ]
            }
        }
    })


    bulk.find({
        server: 'mixdrop.co'
    }).upsert().updateOne({
        $set: {
            "server": "mixdrop.co",
            "link": "https://mixdrop.co",
            "shortcuts": [
                "mixdrop.co"
            ],
            "max_upload_size_free": 3221225472,
            "max_upload_size_premium": 6442450944,
            "storage_time": "180 days",
            "status": true,
            "account_support": true,
            "added": _added,
            "extra": {
                "type": 2,
                "info": "<i class=\"fa fa-exclamation-triangle\" aria-hidden=\"true\"></i> Use <b><u>'API E-Mail'</u></b> AND <b><u>'API Key'</u></b>, you can get them here : <a target=\"_blank\" href=\"https://mixdrop.co/api\"><b>API Email/Key</b></a>",
                "inputs": [
                    {
                        "name": "API Email",
                        "input": "apiemail",
                        "type": "text"
                    },
                    {
                        "name": "API Key",
                        "input": "apikey",
                        "type": "password"
                    }
                ]
            }
        }
    })


    bulk.find({
        server: 'pixhost.to'
    }).upsert().updateOne({
        $set: {
            "server": "pixhost.to",
            "link": "https://pixhost.to",
            "shortcuts": [
                "pixhost.to"
            ],
            "max_upload_size_free": 3221225472,
            "max_upload_size_premium": 6442450944,
            "storage_time": "180 days",
            "status": true,
            "account_support": true,
            "added": _added,
            "extra": {
                "type": 4,
                "info": "",
                "inputs": []
            }
        }
    })


    bulk.find({
        server: 'verystream.com'
    }).upsert().updateOne({
        $set: {
            "server": "verystream.com",
            "link": "http://verystream.com",
            "shortcuts": [
                "verystream.com"
            ],
            "max_upload_size_free": 3221225472,
            "max_upload_size_premium": 6442450944,
            "storage_time": "180 days",
            "status": false,
            "account_support": true,
            "added": _added,
            "extra": {
                "type": 2,
                "info": "<i class=\"fa fa-exclamation-triangle\" aria-hidden=\"true\"></i> Use <b><u>'API-ID'</u></b> And <b><u>'API-Key'</u></b> instead of <b><u>'Username'</u></b> And <b><u>'Password'</u></b>, you can get it here : <a target=\"_blank\" href=\"https://verystream.com/panel#settings\"><b>API ID/Key</b></a>",
                "inputs": [
                    {
                        "name": "API-ID",
                        "input": "api_id",
                        "type": "text"
                    },
                    {
                        "name": "API-Key",
                        "input": "api_key",
                        "type": "password"
                    }
                ]
            }
        }
    });

    bulk.find({
        server: 'anonfile.com'
    }).upsert().updateOne({
        $set: {
            "server": "anonfile.com",
            "link": "http://anonfile.com",
            "shortcuts": [
                "anonfile.com"
            ],
            "max_upload_size_free": 3221225472,
            "max_upload_size_premium": 6442450944,
            "storage_time": "180 days",
            "status": true,
            "account_support": true,
            "added": _added,
            "extra": {
                "type": 1,
                "info": "<i class=\"fa fa-exclamation-triangle\" aria-hidden=\"true\"></i> Use <b><u>'API-Key'</u></b> instead of <b><u>'Username'</u></b> And <b><u>'Password'</u></b>, you can get it here : <a target=\"_blank\" href=\"https://anonfile.com/docs/api\"><b>API-Key</b></a>",
                "inputs": [
                    {
                        "name": "API-Key",
                        "input": "apikey",
                        "type": "password"
                    }
                ]
            }
        }
    });


    bulk.find({
        server: 'vidoza.net'
    }).upsert().updateOne({
        $set: {
            "server": "vidoza.net",
            "link": "https://vidoza.net",
            "shortcuts": [
                "vidoza.net"
            ],
            "max_upload_size_free": 3221225472,
            "max_upload_size_premium": 6442450944,
            "storage_time": "180 days",
            "status": true,
            "account_support": true,
            "added": _added,
            "extra": {
                "type": 2,
                "info": "<i class=\"fa fa-exclamation-triangle\" aria-hidden=\"true\"></i> Use <b><u>'Api Token'</u></b> instead of <b><u>'Username'</u></b> And <b><u>'Password'</u></b>, you can find it in <u>Account Settings</u> in the User Panel : <a target=\"_blank\" href=\"https://vidoza.net/?op=my_account\"><b>API Token</b></a>",
                "inputs": [
                    {
                        "name": "API-Token",
                        "input": "token",
                        "type": "password"
                    }
                ]
            }
        }
    })

    bulk.find({
        server: 'saruch.co'
    }).upsert().updateOne({
        $set: {
            "server": "saruch.co",
            "link": "https://saruch.co",
            "shortcuts": [
                "saruch.co"
            ],
            "max_upload_size_free": 3221225472,
            "max_upload_size_premium": 6442450944,
            "storage_time": "180 days",
            "status": false,
            "account_support": true,
            "added": _added,
            "extra": {
                "type": 2,
                "info": "",
                "inputs": [
                    {
                        "name": "Email",
                        "input": "email",
                        "type": "text"
                    },
                    {
                        "name": "Password",
                        "input": "password",
                        "type": "password"
                    }
                ]
            }
        }
    })


    bulk.find({
        $or: [{ server: 'keep2share.cc' }, { server: 'keep2share.com' }]
    }).upsert().updateOne({
        $set: {
            "server": "keep2share.cc",
            "link": "https://k2s.cc",
            "shortcuts": [
                "keep2share.cc",
                "k2s.cc"
            ],
            "max_upload_size_free": 3221225472,
            "max_upload_size_premium": 6442450944,
            "storage_time": "180 days",
            "status": true,
            "account_support": true,
            "added": _added,
            "extra": {
                "type": 1,
                "info": "",
                "inputs": [
                    {
                        "name": "Access Token",
                        "input": "token",
                        "type": "password"
                    }
                ]
            }
        }
    });


    bulk.find({
        server: "gounlimited.to"
    }).upsert().updateOne({
        $set: {
            "server": "gounlimited.to",
            "link": "https://gounlimited.to",
            "shortcuts": [
                "gounlimited.to"
            ],
            "max_upload_size_free": 3221225472,
            "max_upload_size_premium": 6442450944,
            "storage_time": "180 days",
            "status": true,
            "account_support": true,
            "added": _added,
            "extra": {
                "type": 2,
                "info": "<i class=\"fa fa-exclamation-triangle\" aria-hidden=\"true\"></i> Use <b><u>'API-Key'</u></b> instead of <b><u>'Username'</u></b> And <b><u>'Password'</u></b>, you can get it here : <a target=\"_blank\" href=\"https://gounlimited.to/?op=my_account\"><b>API Key</b></a>",
                "inputs": [
                    {
                        "name": "API-Key",
                        "input": "apikey",
                        "type": "password"
                    }
                ]
            }
        }
    })

    bulk.find({
        server: "katfile.com"
    }).upsert().updateOne({
        $set: {
            "server": "katfile.com",
            "link": "https://katfile.com",
            "shortcuts": [
                "katfile.com"
            ],
            "max_upload_size_free": 3221225472,
            "max_upload_size_premium": 6442450944,
            "storage_time": "180 days",
            "status": true,
            "account_support": true,
            "added": _added,
            "extra": {
                "type": 1,
                "info": "",
                "inputs": [
                    {
                        "name": "Username",
                        "input": "username",
                        "type": "text"
                    },
                    {
                        "name": "Password",
                        "input": "password",
                        "type": "password"
                    }
                ]
            }
        }
    })


    bulk.find({
        server: 'dropapk.to'
    }).upsert().updateOne({
        $set: {
            "server": "dropapk.to",
            "link": "https://dropapk.to",
            "shortcuts": [
                "dropapk.to"
            ],
            "max_upload_size_free": 3221225472,
            "max_upload_size_premium": 6442450944,
            "storage_time": "180 days",
            "status": true,
            "account_support": true,
            "added": _added,
            "extra": {
                "type": 1,
                "info": "<i class=\"fa fa-exclamation-triangle\" aria-hidden=\"true\"></i> Use <b><u>'API-Key'</u></b> instead of <b><u>'Username'</u></b> And <b><u>'Password'</u></b>, you can get it here : <a target=\"_blank\" href=\"https://dropapk.to/?op=my_account\"><b> Configurations > Generate API Key</b></a>",
                "inputs": [
                    {
                        "name": "API-Key",
                        "input": "apikey",
                        "type": "password"
                    }
                ]
            }
        }
    })


    bulk.find({
        server: 'clipwatching.com'
    }).upsert().updateOne({
        $set: {
            "server": "clipwatching.com",
            "link": "https://clipwatching.com",
            "shortcuts": [
                "clipwatching.com"
            ],
            "max_upload_size_free": 3221225472,
            "max_upload_size_premium": 6442450944,
            "storage_time": "180 days",
            "status": true,
            "account_support": true,
            "added": _added,
            "extra": {
                "type": 2,
                "info": "",
                "inputs": [
                    {
                        "name": "Username",
                        "input": "username",
                        "type": "text"
                    },
                    {
                        "name": "Password",
                        "input": "password",
                        "type": "password"
                    }
                ]
            }
        }
    })


    bulk.find({
        server: 'uploadgig.com'
    }).upsert().updateOne({
        $set: {
            "server": "uploadgig.com",
            "link": "http://uploadgig.com",
            "shortcuts": [
                "uploadgig.com"
            ],
            "max_upload_size_free": 3221225472,
            "max_upload_size_premium": 6442450944,
            "storage_time": "180 days",
            "status": true,
            "account_support": true,
            "added": _added,
            "extra": {
                "type": 1,
                "info": "",
                "inputs": [
                    {
                        "name": "Username",
                        "input": "username",
                        "type": "text"
                    },
                    {
                        "name": "Password",
                        "input": "password",
                        "type": "password"
                    }
                ]
            }
        }
    })


    bulk.execute().then(function () {
        console.log('Extra Update Successfully Executed...');
        process.exit(0)
    }).catch(function (_error) {
        console.log('Error Execute : ', _error)
        process.exit(0)
    })
}).catch(function (_error) {
    console.log('Error Mongodb : ', _error)
    process.exit(0)
})