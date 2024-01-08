


var filesUploadedSuccessfully = 0;
var expectedNumberOfUploads = 0;
var sizeOfUploads = 0;
var uploadedFiles = [];
var taskId = null;
var failedAlready = false;
var file1Progress;
var file2Progress;
var file1Size = 0;
var file2Size = 0;
var file1bytesUploaded = 0;
var file2bytesUploaded = 0;
var totalBytesUploaded = 0;


function pad(num, size) {
    var s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
}

getTimestamp = function () {
    var now = new Date()
    var locale = "en-US";
    var out = now.toLocaleString(locale, {
        year: 'numeric'
    });
    out += now.toLocaleString(locale, {
        month: '2-digit'
    });
    out += now.toLocaleString(locale, {
        day: '2-digit'
    });
    out += now.toLocaleString("en-US", {
        hour: '2-digit',
        hour12: false
    });
    out += now.toLocaleString("en-US", {
        minute: '2-digit'
    });
    out += now.toLocaleString("en-US", {
        second: '2-digit'
    });
    out += pad(now.getMilliseconds(), 4);
    return out;
}

var jobTimestamp = getTimestamp();

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
    $('[name="relaxedstringent"]').removeAttr("checked");
    $("input[name=relaxedstringent][value='relaxed']").prop("checked", true);
    $('[name="normnon"]').removeAttr("checked");
    $("input[name=normnon][value='norm']").prop("checked", true);
}

validate = function () {
    // TODO validate file name extensions, only allow .bedgraph extension
    // and any other stuff (file size) that is handled by the framework
    var errors = [];
    var file1 = $("#file1").attr('placeholder');
    if (isEmpty(file1)) {
        errors.push("Select a target data bedgraph file.");
    } else {
        if (!file1.toLowerCase().endsWith(".bedgraph")) {
            errors.push("Target data file must have .bedgraph extension.");
        }
        if (file1.includes("[") || file1.includes("]")) {
            errors.push("Target data filename cannot contain '[' or ']'.");
        }
    }
    var file2 = $("#file2").attr('placeholder');
    var threshold = $("#threshold").val();
    if (isEmpty(file2) && threshold == "") {
        errors.push("Select a control file or choose a numeric threshold.");
    }
    if (!isEmpty(file2) && (file2.includes("[") || file2.includes("]"))) {
       errors.push("Control filename cannot contain '[' or ']'.");
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
        } else if (threshold.startsWith(".")) {
            threshold = "0" + threshold;
            $("#threshold").val(threshold);
        }
    }
    if ((!isEmpty(file2)) && (!file2.toLowerCase().endsWith(".bedgraph"))) {
        errors.push("Control (IgG) file must have .bedgraph extension.");
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
    // spaces in filenames cause problems but SEACR does not 
    // care what the filenames are, so replace with underscores.
    return placeholder.replace(/ /g, "_");
}

kickOffJob = function () {
    $("#console-hideme").show();
    // jobTimestamp = getTimestamp();
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
            relaxedstringent: $('input[name=relaxedstringent]:checked').val(),
            output_prefix: $("#outputprefix").val()
        })
    }).done(function (msg) {
        taskId = msg['taskId'];
        console.log("celery task id is " + taskId);
        pollJob(msg['taskId']);
    });
}

