requirejs.config({
    // baseUrl: 'https://www.leadex-app.com//assets/inspinia/js/lib',
    // baseUrl: "http://localhost:6700/assets/inspinia/js/lib",
    baseUrl: '/assets/js',

    paths: {
        jquery: "jquery-2.1.1",
        // 
        socketio: '/socket.io/socket.io',
        fancybox: 'jquery.fancybox.min',
        // 
        bootstrap: "bootstrap.min",
        metisMenu: "plugins/metisMenu/jquery.metisMenu",
        slimscroll: "plugins/slimscroll/jquery.slimscroll.min",
        //
        pace: 'plugins/pace/pace.min',
        flot: 'plugins/flot/jquery.flot',
        flotTooltip: 'plugins/flot/jquery.flot.tooltip.min',
        flotResize: 'plugins/flot/jquery.flot.resize',
        contextMenu: 'jquery.contextMenu.min',
        uiPosition: 'jquery.ui.position',
        //
        //summernote -------------------------------------------------------------------->
        // codemirror: "plugins/codemirror/codemirror",
        // summernote: "plugins/summernote/summernote",
        // codemirrorjs: "plugins/codemirror/mode/javascript/javascript",
        //end summernote -------------------------------------------------------------------->
        // jqueryForm: "plugins/jqueryForm/jquery.form",
        // validate: "plugins/validate/jquery.validate.min",

        //
        touchspin: 'plugins/touchspin/jquery.bootstrap-touchspin.min',
        duallistbox: 'plugins/dualListbox/jquery.bootstrap-duallistbox',
        inlineConfirmation: 'jquery.inline-confirmation.min',
        confirmButton: 'bootstrap-confirm-button.min',
        tagsinput: 'plugins/bootstrap-tagsinput/bootstrap-tagsinput',
        //
        toastr: "plugins/toastr/toastr.min",
        //dataTable -------------------------------------------------------------------->
        dataTable: "plugins/dataTables/datatables",
        dataTablesbuttons: "plugins/dataTables/dataTables.buttons.min",
        dataTablesbuttonshtml5: "plugins/dataTables/buttons.html5.min",
        dataTablesPrint: "plugins/dataTables/buttons.print.min",
        // dataTablesResponsive: "plugins/dataTables/Responsive-2.2.2/js/dataTables.responsive.min",
        //end dataTable -------------------------------------------------------------------->
        sweetalert: "plugins/sweetalert/sweetalert.min",
        // clipboard: "plugins/clipboard/clipboard.min",
        // inspinia: "../methods/inspinia.min",
        // function: "../methods/app/function",
        // callvalidate: "../methods/callvalidate.min",
        // callplugins: "../methods/callplugins.min"
    },
    shim: {
        bootstrap: {
            deps: ["jquery"]
        },
        // codemirrorjs: {
        //     deps: ["codemirror"]
        // },
        metisMenu: {
            deps: ["jquery"]
        },
        uiPosition: {
            deps: ["jquery"]
        },
        slimscroll: {
            deps: ["jquery"]
        },
        // 

        pace: {
            deps: ["jquery"]
        },
        flot: {
            deps: ["jquery"]
        },
        flotTooltip: {
            deps: ["jquery"]
        },
        flotResize: {
            deps: ["jquery"]
        },
        contextMenu: {
            deps: ["jquery"]
        },
        switchery: {
            deps: ['jquery']
        },
        inlineConfirmation: {
            deps: ['jquery']
        }
        , confirmButton: {
            deps: ['jquery']
        }
        , tagsinput: {
            deps: ['jquery']
        }
        , sweetalert: {
            deps: ['jquery']
        }
        // 
        // 

        , toastr: {
            deps: ['jquery']
        }
        , touchspin: {
            deps: ['jquery']
        }
        , duallistbox: {
            deps: ['jquery', 'bootstrap']
        }
        // 
        // 

        // , dataTablesResponsive: {
        //     deps: ["jquery"]
        // }
        ,
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
        },
        // inspinia: {
        //     deps: ["jquery", "metisMenu", "slimscroll"]
        // }
    },
    map: {
        "*": {
            "datatables.net": "dataTable",
            "datatables.net-buttons": "dataTablesbuttons"
        }
    }
});

requirejs(["base"]);


// Start the main app logic.
// requirejs(
//     [
//         "jquery",
//         "socketio",
//         "bootstrap",
//         "metisMenu",
//         "slimscroll",
//         // "codemirror",
//         // "summernote",
//         // "jqueryForm",
//         // "validate",
//         // "clipboard",
//         // "inspinia"
//     ],
//     function ($, io) { //, toastr, Switchery, datatables, ace


