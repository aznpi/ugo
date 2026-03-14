document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const heroName = urlParams.get('quiz_first_name');
    
    if (heroName) {
        document.getElementById('hero-name').textContent = `, ${heroName}`;
    }

    const container = document.getElementById('search-criteria-results');
    if (!container) return;

    const labelMap = {
        'country_option': 'Country of Study',
        'school_degree_type': 'Degree Type',
        'school_major': 'Area of Study',
        'nationality': 'Your Nationality',
        'school_test_type': 'Entrance Exam',
        'school_outcome_option': 'Top Priorities',
        'school_tuition': 'Tuition Budget Range',
        'location_type_option': 'Preferred Setting'
    };

    const excludedKeys = ['quiz_first_name', 'school_ids'];
    let htmlMarkup = '';

    urlParams.forEach((value, key) => {
        if (excludedKeys.includes(key) || !value || value.trim() === "") {
            return;
        }

        const cleanLabel = labelMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        // Decode and replace "+" with spaces
        let displayValue = decodeURIComponent(value).replace(/\+/g, ' ');

        // Apply Currency Formatting specifically for school_tuition
        if (key === 'school_tuition') {
            const numericValue = displayValue.replace(/[^0-9]/g, '');
            if (numericValue) {
                const formattedPrice = usdFormatter.format(numericValue);
                // Keep prefix symbols like < or > if they exist
                const prefixMatch = displayValue.match(/^[<>=]*/);
                const prefix = prefixMatch ? prefixMatch[0] : '';
                displayValue = `${prefix} ${formattedPrice}`.trim();
            }
        }

        // Clean up comma-separated lists for better readability
        if (key !== 'school_tuition' && displayValue.includes(',')) {
            displayValue = displayValue.split(',').join(', ');
        }

        if (displayValue !== "0") {
            htmlMarkup += `
                <div class="filter-item mb-2">
                    <span class="fw-bold text-blue">${cleanLabel}:</span> 
                    <span class="text-muted">${displayValue}</span>
                </div>`;
        }
    });

    container.innerHTML = htmlMarkup || '<p>No specific filters applied.</p>';
});