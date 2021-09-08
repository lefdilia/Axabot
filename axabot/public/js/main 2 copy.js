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
        , 'datatables': {
            deps: ['jquery', 'bootstrap']
        }
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
    }
});



// define([
require([
    "jquery",
    "socketio",
    "toastr",
    "switchery",
    "datatables",
    "ace",
    "contextMenu",
    "bootstrap",
    "fancybox",
    "uiPosition",
    "metisMenu",
    "slimscroll",
    "pace",
    "flot",
    "flotTooltip",
    "flotResize",
    "touchspin",
    "duallistbox",
    "inlineConfirmation",
    "confirmButton",
    "tagsinput",
    "sweetalert",
    "sceditor",
    "sceditorBBcode",
    "bbcode",
    "undo"
], function ($, io, toastr, Switchery, datatables, ace) {
    // ], function () {

    $(document).ready(function () {
        var socket = io({
            transports: ['websocket']
        });

        socket.on('reconnect_attempt', function (nms) {
            socket.io.opts.transports = ['websocket'];
        }).on('disconnect', function (reason) {
            socket.connect();
            setTimeout(function () {
                $('#updatests').html('')
            }, 3000)
        });

        socket.on('traffic_monitor', function (data) {
            data = JSON.parse(data);
            $('._txmonit').html("").html(data['upload'])
            $('._rxmonit').html("").html(data['download'])
        })

        socket.on('cpu_monitor', function (data) {
            data = JSON.parse(data);

            $('.sktcpu').html(data.cpu);
            if (parseInt(data.cpu) > 80) {
                $('.sktprog').removeClass('progress-bar-primary').addClass('progress-bar-danger').css({ 'width': `${data.cpu}` });
            } else {
                $('.sktprog').removeClass('progress-bar-danger').addClass('progress-bar-primary').css({ 'width': `${data.cpu}` });
            }
            $('.skturam').html(data.used);
            $('.sktram').html(data.total);
        })

        socket.on('tasks_monitor', function (data) {
            data = JSON.parse(data);
            $('.ts_task[data-status=all]').html(`${data['all'] || 0}`);
            $('.ts_task[data-status=running]').html(`${data['running'] || 0}`);
            $('.ts_task[data-status=pending]').html(`${data['pending'] || 0}`);
            $('.ts_task[data-status=aborted]').html(`${data['aborted'] || 0}`);
            $('.ts_task[data-status=finished]').html(`${data['finished'] || 0}`);
        })

        socket.on('uploadProgress', function (data) {
            data = JSON.parse(data);

            var msTaskId = data.taskId;
            var msjobId = data.jobId;
            var msUploaded = data.uploaded;
            var msFSize = data.fullSize;
            var msFSpeed = data.fspeed;
            var msRemain = data.est;
            var msProgress = data.percent + "%";

            if ($('tr[data-idk=' + msTaskId + ']').length > 0) { //if data-idk

                //Update Square (Start)
                $('tr [_subid=' + msjobId + '] .stsquare').html('<i title="Running" class="fa fa-square text-primary-b"></i>');

                $('tr [_subid=' + msjobId + '] .msuploaded').html(msUploaded);
                $('tr [_subid=' + msjobId + '] .msfsize').html(msFSize);
                $('tr [_subid=' + msjobId + '] .msfspeed').html(msFSpeed);
                $('tr [_subid=' + msjobId + '] .msremain').html(msRemain);
                //progress
                $('tr [_subid=' + msjobId + '] .msDivprogress').width(msProgress);
                $('tr [_subid=' + msjobId + '] .msprogress').html(msProgress);
                //Css
                $('tr [_subid=' + msjobId + ']').attr('style', 'background-color:none');
                $('tr [_subid=' + msjobId + '] .msprogressBar')
                    .removeClass('progress-danger progress-primary')
                    .addClass("progress-striped active");
                $('tr [_subid=' + msjobId + '] .msDivprogress')
                    .removeClass('progress-bar-danger progress-bar-primary')
                    .addClass("progress-bar-success");
            }

        })

        socket.on('abortall', function (data) {

            data = JSON.parse(data);

            var status = data.status;
            var msError = data.error;

            $(".blabel").html(`<center><span class="label label-primary">Finished</span></center>`);
            $(".blabel .mbprogressBar")
                .removeClass('progress-danger progress-success progress-striped active')
                .addClass("progress-primary");

            $(".blabel .mbDivprogress")
                .removeClass('progress-bar-danger progress-bar-primary')
                .addClass("progress-bar-success");
            $(".blabel .tableTask").find('> tbody > tr').css('background-color', '#3e894f');

            if (msError) {
                var bTr = $('tr >').find(".tableTask tr");

                bTr.each(function (i, row) {
                    var msjobId = $(row).attr('_subid');
                    //Update Square (Abort)
                    $('tr [_subid=' + msjobId + '] .stsquare[data-status!="Finished"]').html('<i title="Aborted" class="fa fa-square text-danger"></i>');

                    $('tr [_subid=' + msjobId + '][data-status!="Finished"]').attr('style', 'background-color:#FFE9E9');
                    $('tr [_subid=' + msjobId + '][data-status!="Finished"] .msprogressBar')
                        .removeClass("progress-striped active")
                        .addClass('progress-danger')
                    $('tr [_subid=' + msjobId + '][data-status!="Finished"] .msDivprogress')
                        .removeClass("progress-bar-success progress-bar-primary")
                        .addClass('progress-bar-danger')
                    //Update Error
                    $('tr [_subid=' + msjobId + '][data-status!="Finished"] .msremain').html(`<span class="text-danger Eroka"><span data-toggle="tooltip" data-placement="top" title="${msError}"><b><i class="fa fa-exclamation-triangle"></i></b></span></span>`);
                })
            }

        })

        socket.on('uploadStatus', function (data) {
            data = JSON.parse(data);

            var taskId = data.taskId;
            var jobId = data.jobId;
            var status = data.status || '';
            var mbProgress = data.progress ? parseInt(data.progress) + "%" : "0%";

            if (status == 'pending') {
                const url = new URL(window.location.href);
                if (url && /\/tasks\//ig.test(url.pathname) == true) {
                    var _redir = `${url.pathname}${url.search}`;
                    return window.location.href = _redir;
                }
            }

            //if data-idk
            if ($('tr[data-task=' + taskId + ']').length > 0) {

                $('tr [_subid=' + jobId + ']').attr('data-status', status.ucwords())

                if (status == 'downloading') {

                    $('tr[data-task=' + taskId + '] .blabel').html(`<span class="label label-downloading">Download<i class="loading"></i></span>`);

                    $('tr[data-task=' + taskId + '] .mbprogressBar').removeClass('progress-primary progress-success progress-striped active');

                    $('tr[data-task=' + taskId + '] .mbDivprogress').removeClass('progress-bar-success progress-bar-primary progress-bar-danger');

                } else if (status == 'pending') {

                    $('tr[data-task=' + taskId + '] .blabel').html(`<span class="label label-default">Pending</span>`);

                    $('tr[data-task=' + taskId + '] .mbprogressBar').removeClass('progress-primary progress-success progress-striped active');

                    $('tr[data-task=' + taskId + '] .mbDivprogress').removeClass('progress-bar-success progress-bar-primary progress-bar-danger');

                    if (taskId && jobId == null) {
                        var bTr = $('tr[data-idk=' + taskId + '] >').find(".tableTask tr");

                        bTr.each(function (i, row) {
                            var jobId = $(row).attr('_subid');

                            $('tr [_subid=' + jobId + '] .stsquare[data-status!="Finished"]').html('<i title="Pending" class="fa fa-square text-default"></i>');

                            $('tr [_subid=' + jobId + '][data-status!="Finished"]').attr('style', 'background-color:#FFF');
                            $('tr [_subid=' + jobId + '][data-status!="Finished"] .msprogressBar')
                                .removeClass("progress-striped active progress-danger")

                            $('tr [_subid=' + jobId + '][data-status!="Finished"] .msDivprogress')
                                .removeClass("progress-bar-success progress-bar-primary progress-bar-danger")
                                .addClass('progress-bar-success')

                            $('tr [_subid=' + jobId + '][data-status!="Finished"] .msremain').html(`00:00:00`);

                            $('tr [_subid=' + jobId + '][data-status!="Finished"] .msuploaded').html(`--`);
                            $('tr [_subid=' + jobId + '][data-status!="Finished"] .msfspeed').html(`--/--`);

                            $('tr [_subid=' + jobId + '][data-status!="Finished"] .msDivprogress').width(`0%`);
                            $('tr [_subid=' + jobId + '][data-status!="Finished"] .msprogress').html(`0%`);
                        })
                    }

                }

                else if (status == 'aborted') {

                    $('tr[data-task=' + taskId + '] .blabel').html(`<center><span class="label label-success">Finished</span></center>`);

                    $('tr[data-task=' + taskId + '] .mbprogressBar')
                        .removeClass('progress-danger progress-success progress-striped active')
                        .addClass("progress-primary");

                    $('tr[data-task=' + taskId + '] .mbDivprogress')
                        .removeClass('progress-bar-danger progress-bar-primary')
                        .addClass("progress-bar-success");

                    $('tr[data-task=' + taskId + '] .mbDivprogress').width(mbProgress);
                    $('tr[data-task=' + taskId + '] .mbprogress').html(mbProgress);

                } else if (status == 'finished') {

                    $('tr[data-task=' + taskId + '] .blabel').html(`<center><span class="label label-primary">Finished</span></center>`);

                    $('tr[data-task=' + taskId + '] .mbprogressBar')
                        .removeClass('progress-danger progress-striped active')
                        .addClass("progress-primary");

                    $('tr[data-task=' + taskId + '] .mbDivprogress')
                        .removeClass('progress-bar-danger progress-bar-success')
                        .addClass("progress-bar-primary");

                    $('tr[data-task=' + taskId + '] .mbDivprogress').width(mbProgress);
                    $('tr[data-task=' + taskId + '] .mbprogress').html(mbProgress);

                } else if (status == 'running') {

                    $('tr[data-task=' + taskId + '] .blabel').html(`<center><span class="label label-success">Running</span></center>`);

                    $('tr[data-task=' + taskId + '] .mbprogressBar')
                        .removeClass('progress-danger progress-success progress-striped active')
                        .addClass("progress-striped active");

                    $('tr[data-task=' + taskId + '] .mbDivprogress')
                        .removeClass('progress-bar-danger progress-bar-success')
                        .addClass("progress-bar-success");
                }
            }
        })

        socket.on('uploadEnd', function (data) {
            data = JSON.parse(data);

            var msTaskId = data.taskId;
            var msjobId = data.jobId;
            var msStatus = data.status;

            var msUploaded = data.uploaded;
            var msFSize = data.fullSize;
            var msFSpeed = data.fspeed;
            var msProgress = data.percent + "%";

            var msError = data.error;
            var msLink = data.link;

            if ($('tr[data-idk=' + msTaskId + ']').length > 0 && msStatus == 'aborted') {

                $('tr [_subid=' + msjobId + ']').attr('data-status', 'Aborted');

                $('tr[data-task=' + msTaskId + '] .blabel').html(`<center><span class="label label-primary">Finished</span></center>`);

                $('tr[data-task=' + msTaskId + '] .mbprogressBar')
                    .removeClass('progress-danger progress-success progress-striped active')
                    .addClass("progress-primary");

                $('tr[data-task=' + msTaskId + '] .mbDivprogress')
                    .removeClass('progress-bar-danger progress-bar-success')
                    .addClass("progress-bar-primary");

                if (msTaskId && msjobId == null) {
                    var bTr = $('tr[data-idk=' + msTaskId + '] >').find(".tableTask tr");

                    bTr.each(function (i, row) {
                        var msjobId = $(row).attr('_subid');
                        $('tr [_subid=' + msjobId + '] .stsquare[data-status!="Finished"]').html('<i title="Aborted" class="fa fa-square text-danger"></i>');

                        $('tr [_subid=' + msjobId + '][data-status!="Finished"]').attr('style', 'background-color:#FFE9E9');
                        $('tr [_subid=' + msjobId + '][data-status!="Finished"] .msprogressBar')
                            .removeClass("progress-striped active")
                            .addClass('progress-danger')
                        $('tr [_subid=' + msjobId + '][data-status!="Finished"] .msDivprogress')
                            .removeClass("progress-bar-success progress-bar-primary")
                            .addClass('progress-bar-danger')
                        $('tr [_subid=' + msjobId + '][data-status!="Finished"] .msremain').html(`<span class="text-danger Eroka"><span data-toggle="tooltip" data-placement="top" title="${msError}"><b><i class="fa fa-exclamation-triangle"></i></b></span></span>`);
                    })
                }

                $('tr [_subid=' + msjobId + '] .stsquare').html('<i title="Aborted" class="fa fa-square text-danger"></i>');

                $('tr [_subid=' + msjobId + ']').attr('style', 'background-color:#FFE9E9');
                $('tr [_subid=' + msjobId + '] .msprogressBar')
                    .removeClass("progress-striped active")
                    .addClass('progress-danger')
                $('tr [_subid=' + msjobId + '] .msDivprogress')
                    .removeClass("progress-bar-success progress-bar-primary")
                    .addClass('progress-bar-danger')

                $('tr [_subid=' + msjobId + '] .msremain').html(`<span class="text-danger Eroka"><span data-toggle="tooltip" data-placement="top" title="${msError}"><b><i class="fa fa-exclamation-triangle"></i></b></span></span>`);

            } else if ($('tr[data-idk=' + msTaskId + ']').length > 0 && msStatus == 'finished') {

                $('tr [_subid=' + msjobId + ']').attr('data-status', 'Finished');

                $('tr [_subid=' + msjobId + '] .stsquare')
                    .attr('data-status', 'Finished')
                    .html('<i title="Finished" class="fa fa-square text-success-b"></i>');

                $('tr [_subid=' + msjobId + '] .msuploaded').html(msUploaded);
                $('tr [_subid=' + msjobId + '] .msfsize').html(msFSize);
                $('tr [_subid=' + msjobId + '] .msfspeed').html(msFSpeed);

                $('tr [_subid=' + msjobId + '] .msDivprogress').width(msProgress);
                $('tr [_subid=' + msjobId + '] .msprogress').html(msProgress);

                $('tr [_subid=' + msjobId + ']').attr('style', 'background-color:#EAF9E3');
                $('tr [_subid=' + msjobId + '] .msprogressBar')
                    .removeClass("progress-striped active")
                    .addClass('progress-primary')
                $('tr [_subid=' + msjobId + '] .msDivprogress')
                    .removeClass("progress-bar-success progress-bar-danger")
                    .addClass('progress-bar-primary')

                $('tr [_subid=' + msjobId + '] .msremain').html(`<a class="Eroka" style="color:#3e894f;" target="_blank" href="${msLink}"><span data-toggle="tooltip" data-placement="top" data-original-title="${msLink}"><b><i class="fa fa-check-circle"></i></b></span></a>`);
            }
        })
    })

    $(document).ready(function () {
        // 
        String.prototype.ucwords = function () {
            str = this.trim();
            return str.replace(/(^([a-zA-Z\p{M}]))|([ -][a-zA-Z\p{M}])/g, function (s) {
                return s.toUpperCase();
            });
        };


        $('body').tooltip({
            selector: ".Eroka [data-toggle=tooltip]"
        });

        $(document).on('click', '.bs-dropdown-to-select-group .dropdown-menu li', function (e) {
            var $target = $(e.currentTarget);

            var Kvalue = $target.attr('data-value');
            var Tvalue = $target.text();

            $target.closest('.bs-dropdown-to-select-group')
                .find('[data-bind="bs-drp-sel-value"]').val(Kvalue)
                .end()
                .children('.dropdown-toggle').dropdown('toggle');
            $target.closest('.bs-dropdown-to-select-group')
                .find('[data-bind="bs-drp-sel-label"]').text(Tvalue);
            return false;
        });

        $('.dual_select').bootstrapDualListbox({
            selectorMinimalHeight: 220,
            showFilterInputs: false,
            infoText: false,
            moveAllLabel: 'Select All',
            removeAllLabel: 'Remove All',
        });

        $(".nmspin").TouchSpin({
            buttondown_class: 'btn btn-success',
            buttonup_class: 'btn btn-success'
        });

        $(".nmspin2").TouchSpin({
            min: 0,
            max: 999,
            postfix: 'MB',
            buttondown_class: 'btn btn-success',
            buttonup_class: 'btn btn-success'
        });

        $(".nmspin3").TouchSpin({
            min: 0,
            max: 5,
            postfix: 'Times',
            buttondown_class: 'btn btn-success',
            buttonup_class: 'btn btn-success'
        });

        $(".nmspin4").TouchSpin({
            min: 5,
            max: 60,
            buttondown_class: 'btn btn-success',
            buttonup_class: 'btn btn-success'
        });

        $(".nmspin5").TouchSpin({
            min: 0,
            max: 9999999999,
            buttondown_class: 'btn btn-success',
            buttonup_class: 'btn btn-success'
        });

        var elems = document.querySelectorAll('.js-switch');
        if (elems.length > 0) {
            for (var i = 0; i < elems.length; i++) {
                var switchery = new Switchery(elems[i], {
                    color: '#1c84c6'
                });
            }
        }

        $('.tagsinput').tagsinput({
            tagClass: 'label label-success',
            freeInput: true,
            trimValue: true
        });

        $('.tagsinput2').tagsinput({
            tagClass: 'label label-primary',
            freeInput: true,
            trimValue: true
        });

        $(document).ajaxComplete(function () {
            $('.tagsinput3').tagsinput({
                tagClass: 'label label-success',
                freeInput: true,
                trimValue: true
            });
            $('.tagsinput4').tagsinput({
                tagClass: 'label label-danger',
                freeInput: true,
                trimValue: true
            });
        });

        toastr.options = {
            "closeButton": false,
            "debug": false,
            "progressBar": true,
            "preventDuplicates": false,
            "positionClass": "toast-bottom-right",
            "onclick": null,
            "showDuration": 300,
            "hideDuration": 300,
            "timeOut": 1100,
            "extendedTimeOut": 900,
            "showEasing": "swing",
            "hideEasing": "linear",
            "showMethod": "fadeIn",
            "hideMethod": "fadeOut"
        }


        var extensionsMap = {
            ".zip": "icon_zip",
            ".gz": "icon_zip",
            ".bz2": "icon_zip",
            ".xz": "icon_zip",
            ".rar": "icon_rar",
            ".tar": "icon_zip",
            ".tgz": "icon_zip",
            ".tbz2": "icon_zip",
            ".z": "icon_zip",
            ".7z": "icon_zip",
            ".mp3": "icon_audio",
            ".flac": "icon_audio",
            ".cs": "default",
            ".c++": "default",
            ".cpp": "default",
            ".css": "icon_css",
            ".js": "icon_js",
            ".html": "html_icon",
            ".htm": "html_icon",
            ".iso": "icon_iso",
            ".xls": "excel_icon",
            ".xlsx": "excel_icon",
            ".png": "icon_image",
            ".jpg": "icon_image",
            ".jpeg": "icon_image",
            ".gif": "icon_image",
            ".mpeg": "icon_mkv",
            ".mkv": "icon_mkv",
            ".avi": "icon_mkv",
            ".mp4": "icon_mkv",
            ".pdf": "icon_pdf",
            ".ppt": "default",
            ".pptx": "default",
            ".txt": "icon_txt",
            ".log": "default",
            ".doc": "word_icon",
            ".docx": "word_icon",
            ".nfo": "icon_nfo",
            ".pkg": "icon_pkg",
            ".dmg": "icon_pkg",
            ".torrent": "icon_torrent"
        };

        function getFileIcon(ext) {
            return (ext && extensionsMap[ext.toLowerCase()]) || 'default';
        }

        // $.fn.dataTableExt.oApi.fnFilterClear = function (oSettings) {
        //     var i, iLen;

        //     /* Remove global filter */
        //     oSettings.oPreviousSearch.sSearch = "";

        //     /* Remove the text of the global filter in the input boxes */
        //     if (typeof oSettings.aanFeatures.f != 'undefined') {
        //         var n = oSettings.aanFeatures.f;
        //         for (i = 0, iLen = n.length; i < iLen; i++) {
        //             $('input', n[i]).val('');
        //         }
        //     }

        //     /* Remove the search text for the column filters - NOTE - if you have input boxes for these
        //      * filters, these will need to be reset
        //      */
        //     for (i = 0, iLen = oSettings.aoPreSearchCols.length; i < iLen; i++) {
        //         oSettings.aoPreSearchCols[i].sSearch = "";
        //     }

        //     /* Redraw */
        //     oSettings.oApi._fnReDraw(oSettings);
        // };

        function sdtruncate(fullStr, strLen) {
            if (!fullStr) return;
            if (fullStr.length <= strLen) return fullStr;

            var separator = '...';

            var sepLen = separator.length,
                charsToShow = strLen - sepLen,
                frontChars = Math.ceil(charsToShow / 2),
                backChars = Math.floor(charsToShow / 2);

            var _asm = fullStr.substr(0, frontChars) + separator + fullStr.substr(fullStr.length - backChars);

            return _asm;
        }



        var currentPath = null;
        var options = {
            "language": {
                "emptyTable": " ",
                "zeroRecords": " "
            },
            "responsive": true,
            "bProcessing": true,
            "bServerSide": false,
            "bPaginate": false,
            "bAutoWidth": true,
            "bSort": false,
            "dom": 'lTgtp',
            "fnCreatedRow": function (nRow, aData, iDataIndex) {
                if (!aData.IsDirectory) return;
                var path = encodeURIComponent(aData.Path);

                table.fnFilterClear();
                $(nRow).find('td:eq( 1 ) a').bind("click", function (e) {
                    $.get('/files/list/?path=' + path).then(function (data) {
                        table.fnClearTable();
                        if (Array.isArray(data) && data.length > 0) table.fnAddData(data, true);
                        currentPath = decodeURIComponent(path);
                    })
                    e.preventDefault();
                });
            },
            "aoColumns": [{
                "sWidth": "1px",
                "render": function (data, type, row, meta) {

                    if (!row.internal) {
                        return '<div class="checkbox checkbox-primary"><input data-path="' + row.Path + '" type="checkbox" name="input[]"><label></label></div>';
                    } else {
                        return '';
                    }

                }
            }, {
                "sTitle": "",
                "mData": null,
                "bSortable": false,
                "sClass": "issue-info",
                "render": function (data, type, row, meta) {
                    var icon = data && data['internal'] ? 'folder_int.png' : 'folder_icon.png';

                    var eveimg = data && data['eveimg'] ? `<span class="pull-right">&nbsp;&nbsp;<a href="/thumbnails/${data.Name}" data-fancybox="images"> <i class="fa fa-eye"></i></a></span>` : ``;

                    var evevid_ = data && data['evevid_'] ? `<span class="pull-right"><a href="/downloads/${row.Path}"> <i class="fa fa-download"></i></a></span>` : ``;

                    var evevid = data && data['evevid'] ? `<span class="pull-right"><a href="/samples/${data.Name}"> <i class="fa fa-download"></i></a></span>` : ``;


                    if (data.IsDirectory) {
                        return `<a class='evit' href='javascript:void(0);' target='_blank'><img src='/assets/img/ext/${icon}' height="17" width="17">&nbsp;${data && data['internal'] ? '.' : ''}${data.Name}</a><small>${data.time['ctime']}</small>`;
                    } else {

                        if (row['eveimg'] || row['evevid'] || row['evetxt']) {
                            return `<span> <img src='/assets/img/ext/${getFileIcon(data.Ext)}.png'>&nbsp; ${sdtruncate(data.Name, 80)} </span><br><small>${data.time['ctime']}</small>`;
                        } else {
                            return `<span> <img src='/assets/img/ext/${getFileIcon(data.Ext)}.png'>&nbsp; ${sdtruncate(data.Name, 80)} ${eveimg}${evevid}${evevid_}</span><br><small>${data.time['ctime']}</small>`;
                        }
                    }
                }
            }, {
                "render": function (data, type, row, meta) {
                    return ''
                }
            }, {
                "sWidth": "10%",
                "render": function (data, type, row, meta) {
                    if (row.IsDirectory) {
                        return '–';
                    } else {
                        return row.Size;
                    }
                }
            }, {
                "sWidth": "16%",
                "sClass": "text-right",
                "render": function (data, type, row, meta) {

                    var _mret = "";
                    var _archive = '&nbsp;<a data-path="' + row.Path + '" class="archiveme "> <i class="fa fa-archive"></i></a>';

                    var _manager = '<a data-path="' + row.Path + '" data-title="' + row.Path + '" class="addtasktr btn btn-success btn-xs" data-toggle="modal" data-target="#addtasktr"> <i class="fa fa-plus"></i> Manage</a>';


                    var eveimg = row && row['eveimg'] ? `<span class="pull-right">&nbsp;&nbsp;<a href="/thumbnails/${row.Name}" data-fancybox="images"> <i class="fa fa-eye"></i></a></span>` : ``;

                    var evevid_ = row && row['evevid_'] ? `<span class="pull-right"><a href="/downloads/${row.Path}"> <i class="fa fa-download"></i></a></span>` : ``;

                    var evevid = row && row['evevid'] ? `<span class="pull-right"><a href="/samples/${row.Name}"> <i class="fa fa-download"></i></a></span>` : ``;

                    var evetxt = row && row['evetxt'] && !row.IsDirectory ? `<a target="_blank" href="/view/${row.Path}"> <i class="fa fa-chain-broken"></i></a> &nbsp; ` : ``;

                    if (row && row['internal']) {
                        _mret = '<center>–</center>';
                        return _mret;
                    } else {
                        if (row['eveimg'] || row['evevid'] || row['evetxt']) {
                            _mret = `<span> ${eveimg}${evevid}${evevid_}${evetxt}</span>`;
                        } else if (row['zip_folder']) {
                            _mret = `${_manager}`;
                        } else {
                            _mret = `${_manager} ${_archive}`;
                        }

                        return _mret;
                    }

                }
            }]
        };


        $(document).on('click', '.archiveme', function (e) {
            e.preventDefault();
            var btn = $(this);
            btn.prop('disabled', true).addClass('loading').html('')
            var _dpath = btn.data('path');
            _dpath = _dpath ? encodeURIComponent(_dpath) : '';
            $.post("/files/archiveme", {
                _dpath: _dpath
            }).done(function (data) {
                btn.prop('disabled', false).removeClass('loading').html('<i class="fa fa-archive"></i>')
                toastr.success(`File Compressed successfully.`);
            }).fail(function (err) {
                btn.removeClass('disabled');
                try { toastr.error(err.responseJSON['message']); } catch (e) { }
            })

        })

        if ($('.linksholder').length > 0) {

            console.log('found linksholder ')

            var table = $(".linksholder").dataTable(options);

            $.get('/files/list/').then(function (data) {
                console.log('im here...')
                table.fnClearTable();
                table.fnAddData(data);
            });



            $('#searchfilebox').keyup(function () {
                var valik = $(this).val();
                table.fnFilter(valik);
            })

            pathList = [];
            $('.linksholder').on('draw.dt', function () {
                pathList.map(function (pathN) {
                    return $('input[type=checkbox][data-path="' + pathN + '"]').prop('checked', true);
                })

                $('input[type=checkbox]').on('change', function (e) {
                    e.preventDefault();
                    var isChecked = $(this).is(':checked');
                    var ikpath = $(this).data('path');
                    if (isChecked == true) {
                        $("input[type=checkbox]:checked").map(function () {
                            pathList.push($(this).data('path'));
                            return;
                        })
                    } else {
                        pathList = pathList.filter(e => e !== ikpath)
                    }
                    pathList = [...new Set(pathList)];
                    $('.countcheck').html(pathList.length);
                })
            })

            $(".refresh").bind("click", function (e) {
                e.preventDefault()
                path = currentPath ? encodeURIComponent(currentPath) : '';
                $.get('/files/list/?path=' + path).then(function (data) {
                    table.fnClearTable();
                    table.fnAddData(data);
                });

                pathList = [];
                $('.countcheck').html(0);
            })

            $(".up").bind("click", function (e) {
                e.preventDefault()
                $('#searchfilebox').val("");
                var idx = currentPath ? currentPath.lastIndexOf("/") : '';
                var path = currentPath && idx > -1 ? currentPath.substr(0, idx) : '';
                path = path ? encodeURIComponent(path) : '';

                $.get('/files/list/?path=' + path).then(function (data) {
                    table.fnClearTable();
                    table.fnAddData(data);
                    currentPath = decodeURIComponent(path);
                });
            });

            $(document).on('click', '.ckall', function (e) {
                $('.countcheck').html(0);
                pathList = [];
                //
                var _checkboxes = $('.linksholder').find("input:checkbox");
                _checkboxes.prop("checked", !_checkboxes.prop("checked"));

                $(_checkboxes).map(function () {
                    var _ipath = $(this).data('path');
                    if ($(this).is(':checked')) {
                        pathList.push(_ipath);
                        return;
                    } else {
                        pathList = pathList.filter(e => e !== _ipath)
                        return;
                    }

                })

                pathList = [...new Set(pathList)];
                $('.countcheck').html(pathList.length);
            })


            $(document).on('click', '.linksholder td:nth-child(1)', function (e) {
                if ($(e.target).hasClass('evit')) return;

                var _mainti = $(this).closest("tr").find("input:checkbox");
                var chk = _mainti.get(0);

                if (!chk) return;

                if (e.target != chk) {
                    chk.checked = !chk.checked;
                }

                var ikpath = _mainti.data('path');

                if (chk.checked == true) {
                    $("input[type=checkbox]:checked").map(function () {
                        pathList.push($(this).data('path'));
                        return;
                    })
                } else {
                    pathList = pathList.filter(e => e !== ikpath)
                }
                pathList = [...new Set(pathList)];
                $('.countcheck').html(pathList.length);
            })


            $('.trashfiles').kickme({
                confirm: '<a style="color: #FFFFFF;" class="btn btn-danger btn-sm confirm-yes"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i> Are you sure ?</a>',
                cancel: '<a class="btn btn-default btn-sm confirm-no"><i class="fa fa-times" aria-hidden="true"></i> Cancel</a>',
                separator: "&nbsp;",
                expiresIn: 4,
                confirmCallback: function ($button) {
                    $.post('/files/trashfiles', {
                        arrpath: pathList
                    }).done(function (data) {
                        pathList = [];
                        $("input[type=checkbox]:checked").map(function () {
                            return $(this).prop('checked', false)
                        })
                        $('.countcheck').html('0');
                        $(".refresh").trigger('click');
                        toastr.success(`${data._length} Files Removed.`);
                    }).fail(function (err) {
                        try { toastr.error(err.responseJSON['message']); } catch (e) { }
                    })
                }
            });

        }

        $('.incofd').btsConfirmButton({
            msg: '<i class="fa fa-trash"></i> Clean Rtorrent Incomplete Folder ?',
            classname: 'btn-danger',
            timeout: 2000
        }, function (e) {
            $.post('/files/cleanfd', {}).done(function (data) {
                var url = "/settings/services/";
                toastr.options.onclick = function () {
                    window.location.href = url;
                }
                toastr.options.onHidden = function () {
                    window.location.href = url;
                }
                toastr.success(data.message);
            }).fail(function (err) {
                try { toastr.error(err.responseJSON['message']); } catch (e) { }
            })
        })


        $('.exportlog').btsConfirmButton({
            msg: '<i class="fa fa-download"></i> Export this Log ?',
            classname: 'btn-primary',
            timeout: 2000
        }, function (e) {
            var _id = $(e.target).data('id');
            var _tid = $(e.target).data('tid');
            if (!_id || !_tid) return toastr.error('Log ID is Missing.');
            $.post('/logs/export_log/', {
                _tid: _tid
            }).done(function (data) {
                toastr.success(data.message);
            }).fail(function (err) {
                try { toastr.error(err.responseJSON['message']); } catch (e) { }
            })
        })


        $('.trashtlog').btsConfirmButton({
            msg: "Sure ?",
            classname: 'btn-danger',
            timeout: 2000
        }, function (e) {
            var _id = $(e.target).data('id');
            if (!_id) return toastr.error('Log ID is Missing.');
            $.post('/logs/remove_log/', {
                _id: _id
            }).done(function (data) {
                $(e.target).parents(".faq-item").fadeOut("fast").next('hr').fadeOut("fast");
                toastr.success(data.message);
            }).fail(function (err) {
                try { toastr.error(err.responseJSON['message']); } catch (e) { }
            })
        });


        $('.repostlog').kickme({
            confirm: '<label class="btn btn-success btn-xs confirm-yes"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i> Are you sure ?</label>',
            cancel: '',
            separator: "&nbsp;",
            expiresIn: 3,
            confirmCallback: function ($button) {
                var _id = $button.closest('button').data('id');
                var _tid = $button.closest('button').data('tid');

                $($button).prop('disabled', true);

                $.post('/logs/post_api/', {
                    _tid: _tid,
                }).done(function (data) {
                    $($button).prop('disabled', false);
                    $('[data-pi=' + _id + ']').html(`<span class="text-navyx"><i class="fa fa-check "></i> <b>Posted</b></span>`);
                    toastr.success(data.message);
                }).fail(function (err) {
                    $($button).prop('disabled', false);
                    $('[data-pi=' + _id + ']').html(`<span class="text-danger"><i class="fa fa-times"></i> <b>Posted</b></span>`);
                    try { toastr.error(err.responseJSON['message']); } catch (e) { }
                })
            }
        });

    })

    $(document).on('click', '.addtask', function () {
        var btn = $(this);
        btn.addClass('disabled');
        var path = btn.data('path');
        $.post("/tasks/add", {
            path: path
        }).done(function (data) {
            btn.removeClass('disabled').closest('tr').find('input[type=checkbox]').prop('checked', false);
            pathList = pathList.filter(e => e !== path);
            $('.countcheck').html(pathList.length);
            toastr.success('Task created successfully.');
        }).fail(function (err) {
            btn.removeClass('disabled');
            try { toastr.error(err.responseJSON['message']); } catch (e) { }
        })
    })

    $(document).ready(function () {

        $("#profiles_form").submit(function (e) {
            e.preventDefault();

            var btn = $(this).find(":submit");
            btn.addClass('disabled');

            var dataString = $(this).serialize();

            $.post('/settings/profiles/', dataString).done(function (data) {
                btn.removeClass('disabled');

                // var url = "/settings/profiles/";
                // toastr.options.onclick = function () {
                //     window.location.href = url;
                // }
                // toastr.options.onHidden = function () {
                //     window.location.href = url;
                // }

                toastr.success(data.message);

            }).fail(function (err) {
                btn.removeClass('disabled');
                try { toastr.error(err.responseJSON['message']); } catch (e) { }
            })
        })



        $('select[name="server"]').on('change', function () {
            var _info = $(this).find(':selected').data('info');
            $("#serverinfo").html(_info);
        })


        $("#hosts_form").submit(function (e) {
            e.preventDefault();

            var btn = $(this).find(":submit");
            btn.addClass('disabled');

            var dataString = $(this).serialize();

            $.post('/settings/accounts/', dataString).done(function (data) {
                btn.removeClass('disabled');

                var url = "/settings/hosts/";
                toastr.options.onclick = function () {
                    window.location.href = url;
                }
                toastr.options.onHidden = function () {
                    window.location.href = url;
                }

                toastr.success(data.message);
            }).fail(function (err) {
                btn.removeClass('disabled');
                try { toastr.error(err.responseJSON['message']); } catch (e) { }
            })
        })

        $("#pref_save").click(function (e) {
            e.preventDefault();

            var btn = $(this);

            btn.addClass('disabled').prop('disabled', true).html('Saving <span class="loading"></span>');

            var dataString = $("#preferences_form").serialize();

            $.post('/settings/preferences/', dataString).done(function (data) {
                btn.removeClass('disabled').prop('disabled', false).html('Save changes');

                var url = "/settings/preferences/";
                toastr.options.onclick = function () {
                    window.location.href = url;
                }
                toastr.options.onHidden = function () {
                    window.location.href = url;
                }

                toastr.success(data.message);
            }).fail(function (err) {
                btn.removeClass('disabled').prop('disabled', false).html('Save changes');
                try { toastr.error(err.responseJSON['message']); } catch (e) { }
            })
        })

        function changeSwitcheryState(el, value) {
            if ($(el).is(':checked') != value) {
                $(el).trigger("click")
            }
        }

        $('.editaccount').on('click', function () {
            var _id = $(this).closest('tr').attr('id');

            $.post('/settings/getaccount/', {
                _id: _id
            }).done(function (info) {
                var username = info.data.username || '';
                var password = info.data.password || '';
                var useaccount = info.data.use_account || false;
                var api = info.data.api || '';

                var host = info.data.host || '';

                $('select[name="server"]').val(host);
                $('input[name="username"]').val(username);
                $('input[name="password"]').val(password);
                $('input[name="api"]').val(api);
                $("input[name='useac']").prop('checked', useaccount)

                $('select[name="server"]').change();
            })
        })


        $('.editfeed').on('click', function () {
            var _id = $(this).closest('tr').attr('id');

            $('.nav-tabs li').removeClass('active');
            $('#fr_newfeed').addClass('active');
            $('#lisfeed').removeClass('active');
            $('#newfeed').addClass('active');

            $.post('/torrents/getfeed/', {
                _id: _id
            }).done(function (info) {
                if (!info.data) return false;

                var name = info.data.name || '';
                var type = info.data.type || '';
                var link = info.data.link || '';

                var extra = info.data.extra || {};

                var fd_incl = extra.feed_include ? extra.feed_include.map(function (itm) {
                    return itm.replace(/\\/g, "");
                }) : [];

                var fd_excl = extra.feed_exclude ? extra.feed_exclude.map(function (itm) {
                    return itm.replace(/\\/g, "");
                }) : [];

                var fd_auto_dl = extra.feed_auto_download || false;
                var fd_auto_dt = extra.feed_auto_data || false;
                var fd_profile = extra.upload_profile || '';
                var fd_ping_interval = extra.ping_interval || 5;
                var fd_auto_ping = extra.feed_auto_ping || false;

                changeSwitcheryState($('input[name=feed_status]'), Boolean(info.data.status));

                var fd_c_char = extra.feed_clear_chars;
                var fd_re_wrds = extra.feed_words_remove ? extra.feed_words_remove.map(function (itm) {
                    return itm.replace(/\\/g, "");
                }) : [];

                $('input[name="feedname"]').val(name);
                $('select[name="feedtype"]').val(type);
                $('input[name="feedurl"]').val(link);

                $('input[name="feed_include"]').tagsinput('removeAll');
                $.each(fd_incl, function (i, tag) {
                    $('input[name="feed_include"]').tagsinput('add', tag);
                })

                $('input[name="feed_exclude"]').tagsinput('removeAll');
                $.each(fd_excl, function (i, tag) {
                    $('input[name="feed_exclude"]').tagsinput('add', tag);
                })

                $('input[name="feed_words_remove"]').tagsinput('removeAll');
                $.each(fd_re_wrds, function (i, tag) {
                    $('input[name="feed_words_remove"]').tagsinput('add', tag);
                })

                if (Boolean(fd_auto_dl) == true) {
                    $('select[name=upload_profile]').prop('disabled', false)
                } else {
                    $('select[name=upload_profile]').prop('disabled', true);
                }

                $('select[name="upload_profile"]').val(fd_profile);
                $('input[name="ping_interval"]').val(fd_ping_interval);

                $('input[name="feed_auto_download"]').prop('checked', Boolean(fd_auto_dl));
                $('input[name="feed_auto_data"]').prop('checked', Boolean(fd_auto_dt));
                $('input[name="feed_auto_ping"]').prop('checked', Boolean(fd_auto_ping));

                $('input[name="feed_clear_chars"]').prop('checked', Boolean(fd_c_char));

            })
        })

        changeSwitcheryState($('input[name=prefix_filename]'), false);
        $('input[name=prefix_filename]').on('change', function () {
            if ($(this).is(':checked') == true) {
                $('#prefix_str').fadeIn();
            } else {
                $('#prefix_str').fadeOut();
            }
        })

        changeSwitcheryState($('input[name=forced_auto_post]'), false);
        $('input[name=auto_post]').on('change', function () {
            if ($(this).is(':checked') == true) {
                $('#forced_auto_post').fadeIn();
            } else {
                $('#forced_auto_post').fadeOut();
            }
        })



        $('.editprofile').on('click', function () {
            var _id = $(this).closest('tr').attr('id');

            $.post('/settings/getprofile/', {
                _id: _id
            }).done(function (info) {

                var indata = info.data;
                var defaultProfile = indata.status;

                var s = indata.settings;

                var profile_name = s.profileName;
                var randomFilename = s.randomFilename;

                var stemplates = s.stemplates;
                var stapi = s.stapi;

                var prefixFilename = s.prefixFilename;
                var prefixFilenameString = s.prefixString;

                var startUploadAuto = s.startUploadAuto;
                var autopost = s.autoPost;
                var forcedAutoPost = s.forcedAutoPost || false;

                var rarEnabled = s.rarEnabled;
                var rar_password = s.rarPassword || '';
                var rar_comment = s.rarComment || '';
                var rarSplitSize = s.rarSplitSize || 0;

                var rarEqualParts = s.rarEqualParts;

                var uploadTopicImage = s.uploadTopicImage;
                var sampleEnabled = s.sampleEnabled;
                var uploadNfoImage = s.uploadNfoImage;
                var uploadThumbImage = s.uploadThumbImage;

                var nfoProcess = s.nfoProcess;
                var mediaFiles = s.mediaFiles;

                var thumbnailEnabled = s.thumbnailEnabled;
                var thumbnailCols = s.thumbnailCols;
                var thumbnailRows = s.thumbnailRows;
                var thumbnailText = s.thumbnailText;

                var uploadTries = s.uploadTries;

                var dTvCra = s.defaultCrawlers['tv'];
                var dMoviesCra = s.defaultCrawlers['movies'];

                //Tvs
                $('.dftv').removeClass('active').addClass('disabled');
                $('button.dftv[data-source="' + dTvCra + '"]').addClass('active').removeClass('disabled');
                $('input[name="default_tv_cr"]').val(dTvCra ? dTvCra : '');

                //Movies
                $('.dfmv').removeClass('active').addClass('disabled');
                $('button.dfmv[data-source="' + dMoviesCra + '"]').addClass('active').removeClass('disabled');
                $('input[name="default_movie_cr"]').val(dMoviesCra ? dMoviesCra : '');

                $('input[name="profile_name"]').val(profile_name);

                changeSwitcheryState($('input[name="default_profile"]'), defaultProfile)
                changeSwitcheryState($('input[name="random_filename"]'), randomFilename)

                changeSwitcheryState($('input[name="prefix_filename"]'), prefixFilename)
                $('input[name=prefix_str]').val(prefixFilenameString)

                changeSwitcheryState($('input[name="start_upload_auto"]'), startUploadAuto)
                changeSwitcheryState($('input[name="auto_post"]'), autopost)
                changeSwitcheryState($('input[name="forced_auto_post"]'), forcedAutoPost)

                //Updated-fields
                changeSwitcheryState($('input[name="upload_t_image"]'), uploadTopicImage)
                changeSwitcheryState($('input[name="sample_enabled"]'), sampleEnabled)

                changeSwitcheryState($('input[name="upload_nfo_image"]'), uploadNfoImage)
                changeSwitcheryState($('input[name="upload_thumb_image"]'), uploadThumbImage)

                //Rar
                changeSwitcheryState($('input[name="rar_enabled"]'), rarEnabled)
                $('input[name="rar_password"]').val(rar_password);
                $('textarea[name="rar_comment"]').val(rar_comment);
                $('input[name="rar_split"]').val(rarSplitSize);
                $('input[name="rar_eqpart"]').prop('checked', rarEqualParts);

                //nfo
                changeSwitcheryState($('input[name="nfo_process"]'), nfoProcess)
                changeSwitcheryState($('input[name="media_files"]'), mediaFiles)

                //thumbnail
                changeSwitcheryState($('input[name="thumbnail_enabled"]'), thumbnailEnabled)
                $('input[name="mtncols"]').val(thumbnailCols);
                $('input[name="mtnrows"]').val(thumbnailRows);
                $('input[name="mtntext"]').val(thumbnailText);

                //upload_tries
                $('input[name="upload_tries"]').val(uploadTries);

                //Template
                $('#stemplates').val(stemplates);
                $('#stapi').val(stapi);

                //Fix Checked values on dual select
                //Hosts 
                var hosts = s.hosts
                $('[name=hosts] option').prop('selected', false);
                $.each(hosts, function (i, e) {
                    $('[name=hosts] option[value="' + e + '"]').prop('selected', true);
                })
                // Shortners
                var shortners = s.shortners
                $('[name=shortners] option').prop('selected', false);
                $.each(shortners, function (i, e) {
                    $('[name=shortners] option[value="' + e + '"]').prop('selected', true);
                })
                // himages
                var hostImages = s.hostImages

                $('[name=host_images] option').prop('selected', false);
                $.each(hostImages, function (i, e) {
                    $('[name=host_images] option[value="' + e + '"]').prop('selected', true);
                })
                // himages
                var hostSample = s.hostSample
                $('[name=host_sample] option').prop('selected', false);
                $.each(hostSample, function (i, e) {
                    $('[name=host_sample] option[value="' + e + '"]').prop('selected', true);
                })
                $('.dual_select').bootstrapDualListbox('refresh', true);
            }).fail(function (err) {
                try { toastr.error(err.responseJSON['message']); } catch (e) { }
            })
        })

        //Change thumbnail switch
        $('.nmspin').change(function (e) {
            var zr1 = $('input[name="mtncols"]').val();
            var zr2 = $('input[name="mtnrows"]').val();
            if (zr1 == 0 || zr2 == 0) {
                changeSwitcheryState($('input[name="thumbnail_enabled"]'), false)
            } else {
                changeSwitcheryState($('input[name="thumbnail_enabled"]'), true)
            }
        })

        //Change rar switch /rar_enabled
        $('.rarvi').on('input', function (e) {
            var zr1 = $('input[name="rar_password"]').val().trim();
            var zr2 = $('input[name="rar_comment"]').val().trim();
            var zr3 = $('input[name="rar_split"]').val().trim();
            if (zr1 == "" && zr2 == "" && zr3 == 0) {
                changeSwitcheryState($('input[name="rar_enabled"]'), false);
            } else {
                changeSwitcheryState($('input[name="rar_enabled"]'), true);
            }
        })

        $('input[name="rar_split"]').on("change", function (e) {
            var zr1 = $('input[name="rar_password"]').val().trim();
            var zr2 = $('input[name="rar_comment"]').val().trim();
            var zr3 = $('input[name="rar_split"]').val().trim();
            if (zr3 == 0 && zr1 == "" && zr2 == "") {
                changeSwitcheryState($('input[name="rar_enabled"]'), false);
            } else {
                changeSwitcheryState($('input[name="rar_enabled"]'), true);
            }
        })


        //Clear feed Form
        $('input[name="feed_auto_data"]').prop('checked', false);
        $('input[name="feed_auto_download"]').prop('checked', false);
        $('input[name="feedname"]').val('');
        $('input[name="feedurl"]').val('');
        $('input[name="feedtype2"]').val('');
        $('input[name="feed_exclude"]').tagsinput('removeAll');
        $('input[name="feed_include"]').tagsinput('removeAll');

        $('input[name="feed_auto_download"]').on('change', function () {
            if ($(this).is(':checked'))
                $('select[name="upload_profile"]').prop('disabled', false);
            else
                $('select[name="upload_profile"]').prop('disabled', true);
        })


        $('#addfeed').on('hidden.bs.modal', function () {
            $('#newfeed').removeClass('active');
            $('#lisfeed').addClass('active');
            $(this).find('form').trigger('reset');
            $('.pingfeed').removeClass('disabled').prop('disabled', false).html('<i class="fa fa-bolt"></i> Ping');
        })


        $(".pingfeed").on('click', function (e) {
            e.preventDefault();

            var _id = $(this).closest('tr').attr('id');

            var btn = $(this);

            btn.addClass('disabled').prop('disabled', true).html('Loading <span class="loading"></span>');

            $.post('/torrents/pingfeed/', { _id: _id }).done(function (data) {
                btn.removeClass('disabled').prop('disabled', false).html('<i class="fa fa-bolt"></i> Ping');

                var url = "/torrents/";
                toastr.options.onclick = function () {
                    window.location.href = url;
                }
                toastr.options.onHidden = function () {
                    window.location.href = url;
                }

                toastr.success(data.message);
            }).fail(function (err) {
                btn.removeClass('disabled').prop('disabled', false).html('<i class="fa fa-bolt"></i> Ping');
                try { toastr.error(err.responseJSON['message']); } catch (e) { }
            })

        })

        $("#saveform").on('click', function (e) {
            e.preventDefault();

            var btn = $(this);

            var fname = $('input[name="feedname"]').val().trim();
            if (fname == "") return false;

            btn.addClass('disabled').prop('disabled', true).html('Loading <span class="loading"></span>');

            var dataString = $('#feed_form').serialize();

            $('#alertfeed').fadeIn('fast');

            $.post('/torrents/addfeed/', dataString).done(function (data) {
                btn.removeClass('disabled').prop('disabled', false).html('Save changes');

                var url = "/torrents/";
                toastr.options.onclick = function () {
                    window.location.href = url;
                }
                toastr.options.onHidden = function () {
                    window.location.href = url;
                }

                toastr.success(data.message);
                $('#alertfeed').fadeOut('fast');

            }).fail(function (err) {
                btn.removeClass('disabled').prop('disabled', false).html('Save changes');
                try { toastr.error(err.responseJSON['message']); } catch (e) { }
            })
        })



        $('.dfmv').on('click', function (e) {
            e.preventDefault();
            $('.dfmv').removeClass('active').addClass('disabled');
            $(this).addClass('active').removeClass('disabled');
            var valmik = $(this).data('source');
            $('input[name="default_movie_cr"]').val(valmik);
        })

        $('.dftv').on('click', function (e) {
            e.preventDefault();
            $('.dftv').removeClass('active').addClass('disabled');
            $(this).addClass('active').removeClass('disabled');
            var valmik = $(this).data('source');
            $('input[name="default_tv_cr"]').val(valmik);
        })



        //PREZ
        $(document).on('click', '.addtasktr', function (e) {
            e.preventDefault();

            var _ids = $("input[name=tcheck]:checked").map(function () {
                return $(this).closest('tr').data('hash');
            })

            $("#loadingbi").hide();
            $("#preztable").html("");
            $('.prezbtn').removeClass('active').prop('disabled', false);

            var title = "";
            try {
                title = $(this).data('title');
                title = title.split(/([0-9]{4}|S[0-9]{1,3}E?([0-9]{1,3})?|20[0-9]{2}\s+[0-9]{2}\s+[0-9]{2})/ig)
                title = title[0].trim().replace(/(\(+|\)+)/ig, " ").trim();
                title = title.replace(/(\.+|\_+|\-+)/ig, " ").trim();
                title = title.split(/\//ig);
                title = Array.isArray(title) ? title[title.length - 1] : title;
            } catch (e) {
                title = ""
            }

            var _id_ = $(this).attr('id');
            var dTopic = $(this).data('topic');
            var tdatapath = $(this).data('path');
            var dProfile = $(this).data('profile');

            var dcdc = dTopic == true ? 'int' : 'ext';

            $('input[name="dProfile"]').val(dProfile);
            $('input[name="tdatapath"]').val(tdatapath);
            $('input[name="torr_task"]').val(_id_);

            $('input[name="dtopic"]').val(dcdc);
            $('#preztable').html('');

            var type = $(this).data('type');

            if (!/(tv|movies)/ig.test(type)) {
                title = title
                    .replace(/[`~!@#$%^&*()_|+\-=?;:",.<>\{\}\[\]\\\/]/gi, ' ')
                    .replace(/\s+/ig, ' ')
            }

            $('input[name="prsearch"]').val(title);

            try {
                var ttich = $(this).data('title');
                var tType = ttich.replace(/\.+/ig, ' ').replace(/\s+/ig, ' ').trim();
                type = !type ? (tType.match(/(20[0-9]{2}\s+[0-9]{2}\s+[0-9]{2}|S[0-9]{1,3}E?([0-9]{1,3})?)/ig) ? 'tv' : 'movies') : type;
            } catch (e) { }

            $('#srctask [data-bind="bs-drp-sel-value"]').val(type);
            $('#srctask [data-bind="bs-drp-sel-label"]').text(type.ucwords());

            // if (dTopic == true) {
            $('button.prezbtn[data-source="internal"]').trigger('click', "internal");
            // }

            return showPrez(type);

        })

        //Loop search

        $(document).on('click', '#srchloop', function (e) {
            var _ssrc = $('.prezbtn.active').data('source');
            if (_ssrc) {
                $('button.prezbtn').trigger('click', _ssrc);
            } else {
                $('button.prezbtn').trigger('click', 'internal');
            }
        })

        //Show Related Prez
        $(document).on('click', '.bs-dropdown-to-select-group .dropdown-menu li', function (e) {
            var _type = $('#srctask [data-bind="bs-drp-sel-value"]').val();
            return showPrez(_type);
        })


        function showPrez(_type) {
            if (!_type) return;
            $('button.prezbtn').fadeOut(0);
            $('button[data-types*=' + _type + '').fadeIn(0);
        }


        var xhr;

        $(document).on('click', '.prezbtn', function (e, ssrc) {
            e.preventDefault();

            xhr ? xhr.abort() : '';

            $("#loadingbi").show();
            $("#preztable").html("");

            $('.prezbtn').removeClass('active').prop('disabled', true);
            if (!ssrc) {
                $(this).addClass('active').prop('disabled', false)
            } else {
                $('button.prezbtn[data-source="' + ssrc + '"]').addClass('active').prop('disabled', false)
            }

            //Go find on prez's
            var ktitle = $('input[name="prsearch"]').val().trim();
            var source = ssrc ? ssrc : $(this).data('source');
            var type = $('#srctask [data-bind="bs-drp-sel-value"]').val();

            var _id_ = $('#torr_task').val();
            var _dtopic = $('#dtopic').val();
            var dProfile = $('#dProfile').val();

            xhr = $.post('/torrents/dgrab/', {
                ktitle: ktitle,
                source: source,
                type: type,
                _id_: _id_,
                dtopic: _dtopic,
                profile: dProfile
            }).done(function (result) {
                $('.prezbtn').prop('disabled', false);

                if (!data) var data = [];
                if (!result) var data = [];

                var data = result.data;
                var _profile = result.profile;

                $.get("/settings/aprofiles", function (profiles) {
                    var sdgprofiles = profiles;

                    var pptprofiles = sdgprofiles.map(function (_item) {
                        var _sl = _item._id == _profile ? ' selected="selected"' : '';
                        return `<option value="${_item._id}"${_sl}>${_item._name}</option>`;
                    }).join('');

                    pptprofiles = `<select name="pptprofiles" class="form-control input-sm"><option selected="selected" disabled="disabled">*Upload_Profile</option>${pptprofiles}</select>`

                    $(".pptprofiles").html(pptprofiles);
                })

                var trprep = '';

                var todo = source == 'internal' ? 'Update' : 'Save';

                if (data.length > 0) {
                    try {
                        data.forEach(function (item) {

                            var tpidip = item.tpid ? `<input type="hidden" name="tpid" value="${item.tpid}">` : ``;

                            var imer = Array.isArray(item['images']['rs']) ? item['images']['rs'][0] : item['images']['rs'];

                            var image = item['image'] && item['image'] != "" ? item['image'] : (imer && imer != "" ? imer : '/assets/images/no_image.jpg');


                            var title = item['title'];
                            title = title ? title.trim() : title;
                            var year = item['year'] || '';
                            var yearmc = item['year'] ? '<b>(' + item['year'] + ')</b>' : '';
                            var summary = item['summary'];
                            var runtime = item['runtime'] || '';
                            var genres = item['genres'] && item['genres'].length > 0 ? item['genres'].join(', ') : '';

                            if (Array.isArray(item.tags) && item.tags.indexOf(ktitle) === -1 && ktitle) {
                                item.tags.push(ktitle.trim());
                                item.tags = item.tags.map(function (_val) {
                                    return _val.toLowerCase().ucwords();
                                })
                            }

                            var prtags = item['tags'] && Array.isArray(item.tags) && item.tags.length > 0 ? item.tags.join(', ') : '';

                            var stars = item['stars'] && item['stars'].length > 0 ? item['stars'].join(', ') : '';
                            var source = Array.isArray(item['source']) ? item['source'][0] : item['source'];
                            source = '<input type="hidden" name="pr_source" value="' + (source ? source : '') + '">'

                            var imgvi = image.match(/thetvdb/ig) ? '/torrents/img?i=' : '';

                            trprep += '<div class="hr-line-dashed"></div>' +
                                '<div class="table-responsive">' +
                                '<table class="table shoping-cart-table"><tbody><tr>' +
                                '<td width="90">' +
                                '<span class="pull-left">' +
                                '<img class="thumbnailme" src="' + imgvi + image + '" width="90px">' +
                                '</span>' +
                                '</td>' +
                                '<td class="desc" colspan="2">' +
                                '<h3><a class="text-success"> ' + title + ' ' + yearmc + '</a></h3>' +
                                '<p class="">' + summary + '</p>' +
                                '' + (runtime ? '<b>Runtime : </b>' + runtime + '<br>' : '') + '' +
                                '' + (genres ? '<b>Genres : </b>' + genres + '<br>' : '') + '' +

                                '<div data-type="isolated" class="form-group text-left">' +
                                '<br><div class="col-md-5" style="padding-left: 0px;">' +
                                '<div class="pptprofiles"></div>' +
                                '</div></div>' +

                                '</td></tr>' +
                                '<tr>' +
                                '<td colspan="3">' +
                                '<span class="cfprezarea" style="display:none;">' +
                                '<div class="ibox-content">' +
                                '<form class="prdataform form-horizontal m-t-md" method="POST">' +
                                '<div class="form-group">' +
                                '<label class="col-sm-2 col-sm-2 control-label">Title</label>' +
                                '<div class="col-md-8">' +
                                '<input type="text" name="pr_title" class="form-control input-sm" value="' + title + '">' +
                                '</div></div>' +
                                '<div class="form-group">' +
                                '<label class="col-sm-2 control-label">Year</label>' +
                                '<div class="col-md-4">' +
                                '<input type="text" name="pr_year" class="form-control input-sm" value="' + year + '">' +
                                '</div></div>';

                            if (/(tv|movies)/ig.test(type)) {
                                trprep += '<div class="form-group">' +
                                    '<label class="col-sm-2 control-label">Runtime</label>' +
                                    '<div class="col-md-4">' +
                                    '<input type="text" name="pr_runtime" class="form-control input-sm" value="' + runtime + '">' +
                                    '</div></div>' +
                                    '<div class="form-group">' +
                                    '<label class="col-sm-2 control-label">Genres</label>' +
                                    '<div class="col-md-10">' +
                                    '<input type="text" name="pr_genres" class="tagsinput3 form-control input-sm" value="' + genres + '">' +
                                    '</div></div>' +
                                    '<div class="form-group">' +
                                    '<label class="col-sm-2 control-label">Stars</label>' +
                                    '<div class="col-md-10">' +
                                    '<input type="text" name="pr_stars"  class="tagsinput3 form-control input-sm" value="' + stars + '">' +
                                    '</div></div>';
                            }


                            trprep += '<div class="form-group">' +
                                '<label class="col-sm-2 control-label">Summary</label>' +
                                '<div class="col-md-10">' +
                                '<textarea class="form-control" name="pr_summary" rows="8">' + summary + '</textarea></div></div>' +
                                '<div class="form-group">' +
                                '<label class="col-sm-2 control-label">Tags</label>' +
                                '<div class="col-md-10">' +
                                '<input type="text" name="pr_tags" class="tagsinput4 form-control input-sm" value="' + prtags + '"><span class="help-block m-b-none"> - Tags help avoiding conflict in topics that\'s have same Title. </span>' +
                                '</div></div>' +
                                ' <br>' +
                                '<div class="form-group">' +
                                '<label class="col-sm-2 control-label">Profile</label>' +
                                '<div class="col-md-4">' +
                                '<div class="pptprofiles"></div>' +
                                '</div></div>' +
                                '' + source + '' +
                                '<div class="edimagegroup form-group" style="display:none;">' +
                                '<label class="col-sm-2 control-label">Custom Image</label>' +
                                '<div class="col-md-10">' +
                                '<input type="text" placeholder="https://m.media-amazon.com/images/M/MV5BMjI1OTI3ODc0M15BMl5BanBnXkFtZTgwNDE4OTE1NjM@.jpg" name="bc_image" class="form-control input-sm" value="">' +
                                '</div>' +
                                '</div>' +
                                '<a class="edimage pull-right"><i class="fa fa-image"></i> Edit Image</a>' +
                                '<br>' +
                                '' + tpidip + '' +
                                '<p class="text-center">';

                            try {
                                item['images']['banners'] = item['images']['banners'].filter(function (_im) { return _im })
                            } catch (e) { }

                            if (item['images'] && Array.isArray(item['images']['banners'])) {
                                var banners = item['images']['banners'].slice(0, 6);

                                banners.forEach(function (item, ind) {
                                    var sub_imgvi = item.match(/thetvdb/ig) ? '/torrents/img?i=' : '';

                                    trprep += '<label class="fancy-checkbox-label">' +
                                        '<input name="tgimage" value="' + item + '" type="radio">' +
                                        '<span class="fancy-checkbox fancy-checkbox-img"></span>' +
                                        '<img class="thumbnailme" height="100px" src="' + sub_imgvi + item + '">' +
                                        '</label>';
                                })
                                trprep += '<br>';
                            }

                            if (item['images'] && image != '') {
                                try {
                                    item['images']['or'] = item['images']['or'].filter(function (_im) { return _im })
                                } catch (e) { }

                                if (Array.isArray(item['images']['or'])) {
                                    item['images']['or'].forEach(function (item, ind) {
                                        var sub_imgvi = item.match(/thetvdb/ig) ? '/torrents/img?i=' : '';

                                        item = Array.isArray(item) ? item[0] : item;

                                        var bChecked = image == item ? 'checked="checked"' : (ind == 0 ? 'checked="checked"' : '');

                                        var _sdsize = ''
                                        if (/banners\/graphical/ig.test(item)) {
                                            trprep += "<br>";
                                            _sdsize = 'height=100px';
                                        } else {
                                            _sdsize = 'width=140px';
                                        }

                                        trprep += '<label class="fancy-checkbox-label">' +
                                            '<input dt="dt" ' + bChecked + ' name="tgimage" value="' + item + '" type="radio">' +
                                            '<span class="fancy-checkbox fancy-checkbox-img"></span>' +
                                            '<img class="thumbnailme" ' + _sdsize + ' src="' + sub_imgvi + item + '">' +
                                            '</label>' + (ind == 4 ? '<br>' : '');
                                    })
                                } else {
                                    trprep += '<label class="fancy-checkbox-label">' +
                                        '<input checked="checked" name="tgimage" value="' + image + '" type="radio">' +
                                        '<span class="fancy-checkbox fancy-checkbox-img"></span>' +
                                        '<img class="thumbnailme" width="130px" src="' + imgvi + image + '">' +
                                        '</label>'
                                }
                            }

                            trprep += '</p>' +
                                '</form></div>' +
                                '</span>' +
                                '</td>' +
                                '</tr>' +
                                '<tr>' +
                                '<td colspan="3">' +
                                '<div class="m-t-sm">' +
                                '<small class="pull-right">' +
                                '<a class="nilltask btn btn-xs btn-default"><i class="fa fa-minus"></i> Create Empty Task</a> ' +
                                '<a data-tt="update" class="slprez btn btn-xs btn-ups"><i class="fa fa-database"></i> ' + todo + ' Data</a> ' +
                                '<a class="slprez btn btn-xs btn-success"><i class="fa fa-plus"></i> Create Task</a> ' +
                                '<a class="cfprez btn btn-xs btn-primary"><i class="fa fa-arrow-down"></i></a>' +
                                '</small>' +
                                '</div>' +
                                '</td>' +
                                '</tr>' +
                                '</tbody></table>' +
                                '</div>'
                        })
                    } catch (e) { }
                } else {
                    trprep = `<center data-type="isolated"><div class="alert alert-danger"><a class="alert-link lead font14"><i class="fa fa-exclamation-triangle"></i> Title did not match any results.</a><br><br>
                   <ul>
                   <span>- Make sure the title is spelled correctly, or switch to the next parsing service.</span>
                   </ul>
                   </div>
                   </center>`;

                    trprep +=
                        '<div data-type="isolated" class="m-t-sm">' +
                        '<div class="form-group text-left">' +
                        '<div class="col-md-4">' +
                        '<div class="pptprofiles"></div>' +
                        '</div></div>' +
                        '<small class="pull-right">' +
                        '<a class="intcfprez btn btn-xs btn-primary"><i class="fa fa-plus"></i> Create Topic</a> ' +
                        '<a class="nilltask btn btn-xs btn-default"><i class="fa fa-minus"></i> Create Empty Task</a> ' +
                        '</small>' +
                        '<br>' +
                        '</div>';

                    trprep += '<div class="hr-line-dashed"></div>' +
                        '<div class="table-responsive">' +
                        '<span class="intcfprezarea" style="display:none;">' +
                        '<table class="table shoping-cart-table"><tbody>' +
                        '<tr>' +
                        '<td colspan="3">' +
                        '<div class="ibox-content">' +
                        '<form class="prdataform form-horizontal m-t-md" method="POST">' +
                        '<div class="form-group">' +
                        '<label class="col-sm-2 col-sm-2 control-label">Title</label>' +
                        '<div class="col-md-8">' +
                        '<input type="text" name="pr_title" class="form-control input-sm" value="">' +
                        '</div></div>' +
                        '<div class="form-group">' +
                        '<label class="col-sm-2 control-label">Year</label>' +
                        '<div class="col-md-4">' +
                        '<input type="text" name="pr_year" class="form-control input-sm" value="">' +
                        '</div></div>';


                    if (/(tv|movies)/ig.test(type)) {
                        trprep +=
                            '<div class="form-group">' +
                            '<label class="col-sm-2 control-label">Runtime</label>' +
                            '<div class="col-md-4">' +
                            '<input type="text" name="pr_runtime" class="form-control input-sm" value="">' +
                            '</div></div>' +
                            '<div class="form-group">' +
                            '<label class="col-sm-2 control-label">Stars</label>' +
                            '<div class="col-md-10">' +
                            '<input type="text" name="pr_stars"  class="tagsinput3 form-control input-sm" value="">' +
                            '</div></div>' +
                            '<div class="form-group">' +
                            '<label class="col-sm-2 control-label">Genres</label>' +
                            '<div class="col-md-10">' +
                            '<input type="text" name="pr_genres" class="tagsinput3 form-control input-sm" value="">' +
                            '</div></div>';
                    }

                    trprep += '<div class="form-group">' +
                        '<label class="col-sm-2 control-label">Summary</label>' +
                        '<div class="col-md-10">' +
                        '<textarea class="form-control" name="pr_summary" rows="8"></textarea></div></div>' +
                        '<div class="form-group">' +
                        '<label class="col-sm-2 control-label">Tags</label>' +
                        '<div class="col-md-10">' +
                        '<input type="text" name="pr_tags" class="tagsinput4 form-control input-sm" value=""><span class="help-block m-b-none"> - Tags help avoiding conflict in topics that\'s have same Title. </span>' +
                        '</div></div>' +
                        ' <br>' +
                        '<div class="form-group">' +
                        '<label class="col-sm-2 control-label">Profile</label>' +
                        '<div class="col-md-4">' +
                        '<div class="pptprofiles"></div>' +
                        '</div></div>' +
                        '<div class="form-group" style="display:block;">' +
                        '<label class="col-sm-2 control-label">Custom Image</label>' +
                        '<div class="col-md-10">' +
                        '<input type="text" placeholder="https://m.media-amazon.com/images/M/MV5BMjI1OTI3ODc0M15BMl5BanBnXkFtZTgwNDE4OTE1NjM@.jpg" name="bc_image" class="form-control input-sm" value="">' +
                        '</div>' +
                        '</div>' +
                        '<a class="edimage pull-right"><i class="fa fa-image"></i> Edit Image</a>' +
                        '<br>';


                    trprep += '</p>' +
                        '</form></div>' +
                        '</td>' +
                        '</tr>' +
                        '<tr>' +
                        '<td colspan="3">' +
                        '<div class="m-t-sm">' +

                        '<small class="pull-right">' +
                        '<a class="nilltask btn btn-xs btn-default"><i class="fa fa-minus"></i> Create Empty Task</a> ' +
                        '<a data-tt="update" class="slprez btn btn-xs btn-ups"><i class="fa fa-database"></i> ' + todo + ' Data</a> ' +
                        '<a class="slprez btn btn-xs btn-success"><i class="fa fa-plus"></i> Create Task</a> ' +
                        '</small>' +
                        '</div>' +
                        '</td>' +
                        '</tr>' +
                        '</tbody></table>' +
                        '</span>' +
                        '</div>'



                }

                $("#preztable").html(trprep);
                $("#loadingbi").hide();

            })
        })

        $(document).on('click', '.edimage', function () {
            $(".edimagegroup").toggle()
            $('input[name="bc_image"]').val("").focus();
        })


        $(document).on('click', '.cfprez', function () {
            $(".edimagegroup").hide();
            $('.cfprezarea').fadeOut("fast");
            var blockTr = $(this).closest('tr').prev('tr').find('.cfprezarea');

            $(this).closest('table').find('[data-type="isolated"]').remove();
            $('.intcfprezarea').fadeIn("fast");

            blockTr.fadeIn("fast");
        })

        $(document).on('click', '.intcfprez', function () {
            $('.cfprezarea').fadeOut("fast");
            $('.intcfprezarea').fadeIn("fast");

            $('[data-type="isolated"]').remove();

        })





        $(document).on('click', '.slprez', function () {
            var btn = $(this);
            var form = btn.closest('tr').prev('tr').find('.prdataform');

            var _id_ = $('#torr_task').val();
            var type = $('#srctask [data-bind="bs-drp-sel-value"]').val();

            var _datapath = $('#tdatapath').val();
            var _datatt = Boolean($(this).data('tt'));
            var dataString = form.serializeArray();

            var _slHashs = $("input[name=tcheck]:checked").map(function (itm, val) {
                return $(this).closest('tr').data('hash');
            }).get();

            dataString.push({
                name: "_id_",
                value: _id_
            }, {
                name: "type",
                value: type
            });

            if (_datapath) {
                dataString.push({
                    name: "path",
                    value: _datapath
                })
            }
            if (_datatt) {
                dataString.push({
                    name: "datatt",
                    value: _datatt
                }, {
                    name: "hashs",
                    value: _slHashs
                })
            }

            var bdProfile = $('select[name="pptprofiles"]').val();

            if (bdProfile) {
                if (_id_) $("#" + _id_).data("profile", bdProfile)

                $('input[name="dProfile"]').val(dProfile);
                $('#dProfile').val(bdProfile);
            }

            btn.addClass('disabled').prop('checked', true); //

            // _przxhr = 
            $.post('/torrents/saveprez/', dataString).done(function (data) {
                btn.removeClass('disabled').prop('checked', false);

                if (_slHashs) {
                    _slHashs.map(function (_h) {
                        $('tr[data-hash="' + _h + '"').find('.autodata').html('<i class="fa fa-circle text-warning"></i>')
                        return;
                    })
                }

                if (_id_) {
                    $('a#' + _id_).data('topic', true)
                    $('#dtopic').val('int')
                }

                if (_slHashs.length == 0 && _id_) $('tr#tr_' + _id_).find('.autodata').html('<i class="fa fa-circle text-warning"></i>');

                $("input[name=tcheck]").prop('checked', false);
                toastr.success(data.message);
                if (!_datatt) $('#addtasktr').modal('toggle');

            }).fail(function (err) {
                btn.removeClass('disabled').prop('checked', false);
                try { toastr.error(err.responseJSON['message']); } catch (e) { }
            })
        })


        $(document).on('click', 'td.checkmlk', function (e) {
            var chk = $(this).closest("tr").find("input:checkbox").get(0);
            if (e.target != chk) {
                chk.checked = !chk.checked;
            }

            $('input[name=tcheck]').change();

            var lng = $("input[name=tcheck]:checked").length;
            $('.countcheck').html(lng);

        });

        $('input[name=tcheck], #checkall').prop('checked', false);

        var _ids_ = [];
        $(document).on('change', 'input[name=tcheck]', function (e) {
            e.preventDefault();

            var chk = $(this);

            var isChecked = chk.is(':checked');
            var _id = chk.closest('tr').attr('id').replace(/tr_/ig, '');

            if (isChecked == true) {
                $("input[name=tcheck]:checked").map(function () {
                    _ids_.push(chk.data('tid'));
                    return;
                })
            } else {
                _ids_ = _ids_.filter(e => e !== _id)
            }

            _ids_ = [...new Set(_ids_)];

            var lng = $("input[name=tcheck]:checked").length;
            $('.countcheck').html(lng);
            if (lng == 0) return $('input#checkall').prop('checked', false);

        })

        $(document).on('change', '#checkall', function () {
            if ($(this).is(':checked')) {
                $('.tcheck').prop('checked', true);
            } else {
                $('.tcheck').prop('checked', false);
            }
            $('input[name=tcheck]').change();

        })

        $(document).on('click', '.nilltask', function () {
            var btn = $(this);
            var form = btn.closest('tr').prev('tr').find('.prdataform');

            var _id_ = $('#torr_task').val();
            var type = $('#srctask [data-bind="bs-drp-sel-value"]').val();

            var _datapath = $('#tdatapath').val();
            var dataString = form.serializeArray();

            dataString.push({
                name: "_id_",
                value: _id_
            }, {
                name: "type",
                value: type
            }, {
                name: "nilltask",
                value: true
            });

            if (_datapath) {
                dataString.push({
                    name: "path",
                    value: _datapath
                })
            }

            var bdProfile = $('select[name="pptprofiles"]').val();

            if (bdProfile) {
                dataString.push({
                    name: "pptprofiles",
                    value: bdProfile
                })

                // if (_id_) $("#" + _id_).data("profile", bdProfile)
                // $('input[name="dProfile"]').val(dProfile);
                // $('#dProfile').val(bdProfile);
            }

            btn.addClass('disabled').prop('checked', true); //
            $.post('/torrents/saveprez/', dataString).done(function (data) {
                btn.removeClass('disabled').prop('checked', false);
                toastr.success(data.message);
            }).fail(function (err) {
                btn.removeClass('disabled').prop('checked', false);
                try { toastr.error(err.responseJSON['message']); } catch (e) { }
            })
        })



        $('#sendall').on('click', function () {
            var btn = $(this);

            btn.addClass('disabled').prop('checked', true); //

            $.post('/torrents/sendtorrents/', {
                ids: _ids_
            }).done(function (data) {
                btn.removeClass('disabled').prop('checked', false);
                _ids_.map(function (id) {
                    return $('#mttbl tr#tr_' + id + '').find('.torrentdl').html('<i class="fa fa-circle text-navyx"></i>');
                })
                //RESET
                _ids_ = [];
                $('input[name=tcheck], #checkall').prop('checked', false);
                $('.countcheck').html('0');
            })
        })

        $(document).on('click', '.sendthis', function () {

            var btn = $(this);
            var _tid = btn.closest('tr').attr('id').replace(/tr_/ig, '');
            var ids = _tid ? [_tid] : [];

            btn.html('<span class="loading"></span>'); //

            $.post('/torrents/sendtorrents/', {
                ids: ids
            }).done(function (data) {
                btn.closest('tr').find('.torrentdl').html('<i class="fa fa-circle text-navyx"></i>');
                btn.html('<span class="fa fa-download"></span>'); //

            }).fail(function (err) {
                btn.html('<span class="fa fa-download"></span>'); //
                try { toastr.error(err.responseJSON['message']); } catch (e) { }
            })
        })

        $('#trashall').kickme({
            confirm: '<a class="btn btn-danger btn-sm confirm-yes"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i> Are you sure ?</a>',
            cancel: '<a class="btn btn-default btn-sm confirm-no"><i class="fa fa-times" aria-hidden="true"></i> Cancel</a>',
            separator: "&nbsp;",
            expiresIn: 4,
            confirmCallback: function ($button) {
                $.post('/torrents/remove_torrent/', {
                    ids: _ids_
                }).done(function (data) {
                    _ids_.forEach(function (_id) {
                        $('tr#tr_' + _id).fadeOut("fast");
                    })
                    toastr.success(data.message);
                    $('input[name=tcheck], #checkall').prop('checked', false);
                    $('.countcheck').html('0');
                }).fail(function (err) {
                    try { toastr.error(err.responseJSON['message']); } catch (e) { }
                })
            }
        });

        $(".trashfeed").kickme({
            confirm: "<a href='#' class='btn btn-xs btn-primary confirm-yes'><i class='fa fa-check'></i></a>",
            cancel: "<a href='#' class='btn btn-xs btn-danger confirm-no'><i class='fa fa-times'></i></a>",
            separator: "&nbsp;",
            expiresIn: 4,
            confirmCallback: function ($button) {
                var _id = $button.closest('tr').attr('id');
                $.post('/torrents/removefeed/', {
                    _id: _id
                }).done(function (data) {
                    $button.parents("tr").fadeOut("fast");
                    toastr.success(data.message);
                }).fail(function (err) {
                    try { toastr.error(err.responseJSON['message']); } catch (e) { }
                })
            }
        });

        $(".trashprofile").kickme({
            confirm: "<a href='#' class='btn btn-xs btn-primary confirm-yes'><i class='fa fa-check'></i></a>",
            cancel: "<a href='#' class='btn btn-xs btn-danger confirm-no'><i class='fa fa-times'></i></a>",
            separator: "&nbsp;",
            expiresIn: 4,
            confirmCallback: function ($button) {
                var _id = $button.closest('tr').attr('id');
                $.post('/settings/remove/', {
                    _id: _id
                }).done(function (data) {
                    $button.parents("tr").fadeOut("fast");
                    toastr.success(data.message);
                }).fail(function (err) {
                    try { toastr.error(err.responseJSON['message']); } catch (e) { }
                })
            }
        });

        $(".trashaccount").kickme({
            confirm: "<a href='#' class='btn btn-xs btn-primary confirm-yes'><i class='fa fa-check'></i></a>",
            cancel: "<a href='#' class='btn btn-xs btn-danger confirm-no'><i class='fa fa-times'></i></a>",
            separator: "&nbsp;",
            expiresIn: 4,
            confirmCallback: function ($button) {
                var _id = $button.closest('tr').attr('id');
                $.post('/settings/remove_account/', {
                    _id: _id
                }).done(function (data) {
                    $button.parents("tr").fadeOut("fast");
                    toastr.success(data.message);
                }).fail(function (err) {
                    try { toastr.error(err.responseJSON['message']); } catch (e) { }
                })
            }
        });

        //Start Torrent Search
        function debounce(func, wait, immediate) {
            var timeout;
            return function () {
                var context = this, args = arguments;
                var later = function () {
                    timeout = null;
                    if (!immediate) func.apply(context, args);
                };
                var callNow = immediate && !timeout;
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
                if (callNow) func.apply(context, args);
            };
        };

        ///******///
        var pagenm;

        $('.grabox').val('');
        $('input[name=selected_value]').val("all");

        //Start-needed function 
        function truncate(fullStr, strLen) {
            if (!fullStr) return;
            if (fullStr.length <= strLen) return fullStr;

            var separator = '...';

            var sepLen = separator.length,
                charsToShow = strLen - sepLen,
                frontChars = Math.ceil(charsToShow / 2),
                backChars = Math.floor(charsToShow / 2);

            return fullStr.substr(0, frontChars) +
                separator +
                fullStr.substr(fullStr.length - backChars);
        }

        function bytesToSize(bytes) {
            var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
            if (bytes == 0) return '';
            if (bytes <= 1024) bytes = 1024;
            var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
            if (i == 0) return {
                size: bytes + " " + sizes[i]
            };
            return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
        }


        function fixDate(added) {
            if (!added) return;
            var mdt = new Date(added).toLocaleString('en-US', {
                hour12: false
            });

            mdt = mdt.replace(/\//ig, '.').replace(/\,/ig, ' - ').replace(/\s+/ig, ' ');
            return mdt;
        }

        function dataTopic(topic_docs) {
            if (!topic_docs) return '';
            return topic_docs.length > 0 ? true : false;
        }

        function dataTpid(topic_docs) {
            if (!topic_docs) return '';
            return topic_docs.length > 0 ? topic_docs[0]._id : '';
        }

        function autoData(topic_docs) {
            if (!topic_docs) return '';
            var status = topic_docs.length > 0 ? '<i class="fa fa-circle text-warning"></i>' : '';
            return status;
        }

        function torrentDL(torrent_sts) {
            if (!torrent_sts) return '';
            var status = torrent_sts ? '<i class="fa fa-circle text-navyx"></i>' : '';
            return status;
        }

        var callback = function (keyword, section, pagenm) {
            var plimit = 50;

            keyword = keyword.replace(/\s+/ig, ' ').trim();
            $('.grabox').val(keyword);

            $.post('/torrents/search', { keyword: keyword, section: section, pagenm: pagenm, limit: plimit }, function (data) {
                $('#loadmespn').hide();


                var section = data['section'];
                if (keyword.trim() == "") {
                    $('#srchkey').html('');
                } else {
                    $('#srchkey').html('<b>Search for :</b> <span style="text-decoration:underline;">' + keyword + '</span> ' + (section ? ' (' + section.ucwords() + ')' : ''));
                }

                var list = data['list'];
                var trprep = "";

                var lenghRest = list ? list.length : 0;

                list.forEach(function (item) {
                    trprep += `<tr id="tr_${item._id}" data-hash="${item.hash}"><td class="checkmlk" width="1%"><div class="checkbox checkbox-primary"><input name="tcheck" class="tcheck" data-tid="${item._id}" type="checkbox"><label></label></div></td><td class="checkmlk" width="1%"><span class="autodata">${autoData(item.topic_docs)}</span><span class="torrentdl">${torrentDL(item.torrent_sts)}</span></td><td class="checkmlk" width="55%"><span class="pull-right"></span><span class="creelead text-primary">${truncate(item.title, 70)}</span><small class="pull-right noselect">${bytesToSize(item.size)}</small><br><br><b>Hash : </b><span class="text-default">${item.hash}</span><span class="pull-right"><a class="text-danger" href="${item.magnet}"><span class="fa fa-magnet"></span></a></span></td><td class="checkmlk" width="20%"><b>Feed Name : </b><span style="font-size:13px;" class="text-default">${item.info.source}</span>&nbsp;<br><b>Type : </b><span style="font-size:13px;" class="text-default">${item.info.type.ucwords()}</span><br> <b>Saved : </b><span style="font-size:12px;" class="text-default">${fixDate(item.added)}</span></td><td width="15%"><div class="pull-right"><p><a id="${item._id}" data-type="${item.info.type}" data-title="${item.title}" data-toggle="modal" data-target="#addtasktr" data-topic="${dataTopic(item.topic_docs)}" data-tpid="${dataTpid(item.topic_docs)}" data-profile="${item.extra.upload_profile}" class="addtasktr label label-success"><i class="fa fa-plus"></i> Manage</a>&nbsp;<a class="sendthis label label-primary"><span class="fa fa-download"></span></a></p></div></td></tr>`;
                })


                $('#olaselistmfik').html("");
                $("#mttblsrc").show();

                if (pagenm == 1) {
                    $("#mttblsrc > tbody").html(trprep);
                } else {
                    $("#mttblsrc > tbody").append(trprep);
                }

                if (lenghRest == 0 || lenghRest < plimit) {
                    $('#loadselistmfik').html('<br><center><h5><i class="fa fa-exclamation-circle"></i> No Torrents to show</h4></center><br>');
                } else {
                    $('#loadselistmfik').html('<br><center><a class="font14 btn btn-sm btn-default" href="javascript:void(0);" id="loadmore">Load more...</a></center><br>');
                }
            })
        };

        $('#mselect li').on('click', function () {
            var dataVal = $(this).data('value');
            $(".grabox").keypress();
        })


        $(document).on('click', '#loadmore', function () {
            $('#loadmespn').show();

            pagenm++;
            var datafill = $('.grabox').val();
            var section = $('input[name=selected_value]').val();

            $('#loadmespn').hide();
            $('#loadselistmfik').html(`<br><center> <div class="sk-spinner sk-spinner-wave"> <div class="sk-rect1"></div> <div class="sk-rect2"></div> <div class="sk-rect3"></div> <div class="sk-rect4"></div> <div class="sk-rect5"></div> </div></center><br>`);

            callback(datafill, section, pagenm);

        })

        $(".grabox").keypress(debounce(function () {
            $('#loadmespn').show();

            var datafill = $(this).val();
            var section = $('input[name=selected_value]').val();
            $('.pagination').hide();
            $("#checkall").prop('checked', false);

            pagenm = 1;
            callback(datafill, section, pagenm);
        }, 400));

        //End Torrent Search
        $("#btnamodal").on('click', function () {
            $("#apisform").find("input[type=text], input[type=password]").val("")
            $('select[name="sttype"]').val('api')
            $('select[name="stAuth"]').val('0')
            $('._auth').find('input, textarea').val('');
            $('._auth').attr('data-sh', false).hide()
        })

        $('select[name="stAuth"]').on('change', function () {

            var _ch = $(this).val();
            if (!_ch) _ch = 0;

            $('._auth').find('input, textarea').val('');
            $('._auth').attr('data-sh', false).hide()
            $('._auth[data-type="' + _ch + '"]').attr('data-sh', true).show()


        })

        $("#apisform").submit(function (e) {
            e.preventDefault();

            var btn = $(this).find(":submit");

            var dataString = $(this).serialize();
            if (!$('input[name="stname"]').val()) {
                $('input[name="stname"]').closest('.form-group').addClass('has-error');
                return false;
            } else {
                $('input[name="stname"]').closest('.form-group').removeClass('has-error');
            }

            if (!$('input[name="sturl"]').val()) {
                $('input[name="sturl"]').closest('.form-group').addClass('has-error');
                return false;
            } else {
                $('input[name="sturl"]').closest('.form-group').removeClass('has-error');
            }

            btn.addClass('disabled');

            $.post('/settings/sites/', dataString).done(function (data) {
                btn.removeClass('disabled');

                var url = "/settings/sites/";
                toastr.options.onclick = function () {
                    window.location.href = url;
                }
                toastr.options.onHidden = function () {
                    window.location.href = url;
                }

                toastr.success(data.message);

            }).fail(function (err) {
                btn.removeClass('disabled');
                try { toastr.error(err.responseJSON['message']); } catch (e) { }
            })
        })




        $('.editapi').on('click', function () {
            var _id = $(this).closest('tr').data('id');
            //clear prevent old values
            $('._auth').find('input, textarea').val('');
            $('select[name="sttype"]').val('api')

            $.post('/settings/editapi/', {
                _id: _id
            }).done(function (api) {
                var stname = api.name || '';
                var sturl = api.settings.url || '';
                var sttype = api.settings.type || '';
                var stcategory = api.settings.category || '';

                $('input[name="stname"]').val(stname);
                $('input[name="sturl"]').val(sturl);
                $('select[name="sttype"]').val(sttype);
                $('select[name="sttype"]').change();
                $('input[name="stcategory"]').val(stcategory);

                var stAuth = api.authorization.stAuth;
                $('select[name="stAuth"]').val(stAuth);
                $('select[name="stAuth"]').change();

                if (stAuth == '1') {
                    var stusername = api.authorization.username || '';
                    var stpassword = api.authorization.password || '';
                    $('input[name="stusername"]').val(stusername);
                    $('input[name="stpassword"]').val(stpassword);
                } else if (stAuth == '2') {
                    var stkey = api.authorization.key || '';
                    var stvalue = api.authorization.value || '';
                    $('input[name="stkey"]').val(stkey);
                    $('input[name="stvalue"]').val(stvalue);
                } else if (stAuth == '3') {
                    var sttoken = api.authorization.token || '';
                    $('textarea[name="sttoken"]').val(sttoken);
                }
            })
        })


        $(".trashapi").kickme({
            confirm: "<a href='#' class='btn btn-xs btn-primary confirm-yes'><i class='fa fa-check'></i></a>",
            cancel: "<a href='#' class='btn btn-xs btn-danger confirm-no'><i class='fa fa-times'></i></a>",
            separator: "&nbsp;",
            expiresIn: 4,
            confirmCallback: function ($button) {
                var _id = $button.closest('tr').data('id');
                $.post('/settings/remove_api/', {
                    _id: _id
                }).done(function (data) {
                    $button.parents("tr").fadeOut("fast");
                    toastr.success(data.message);
                }).fail(function (err) {
                    try { toastr.error(err.responseJSON['message']); } catch (e) { }
                })
            }
        });


        $(".trashtpl").kickme({
            confirm: "<a href='#' class='btn btn-xs btn-success confirm-yes'><i class='fa fa-check'></i></a>",
            cancel: "<a href='#' class='btn btn-xs btn-danger confirm-no'><i class='fa fa-times'></i></a>",
            separator: "&nbsp;",
            expiresIn: 4,
            confirmCallback: function ($button) {
                var _id = $button.closest('tr').data('id');
                $.post('/settings/remove_template/', {
                    _id: _id
                }).done(function (data) {
                    $button.parents("tr").fadeOut("fast");
                    toastr.success(data.message);
                }).fail(function (err) {
                    try { toastr.error(err.responseJSON['message']); } catch (e) { }
                })
            }
        });

        // Report
        $('#sendreport').on('click', function (e) {
            e.preventDefault();

            var _btn = $(this);
            _btn.prop('disabled', true);

            _btn.html(`<i class="fa fa-refresh fa-spin"></i> Send Report`);

            var _r = $("#desprob").val();
            if (!_r || _r == "") return toastr.error("Report cannot be empty.")

            $.post('/settings/send_report', { _r: _r }).done(function (data) {
                _btn.prop('disabled', false);
                _btn.html(`<i class="fa fa-send"></i> Send Report`);
                // var url = "/settings/services/";
                // toastr.options.onclick = function () { window.location.href = url; }
                // toastr.options.onHidden = function () { window.location.href = url; }
                toastr.success(data.message);
            }).fail(function (err) {
                _btn.prop('disabled', false);
                _btn.html(`<i class="fa fa-send"></i> Send Report`);
                try { toastr.error(err.responseJSON['message']); } catch (e) { }
            })
        })

        // Update
        $('#checkupdate').on('click', function (e) {
            e.preventDefault();
            var _nload = $(this).find('.nload');
            _nload.addClass('loading');
            $.post('/settings/check_update/').done(function (data) {
                _nload.removeClass('loading');

                var _update = data.update;

                if (_update && _update == true) {
                    var url = "/settings/services/";
                    toastr.options.onclick = function () {
                        window.location.href = url;
                    }
                    toastr.options.onHidden = function () {
                        window.location.href = url;
                    }
                }

                toastr.success(data.message);
            }).fail(function (err) {
                try { toastr.error(err.responseJSON['message']); } catch (e) { }
            })
        })

        $('#updatebot').btsConfirmButton({
            msg: 'Are you sure ? ',
            classname: 'text-danger',
            timeout: 3000
        }, function (e) {
            $('#updatests').html(`<div class="lead font14 alert alert-success alert-dismissable"><center><i class="fa fa-refresh fa-spin fa-fw"></i> Update is currently in progress. Please wait a few moments...</center></div>`);
            return $.post('/settings/updatebot/', {});
        })

        $('#dismissupdate').on('click', function () {
            return $.post('/settings/dismissupdate/');
        })

        $('#showfeatures').on('click', function (e) {
            $('#featureslist').toggle();
        })


    })

    //Start-Services
    $.fn.extend({
        toggleText: function (a, b) {
            return this.text(this.text() == b ? a : b);
        }
    });

    $.fn.extend({
        toggleHtml: function (a, b) {
            return this.html(this.html() == b ? a : b);
        }
    });

    $(document).ready(function () {

        //showPassword
        $('.srvpass').on('click', function () {
            var _this = $(this);
            var _type = $(this).closest('div.form-group').data('type');

            $.post('/settings/get_password/', {
                type: _type
            }).done(function (data) {
                var _pass = data ? data.password : null;
                if (_pass) {
                    _this.prev('.mhpassword').toggleText(`•••••••••••••••••`, `${_pass}`)
                }
            })
        })


        $(".gnpass").kickme({
            confirm: '<a class="btn btn-danger btn-sm confirm-yes"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i> Are you sure ?</a>',
            cancel: '<a class="btn btn-default btn-sm confirm-no"><i class="fa fa-times" aria-hidden="true"></i> Cancel</a>',
            separator: "&nbsp;",
            expiresIn: 4,
            confirmCallback: function ($button) {
                var _type = $button.closest('div.form-group').data('type');
                $.post('/settings/reset_password/', {
                    type: _type
                }).done(function (lpass) {
                    $button
                        .closest("div")
                        .prev('div')
                        .find('.mhpassword')
                        .html(`•••••••••••••••••`);
                })
            }
        });

        $(".restartsrv").kickme({
            confirm: '<a class="btn btn-danger btn-sm confirm-yes"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i> Are you sure ?</a>',
            cancel: '<a class="btn btn-default btn-sm confirm-no"><i class="fa fa-times" aria-hidden="true"></i> Cancel</a>',
            separator: "&nbsp;",
            expiresIn: 4,
            confirmCallback: function ($button) {
                var _type = $button.data('type');
                $.post('/settings/restart_service/', {
                    type: _type
                }).done(function (result) {
                    $button
                        .closest("div")
                        .prev('div')
                        .find('.mhpassword')
                        .html(`•••••••••••••••••`);
                })
            }
        });
    })

    $(document).on('click', '.vtask', function () {
        var btn = $(this);
        var _id = btn.closest('tr').data('task');
        return _expand(_id);
    })

    function _expand(_idk) {
        $("tr[data-idk='" + _idk + "']").toggle("fast");
        $('tr._miniTr:not([data-idk="' + _idk + '"])').hide()
        return;
    }

    function _copylinks(opts) {
        opts = opts || {};

        var _ti = opts._ti;//
        var _si = opts._si;//
        var _ty = opts._ty;//
        var _st = opts._st;//

        if (!_ti) return false;
        if (!_ty) return false;
        if (!_st) return false;

        $.ajax({
            url: '/logs/mcopy/',
            async: false,
            data: { _ti: _ti, _si: _si, _ty: _ty, _st: _st },
            type: 'POST',
            success: function (data) {
                if (!data || data == "") return false;
                let copyFrom = document.createElement("textarea");
                document.body.appendChild(copyFrom);
                copyFrom.textContent = data;
                copyFrom.select();
                document.execCommand("copy");
                copyFrom.remove();
            }
        });

    }

    $(function () {
        //main Task
        $.contextMenu({
            selector: 'tr[data-task]',
            build: function ($trigger, e) {
                return {
                    callback: function (dcom, options) {
                        var _taskid = $(this).data("task");
                        var _subid = $(this).attr("_subid");
                        if (!_taskid) return;
                        var _trigger = options.$trigger;
                        //send commands to switcher in Task Handler Class
                        if (dcom == 'expand_subtasks' && _taskid)
                            return _expand(_taskid);

                        if (dcom == 'copy_link_b' && _taskid)
                            return _copylinks({ _ti: _taskid, _ty: 'text', _st: 'main' });

                        if (dcom == 'copy_bbcode_b' && _taskid)
                            return _copylinks({ _ti: _taskid, _ty: 'bbcode', _st: 'main' });

                        if (dcom == 'copy_json_b' && _taskid)
                            return _copylinks({ _ti: _taskid, _ty: 'json', _st: 'main' });

                        if (dcom == 'copy_html_b' && _taskid)
                            return _copylinks({ _ti: _taskid, _ty: 'html', _st: 'main' });

                        if (dcom == 'copy_template_b' && _taskid)
                            return _copylinks({ _ti: _taskid, _ty: 'template', _st: 'template' });

                        var opts = {
                            _main: true,
                            _taskid: _taskid,
                            _dcom: dcom
                        }

                        if (dcom == 'delete_task_b' && _taskid) {
                            swal({
                                title: "Are you sure?",
                                text: "Are you sure you want to Delete this task permanently ?",
                                showCancelButton: true,
                                confirmButtonColor: "#DD6B55",
                                confirmButtonText: "Yes, delete",
                                closeOnConfirm: true
                            }, function (value) {
                                if (value == true) {
                                    _trigger.fadeOut();
                                    _trigger.next('._miniTr').remove();// use remove instead
                                    return $.post('/tasks/run', opts);
                                }
                                return false;
                            });
                        } else if (dcom == 'delete_subtasks_b' && _taskid) {
                            swal({
                                title: "",
                                text: "Are you sure you want to Delete Sub-tasks ?",
                                showCancelButton: true,
                                confirmButtonColor: "#DD6B55",
                                confirmButtonText: "Yes, delete",
                                closeOnConfirm: true
                            }, function (value) {
                                if (value == true) {
                                    _trigger.next('tr').remove(); // use remove instead
                                    return $.post('/tasks/run', opts);
                                }
                                return false;
                            });
                        } else if (dcom == 'delete_alltask_b') {
                            swal({
                                title: "Delete All task permanently ?",
                                text: "",
                                showCancelButton: true,
                                confirmButtonColor: "#DD6B55",
                                confirmButtonText: "Yes, delete",
                                closeOnConfirm: true
                            }, function (value) {
                                if (value == true) {
                                    _trigger.fadeOut();
                                    _trigger.nextAll('tr').remove();// use remove instead
                                    $('.pagination').fadeOut()
                                    $("#taski > tbody").html(`<center><h5><i class="fa fa-exclamation-circle"></i> No Tasks Available</h4></center>`);
                                    return $.post('/tasks/run', opts);
                                }
                                return false;
                            });

                        } else if (dcom == 'access_rutorrent') {
                            window.open('/rutorrent');
                            return;
                        } else {
                            $.post('/tasks/run', opts)
                        }
                    },
                    items: {
                        "start_task_b": {
                            name: "Start Task",
                            icon: "fa-play"
                        },
                        "sep1": "---------",

                        "expand_subtasks": {
                            name: "Expand",
                            icon: "fa-expand"
                        },
                        "Copy to clipboard": {
                            "name": "Copy to clipboard",
                            "items": {
                                "copy_link_b": {
                                    name: "Links",
                                    icon: "fa-copy"
                                },
                                "_sep1": "---------",
                                "copy_bbcode_b": {
                                    name: "BBCode",
                                    icon: "fa-bold"
                                },
                                "copy_json_b": {
                                    name: "JSON",
                                    icon: "fa-code"
                                },
                                "copy_html_b": {
                                    name: "HTML",
                                    icon: "fa-html5"
                                },
                                "_sep2": "---------",
                                "copy_template_b": {
                                    name: "Template",
                                    icon: "fa-file-text-o"
                                }
                            }
                        },
                        // "view_topic": {
                        //     name: "View Related Topic",
                        //     icon: "fa-database"
                        // },
                        "sep2": "---------",
                        "restart_torrent_b": {
                            name: "Reload Torrent",
                            icon: "fa-magnet"
                        },
                        "stop_torrent_b": {
                            name: "Stop Torrent",
                            icon: "fa-stop-circle-o"
                        },
                        "access_rutorrent": {
                            name: "Access Rutorrent",
                            icon: "fa-rutorrent"
                        },
                        "sep3": "---------",
                        "restart_task_b": {
                            name: "Re-Start",
                            icon: "fa-history"
                        },
                        "abort_task_b": {
                            name: "Abort Task",
                            icon: "fa-ban"
                        },
                        "sep4": "---------",
                        "abort_all": {
                            name: "Stop All Tasks",
                            icon: "fa-square"
                        },
                        "start_all": {
                            name: "Start All Tasks",
                            icon: "fa-play"
                        },
                        "sep5": "---------",
                        "delete_task_b": {
                            name: "Delete Task",
                            icon: "fa-times"
                        },
                        "delete_subtasks_b": {
                            name: "Delete Sub-Tasks",
                            icon: "fa-minus"
                        },
                        "sep6": "---------",
                        "delete_alltask_b": {
                            name: "Delete All Tasks",
                            icon: "fa-trash-o"
                        }

                    }
                };
            }
        });

        //sub Tasks
        $.contextMenu({
            selector: '.tableTask tr',
            build: function ($trigger, e) {
                return {
                    callback: function (dcom, options) {
                        var _taskid = $(this).attr("_taskid");
                        var _subid = $(this).attr("_subid");

                        var _trigger = options.$trigger;

                        if (!_taskid || !_subid) return;

                        if (dcom == 'copy_link_m' && _taskid && _subid)
                            return _copylinks({ _ti: _taskid, _si: _subid, _ty: 'text', _st: 'sub' });

                        if (dcom == 'copy_bbcode_m' && _taskid && _subid)
                            return _copylinks({ _ti: _taskid, _si: _subid, _ty: 'bbcode', _st: 'sub' });

                        if (dcom == 'copy_json_m' && _taskid && _subid)
                            return _copylinks({ _ti: _taskid, _si: _subid, _ty: 'json', _st: 'sub' });

                        if (dcom == 'copy_html_m' && _taskid && _subid)
                            return _copylinks({ _ti: _taskid, _si: _subid, _ty: 'html', _st: 'sub' });

                        var opts = {
                            _taskid: _taskid,
                            _subid: _subid,
                            _dcom: dcom
                        }

                        if (dcom == 'delete_m' && _taskid && _subid) {
                            swal({
                                title: "Are you sure?",
                                text: "Are you sure you want to delete this task permanently ?",
                                showCancelButton: true,
                                confirmButtonColor: "#DD6B55",
                                confirmButtonText: "Yes, delete",
                                closeOnConfirm: true
                            }, function (value) {
                                if (value == true) {
                                    _trigger.fadeOut();
                                    return $.post('/tasks/run', opts)
                                }
                                return false;
                            });
                        } else {
                            $.post('/tasks/run', opts);
                        }
                    },
                    items: {
                        "start_m": {
                            name: "Start",
                            icon: "fa-play"
                        },
                        "restart_m": {
                            name: "Re-Start",
                            icon: "fa-history"
                        },
                        "cancel_m": {
                            name: "Cancel upload",
                            icon: "fa-ban"
                        },
                        "sep3": "---------",
                        "Copy to clipboard": {
                            "name": "Copy to clipboard",
                            "items": {
                                "copy_link_m": {
                                    name: "Link",
                                    icon: "fa-copy"
                                },
                                "_sep1": "---------",
                                "copy_bbcode_m": {
                                    name: "BBCode",
                                    icon: "fa-bold"
                                },
                                "copy_json_m": {
                                    name: "JSON",
                                    icon: "fa-code"
                                },
                                "copy_html_m": {
                                    name: "HTML",
                                    icon: "fa-html5"
                                }
                            }
                        },
                        "sep4": "---------",
                        "delete_m": {
                            name: "Delete Permanently",
                            icon: "fa-times"
                        },
                    }
                };
            }
        });
    });


    $(document).ready(function () {
        var editor;

        function lsvar(data, status) {
            var _type = data.type;

            $('#opform').show();
            $('#tlpreview').hide();
            if (status == true) $('#litemplates').hide();
            $('#tplexamples').hide();

            if (_type == 'json') {
                $('#tlpreview').hide();

                $('select[name="tpltype"] option').prop('disabled', false);
                $('select[name="tpltype"]').val('json');
                $('select[name="tpltype"] option[value!=json]').prop('disabled', true);

                $('#tlarea').html('<textarea spellcheck="false" class="form-control" id="messagetx" name="messagetx" rows="12" placeholder="Click here to reply" style="width: 100%">{"data": {"release": "{grelease}","type": "{gtype}","size": "{gsize}","infos": {"title": "{mt_title}","year": "{mt_year}","runtime": "{mt_runtime}","genres": "{mt_genres}","summary": "{mt_summary}","stars": "{mt_stars}","rating": "{mt_rating}","source": "{mt_source}"},"poster": {"original": "{mt_poster}","upload": "{gposter}"},"@meta": {"media_format": "{media_format}","video_duration":"{video_duration}","video_codec": "{video_codec}","video_infos": "{video_infos}","audio_infos": "{audio_infos}","thumbnail": "{gthumbnail}","nfo": "{gnfo}"}},"links": {"sample": "{gsample}","download_links": "{download_links}"}}</textarea>')

                editor = ace.edit('messagetx');
                editor.setHighlightActiveLine(true);
                editor.getSession().setUseWrapMode(true);

                editor.focus();
                editor.navigateFileEnd();

                editor.setFontSize(13);
                editor.setOptions({
                    enableBasicAutocompletion: true,
                    enableLiveAutocompletion: true,
                    tabSize: 2,
                    //
                    autoScrollEditorIntoView: true,
                    maxLines: 40,
                    minLines: 20,
                    useWrapMode: true,
                    highlightActiveLine: true,
                    showPrintMargin: false,
                    theme: 'ace/theme/github',
                    mode: 'ace/mode/json'
                })

                try {
                    var val = editor.session.getValue()
                    var o = JSON.parse(val);
                    val = JSON.stringify(o, null, 4).replace(/\s(?=\w+":)/g, "")
                    editor.session.setValue(val)
                } catch (e) { }

            } else {

                $('select[name="tpltype"] option').prop('disabled', false);
                $('select[name="tpltype"]').val('bbcode');
                $('select[name="tpltype"] option[value=json]').prop('disabled', true);

                $('#tplexamples').show();

                $('#tlarea').html('<textarea spellcheck="false" class="form-control" id="messagetx" name="messagetx" rows="12" placeholder="Click here to reply" style="width: 100%"></textarea>');

                $("#messagetx").sceditor({
                    plugins: "undo",
                    format: 'bbcode',
                    width: "100%",
                    height: '460px',
                    toolbar: "bold,italic,underline,strike|image|left,center,right,justify|size,color,removeformat|bulletlist,orderedlist,horizontalrule,rtl|source",
                    locale: "fr",
                    bbcodeTrim: true,
                    resizeHeight: true,
                    resizeWidth: false,
                    autofocus: true,
                    spellcheck: false,
                }).sceditor('instance').css('@import url(/assets/css/customd.css); html, body, p, code:before, table {font-family: "Open Sans", sans-serif;font-size:.94rem;}');
            }
            $('html,body').animate({ scrollTop: $("#savetpl").offset().top }, 'slow');
        }

        $('.lsvariables').on('click', function (e) {
            e.preventDefault();

            //clear inputs
            $('input[name=tplname]').val("");
            $('input[name=tpltitle]').val("");

            var _type = $(this).data('type');
            var data = { type: _type };

            return lsvar(data, true);
        });

        $('.litemplates').on('click', function (e) {
            e.preventDefault()
            $('#litemplates').fadeToggle('fast');
        })

        $('.extpl').on('click', function (e) {
            e.preventDefault();
            var _mt =
                '\n[center]{mt_poster}(height=120)' +
                '\n' +
                '\n[size=5]{grelease}[/size]' +
                '\n' +
                '\n[b]Title :[/b] {mt_title}' +
                '\n[b]Date release :[/b] {mt_year}' +
                '\n[#if][b]Runtime :[/b] {mt_runtime}[/if]' +
                '\n' +
                '\n[#if][b]Genres :[/b] {mt_genres}[/if]' +
                '\n[#if][b]Summary :[/b] {mt_summary}[/if]' +
                '\n[#if][b]Stars :[/b] {mt_stars}[/if]' +
                '\n[#if][b]Rating :[/b] {mt_rating}[/if]' +
                '\n' +
                '\n[#if][b]Summary :[/b] {mt_summary}[/if]' +
                '\n' +
                '\n[#if][b]Episode :[/b] {mt_episode}[/if]' +
                '\n[#if][b]Season :[/b] {mt_season}[/if]' +
                '\n[#if][b]Aired :[/b] {mt_air_episode}[/if]' +
                '\n' +
                '\n[b]Release :[/b] {grelease}' +
                '\n[b]Size :[/b] {gsize}' +
                '\n' +
                '\n[b][size=3]#Sample[/size] :[/b]' +
                '\n{gsample}(anchor=View Sample {mt_host})' +
                '\n' +
                '\n{gthumbnail}(width=716.8|height=421.4)' +
                '\n' +
                '\n[#if][size=3][b]#Links[/b][/size]' +
                '\n{download_links}(anchor=host)' +
                '\n[/if][/center]';

            $('#messagetx').sceditor('instance').val("");
            $('#messagetx').sceditor('instance').sourceMode(true)
            $('#messagetx').sceditor('instance').insert(_mt, false);
            $('#messagetx').sceditor('instance').sourceMode(false)

        })


        $('.ltag').on('click', function (e) {
            e.preventDefault();
            var _tag = $(this).data('tag');
            if (!$('#messagetx').sceditor('instance').insertText) return false;
            $('#messagetx').sceditor('instance').insertText(`${_tag}\n`);
        })


        $('#savetpl').on('click', function (e) {
            e.preventDefault();

            var btn = $(this).find(":submit");

            var _tplname = $('input[name=tplname]').val();
            var _title = $('input[name=tpltitle]').val();
            var _type = $('select[name=tpltype]').val();

            if (!_tplname) {
                $('input[name=tplname]').closest('.form-group').addClass('has-error');
                return false;
            } else {
                $('input[name=tplname]').closest('.form-group').removeClass('has-error').addClass('has-success');
            }

            btn.addClass('disabled');

            var _val;
            if (editor && _type == 'json') {
                _val = editor.getValue();
                try {
                    _val = JSON.parse(_val);
                    _val = JSON.stringify(_val);
                } catch (e) {
                    return false;
                }
            } else {
                _val = $("#messagetx").sceditor('instance').val();
                if (_type == 'html') {
                    _val = $("#messagetx").sceditor('instance').fromBBCode(_val);
                    _val = _val.replace(/<div>(.*?)<br\s+\/><\/div>/ig, '<span>$1</span>');
                }
            }

            if (!_val) return false;

            var _data = { name: _tplname, type: _type, title: _title, template: _val }
            $.post('/settings/templates/', _data).done(function (data) {
                btn.removeClass('disabled');

                var url = "/settings/templates/";
                toastr.options.onclick = function () {
                    window.location.href = url;
                }

                toastr.success(data.message);
            }, 'json').fail(function (err) {
                btn.removeClass('disabled');
                try { toastr.error(err.responseJSON['message']); } catch (e) { }
            })

        })


        $('.editpl').on('click', function (e) {
            e.preventDefault();

            var _type = $(this).data('type');
            var _id = $(this).closest('tr').data('id');

            lsvar({ type: _type }, false);

            $.post('/settings/editemplate/', {
                _id: _id
            }).done(function (result) {
                result = result || [];

                var stname = result['name'] || '';

                var stype = result['data']['type'] || '';
                var stitle = result['data']['title'] || '';
                var stemplate = result['data']['template'] || '';

                $('input[name=tplname]').val(stname);
                $('select[name=tpltype]').val(stype);
                $('input[name=tpltitle]').val(stitle);

                var _val;
                if (editor && _type == 'json') {
                    try {
                        var o = JSON.parse(JSON.stringify(stemplate))
                        stemplate = JSON.stringify(o, null, 4).replace(/\s(?=\w+":)/g, "")
                        editor.session.setValue(stemplate)
                    } catch (e) {
                        return false;
                    }
                } else {
                    _val = $("#messagetx").sceditor('instance').val();
                    //Test convert before send
                    if (_type == 'html') {
                        stemplate = stemplate.replace(/<div>(.*?)<br\s+\/><\/div>/ig, '<span>$1</span>');
                        stemplate = $("#messagetx").sceditor('instance').toBBCode(stemplate);
                    } else {
                        stemplate = stemplate;
                    }
                    $('#messagetx').sceditor('instance').val("");
                    $('#messagetx').sceditor('instance').sourceMode(true)
                    $('#messagetx').sceditor('instance').insert(stemplate, false);
                    $('#messagetx').sceditor('instance').sourceMode(false)
                }
            })
            $('html,body').animate({ scrollTop: $("#savetpl").offset().top }, 'slow');
        })

    });

    //Logs
    $(document).ready(function () {

        $('.akview').on('click', function (e) {
            e.preventDefault();

            $('.collapse').collapse('hide');

            var _id = $(this).data('id');
            $('div#' + _id).find('.lablog[data-type=1]').click();
        })

        $(document).on('shown.bs.collapse', function (e) {
            e.target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        });
    });
    //html-->

    $('.achlinks').on('change', function () {
        var _id = $(this).data('lid');
        var _status = $(this).is(':checked');
        $.post('/logs/shlink', {
            _id: _id,
            _status: _status
        }).done(function (result) {
            $('div#' + _id).find('.lablog[data-type=1]').click();
        })
    })

    $(document).on('click', '.lablog', function () {
        $(".lablog").prop('disabled', true)

        var _id = $(this).closest('.panel-collapse').attr('id');

        var _t = $(this).data('type');

        $('#pr_' + _id).html(`<center><i class="fa fa-cog fa-spin fa-2x fa-fw"></i></center>`);

        grabLog({ _id: _id, _t: _t }, function (e, _res) {
            $('#pr_' + _id).html(``);
            $(".lablog").prop('disabled', false)

            if (!_res) return;

            var _type = _res.type;
            var _stype = _res.stype;
            var _code = _res.code;
            var _data = _res.data;

            var _preview = "";

            if (_type == 1) {
                if (_stype == 'bbcode') {
                    var textarea = document.getElementById('vediv');
                    sceditor.create(textarea, {
                        format: 'bbcode'
                    });
                    _preview = sceditor.instance(textarea).fromBBCode(_code);

                    if (/thetvdb/ig.test(_preview)) {
                        _preview = _preview.replace(/https:\/\/www\.thetvdb/, '/torrents/img?i=https://www.thetvdb');
                    }
                    $('#pr_' + _id).html(`${_preview}`);
                    sceditor.instance(textarea).destroy();

                } else if (_stype == 'html') {
                    _preview = _code.trim();
                    _preview = _preview.replace(/\\\"/ig, '"')
                    _preview = _preview.replace(/((\s+)?<br(\s+)?(\/)?>){4,}/img, '<br><br><br>');

                    if (/thetvdb/ig.test(_preview)) {
                        _preview = _preview.replace(/https:\/\/www\.thetvdb/, '/torrents/img?i=https://www.thetvdb');
                    }

                    $('#pr_' + _id).removeClass('pre-scrollable').html(`${_preview}`);
                } else if (_stype == 'json') {
                    try {
                        var parsed = JSON.parse(_code);
                        _preview = JSON.stringify(parsed, null, "\t");
                        _preview = syntaxHighlight(_preview)
                    } catch (e) {
                        _preview = _code;
                    }
                    $('#pr_' + _id).html(`${_preview}`);
                }
            } else if (_type == 2) {
                if (_stype == 'bbcode') {
                    _preview = _code.trim();
                    _preview = _preview.replace(/\\\"/ig, '"')
                    _preview = _preview.replace(/(\n){3,}/ig, '\n')
                    $('#pr_' + _id).html(`${_preview}`);

                } else if (_stype == 'html') {
                    _preview = formatFactory(_code);
                    _preview = _preview.replace(/\\\"/ig, '"')
                    _preview = _preview.replace(/((\s+)?<br(\s+)?(\/)?>){2,}/img, '<br><br>');

                    $('#pr_' + _id).addClass('pre-scrollable').text(`${_preview}`);
                } else if (_stype == 'json') {
                    try {
                        var parsed = JSON.parse(_code);
                        _preview = JSON.stringify(parsed, null, "\t");
                        _preview = syntaxHighlight(_preview)
                    } catch (e) {
                        _preview = _code;
                    }
                    $('#pr_' + _id).html(`${_preview}`);
                }
            } else if (_type == 3) {
                _preview = JSON.stringify(_data, null, 4);
                _preview = _preview.replace(/(\\{2,})\"/ig, '\\"')
                _preview = syntaxHighlight(_preview)
                $('#pr_' + _id).removeClass('pre-scrollable').html(`${_preview}`);
            }
        })
    })

    function syntaxHighlight(json) {
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
            var cls = 'number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'key';
                } else {
                    cls = 'string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'boolean';
            } else if (/null/.test(match)) {
                cls = 'null';
            }
            return '<span class="' + cls + '">' + match + '</span>';
        });
    }

    function selectText(containerid) {
        if (document.selection) { // IE
            var range = document.body.createTextRange();
            range.moveToElementText(document.getElementById(containerid));
            range.select();
            document.execCommand("copy")
        } else if (window.getSelection) {
            var range = document.createRange();
            range.selectNode(document.getElementById(containerid));
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
            document.execCommand("copy")
        }
    }

    function formatFactory(html) {
        function parse(html, tab = 0) {
            var tab;
            var html = $.parseHTML(html);
            var formatHtml = new String();

            function setTabs() {
                var tabs = new String();

                for (i = 0; i < tab; i++) {
                    tabs += '\t';
                }
                return tabs;
            };

            $.each(html, function (i, el) {
                if (el.nodeName == '#text') {
                    if (($(el).text().trim()).length) {
                        formatHtml += setTabs() + $(el).text().trim() + '\n';
                    }
                } else {
                    var innerHTML = $(el).html().trim();
                    $(el).html(innerHTML.replace('\n', '').replace(/ +(?= )/g, ''));


                    if ($(el).children().length) {
                        $(el).html('\n' + parse(innerHTML, (tab + 1)) + setTabs());
                        var outerHTML = $(el).prop('outerHTML').trim();
                        formatHtml += setTabs() + outerHTML + '\n';

                    } else {
                        var outerHTML = $(el).prop('outerHTML').trim();
                        formatHtml += setTabs() + outerHTML + '\n';
                    }
                }
            });

            return formatHtml;
        };

        return parse(html.replace(/(\r\n|\n|\r)/gm, " ").replace(/ +(?= )/g, ''));
    };

    function grabLog(opts, cb) {
        opts = opts || {};
        var _id = opts._id || null;
        var _t = opts._t || 1;

        $.post('/logs/view', {
            _id: _id,
            _t: _t
        }).done(function (result) {
            return cb(null, result);
        }).fail(function (error) {
            return cb(error);
        })
    }

})



