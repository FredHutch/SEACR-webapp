/*
 * jQuery File Upload Plugin JS Example 8.9.1
 * https://github.com/blueimp/jQuery-File-Upload
 *
 * Copyright 2010, Sebastian Tschan
 * https://blueimp.net
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/MIT
 */

/* global $, window */

var filesUploadedSuccessfully = 0;
var expectedNumberOfUploads = 0;
var uploadedFiles = [];
var jobTimestamp = null;
var taskId = null;

function pad(num, size) {
    var s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
}

getTimestamp = function () {
    var now = new Date()
    var locale = "en-US";
    var out = now.toLocaleString(locale, { year: 'numeric' });
    out += now.toLocaleString(locale, { month: '2-digit' });
    out += now.toLocaleString(locale, { day: '2-digit' });
    out += now.toLocaleString("en-US", { hour: '2-digit', hour12: false });
    out += now.toLocaleString("en-US", { minute: '2-digit' });
    out += now.toLocaleString("en-US", { second: '2-digit' });
    out += pad(now.getMilliseconds(), 4);
    return out;
}

isEmpty = function (thing) {
    // TODO unhardcode these everywhere:
    var empty = ["target data bedgraph file", "Control (IgG) data bedgraph file", ""]
    return empty.indexOf(thing) != -1
}

// are one or more files selected?
fileSelected = function () {
    var boxes = ["file1", "file2"];
    var box;
    var empty = ["target data bedgraph file", "Control (IgG) data bedgraph file", ""]
    for (box of boxes) {
        var selector = "#" + box;
        var placeholder = $(selector).attr('placeholder');
        if (!isEmpty(placeholder)) return true;
    }
    return false;
}

// clear out form items when page is reloaded
cleanup = function () {
    $("#outputprefix").val("");
    $("#threshold").val("");
}

validate = function () {
    // TODO validate file name extensions, only allow .bedgraph extension
    // and any other stuff (file size) that is handled by the framework
    var errors = [];
    var file1 = $("#file1").attr('placeholder');
    if (isEmpty(file1)) {
        errors.push("Select a target data bedgraph file.");
    }
    var file2 = $("#file2").attr('placeholder');
    var threshold = $("#threshold").val();
    if (isEmpty(file2) && threshold == "") {
        errors.push("Select a control file or choose a numeric threshold.");
    }
    if ((!isEmpty(file2)) && threshold != "") {
        errors.push("Choose control file OR numeric threshold, not both.")
    }
    if (threshold != "" && isNaN(Number(threshold))) {
        errors.push("Threshold must be a number.")
    }
    if (threshold != "" && !isNaN(Number(threshold))) {
        var numthresh = Number(threshold);
        if (numthresh < 0 || numthresh > 1) {
            errors.push("Threshold must be between 0 and 1.");
        }
    }
    var outputprefix = $("#outputprefix").val();
    if (outputprefix == "") {
        errors.push("Select an output prefix.");
    }
    var badchars = ['.', '/', '\\'];
    for (var i = 0; i < badchars.length; i++) {
        var ch = badchars[i];
        if (outputprefix.indexOf(ch) > -1) {
            errors.push("Output prefix cannot contain '.', '/', or '\\'.");
            break;
        }
    }
    if (errors.length > 0) {
        $("#error_list").html(errors.join("<br>"));
        $("#validation_failure_modal").modal();
        return false;
    }
    return true;
}

getFileName = function (file1or2) {
    var selector = "#" + file1or2;
    var placeholder = $(selector).attr('placeholder');
    if (isEmpty(placeholder)) return null;
    return placeholder;
}

kickOffJob = function () {
    $("#console-hideme").show();
    jobTimestamp = getTimestamp();
    $.ajax({
        contentType: "application/json;charset=UTF-8",
        dataType: "json",
        method: "POST",
        url: "/kick_off_job",
        data: JSON.stringify({
            timestamp: jobTimestamp,
            file1: getFileName("file1"),
            file2: getFileName("file2"),
            threshold: $("#threshold").val(),
            normnon: $('input[name=normnon]:checked').val(),
            unionauc: $('input[name=unionauc]:checked').val(),
            output_prefix: $("#outputprefix").val()
        })
    }).done(function (msg) {
        taskId = msg['taskId'];
        console.log("celery task id is " + taskId);
        pollJob(msg['taskId']);
    });
}

function serveResultFiles(taskId, obj) {
    var resultFiles = obj['info'][1];
    var html = "";
    for (var i = 0; i < resultFiles.length; i++) {
        var resultFile = resultFiles[i];
        html += '<a href="/send_file/' + 
            jobTimestamp + '/' + $("#outputprefix").val() +
               '/' + i + '">Download result file ' + resultFile + 
               '</a>&nbsp;'
    }
    $("#scroll_to_me").get(0).scrollIntoView();
    $("#results-container").show();
    $("#results").append(html);
}

function handleTaskFailure(obj) {
    // TODO show any error messages and nonzero result code in UI
}

var seenLogMessages = {};

function updateTaskUi(obj) {
    var previousState = $("#task_status").html();
    var currentState = obj['state'];
    if (previousState != currentState) {
        $("#task_status").html(currentState);
    }
    var color = 'black';
    if (obj['log_obj'] != null) {
        // if (!seenLogMessages.hasOwnProperty(obj['log_obj'])) {
        if (true) {
            seenLogMessages[obj['log_obj']] = 1;
            console.log(obj);
            if (obj['log_obj']['data'].length > 600 && obj['log_obj']['data'].indexOf("Done:") > -1) {
                console.log("This message does not belong here.");
                return;
            }
            console.log(obj['log_obj']['data']);
            if (obj['log_obj']['stream'] == "STDERR") color = "red";
            var msg = obj['log_obj']['data'].trim().replace("\n\n", "\n").split("\n").join("<br/>\n") + "<br/>\n";
            var html = '<span style="font-family: Courier New; color: ' + color + ';">' + msg + '</span>';
            $("#console").append(html);
            $("#scroll_to_me").get(0).scrollIntoView();
        } else {
            console.log("we have seen this log message before")
        }

    } else {
        console.log("log obj is null");
    }
}

