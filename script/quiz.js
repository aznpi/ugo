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

const submitQuizFormArray = [
{
    inputName: "quiz_first_name",
    objInputName: "firstname",
    inputType: "text",
    required: true,
    value: "",
  },
  {
    inputName: "quiz_last_name",
    objInputName: "lastname",
    inputType: "text",
    required: true,
    value: "",
  },
  {
    inputName: "quiz_email",
    objInputName: "email",
    inputType: "email",
    required: true,
    value: "",
  },
  {
    inputName: "quiz_phone",
    objInputName: "phone",
    inputType: "phone",
    required: true,
     value: "",
  },
  {
    inputName: "country_option",
    objInputName: "ugo_study_country",
    inputType: "radio",
    required: true,
    value: "", 
  },
  {
    inputName: "location_type_option",
    objInputName: "what_type_of_location_do_you_prefer_for_your_studies",
    inputType: "radio",
    required: true,
    value: "", 
  },
  {
    inputName: "nationality",
    objInputName: "nationality",
    inputType: "dropdown",
    required: true,
    value: "",
  },
  {
    inputName: "school_degree_type",
    objInputName: "ugo_degree_type",
    inputType: "radio",
    required: true,
    value: "",
  },
  {
    inputName: "school_major",
    objInputName: "ugo_area_of_study",
    inputType: "radio",
    required: true,
    value: "",
  },
  {
    inputName: "school_major_search_result",
    objInputName: "ugo_area_of_study",
    inputType: "text",
    required: true,
    value: "",
  },
  {
    inputName: "school_outcome_option",
    objInputName: "which_of_these_outcomes_is_most_important_to_you",
    inputType: "checkbox",
    required: true,
    value: "",
  },
  {
    inputName: "school_test_score_ielts",
    objInputName: "ielts_band_score",
    inputType: "number",
    required: true,
    value: "",
  },
  {
    inputName: "school_test_score_toefl",
    objInputName: "toefl_ibt_socre",
    inputType: "text",
    required: true,
    value: "",
  },
  {
    inputName: "school_test_score_duolingo",
    objInputName: "duolingo_english_test_score",
    inputType: "text",
    required: true,
    value: "",
  },
  {
    inputName: "school_test_type",
    objInputName: "which_english_tests_have_you_taken_or_plan_on_taking",
    inputType: "text",
    required: true,
    value: "",
  },
  {
    inputName: "school_tuition",
    objInputName: "expected_annual_tuition",
    inputType: "text",
    required: true,
    value: "",
  },

];
            
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
        
const validateFormQuiz = (event, form) => {
    // 1. Handle Checkbox Group Validation
    if ($(form).hasClass('checkbox-group')) {
        const $checkboxes = $(form).find('input[type=checkbox]');
        const isAnyChecked = $checkboxes.is(':checked');

        if (isAnyChecked) {
            $checkboxes.prop('required', false);
            $checkboxes.each(function() { this.setCustomValidity(""); });
        } else {
            $checkboxes.prop('required', true);
            if ($checkboxes[0]) {
                $checkboxes[0].setCustomValidity("Please select at least one option.");
            }
        }
    }

    // 2. Check General Validity
    if (form.checkValidity() === false) {
        event.preventDefault();
        event.stopPropagation();
        $(form).addClass('was-validated'); 
    } else {
        // 3. Form is Valid: Check if this is the final Student Info Form
        if (form.id === 'studentInfoForm') {
            submitQuizResults(false);
        } else {
            // Standard slide progression for other parts of the quiz
            carousel.next();
            checkToSkipSlide();
        }
    }
};

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
                const matchesCountry = answers.country === 'Europe' 
                ? (item.region && item.region.includes('Europe')) 
                : (item.country_name && item.country_name.includes(answers.country));
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
        tags: formData['location_type_option'] !== "No preference" ? formData['location_type_option'] : "",
        nationality: formData['nationality'],
        degreeType: formData['school_degree_type'],
        major: formData['school_major_search_result'] !== "" ? formData['school_major_search_result'] : formData['school_major'] !== "I'm undecided at this time" ? formData['school_major'] : "",
        testType: formData['school_test_type'] !== "Other/Not take yet" ? formData['school_test_type'] : "",
        testScore: formData['school_test_score'],
        outcomeOption: formData['school_outcome_option'],
        tuition: formData['school_tuition']
    }
    try {
        const results = await searchQuizSchools(answers);
        localStorage.setItem(resultsName, JSON.stringify(results));
        displayQuizResults(results);
        setTimeout(()=>{
            if(results.length > 0){
                $('.search-count').addClass('highlight');
            }
        },500)

    } catch (error) {
        console.error("Search failed", error);
    }
}

