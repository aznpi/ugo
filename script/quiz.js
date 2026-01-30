$(document).ready(()=>{

    const   quizContainerEl = 'quizSchoolSearch',
            quizCarouselEl = 'carouselQuiz',
            bgChangeClass = 'bg-light-blue',
            schoolQuizCarouselEl = document.querySelector('#'+quizCarouselEl),
            carousel = new bootstrap.Carousel(schoolQuizCarouselEl);
            
    const validateFormQuiz = (event,form) => {

        if($(form).hasClass('checkbox-group')){
            const $checkboxes = $(form).find('input[type=checkbox]');
            const isAnyChecked = $checkboxes.is(':checked');

            if (isAnyChecked) {
                $checkboxes.prop('required', false);
                $checkboxes.each(function() { this.setCustomValidity(""); });
            } else {
                $checkboxes.prop('required', true);
                // Set a custom message on the first one to prompt the user
                $checkboxes[0].setCustomValidity("Please select at least one option.");
            }
        }

        if (form.checkValidity() === false) {
      // Form is invalid: stop everything and show validation styles
            event.preventDefault();
            event.stopPropagation();
            $(form).addClass('was-validated'); 
        } else {
        // Form is valid: proceed to the next slide
        // Replace '#yourCarouselId' with the actual ID of your carousel div
            carousel.next()
        }
        
    }
    
    const searchSchoolResults = (event) => {
        activeItem = $(event.relatedTarget);
        
        if(activeItem.hasClass('results-item') && activeItem.hasClass('active')){
            $('#'+quizContainerEl).addClass(bgChangeClass);
            setTimeout(()=>{
                activeItem.find('.lds-loader').addClass('d-none');
                activeItem.find('.results-container').addClass('opacity-100');
            },2000)
        }
    }

    const searchSchoolResultsList = (event) => {
        activeItem = $(event.relatedTarget);
        if(activeItem.hasClass('results-list') && activeItem.hasClass('active')){
            $('#'+quizContainerEl).attr('style','width:100%;max-height:fit-content;');
            setTimeout(()=>{
                $('.school-results-list').slick({
                    dots: true,
                    infinite: false,
                    speed: 300,
                    slidesToShow: 4,
                    slidesToScroll: 4,
                    arrow:true,
                    responsive: [
                        {
                        breakpoint: 1024,
                        settings: {
                            slidesToShow: 3,
                            slidesToScroll: 3,
                            infinite: true,
                            dots: true
                        }
                        },
                        {
                        breakpoint: 600,
                        settings: {
                            slidesToShow: 2,
                            slidesToScroll: 2
                        }
                        },
                        {
                        breakpoint: 480,
                        settings: {
                            slidesToShow: 1,
                            slidesToScroll: 1
                        }
                        }
                        // You can unslick at a given breakpoint now by adding:
                        // settings: "unslick"
                        // instead of a settings object
                    ]
                });
                activeItem.find('.lds-loader').addClass('d-none');
            },600)
            
        }
    }

    

   $('#carouselQuiz').on('slid.bs.carousel', (event) => {

        searchSchoolResults(event);
        searchSchoolResultsList(event);
    });


    const removeBg = () =>{
        $('#'+quizContainerEl).removeClass(bgChangeClass);
        $('.lds-loader').removeClass('d-none');
        $('.results-container').removeClass('opacity-100');
    }

    $('#restartQuiz').on('click',()=>{
        $('.lds-loader','.school-results-container').removeClass('d-none');
        $('#'+quizContainerEl).removeAttr('style');
        $('.school-results-list').slick('unslick');
        carousel.to(0);
    })

    $(document).on('click','a[data-bs-slide=prev]',()=>{
        removeBg();
    });
    $(document).on('click','button[data-submit=view-matches]',()=>{
        removeBg();
    });

    $('.carousel-item:not(:first-child):not(:last-child)','#'+quizCarouselEl).prepend('<a href="#" data-bs-target="#carouselQuiz" data-bs-slide="prev" class="carousel-link">Back</a>');


    $('input:not([type=text]):not([type=checkbox]):not([type=email]),button.next-slide','#'+quizCarouselEl).on('click',(event) => {
        var formEl = $(event.currentTarget).closest('form')[0];
        if(formEl){
            validateFormQuiz(event,formEl)
        }else{
            carousel.next();
        }
       
    })
    $('select','#'+quizCarouselEl).on('change',()=>{
        carousel.next();
    })

    $('input[type=checkbox]').on('change', function() {
        let checkEl = $(this).closest('.input-form-group'),
            hasLimit = $(this).closest('.input-form-group').is('[data-check-limit]'),
            $group = checkEl.find('input[type="checkbox"]');
    if(hasLimit){
        let limit = parseInt(checkEl.attr('data-check-limit')),
            checkedCount = $group.filter(':checked').length;
        if (checkedCount >= limit) {
        // Disable only the checkboxes that are NOT currently checked
            $group.not(':checked').prop('disabled', true);
        } else {
        // Re-enable all checkboxes in the group if we are under the limit
            $group.prop('disabled', false);
        }
    
        // Clear validation error if at least one is selected
        if (checkedCount > 0) {
            $group.each(function() { this.setCustomValidity(""); });
        }
    }
    if ($group.is(':checked')) {
        $group.prop('required', false);
        $group.each(function() { this.setCustomValidity(""); });
    }
  });

})