//Hero School Search Form Script
$('.dropdown-menu .dropdown-item','.hero').on('click', function(e) {
    e.preventDefault();
    var selectedValue = $(this).attr('data-value');
    var dropdownButton = $(this).closest('.dropdown').find('.dropdown-toggle');
    dropdownButton.text(selectedValue);
    dropdownButton.val(selectedValue);
    $('input[name="heroDegreeType"]','.hero').val(selectedValue);
});
$('ul.btn-list a','.hero').on('click', function(e) {
    e.preventDefault();
    $('ul.btn-list a','.hero').removeClass('active');
    $(this).addClass('active');
    var selectedValue = $(this).attr('data-value');
    $('input[name="heroSchoolPrimarySearch"]','.hero').val(selectedValue);
});