const displayQuizResults = (results) => {

    const formData2 = serializeContainer('#' + quizContainerId);

    // 1. Determine the best value for Study Area
    const finalStudyArea = formData2.school_major_search_result || formData2.school_major || "";
    const cleanedSearchData = {
        study_area_search: finalStudyArea,
        degree_type_search: formData2.school_degree_type || ""
    };
    const queryString = new URLSearchParams(cleanedSearchData);

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
        let currency = item.currency.name || 'USD';
        let countryDirectory = item.country_name ? item.country_name.includes("USA") ? "/usa" : item.country_name.includes("Canada") ? "/canada" : item.country_name.includes("Australia") ? "/australia" : item.country_name.includes("Malaysia") ? "/malaysia" : "/europe" : "";
        let rankingString = item.rankings 
            ? `<li class="badge text-wrap bg-light-grey align-items-center me-1 my-1 py-2 w-100">
                <i class="fa-solid fa-trophy me-2"></i>${item.rankings.split(';')[0]}
            </li>`
            : [];
        let scholarshipString = item.scholarship_details
            ? `<li class="badge text-wrap bg-light-grey align-items-center me-1 my-1 py-2 w-100">
                <i class="fa-solid fa-dollar-sign me-2"></i>Scholarships Available
            </li>`
            : '';

        // 2. Add the individual box-card
        htmlString += `
            <div class="box-card">
                <div class="result-header">
                <div class="title">
                    <h6>${item.name}</h6>
                    <p>${[item.city, item.state_province, item.country_name].filter(Boolean).join(', ')}</p>
                </div>
                <div class="logo-container">
                    ${logoHtml}
                </div>
                </div>
                <div class="school-details">
                <ul>
                    <li class="tuition fw-bold">Average Tuition: ${item.average_tuition_fees 
                        ? formatCurrencyAmount(item.average_tuition_fees, currency) 
                        : 'Contact for fees'}</li>
                
                    <li class="ranking">
                    ${rankingString.length > 0 ? ` 
                        <ul class="list-unstyled mb-0 text-center">
                            ${rankingString}
                        </ul>` 
                    : ''}
                    ${scholarshipString.length > 0 ? ` 
                        <ul class="list-unstyled mb-0 text-center">
                            ${scholarshipString}
                        </ul>` 
                    : ''}

                    </li>
                </ul>
                
                </div>
                
                <div class="btn-container">
                <a href="#" class="btn btn-primary">Contact an Advisor</a>
                <a href="${item.page_link?'/school'+countryDirectory+item.page_link+'?'+queryString:'/'}" class="btn btn-outline">Learn More</a>
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
                resizeSectionBoxes(['.box-card .result-header', '.box-card .ranking'],resultsContainer);
            },60)
            resultsContainer.removeAttr('style');
         },500);
    }
}

$('#carouselQuiz').on('slid.bs.carousel', (event) => {
    searchQuizSchoolResults(event);
    searchQuizSchoolResultsList(event);
});


const removeBg = () =>{
    $('#'+quizContainerId).removeClass(bgChangeClass);
    $('.lds-loader').removeClass('d-none');
    $('.results-container').removeClass('opacity-100');
}
const reinitUniversityLogoSlider = () => {
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
}
const submitQuizResults = (enableStudentEmail = false) => {

    let url =
        "https://api.hsforms.com/submissions/v3/integration/submit/" +
        portalId +
        "/" +
        quizGuid;
    url = encodeURI(url);

    const emailInputVal = $('input#quiz-email').val();
    const results = JSON.parse(localStorage.getItem(resultsName)) || [];
    const schoolIds = results.map(school => school.hs_id);
    const schoolNames = results.map(school => school.name);
    const readableSchoolNames = schoolNames.join('\n');
    const formData =  serializeContainer('#'+quizContainerId,false);
    const formData2 =  serializeContainer('#'+quizContainerId);
    const queryString = new URLSearchParams({
        ...formData2,
        school_ids: schoolIds.join(',').toString()
    });
    quizResultsUrl = `${pageUriQuiz}?${queryString}`;

    const hubspotFields = submitQuizFormArray
    // 1. Remove entries that don't have a HubSpot property name defined
    .filter(item => item.objInputName && item.objInputName.trim() !== "")
    .map(item => {
        const rawValue = formData[item.inputName];
        let formattedValue = "";

       // 1. Handle Number Inputs (Force 1 decimal point)
        // 1. Handle Number Inputs
        if (item.inputType === 'number' && rawValue !== "" && rawValue !== undefined && rawValue !== null) {
            const num = parseFloat(rawValue);
            
            if (isNaN(num)) {
                formattedValue = "";
            } else if (num === 0) {
                // Specifically check for 0 to avoid "0.0"
                formattedValue = "0";
            } else {
                // For all other numbers, force 1 decimal point (e.g., 5.55 -> 5.6, 5 -> 5.0)
                formattedValue = num.toFixed(1);
            }
        }
        // 2. Handle Checkboxes (Arrays)
        else if (Array.isArray(rawValue)) {
            formattedValue = rawValue.join(';');
        } 
        // 3. Handle Null/Undefined/Empty
        else if (rawValue === undefined || rawValue === null) {
            formattedValue = "";
        } 
        // 4. Standard Text/Radio/Dropdown
        else {
            formattedValue = String(rawValue);
        }

        return {
        name: item.objInputName,
        value: formattedValue
        };
    });

    const manualFields = [
        { name: "ugo_school_match_results_url", value: quizResultsUrl },
        { name: "ugo_school_search_results_url", value: readableSchoolNames },
    ];

    const emailStudentField = enableStudentEmail ? [{ name: "email", value: emailInputVal },{ name: "ugo_advisor_contact_confirmed", value: "Yes" }] : [];

    let formArray = {
      fields: enableStudentEmail 
        ? emailStudentField 
        : [...hubspotFields, ...manualFields],
      context: {
        pageUri: pageUriQuiz,
        pageName: "UGO School Match Quiz",
        hutk: getCookie("hubspotutk"),
      },
      legalConsentOptions: {
        consent: {
          // Include this object when GDPR options are enabled
          consentToProcess: true,
          text: consentAgreeTxt,
        },
      },
    };

    // $.ajax({
    //     type: "POST",
    //     url: url,
    //     data: JSON.stringify(formArray),
    //     contentType: "application/json",
    //     dataType: "json",
    //     success: function () {
            
    //         carousel.next();
            
    //     }

    // });
    carousel.next();
}
const updateTuitionLabels = (selectedCountry) => {
    const currencyMap = {
        'Canada': ' $',
        'Australia': ' A$',
        'USA': ' $',
        'Europe': ' €',
        'Malaysia': ' RM'
    };

    // Fallback to $ if country isn't matched
    const symbol = currencyMap[selectedCountry] || ' $';
    const tuitionLabels = document.querySelectorAll('input[name="school_tuition"] + label');

    tuitionLabels.forEach(label => {
        const text = label.textContent.trim();
        
        // 1. Strip everything except digits
        const rawDigits = text.replace(/\D/g, ''); 
        
        if (rawDigits) {
            const amount = parseInt(rawDigits, 10);
            
            // 2. FORCE 'en-US' locale to ensure a COMMA separator (10,000)
            const formattedAmount = new Intl.NumberFormat('en-US').format(amount);

            // 3. Rebuild string based on the text context
            if (text.toLowerCase().includes('less')) {
                label.innerHTML = `Less than ${symbol}${formattedAmount}`;
            } else if (text.toLowerCase().includes('higher') || text.includes('+')) {
                label.innerHTML = `${symbol}${formattedAmount} or higher`;
            } else {
                label.innerHTML = `Up to ${symbol}${formattedAmount}`;
            }
        }
    });
};
$(document).on('click','button#email-quiz-results',()=>{
    submitQuizResults(true);
});
$(document).on('click','button#go-to-quiz-results',()=>{
   //Update to live url when ready
    // let resultsPage = "/school-search/quiz-results";
    let resultsPage = "/ugo_dev/school-search/ugo_quiz_results.html";
    const results = JSON.parse(localStorage.getItem(resultsName)) || [];
    const schoolIds = results.map(school => school.hs_id);
    const formData =  serializeContainer('#'+quizContainerId);
    // If you need it as a query string for a URL:
    const queryString = new URLSearchParams({
        ...formData,
        school_ids: schoolIds.join(',').toString()
    });
    window.location.href = `${resultsPage}?${queryString}`;
    // If you need it as a query string for a URL:
})
$('.restart-quiz').on('click',()=>{
    $('#'+quizContainerId).removeAttr('style');
    removeBg();
    $('.school-results-list','#'+quizContainerId).slick('unslick');
    reinitUniversityLogoSlider();
    clearInputs(quizContainerId);
    carousel.to(0);
})

$(document).on('click','.carousel-link.prev-slide',()=>{
    removeBg();
    reinitUniversityLogoSlider();
});
$(document).on('click','button[data-submit=view-matches]',()=>{
    //initializeRangeSlider(quizId);
    setupAutocomplete('#schoolNameSearchInputFilterQuiz', 'auto-school', getValueFromStorage('name',resultsName));
    setupAutocomplete('#schoolCitySearchInputFilterQuiz', 'auto-city', getValueFromStorage('city',resultsName));
    removeBg();
});

$('.carousel-item:not(:first-child):not(:last-child)','#'+quizCarouselEl).prepend('<a href="javascript:void(0)" class="prev-slide carousel-link">Back</a>');

$('.carousel-link.prev-slide').on('click',() =>{
    carousel.prev();
    checkToSkipSlide
});
$(document).on('click','.input-country-radio .input-group-radio', function() {
    radioEl = $(this).find('input[name=country_option]');
    val = radioEl.val();
    region = radioEl.attr('data-region');
    updateTuitionLabels(val);
    $('input[name=school_degree_type]').prop('checked', false);
    $('input[name=school_degree_type]').parent().parent('.input-group-radio').removeClass('d-none');
    $('input[name=school_degree_type]').each(function() {
        let regions = $(this).attr('data-regions').split(';');
        if (!regions.includes(region)) {
            $(this).parent().parent('.input-group-radio').addClass('d-none');
        }
    });

    $('input[name=school_major]').prop('checked', false);
    $('input[name=school_major]').parent().parent('.input-group-radio').removeClass('d-none');
    $('input[name=school_major]').each(function() {
        let regions = $(this).attr('data-regions').split(';');
        if (!regions.includes(region)) {
            $(this).parent().parent('.input-group-radio').addClass('d-none');
        }
    });
});
$(document).on('click','.input-degree-radio .input-group-radio', async function() {
    radioEl = $(this).find('input[name=school_degree_type]');
    initialLocation = $('input[name=country_option]:checked').val() || "";
    val = radioEl.val();
    setupAutocomplete('#areaOfStudyQuiz', 'auto-area-of-study', await getUniqueAreasOfStudy(initialLocation, val));
});
$('input[name=school_test_type]').on('click', function() {
    val = $(this).val();
    $('span#test-type-name').text(val);

    const testConfigs = {
        'IELTS': { min: 0, max: 9, step: '0.5', label: 'IELTS', field: 'school_test_score_ielts' },
        'TOEFL': { min: 0, max: 120, step: '1', label: 'TOEFL', field: 'school_test_score_toefl' },
        'Duolingo': { min: 0, max: 160, step: '5', label: 'Duolingo', field: 'school_test_score_duolingo' }
    };

    const config = testConfigs[val];

    if (config) {
        $('#testScore').attr({
            'placeholder': `Enter your ${config.label} score: range from ${config.min} to ${config.max}`,
            'aria-label': `Enter your ${config.label} score`,
            'step': config.step,
            'min': config.min,
            'max': config.max,
            'name': config.field,
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

const quizCarousel = document.getElementById(quizCarouselEl);

quizCarousel.addEventListener('slide.bs.carousel', function () {
    // 1. Find the top position of the quiz element
    const quizTop = quizCarousel.getBoundingClientRect().top + window.pageYOffset;

    // 2. Scroll to that position
    window.scrollTo({
        top: quizTop - 150, // -150 adds a little padding at the top
        behavior: 'smooth'
    });
});

