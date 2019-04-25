

window.reset = function (e) {
    e.wrap('<form>').closest('form').get(0).reset();
    e.unwrap();
}

$(function () {
    console.log("hoo");
    // $(":file").fileupload('clear');
    // $(":file").html('clork');
    console.log("ha");
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

