var aggregatePaginate = require('mongoose-aggregate-paginate-v2');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var taskSchema = new Schema({
    name: {
        type: String
    },
    infos: {
        type: Schema.Types.Mixed,
        default: {}
    },
    options: {
        type: Schema.Types.Mixed,
        default: {}
    },
    extra: {
        type: Schema.Types.Mixed,
        default: {}
    },
    stats: {
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

//-> topic   => The _id of topic
//-> infos => File Infos ( Time / Path / Size / isDirectory )
// taskSchema.index({ name: 1, path: 1}, { unique: true });

var childTasksSchema = new Schema({
    taskId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    infos: {
        type: Schema.Types.Mixed,
        default: {}
    },
    stats: {
        type: Schema.Types.Mixed,
        default: {}
    },
    istime: { // created, started, finished
        type: Schema.Types.Mixed,
        default: {}
    }
}, {
    strict: false,
    minimize: false
})



var logsSchema = new Schema({
    name: {
        type: String
    },
    taskId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    ts_infos: { //Add -> topic_id && profile_id
        type: Schema.Types.Mixed,
        default: {}
    },
    ts_links: {
        type: Array,
        default: []
    },
    extra: {
        type: Schema.Types.Mixed,
        default: {}
    },
    posted: {
        status: {
            type: Boolean,
            default: false
        },
        data: {
            type: Schema.Types.Mixed,
            default: {}
        },
        _date: {
            type: Date,
            default: Date.now
        }
    },
    created: {
        type: Date,
        default: Date.now
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    strict: false,
    minimize: false
})

logsSchema.pre('save', function (next) {
    this.lastUpdated = Date.now()
    next()
})


logsSchema.index({
    "taskId": 1
}, {
    unique: true,
    name: 'KordaCloud'
});

//Test only for Torrent faster aggregation
logsSchema.index({ "ts_infos.hash": 1, "created": 1 }, { name: 'fast_agg' });
logsSchema.index({ "taskId": 1, "ts_links": 1 }, { name: 'fast_cgg' });

childTasksSchema.index({
    "taskId": 1,
    "infos.type": 1,
    "infos.path": 1,
    "infos.host": 1
}, {
    unique: true,
    name: 'childtaskguard'
});

taskSchema.index({
    "infos.profile": 1,
    "infos.hash": 1
}, {
    name: 'taskguard',
    unique: true,
    partialFilterExpression: {
        "infos.hash": {
            $type: "string"
        }
    }
});


logsSchema.plugin(aggregatePaginate);
module.exports.logs = mongoose.model('logs', logsSchema, 'logs');

taskSchema.plugin(aggregatePaginate);
module.exports.tasks = mongoose.model('tasks', taskSchema);

module.exports.childTasks = mongoose.model('childTasks', childTasksSchema, 'childTasks');

/**
 * infos : Info grabed from fs.stats
 * * Size (In Bytes) / Time (atime/ctime/mtime) / type (Folder/File)
 * extra : In case i need to store more infos
 * **
 * "extra": {"id_fiche" : "000", "hash" : "000", "profile" : "000"}
 * **
 */


