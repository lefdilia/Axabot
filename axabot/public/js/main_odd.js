/*
 paths: {
        'dependency': 'http://some.domain.dom/path/to/dependency'
    }
*/

/*
require.config({
    shim: {
        bootstrap: {
            deps: [ "jquery" ]
        }
    },
    paths: {
        bootstrap: "//maxcdn.bootstrapcdn.com/bootstrap/3.3.5/js/bootstrap.min"
    }
});
*/

require.config({
    paths: {
        // 'socketio': 'http://my.cross.domain.server.com/socket.io/socket.io',
        'jquery': 'jquery-3.1.1.min',
        'socketio': '/socket.io/socket.io',
        'bootstrap': '/assets/js/bootstrap.min',
        'fancybox': '/assets/js/jquery.fancybox.min',
        'contextMenu': '/assets/js/jquery.contextMenu.min',
        'uiPosition': '/assets/js/jquery.ui.position',
        'metisMenu': '/assets/js/plugins/metisMenu/jquery.metisMenu',
        'slimscroll': '/assets/js/plugins/slimscroll/jquery.slimscroll.min',
        'pace': '/assets/js/plugins/pace/pace.min',
        'flot': '/assets/js/plugins/flot/jquery.flot',
        'flotTooltip': '/assets/js/plugins/flot/jquery.flot.tooltip.min',
        'flotResize': '/assets/js/plugins/flot/jquery.flot.resize',
        // 'datatables': '/assets/js/plugins/dataTables/datatables.min',
        //DataTables core
        // 'datatables': 'https://cdn.datatables.net/v/dt/jszip-2.5.0/dt-1.10.16/b-1.5.1/b-html5-1.5.1/datatables.min',
        // 
        'datatables': '/assets/js/plugins/dataTables/datatables.min',
        'datatables.net': '/assets/js/plugins/dataTables/jquery.dataTables.min',
        'datatables.net-bs': '/assets/js/plugins/dataTables/dataTables.bootstrap.min',
        'datatables.net-buttons': '/assets/js/plugins/dataTables/dataTables.buttons.min',
        // 
        'toastr': '/assets/js/plugins/toastr/toastr.min',
        'touchspin': '/assets/js/plugins/touchspin/jquery.bootstrap-touchspin.min',
        'duallistbox': '/assets/js/plugins/dualListbox/jquery.bootstrap-duallistbox',
        'switchery': '/assets/js/plugins/switchery/switchery',
        'inlineConfirmation': '/assets/js/jquery.inline-confirmation.min',
        'confirmButton': '/assets/js/bootstrap-confirm-button.min',
        'tagsinput': '/assets/js/plugins/bootstrap-tagsinput/bootstrap-tagsinput',
        'sweetalert': '/assets/js/plugins/sweetalert/sweetalert.min',
        'sceditor': '/assets/js/sceditor/jquery.sceditor.min',
        'sceditorBBcode': '/assets/js/sceditor/jquery.sceditor.bbcode.min',
        'bbcode': '/assets/js/sceditor/formats/bbcode',
        'undo': '/assets/js/sceditor/plugins/undo',
        'ace': '/assets/js/srcace-noconflict/ace',
    },
    shim: {
        'bootstrap': {
            deps: ["jquery"]
        }
        // , 'datatables': {
        //     deps: ['jquery', 'bootstrap']
        // }
        // 
        , dataTablesResponsive: {
            deps: ["jquery"]
        },
        dataTablesPrint: {
            deps: ["jquery"]
        },
        dataTablesbuttonshtml5: {
            deps: ["jquery"]
        },
        dataTablesbuttons: {
            deps: ["jquery"]
        },
        dataTable: {
            deps: ["jquery"],
            exports: "DataTable"
        }
        // 
        , 'fancybox': {
            deps: ['jquery']
        }
        , 'contextMenu': {
            deps: ['jquery']
        }
        , 'uiPosition': {
            deps: ['jquery']
        }
        , 'metisMenu': {
            deps: ['jquery']
        }
        , 'slimscroll': {
            deps: ['jquery']
        }
        , 'pace': {
            deps: ['jquery']
        }
        , 'flot': {
            deps: ['jquery']
        }
        , 'flotTooltip': {
            deps: ['jquery', 'flot']
        }
        , 'flotResize': {
            deps: ['jquery', 'flot']
        }
        , 'toastr': {
            deps: ['jquery']
        }
        , 'touchspin': {
            deps: ['jquery']
        }
        , 'duallistbox': {
            deps: ['jquery']
        }
        , 'switchery': {
            deps: ['jquery', 'uiPosition', 'bootstrap']
        }
        , 'inlineConfirmation': {
            deps: ['jquery']
        }
        , 'confirmButton': {
            deps: ['jquery']
        }
        , 'tagsinput': {
            deps: ['jquery']
        }
        , 'sweetalert': {
            deps: ['jquery']
        }
        , 'sceditor': {
            deps: ['jquery']
        }
        , 'sceditorBBcode': {
            deps: ['jquery', 'sceditor']
        }
        , 'bbcode': {
            deps: ['jquery', 'sceditor', 'sceditorBBcode', 'datatables']
        }
        , 'undo': {
            deps: ['jquery', 'sceditor', 'sceditorBBcode', 'datatables']
        }
        , 'ace': {
            deps: ['jquery']
        }
    },
    map: {
        "*": {
            "datatables.net": "dataTable",
            "datatables.net-buttons": "dataTablesbuttons"
        }
    }
});

requirejs(["base"]);


// // define([
// require([
//     "jquery",
//     "socketio",
//     "toastr",
//     "switchery",
//     "datatables",
//     "ace",
//     "contextMenu",
//     "bootstrap",
//     "fancybox",
//     "uiPosition",
//     "metisMenu",
//     "slimscroll",
//     "pace",
//     "flot",
//     "flotTooltip",
//     "flotResize",
//     "touchspin",
//     "duallistbox",
//     "inlineConfirmation",
//     "confirmButton",
//     "tagsinput",
//     "sweetalert",
//     "sceditor",
//     "sceditorBBcode",
//     "bbcode",
//     "undo"
// ], function ($, io, toastr, Switchery, datatables, ace) {
    // ], function () {


