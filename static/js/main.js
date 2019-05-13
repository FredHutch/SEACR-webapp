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
    console.log("in validate function");
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
    console.log("in kickOffJob()");
    $("#console-hideme").show();
    $("#fileupload").hide();
    //    $("#console").append('<span style="font-family: Courier New; color: orange;">dlkjfdlkjfhdf lfkdjhdlkjfhd lkjfhd<br/></span>');
    // console.log("FIXME!");
    // if (true) return;
    jobTimestamp = getTimestamp();
    console.log("set job timestamp to " + jobTimestamp);
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
        console.log("in kickOffJob done callback, message is");
        console.log(msg);
        // TODO start polling server to see when job ends,
        // displaying log messages if possible.
        // like this:
        // $.getJSON("/get_job_status", {job_id: "2112"}, function(msg) {console.log(msg)} );
        // but do it in a timer loop
        // see https://techoctave.com/c7/posts/60-simple-long-polling-example-with-javascript-and-jquery
        // after we're done, link to output files 
        // and also add a button to reload page if you want to run another analysis.

    });
}

$(function () {
    'use strict';

    cleanup();
    $("#submitbutton").bind('click', function () {
        console.log("u clicked submit");
        if (fileSelected()) {
            console.log("a file is selected");
        } else {
            console.log("no files are selected");
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
            console.log("in submit callback");
            // TODO add form validation here, return
            // true/false depending on whether form is valid.
            var valid = validate();
            if (valid && expectedNumberOfUploads == 0) {
                // TODO disable form at this point and show
                // upload progress indicators
                if (!isEmpty($("#file1").attr('placeholder'))) {
                    expectedNumberOfUploads += 1;
                }
                if (!isEmpty($("#file2").attr('placeholder'))) {
                    expectedNumberOfUploads += 1;
                }
                $("#progress-container").show();
                if (expectedNumberOfUploads == 1) {
                    $("#control-progress-container").hide();
                }
            }
            return valid;
        },
        // NOTE: Looks like just having 
        // an add() function stops the submit button
        // from working. 
        // add: function(e, data) {
        //     console.log("in add function");
        //     // TODO track files added in a global array
        //     // $.each(data.files, function (index, file) {
        //     //     console.log('Added file: ' + file.name);
        //     // });
        //     // return true;
        // },
        done: function (e, data) {
            // TODO track state of which files have been uploaded
            if (data.result['files'][0]['name'] == ".placeholder") return
            console.log("Upload done, file " + data.result['files'][0]['name'])
            console.log("result was " + data.textStatus)
            uploadedFiles.push(data.result['files'][0]['name']);
            filesUploadedSuccessfully += 1;
            if (filesUploadedSuccessfully == expectedNumberOfUploads) {
                console.log("all expected files have uploaded successfully!");
                $("#progress-container").hide();
                // now do stuff...
                kickOffJob();
            }
        },
        send: function (e, data) {
            console.log("in send callback");
        },
        fail: function (e, data) {
            console.log("in fail callback");
        },
        always: function (e, data) {
            console.log("in always callback");
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
            console.log("in start callback");
        },
        stop: function (e, data) {
            console.log("in stop callback")
        }



    });

    //attempt validation before submit
    // $("#fileupload").bind('fileuploadsubmit', function(e, data) {
    //     console.log("in validation function");
    //     // TODO add form validation here, return
    //     // true/false depending on whether form is valid.
    //     return true;
    // });

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
    console.log("in doc ready function");

    $(':file').attr('placeholder', '');

    $("#file1").bind('change', function () {
        console.log("does this work?");
    });
    $(':file').bind('change', function () {
        console.log("in change event handler");
        var assoc = $(this).attr('assoc');
        console.log("assoc is " + assoc);

        var arr = $(this).val().split("\\");
        var name = arr[arr.length - 1];
        $("#" + assoc).attr('placeholder', name);
    });

    $(':file').on('fileselect', function (event, numFiles, label) {
        console.log("fileselect triggered");
        var input = $(this).parents('.input-group').find(':text'),
            log = numFiles > 1 ? numFiles + ' files selected' : label;

        if (input.length) {
            input.val(log);
        } else {
            if (log) alert(log);
        }

    });
});

