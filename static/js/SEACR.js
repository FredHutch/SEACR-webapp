// not used
// TODO - delete this file

window.reset = function (e) {
    e.wrap('<form>').closest('form').get(0).reset();
    e.unwrap();
}


validate = function () {
    var errors = [];
    var file1 = $("#file1").val();
    if (file1 == "") {
        errors.push("Select a target data bedgraph file.");
    }
    var file2 = $("#file2").val();
    var threshold = $("#threshold").val();
    if (file2 == "" && threshold == "") {
        errors.push("Select a control file or choose a numeric threshold.");
    }
    if (file2 != "" && threshold != "") {
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

submit = function () {
    console.log("in submit()");
}

$(function () {
    reset($('#file1'));
    reset($('#file2'));
    $("#submitbutton").click(function () {
        if (validate()) {
            console.log("you are valid");
            submit();
        } else {
            console.log("you are invalid");
        }
    })
    $(document).on('change', ':file', function () {
        var input = $(this),
            numFiles = input.get(0).files ? input.get(0).files.length : 1,
            label = input.val().replace(/\\/g, '/').replace(/.*\//, '');
        input.trigger('fileselect', [numFiles, label]);
        console.log("input is:");
        console.log(input);
        console.log(".");

    });

    $(document).ready(function () {
        console.log("in doc ready function");

        // $(':file').attr('placeholder', '');
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

});

