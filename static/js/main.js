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

$(function () {
    'use strict';

    // Initialize the jQuery File Upload widget:
    $('#fileupload').fileupload({
        // Uncomment the following to send cross-domain cookies:
        //xhrFields: {withCredentials: true},
        url: '/upload',
        autoUpload: false, // Does not seem necessary?
        dropZone: null,
        submit: function(e, data) {
        console.log("in validation function");
        // TODO add form validation here, return
        // true/false depending on whether form is valid.
        return true;
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
        done: function(e, data) {
            // TODO track state of which files have been uploaded
            if (data.result['files'][0]['name'] == ".placeholder") return
            console.log("Upload done, file " + data.result['files'][0]['name'])
            console.log("result was " + data.textStatus)
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
            maxFileSize: 5000000,
            acceptFileTypes: /(\.|\/)(gif|jpe?g|png)$/i
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
                .call(this, $.Event('done'), {result: result});
        });
    }

});

/////

$(document).ready(function () {
    console.log("in doc ready function");

    $(':file').attr('placeholder', '');

    $("#file1").bind('change',  function() {
        console.log("does this work?");
    });
    $(':file').bind('change', function() {
        console.log("in change event handler");
        var assoc = $(this).attr('assoc');
        console.log("assoc is " + assoc);

        var arr = $(this).val().split("\\");
        var name = arr[arr.length -1];
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

