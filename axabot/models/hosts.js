var mongoose = require('mongoose');

var Schema = mongoose.Schema;


var hostsSchema = new Schema({
    server: {
        type: String,
        required: true,
        unique: true
    },
    link: {
        type: String
    },
    shortcuts: {
        type: Array,
        default: []
    },
    max_upload_size_free: {
        type: Number,
        default: 0
    },
    max_upload_size_premium: {
        type: Number,
        default: 0
    },
    storage_time: {
        type: String,
        default: "N/A"
    },
    status: {
        type: Boolean,
        default: true
    },
    account_support: {
        type: Boolean,
        default: true
    },
    extra: {
        type: Schema.Types.Mixed,
        default: {}
    },
    data: {
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

/**
 1) Download hosts 
 2) streaming hosts 
 3) shortners hosts 
 4) image hosts 
 
**
{extra :{info:""}} for each host 
Ex : Nitroflare uses Hash instead of password


**
On data : {} --> (username || LOGIN_API) / (password || API_KEY) / access_token


 {
    "server": "adf.ly",
    "link": "http://adf.ly",
    "shortcuts": [
        "adf.ly"
    ],
    "extra": {
        "type": 3
    }
}
 */

module.exports = mongoose.model('hosts', hostsSchema);