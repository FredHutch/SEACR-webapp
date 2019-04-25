$(document).ready(function () {
    $(':file').on('fileselect', function (event, numFiles, label) {
        console.log(numFiles);
        console.log(label);
    });
});


$(document).on('change', ':file', function () {
    var input = $(this),
        numFiles = input.get(0).files ? input.get(0).files.length : 1,
        label = input.val().replace(/\\/g, '/').replace(/.*\//, '');
    console.log("full val is " + input.val())
    input.trigger('fileselect', [numFiles, label]);
    // input.val(label);
    // $(input).val(label);
    console.log("placeholder attr is " + $(input).attr("placeholder"));
    console.log(input);
    // $(input).attr("placeholder", label);
});