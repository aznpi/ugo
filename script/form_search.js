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

//search filter modal
const filterModalId = '#filterOptionPanel',
    modalEl = document.getElementById('filterOptionPanel'),
    modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);

const countFilter = function(){
    let count = 0;

    $('.filter-field',filterModalId + ' .accordion-item .accordion-collapse.show').each(function() {
        let fieldType = $(this).attr('type');
        // Check if the value of the current input is not empty
        if (fieldType === 'checkbox' || fieldType === 'radio'){
            if ($(this).is(':checked')) {
                count++;
            }
        }else{
            if ($(this).val().trim() !== '') {
                count++;
            }
        }            
    });
    // Display the result
    $('.filter-count').text(count);
}

const clearFilterFields = function(){
    $('.filter-field:not([type=range])',filterModalId + ' .accordion-item .accordion-collapse.show').each(function() {
        let fieldType = $(this).attr('type');
        // Check if the value of the current input is not empty
        if (fieldType === 'checkbox' || fieldType === 'radio'){
            $(this).prop('checked', false);
        }else{
            $(this).val('');
        }            
    });
}

$('.filter-submit',filterModalId).on('click',function(){
    // Select all inputs with the class 'myInput'
    countFilter();
    modalInstance.hide()
});

$('.clear-filter',filterModalId).on('click',function(){
    $('.collapse.show',filterModalId).collapse('hide');
    
    // Optional: If using Bootstrap 5's default accordion component structure, 
    // also ensure the buttons/headers get the 'collapsed' class and lose 'active' if used
    $('.accordion-button',filterModalId).addClass('collapsed');
    $('.accordion-button',filterModalId).attr('aria-expanded', false);
    clearFilterFields();
    countFilter();
    modalInstance.hide()
})