pollJob = function (taskId) {
    var finalStates = ['SUCCESS', 'FAILURE', 'REVOKED'];
    (function poll() {
        setTimeout(function () {
            $.getJSON("/get_job_status", { job_id: taskId }, function (obj) {
                // handle log messages & console state here
                updateTaskUi(obj);
                if (finalStates.indexOf(obj['state']) > -1) {
                    if (obj['state'] == 'SUCCESS') {
                        serveResultFiles(taskId, obj);
                    } else {
                        handleTaskFailure(obj);
                    }
                    return;
                }
                poll();
            });
        }, 1000);
    })();
}

$(function () {
    'use strict';

    cleanup();
    $("#submitbutton").bind('click', function () {
        if (fileSelected()) {
        } else {
            return validate();
        }
    });
    // Initialize the jQuery File Upload widget:
    $('#fileupload').fileupload({
        // Uncomment the following to send cross-domain cookies:
        //xhrFields: {withCredentials: true},
        url: '/upload',
        autoUpload: false, // Does not seem necessary?
        dropZone: null,
        submit: function (e, data) {
            var valid = validate();
            if (valid && expectedNumberOfUploads == 0) {
                if (!isEmpty($("#file1").attr('placeholder'))) {
                    expectedNumberOfUploads += 1;
                }
                if (!isEmpty($("#file2").attr('placeholder'))) {
                    expectedNumberOfUploads += 1;
                }
                $("#progress-container").show();
                $("#fileupload").hide();

                if (expectedNumberOfUploads == 1) {
                    $("#control-progress-container").hide();
                    $("#global-progress-container").hide();
                }
            }
            return valid;
        },
        // NOTE: Looks like just having 
        // an add() function stops the submit button
        done: function (e, data) {
            // TODO track state of which files have been uploaded
            if (data.result['files'][0]['name'] == ".placeholder") return
            uploadedFiles.push(data.result['files'][0]['name']);
            filesUploadedSuccessfully += 1;
            if (filesUploadedSuccessfully == expectedNumberOfUploads) {
                $("#progress-container").hide();
                // now do stuff...
                kickOffJob();
            }
        },
        send: function (e, data) {
        },
        fail: function (e, data) {
        },
        always: function (e, data) {
        },
        progress: function (e, data) {
            var assoc = $(data['fileInput'][0]).attr('assoc');
            var progress = parseInt(data.loaded / data.total * 100, 10);
            if (assoc == "file1") {
                $('#target-progress .progress-bar').css(
                    'width',
                    progress + '%'
                );
            } else if (assoc == "file2") {
                $('#control-progress .progress-bar').css(
                    'width',
                    progress + '%'
                );
            }
        },
        progressall: function (e, data) {
            var progress = parseInt(data.loaded / data.total * 100, 10);
            $('#progress .progress-bar').css(
                'width',
                progress + '%'
            );
        },
        start: function (e, data) {
        },
        stop: function (e, data) {
        }



    });


    // Enable iframe cross-domain access via redirect option:
    $('#fileupload').fileupload(
        'option',
        'redirect',
        window.location.href.replace(
            /\/[^\/]*$/,
            '/cors/result.html?%s'
        )
    );

    if (window.location.hostname === 'blueimp.github.io') {
        // Demo settings:
        $('#fileupload').fileupload('option', {
            url: '//jquery-file-upload.appspot.com/',
            // Enable image resizing, except for Android and Opera,
            // which actually support image resizing, but fail to
            // send Blob objects via XHR requests:
            disableImageResize: /Android(?!.*Chrome)|Opera/
                .test(window.navigator.userAgent),
            // TODO: reinstate a max file size when we have an idea 
            // what it should be.
            // maxFileSize: 5000000,
            acceptFileTypes: /(\.|\/)(gif|jpe?g|png|bed|bedgraph)$/i
        });
        // Upload server status check for browsers with CORS support:
        if ($.support.cors) {
            $.ajax({
                url: '//jquery-file-upload.appspot.com/',
                type: 'HEAD'
            }).fail(function () {
                $('<div class="alert alert-danger"/>')
                    .text('Upload server currently unavailable - ' +
                        new Date())
                    .appendTo('#fileupload');
            });
        }
    } else {
        // Load existing files:
        $('#fileupload').addClass('fileupload-processing');
        $.ajax({
            // Uncomment the following to send cross-domain cookies:
            //xhrFields: {withCredentials: true},
            url: $('#fileupload').fileupload('option', 'url'),
            dataType: 'json',
            context: $('#fileupload')[0]
        }).always(function () {
            $(this).removeClass('fileupload-processing');
        }).done(function (result) {
            $(this).fileupload('option', 'done')
                .call(this, $.Event('done'), { result: result });
        });
    }

});

/////

$(document).ready(function () {

    $(':file').attr('placeholder', '');

    $(':file').bind('change', function () {
        var assoc = $(this).attr('assoc');

        var arr = $(this).val().split("\\");
        var name = arr[arr.length - 1];
        $("#" + assoc).attr('placeholder', name);
    });

    $(':file').on('fileselect', function (event, numFiles, label) {
        var input = $(this).parents('.input-group').find(':text'),
            log = numFiles > 1 ? numFiles + ' files selected' : label;

        if (input.length) {
            input.val(log);
        } else {
            if (log) alert(log);
        }

    });
});