function serveResultFiles(taskId, obj) {
    console.log("in serveResultFiles, obj is");
    console.log(obj);
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
    console.log("in handleTaskFailure, obj is");
    console.log(obj);
    $("#error-container").show();
    $("#task_status").html("ERROR");
    $("#task_status").removeClass("label-info");
    $("#task_status").addClass("label-danger");
    $("#scroll_to_me").get(0).scrollIntoView();
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

            var fdrIdx = obj['log_obj']['data'].indexOf("Empirical false discovery rate = ");
            if (fdrIdx > -1) {
                var retIdx = obj['log_obj']['data'].indexOf("\n", fdrIdx);
                if (retIdx == -1) {
                    retIdx = obj['log_obj']['data'].length - 1;
                }
                var fdr = obj['log_obj']['data'].substring(fdrIdx, retIdx);
                fdr = fdr.split("=")[1].trim();
                $("#empirical_fdr").html(fdr);
            }
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
            $.getJSON("/get_job_status", {
                job_id: taskId
            }, function (obj) {
                // handle log messages & console state here
                updateTaskUi(obj);
                if (finalStates.indexOf(obj['state']) > -1) {
                    // if (obj['state'] == 'SUCCESS') {
                    console.log("task ended with status ");
                    console.log(obj);
                    if (obj['info'][0][0] == 0) {
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



var updateProgressBar = function() {

    var totalPercentCompleted = Math.round((totalBytesUploaded * 100) / sizeOfUploads);
    $('#progress .progress-bar').css(
        'width',
        totalPercentCompleted + '%'
    );

    var file1PercentCompleted = Math.round((file1bytesUploaded * 100) / file1Size);
    console.log("file1Size is " + file1Size);
    console.log("file1PercentCompleted is " + file1PercentCompleted);
    $('#target-progress .progress-bar').css(
        'width',
        file1PercentCompleted + '%'
    );

    var file2PercentCompleted = Math.round((file2bytesUploaded * 100) / file2Size);
    console.log("file2Size is " + file2Size);
    console.log("file2PercentCompleted is " + file2PercentCompleted);
    $('#control-progress .progress-bar').css(
        'width',
        file2PercentCompleted + '%'
    );

}

async function doUpload(selector) {

    var data = new FormData();
    data.append(selector, document.getElementById(selector + '-chimera').files[0]);
    const totalSize = "" +  data.get(selector).size;
    sizeOfUploads += data.get(selector).size;
    if (selector == "file1") {
        file1Size = data.get(selector).size;
    } else {
        file2Size = data.get(selector).size;
    }
    console.log("size of uploads is " + sizeOfUploads);
    const chunkSize = 1024 * 1024 * 50; // 50MB
    const filename = data.get(selector).name;
    console.log("total size is " + totalSize);
    console.log(data.get(selector));
    console.log("filename is " + filename);
    let start = 0;

    var config = {
        validateStatus: function (status) {
            return status < 299;
        },
        onUploadProgress: function (progressEvent) {
            var percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            if (selector == "file1" && file1Size == 0) {
                file1Size = progressEvent.total;
            }
            if (selector == "file2" && file2Size == 0) {
                file2Size = progressEvent.total;
            }
            if (selector == "file1") {
                file1Progress = progressEvent.loaded;
                $('#target-progress .progress-bar').css(
                    'width',
                    percentCompleted + '%'
                );
            }
            if (selector == "file2") {
                file2Progress = progressEvent.loaded;
                $('#control-progress .progress-bar').css(
                    'width',
                    percentCompleted + '%'
                );
            }
            if (expectedNumberOfUploads == 2) {
                var totalFileSize = file1Size + file2Size;
                var totalProgress = file1Progress + file2Progress;
                var totalPercentCompleted = Math.round((totalProgress * 100) / totalFileSize);
                $('#progress .progress-bar').css(
                    'width',
                    totalPercentCompleted + '%'
                );

            }


        }
    };

    while (start < totalSize) {
        let end = Math.min(start + chunkSize, totalSize);
        let slice = data.get(selector).slice(start, end);
        // let filename = data.get(selector).name;

        let formData = new FormData();

        let url = '/upload/' + jobTimestamp;
        formData.append('data', slice);
        formData.append('filename', filename);
        formData.append('start', start);
        formData.append('total_size', totalSize); // Send total size to server

        try {
            let response = await fetch(url, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            let data = await response.json();
            console.log("response data is");
            console.log(data);
            console.log(filename + " uploaded " + data.uploaded + " bytes");
            if (selector == "file1") {
                file1bytesUploaded = data.uploaded;
            } else {
                file2bytesUploaded = data.uploaded;
            }
            totalBytesUploaded = file1bytesUploaded + file2bytesUploaded;
            updateProgressBar();
            // document.getElementById(progressElementId).textContent = data.uploaded;
        } catch (error) {
            console.error('There was a problem with the file upload:', error);
        }

        start = end;
    }

}

$(function () {
    'use strict';

    cleanup();
    $("#submitbutton").bind('click', function () {
        var valid = validate();
        // what happens if we are not valid?
        if (valid) {
            expectedNumberOfUploads = 1;
            if (!isEmpty(file2)) {
                expectedNumberOfUploads = 2;
            }
        // }
        // if (valid && expectedNumberOfUploads == 0) {
            // expectedNumberOfUploads = 1;
            $("#progress-container").show();
            $("#fileupload-container").hide();

            doUpload("file1").then((data) => {
                console.log("file1 upload done");
                console.log(data);
                ++filesUploadedSuccessfully;
                if (expectedNumberOfUploads == filesUploadedSuccessfully) {
                    $("#progress-container").hide();
                    kickOffJob();
                    // $("#control-progress-container").hide();
                    // $("#global-progress-container").hide();
                }
            });
            var file2 = $("#file2").attr('placeholder');
            if (expectedNumberOfUploads == 2) {
                doUpload("file2").then((data) => {
                    ++filesUploadedSuccessfully;
                    if (expectedNumberOfUploads == filesUploadedSuccessfully) {
                        $("#progress-container").hide();
                        kickOffJob();
                        console.log("file2 upload done");
                        console.log(data);
                    }
                });
            }

            if (expectedNumberOfUploads == 1) {
                $("#control-progress-container").hide();
                $("#global-progress-container").hide();
            }

        }
    });
});


$(document).ready(function () {

    $(':file').attr('placeholder', '');

    $(':file').bind('change', function () {
        var assoc = $(this).attr('assoc');

        var arr = $(this).val().split("\\");
        var name = arr[arr.length - 1];
        $("#" + assoc).attr('placeholder', name);
        $("#" + assoc).addClass("placeholder");

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