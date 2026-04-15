const   portalId = 5020112,
        schoolTableId = 169609632,
        schoolTableEUId = 224701312,
        schoolTableCAId = 169609637,
        schoolTableAUId = 170385993,
        schoolTableMAId = 224700755,
        programTableId = 170387831,
        programTableEUId = 224700758,
        admissionRequirementTableId = 177485357,
        admissionRequirementTableEUId = 224700760,
        areaOfStudyTableId = 178019487,
        degreeTypesTableId = 177071533,
        quizGuid = "3cb26e21-9995-454c-8835-f0e777fff20a",
        comparisonGuid = "4cca5aa8-0c3f-4f1d-9041-46f5674d9172",
        //pageUriQuiz = "https://www.universityguideonline.org/quiz-results",
        //pageUriQuiz = "https://dev-01.ilsc.com/quiz-results",
        //pageUriComparison = "https://dev-01.ilsc.com/compare",
        pageUriQuiz = "/ugo_dev/ugo_quiz_results.html",
        pageUriComparison = "/ugo_dev/ugo_comparison_results.html",
        consentAgreeTxt = "I agree to allow ILSC to store and process my personal data.";
;

const validateForm = (event, form, actionFunction) => {
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
        if (typeof actionFunction === 'function') {
            actionFunction();
        }

    }
};

const formatCurrencyAmount = function(amount,currency,showCurrency=true){
    let formattedAmount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0, // Enforce no decimal places
        maximumFractionDigits: 0
    }).format(amount);
    return showCurrency ? formattedAmount + ' ' + currency : formattedAmount;
};

const showLoadingState = (isLoading,el) =>{
  if (isLoading) {
    el.html('<div class="lds-loader position-absolute top-50 start-50 translate-middle"><div></div><div></div><div></div></div>');
    
  } else {
    el.find('.lds-loader').remove();
  }
}

const resizeSectionBoxes = (listArray, el) => {
  listArray.forEach((selector) => {
    let maxHeight = 0;
    const items = el.find(selector);

    items.each(function() {
      const $this = $(this);
      let currentHeight = 0;

      if ($this.is(':visible')) {
        currentHeight = $this.height();
      } else {
        // Swap properties to get measurements
        const $clone = $this.clone().attr("style", "visibility: hidden !important; display: block !important; position: absolute !important;");
        $this.after($clone);
        currentHeight = $clone.height();
      }

      if (currentHeight > maxHeight) maxHeight = currentHeight;
    });

    items.height(maxHeight);
  });
};

const usdFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
});

const clearInputs = (elementId) => {
  const container = document.getElementById(elementId);
  if (!container) return;

  // 1. Clear standard inputs (text, password, email, etc.) and textareas
  const inputs = container.querySelectorAll('input, textarea');
  inputs.forEach(input => {
    switch (input.type) {
      case 'checkbox':
        input.disabled = false; // Enable checkboxes
        input.checked = false; // Uncheck checkboxes
        break;
      case 'radio':
        input.checked = false;
        break;
      default:
        input.value = '';
    }
  });

  // 2. Reset dropdowns to the first option
  const selects = container.querySelectorAll('select');
  selects.forEach(select => {
    select.selectedIndex = 0;
  });
}

const setupAutocomplete = (inputSelector, containerClass, dataList) => {
    const $input = $(inputSelector);
    const $container = $input.closest('.' + containerClass);
    const $list = $container.find('.suggestions-list');
    
    // 1. Clean and Sort the data once
    const sortedData = [...new Set(dataList)]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));

    // 2. Remove old listeners to prevent "Event Doubling"
    $input.off('focus input blur keydown');
    $list.off('mousedown', '.suggestion-item');

    const renderList = (matches) => {
        $list.empty();
        if (matches.length > 0) {
            matches.forEach(match => {
                $list.append(`<div class="suggestion-item">${match}</div>`);
            });
            $list.show();
        } else {
            $list.hide();
        }
    };

    $input.on('focus input', function() {
        const query = $(this).val().toLowerCase();
        // Show all if empty, otherwise filter
        const matches = query 
            ? sortedData.filter(item => item.toLowerCase().includes(query)) 
            : sortedData;
        renderList(matches);
    });

    $input.on('blur', function() {
        const currentVal = $(this).val().trim();
        
        // Case-insensitive validation
        const match = sortedData.find(item => 
            item.toLowerCase() === currentVal.toLowerCase()
        );

        if (currentVal !== "" && !match) {
            $(this).val(""); 
        } else if (match) {
            $(this).val(match); // Snap to the correct casing (e.g., "Aviation")
        }
        
        setTimeout(() => $list.hide(), 200); // Small delay for mousedown to fire
    });

    // Selection logic
    $list.on('mousedown', '.suggestion-item', function(e) {
        const selectedValue = $(this).text();
        $input.val(selectedValue).trigger('change');
        $list.hide();
    });
};

