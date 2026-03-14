const   quizContainerId = 'quizSchoolSearch',
        resultsName = 'last_quiz_results',
        filteredResultsName = 'filtered_quiz_results',
        resultsContainer = $('.school-results-list','#'+quizContainerId),
        quizId = 'sectionQuiz',
        quizCarouselEl = 'carouselQuiz',
        bgChangeClass = 'bg-light-blue',
        schoolQuizCarouselEl = document.querySelector('#'+quizCarouselEl),
        carousel = new bootstrap.Carousel(schoolQuizCarouselEl),
        $slider = $('.school-results-list');
            
const sliderSettings = (slideCount) => ({
        dots: slideCount > 4,
        infinite: false,
        speed: 300,
        slidesToShow: slideCount > 4 ? 4 : slideCount,
        slidesToScroll: slideCount > 4 ? 4 : slideCount,
        arrow: slideCount > 4,
        responsive: [
            {
            breakpoint: 1024,
            settings: {
                slidesToShow: 3,
                slidesToScroll: slideCount > 3 ? 3 : slideCount,
                infinite: true,
                dots: true
            }
            },
            {
            breakpoint: 600,
            settings: {
                slidesToShow: 2,
                slidesToScroll: slideCount > 2 ? 2 : 1
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

const checkToSkipSlide = () => {
    let classSkip = 'd-none',
        $carousel = $('#'+quizCarouselEl);

    
    $carousel.on('slide.bs.carousel', function(e) {
        let $allSlides = $(this).find('.carousel-item'),
            $targetSlide = $(e.relatedTarget); // The slide we are moving to
        
        if ($targetSlide.hasClass(classSkip)) {
            e.preventDefault(); // Stop the current slide transition
            
            let currentIndex = e.to,
                direction = e.direction, // 'left' (next) or 'right' (prev)
                nextIndex;

            if (direction === 'left') {
                // Moving Forward: Find the next slide index that isn't d-none
                nextIndex = currentIndex + 1;
                if (nextIndex >= $allSlides.length) nextIndex = 0;
            } else {
                // Moving Backward: Find the previous slide index that isn't d-none
                nextIndex = currentIndex - 1;
                if (nextIndex < 0) nextIndex = $allSlides.length - 1;
            }

            // Jump to the calculated index
            $carousel.carousel(nextIndex);
        }
    });
}
        
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
        carousel.next();
        checkToSkipSlide();
    }
    
}

const searchQuizSchools = async (answers) => {
    try {
        // 1. Get Programs based on Major & Degree
        const activeMajor = answers.major?.trim() || "";
        let query = (activeMajor !== "") 
            ? db.programs.where('area_of_study').equals(activeMajor) 
            : db.programs.toCollection();

        const matchingPrograms = await query
            .filter(p => !answers.degreeType || (p.degree_type && p.degree_type.includes(answers.degreeType)))
            .toArray();

        const uniqueSchoolNames = [...new Set(matchingPrograms.flatMap(p => p.school_available || []))];
        if (uniqueSchoolNames.length === 0) return [];

        // 2. Filter Schools by Country, City Type (tags), and Tuition
        const filteredSchools = await db.schools
            .where('name').anyOf(uniqueSchoolNames)
            .filter(item => {
                const matchesCountry = item.country === answers.country;
                // Match "Big City" against the tags array
                const matchesTags = !answers.tags || answers.tags === "0" || (item.tags && item.tags.includes(answers.tags));
                
                let matchesTuition = true;
                if (answers.tuition) {
                    const limit = parseInt(answers.tuition.replace(/[^0-9]/g, ''));
                    matchesTuition = answers.tuition.startsWith('<') 
                        ? item.average_tuition_fees < limit 
                        : item.average_tuition_fees >= limit;
                }
                return matchesCountry && matchesTags && matchesTuition;
            })
            .toArray();

        // 3. Apply the Test Score Filter
        const schoolNames = filteredSchools.map(s => s.name);
        const requirements = await db.admissionRequirements
            .where('school_name').anyOf(schoolNames)
            .toArray();

        const finalResults = filteredSchools.filter(school => {
            const req = requirements.find(r => r.school_name.includes(school.name));

            // If the user hasn't taken a test or we lack req data, keep the school
            if (!answers.testType || !answers.testScore || !req) return true;

            const testKey = answers.testType.toLowerCase(); // "ielts"
            const minRequired = parseFloat(req[testKey]);
            const userScore = parseFloat(answers.testScore); // "1" in your example
            console.log(`Evaluating ${school.name}: userScore=${userScore}, minRequired=${minRequired}`);
            // Only filter out if the school has a specific requirement and user is below it
            if (isNaN(minRequired)) return true;
            return userScore >= minRequired;
        });
        
        return finalResults;

    } catch (error) {
        console.error("Quiz Search Failed:", error);
        return [];
    }
};

const handleQuizSubmit = async (event) => {
    event.preventDefault();
    activeItem = $(event.relatedTarget);
    // 1. Gather answers from the form
    const formData =  serializeContainer('#'+quizContainerId);
    const answers = {
        country: formData['country_option'],
        tags: formData['location_type_option'],
        nationality: formData['nationality'],
        email: formData['quiz_email'],
        degreeType: formData['school_degree_type'],
        major: formData['school_major_search_result'] != "" ? formData['school_major_search_result'] : formData['school_major'],
        testType: formData['school_test_type'],
        testScore: formData['school_test_score'],
        outcomeOption: formData['school_outcome_option'],
        tuition: formData['school_tuition']
    }
    try {        
        const results = await searchQuizSchools(answers);
        localStorage.setItem(resultsName, JSON.stringify(results));
        displayQuizResults(results);

    } catch (error) {
        console.error("Search failed", error);
    }
}

const displayQuizResults = (results) => {

    const headerHtml = results.length > 0 ? `We've found <span class="search-count">${results.length}</span> school matches that are perfect for you!` 
    : `We couldn't find any matches based on your answers. Please try adjusting your filters or contact an advisor for personalized assistance.`;
    const submitBtnHtml = results.length > 0 ? `<button class="btn btn-white w-100" data-submit="view-matches" type="button" data-bs-target="#carouselQuiz" data-bs-slide="next">View My Matches</button>` :  `<button class="btn btn-white w-100 d-none restart-quiz" data-submit="restart-quiz" type="button">Restart Quiz</button>`;
    $('span.search-count','#'+quizContainerId).text(results.length);

    resultsInitialHtml = `
                <div class="text-box">
                    
                    <h3 class="results-message-container">${headerHtml}</h3>
                    
                    <p>Based on the information that you entered, we were able to find you:</p>
                    
                </div>
                <div class="p-5 border border-white rounded-4 d-flex justify-content-center align-items-center">
                    <h5 class="text-white"><span class="search-count">${results.length}</span> Schools</h5>
                </div>
                <div class="btn-container w-100 mt-4 view-matches-container">
                    ${submitBtnHtml}
                </div>
                `;
    $('.results-container','.results-item').html(resultsInitialHtml);

    resultsContainer.empty();

    let htmlString = '';

    if (results.length === 0) {
        resultsContainer.html('<div class="no-results">No schools found</div>');
        return; // Exit early
    }


    results.forEach((item, index) => {
        // 1. If index is 0, 2, 4, etc., start a new row container
        if (index % 2 === 0) {
            htmlString += `<div>`;
        }
        let logoHtml = '';
    
        if (item.logo && item.logo.url) {
            logoHtml = `<img src="${item.logo.url}" alt="${item.name} logo" class="img-fluid">`;
        }

        // 2. Add the individual box-card
        htmlString += `
            <div class="box-card">
                <div class="result-header">
                <div class="title">
                    <h6>${item.name}</h6>
                    <p>${[item.city, item.state_province, item.country].filter(Boolean).join(', ')}</p>
                </div>
                <div class="logo-container">
                    ${logoHtml}
                </div>
                </div>
                <div class="school-details">
                <ul>
                    <li class="tuition fw-bold">Average Tuition: ${item.average_tuition_fees 
                        ? usdFormatter.format(item.average_tuition_fees) 
                        : 'Contact for fees'}</li>
                    <li class="ranking">Ranking, Special features, etc.</li>
                </ul>
                
                </div>
                
                <div class="btn-container">
                <a href="#" class="btn btn-outline">Contact an Advisor</a>
                <a href="${item.page_link?'/school'+item.page_link:'/'}" class="btn btn-primary">Learn More</a>
                </div>
            </div>
        `;

        // 3. If the next item is a multiple of 8 OR it's the very last item, close the row
        if ((index + 1) % 2 === 0 || index === results.length - 1) {
            htmlString += `</div>`;
        }
    });
    resultsContainer.html(htmlString).attr('style','height:350px;');

    // Simulate loading delay}
}

////
const searchQuizSchoolResults = (event) => {
    activeItem = $(event.relatedTarget);
    const resultsInitialContainer = $('.results-container','.results-item');
    
    if(activeItem.hasClass('results-item') && activeItem.hasClass('active')){
        $('#'+quizContainerId).addClass(bgChangeClass);
        resultsInitialContainer.addClass('opacity-100').empty();
        showLoadingState(true,resultsInitialContainer);
        
        setTimeout(()=>{
            handleQuizSubmit(event);
        },1500)
    }
}

const searchQuizSchoolResultsList = (event) => {
    const slideCount = $('>div','.school-results-list').length; // Each slide contains 2 boxes, so divide total boxes by 2 to get slide count
    localStorage.setItem('quiz_slide_count', slideCount);
    activeItem = $(event.relatedTarget);
    if(activeItem.hasClass('results-list') && activeItem.hasClass('active')){
        $('#'+quizContainerId).attr('style','width:100%;max-height:fit-content;');
         setTimeout(()=>{
            $slider.slick(sliderSettings(slideCount));
            setTimeout(()=>{
                resizeSectionBoxes(['.box-card .result-header'],resultsContainer);
            },60)
            resultsContainer.removeAttr('style');
         },500);
    }
}

$('#btn-start-quiz').on('click',()=>{
    initDataSync();
    setTimeout(async ()=>{
        setupAutocomplete('#areaOfStudyQuiz', 'auto-area-of-study', await getValueFromIndexedDB('name','areaOfStudy'));
        console.log( await getValueFromIndexedDB('name','areaOfStudy'));
    },1000)
                
})

$('#carouselQuiz').on('slid.bs.carousel', (event) => {
    searchQuizSchoolResults(event);
    searchQuizSchoolResultsList(event);
});


const removeBg = () =>{
    $('#'+quizContainerId).removeClass(bgChangeClass);
    $('.lds-loader').removeClass('d-none');
    $('.results-container').removeClass('opacity-100');
}
$(document).on('click','button#email-quiz-results',()=>{
    //Update to live url when ready
    //let resultsPage = "/quiz-results";
    let resultsPage = "/ugo_dev/ugo_quiz_results.html";
    const results = JSON.parse(localStorage.getItem(resultsName)) || [];
    const schoolIds = results.map(school => school.hs_id);
    const formData =  serializeContainer('#'+quizContainerId);
    // If you need it as a query string for a URL:
    const queryString = new URLSearchParams({
        ...formData,
        school_ids: schoolIds.join(',').toString()
    });
    window.location.href = `${resultsPage}?${queryString}`;
    carousel.next();
})
$('.restart-quiz').on('click',()=>{
    $('#'+quizContainerId).removeAttr('style');
    removeBg();
    $('.school-results-list','#'+quizContainerId).slick('unslick');
    $('.university-logos').slick('unslick');
    $('.university-logos').slick({
        slidesToShow: 4,
        slidesToScroll: 4,
        autoplay: true,
        autoplaySpeed: 0, // Set to 0 for constant movement
        speed: 8000,      // Adjust speed for the marquee effect
        cssEase: 'linear',
        infinite: true,
        arrows: false,
        dots: false,
        pauseOnHover: false,
        responsive: [
        {
            breakpoint: 768,
            settings: {
            slidesToShow: 2
            }
        }
        ]
    });
    clearInputs(quizContainerId);
    carousel.to(0);
})

$(document).on('click','.carousel-link.prev-slide',()=>{
    removeBg();
});
$(document).on('click','button[data-submit=view-matches]',()=>{
    initializeRangeSlider(quizId);
    setupAutocomplete('#schoolNameSearchInputFilterQuiz', 'auto-school', getValueFromStorage('name',resultsName));
    setupAutocomplete('#schoolCitySearchInputFilterQuiz', 'auto-city', getValueFromStorage('city',resultsName));
    removeBg();
});

$('.carousel-item:not(:first-child):not(:last-child)','#'+quizCarouselEl).prepend('<a href="javascript:void(0)" class="prev-slide carousel-link">Back</a>');

$('.carousel-link.prev-slide').on('click',() =>{
    carousel.prev();
    checkToSkipSlide
});

$('input[name=school_test_type]').on('click', function() {
    val = $(this).val();
    $('span#test-type-name').text(val);

    const testConfigs = {
        'IELTS': { min: 0, max: 9, step: '0.5', label: 'IELTS' },
        'TOEFL': { min: 0, max: 120, step: '1', label: 'TOEFL' },
        'Duolingo': { min: 0, max: 160, step: '5', label: 'Duolingo' }
    };

    const config = testConfigs[val];

    if (config) {
        $('#testScore').attr({
            'placeholder': `Enter your ${config.label} score: range from ${config.min} to ${config.max}`,
            'aria-label': `Enter your ${config.label} score`,
            'step': config.step,
            'min': config.min,
            'max': config.max,
            'type': 'number'
        }).val(''); // Optional: clear the input when the test type changes
        $('div.test-score-slide').removeClass('d-none');
    }else{
        $('div.test-score-slide').addClass('d-none');
    }
})

$('input:not([type=text]):not([type=number]):not([type=checkbox]):not([type=email]),button.next-slide','#'+quizCarouselEl).on('click',(event) => {
    let el = $(event.currentTarget),
        formEl = el.closest('form')[0],
        $form = $(formEl);

    if(formEl){
        validateFormQuiz(event,formEl)
    }else{
        setTimeout(() => {
            carousel.next();
            checkToSkipSlide();
        }, 60);
    }
    if(el.attr('name') == 'country-option' && el.val() == 'USA'){
        $('#carousel-work-study.carousel-item').addClass('d-none');
    }else if(el.attr('name') == 'country-option' && el.val() != 'USA'){
        $('#carousel-work-study.carousel-item').removeClass('d-none');
    }else if(el.attr('name') == 'school_major'){
        $('input[name="school_major_search_result"]').val('');
    }else if(formEl && $form.find('input[name="school_major_search_result"]').length > 0){
       if($form.find('input[name="school_major_search_result"]').val().length > 0){
         $('input[name="school_major"]').prop('checked', false);
       }
    }
    
})

$('select','#'+quizCarouselEl).on('change',()=>{
    carousel.next();
    checkToSkipSlide();
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

