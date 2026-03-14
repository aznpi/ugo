const formatCurrencyAmount = function(amount,currency){
    let formattedAmount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0, // Enforce no decimal places
        maximumFractionDigits: 0
    }).format(amount);
    return  formattedAmount;
};

const showLoadingState = (isLoading,el) =>{
  if (isLoading) {
    el.html('<div class="lds-loader position-absolute top-50 start-50 translate-middle"><div></div><div></div><div></div></div>');
    
  } else {
    el.find('.lds-loader').remove();
  }
}

const resizeSectionBoxes = (listArray,el)=>{
  
  var resizeArray = listArray;
  var arrayLength = resizeArray.length;
  var maxHeight = [];
  
  for (var i = 0; i < arrayLength; i++) {
    maxHeight[i] = 0;
    el.find(resizeArray[i]).each(function () {
        if ($(this).height() > maxHeight[i]) { maxHeight[i] = $(this).height(); }
    });
    el.find(resizeArray[i]).height(maxHeight[i]);
  }

}

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
    let activeIndex = -1;

    // NEW: Sort the dataList alphabetically immediately
    // Using localeCompare for better handling of special characters
    const sortedData = [...dataList].sort((a, b) => a.localeCompare(b));

    // Helper to render items based on a filtered list
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

    // Handle Focus - Show the entire sorted list
    $input.on('focus', function() {
        activeIndex = -1;
        const query = $(this).val().toLowerCase();
        
        const matches = query 
            ? sortedData.filter(item => item.toLowerCase().includes(query)) 
            : sortedData;
            
        renderList(matches);
    });

    // Handle typing
    $input.on('input', function() {
        const query = $(this).val().toLowerCase();
        activeIndex = -1;

        const matches = query 
            ? sortedData.filter(item => item.toLowerCase().includes(query)) 
            : sortedData;

        renderList(matches);
    });

    /* ... Keyboard Navigation, Selection, and Blur logic remain the same ... */
    
    // Handle Selection
    $list.on('mousedown', '.suggestion-item', function(e) {
        e.preventDefault();
        const selectedValue = $(this).text();
        $input.val(selectedValue).trigger('change');
        $list.hide();
    });

    $input.on('blur', function() {
        const currentVal = $(this).val();
        // Check against the sorted list
        const isValid = sortedData.includes(currentVal);

        if (currentVal !== "" && !isValid) {
            $(this).val(""); 
        }
        $list.hide();
    });

    const updateHighlight = ($items) => {
        $items.removeClass('suggestion-active');
        if (activeIndex > -1) {
            const $activeItem = $items.eq(activeIndex);
            $activeItem.addClass('suggestion-active');
            if ($activeItem[0]) {
                $activeItem[0].scrollIntoView({ block: 'nearest' });
            }
        }
    };
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