const copyToClipboard = async () => {
    const shareBtn = document.getElementById('share-btn');
    const statusText = document.getElementById('copy-status');
    
    // Get the current page URL (including ?school_ids=...)
    const currentUrl = window.location.href;

    try {
        await navigator.clipboard.writeText(currentUrl);
        
        // Visual feedback for the user
        statusText.style.display = 'inline';
        shareBtn.classList.replace('btn-outline-secondary', 'btn-success');
        
        // Reset the button after 3 seconds
        setTimeout(() => {
            statusText.style.display = 'none';
            shareBtn.classList.replace('btn-success', 'btn-outline-secondary');
        }, 3000);
        
    } catch (err) {
        console.error('Failed to copy: ', err);
        alert('Unable to copy URL. Please copy it manually from the address bar.');
    }
}

const serializeContainer = (containerSelector, disablePersonalFields = true) => {
    const container = document.querySelector(containerSelector);
    if (!container) return {};

    const obj = {};
    
    // Define fields to exclude for privacy
    const privateFields = [
        'quiz_last_name', 
        'quiz_email', 
        'quiz_phone', 
        'student_privacy_consent'
    ];

    // 1. Get standard inputs
    const inputs = container.querySelectorAll('input, select, textarea');
    
    // 2. Get Bootstrap dropdowns
    const bootstrapDropdowns = container.querySelectorAll('.dropdown[data-name]');

    // Handle Standard Inputs
    inputs.forEach(field => {
        // Privacy Check: Skip if the field name is in the private list
        if (disablePersonalFields && privateFields.includes(field.name)) {
            return;
        }

        if (!field.name || field.disabled || ['file', 'reset', 'submit', 'button'].includes(field.type)) {
            return;
        }

        if (field.type === 'checkbox') {
            if (field.checked) {
                if (obj[field.name]) {
                    Array.isArray(obj[field.name]) ? obj[field.name].push(field.value) : obj[field.name] = [obj[field.name], field.value];
                } else {
                    obj[field.name] = [field.value];
                }
            } else if (!obj[field.name]) {
                obj[field.name] = [];
            }
        } else if (field.type === 'radio') {
            if (field.checked) obj[field.name] = field.value;
        } else {
            obj[field.name] = field.value;
        }
    });

    // Handle Bootstrap Dropdowns
    bootstrapDropdowns.forEach(dropdown => {
        const key = dropdown.getAttribute('data-name');
        
        // Privacy Check for Dropdowns
        if (disablePersonalFields && privateFields.includes(key)) {
            return;
        }

        const toggleBtn = dropdown.querySelector('.dropdown-toggle');
        const value = toggleBtn.getAttribute('data-value') || toggleBtn.textContent.trim();
        const defaultValue = toggleBtn.getAttribute('data-default');
        
        if (value && value !== defaultValue) {
            obj[key] = value;
        }
    });

    return obj;
};

const getCookie = (name) => {
  let value = "; " + document.cookie;
  let parts = value.split("; " + name + "=");
  if (parts.length == 2) {
    return parts.pop().split(";").shift();
  }
};

const observerOptions = {
  // '0px 0px 100px 0px' means: 
  // Trigger when the element is 100px away from entering the BOTTOM of the viewport
  rootMargin: '0px 0px -300px 0px', 
  threshold: 0 
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
    } 
  });
}, observerOptions);

document.querySelectorAll('section').forEach(section => {
  observer.observe(section);
});
