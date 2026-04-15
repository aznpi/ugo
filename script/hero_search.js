document.addEventListener('DOMContentLoaded', function() {
    const searchForm = document.getElementById('schoolSearchForm');
    const schoolSearchDir = "school-search"; 
    //const resultsPage = "/"+schoolSearchDir+"/search-results";
    const resultsPage = "/ugo_dev/"+schoolSearchDir+"/ugo_search_results.html";

    // --- 1. Elements Cache ---
    const countryOptions = searchForm.querySelectorAll('.dropdown-country-option');
    const degreeMenu = searchForm.querySelector('.dropdown-degree-menu');
    const locationHidden = searchForm.querySelector('input[name="school_country_search"]');
    const degreeHidden = searchForm.querySelector('input[name="degree_type_search"]');
    const studyAreaInput = searchForm.querySelector('input[name="study_area_search"]');
    const countryBtn = searchForm.querySelector('.dropdown-country-toggle');
    const degreeBtn = searchForm.querySelector('.dropdown-degree-toggle');
    const degreeWrapper = searchForm.querySelector('#degreeWrapper');
    const searchWrapper = searchForm.querySelector('#searchWrapper');
    const clearBtn = document.getElementById('studyAreaClrBtn');

    // --- 2. Action Handlers (Reusable) ---

    /**
     * Handles Country Selection (from Click or URL)
     */
    const selectCountry = (val, element) => {
        countryBtn.innerHTML = `<span>${val}</span>`;
        locationHidden.value = val;
        studyAreaInput.value = ''; 
        countryBtn.classList.remove('border-danger');

        if (element) {
            element.closest('.dropdown').classList.add('selected');
        }

        if (degreeWrapper) {
            degreeWrapper.classList.add('reveal-field');
        }

        // Trigger your existing degree update function
        updateDegreeDropdown(val, true);
    };

    /**
     * Handles Degree Selection (from Click or URL)
     */
    const selectDegree = async (val, element) => {
        degreeBtn.innerHTML = `<span>${val}</span>`;
        degreeHidden.value = val;
        studyAreaInput.value = ''; 

        if (element) {
            element.closest('.dropdown').classList.add('selected');
        }

        // Update autocomplete with new filtered data
        const areas = await getUniqueAreasOfStudy(locationHidden.value, val);
        setupAutocomplete('#heroStudyAreaSearchTerm', 'auto-area-study', areas);

        if (searchWrapper) {
            searchWrapper.classList.add('reveal-field');
        }
    };

    // --- 3. URL Detection Logic ---
    const initFromURL = () => {
        const pathSegments = window.location.pathname.split('/').filter(s => s.length > 0);
        const countryMap = {
            'canada': 'Canada',
            'australia': 'Australia',
            'malaysia': 'Malaysia',
            'usa': 'USA',
            'europe': 'Europe'
        };

        const matchedSlug = pathSegments.find(segment => 
            countryMap.hasOwnProperty(segment.toLowerCase())
        );

        const matchedCountry = matchedSlug ? countryMap[matchedSlug.toLowerCase()] : null;

        if (matchedCountry) {
            // Find the UI element associated with this country
            const targetItem = Array.from(countryOptions)
                .find(item => item.getAttribute('data-value') === matchedCountry);
            
            selectCountry(matchedCountry, targetItem);
        }
    };

    // --- 4. Event Listeners ---

    countryOptions.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            selectCountry(item.getAttribute('data-value'), item);
        });
    });

    degreeMenu.addEventListener('click', async (e) => {
            const target = e.target.closest('.dropdown-degree-option');
            if (target) {
            e.preventDefault();
            await selectDegree(target.getAttribute('data-value'), target);
            }
    });

    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // Validation
        if (!locationHidden.value) {
            alert("Please select a school location.");
            return;
        }
        if (!degreeHidden.value) {
            degreeBtn.classList.add('border-danger');
            alert("Please select a Degree Type.");
            return;
        }
        if (!studyAreaInput.value.trim()) {
            studyAreaInput.classList.add('is-invalid');
            studyAreaInput.focus();
            return;
        }

        const filteredParams = {
            school_country_search: locationHidden.value,
            degree_type_search: degreeHidden.value,
            study_area_search: studyAreaInput.value.trim()
        };

        if (window.location.pathname.includes(schoolSearchDir)) {
            queryIndexedDBAndDisplay(serializeContainer('#schoolSearchForm'));
        } else {
            const queryParams = new URLSearchParams(filteredParams);
            window.location.href = `${resultsPage}?${queryParams.toString()}`;
        }
    });

    // Cleanup Listeners
    studyAreaInput.addEventListener('input', () => studyAreaInput.classList.remove('is-invalid'));
    clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        studyAreaInput.value = '';
        studyAreaInput.focus();
    });
 
    // --- 5. Boot ---
    initFromURL();

    });

const updateDegreeDropdown = async (selectedCountry, clear = true) => {
    // 1. Query IndexedDB for degrees matching the country
        let degrees;

        // 1. Branch the query based on whether we are looking for a Country or a Region
        if (selectedCountry === 'Europe') {
            // Query the multi-entry 'regions' index
            degrees = await db.degreeTypes
                .where('regions')
                .equals('Europe')
                .toArray();
        } else {
            // Standard query for specific countries (Canada, Australia, etc.)
            degrees = await db.degreeTypes
            .where('countries')
            .equals(selectedCountry)
            .toArray();
        }

        // 2. Clear and populate the Degree Dropdown
        const degreeBtn = document.querySelector('.dropdown-degree-toggle');
        const degreeMenu = document.querySelector('.dropdown-degree-menu');
        const degreeHidden = document.querySelector('input[name="degree_type_search"]');
        if (clear) {
        degreeBtn.textContent = 'Choose Degree'; // Reset button text
        degreeHidden.value = ''; // Reset hidden input value
        degreeMenu.innerHTML = ''; // Clear old options
        }

        degrees.forEach(degree => {
            const li = `<li><a class="dropdown-item dropdown-degree-option" 
                        data-value="${degree.name}">${degree.name}</a></li>`;
            degreeMenu.insertAdjacentHTML('beforeend', li);
        });
    }

    const getUniqueAreasOfStudy = async (country, degreeType) => {
        try {
            // 1. Find all schools in the target country
            let schoolsInCountry;

            if (country === 'Europe') {
                schoolsInCountry = await db.schools
                    .where('region')
                    .equals('Europe')
                    .toArray();
            } else {
                schoolsInCountry = await db.schools
                    .where('country_name')
                    .equals(country)
                    .toArray();
            }

            // Extract the School Names (or IDs if your schema uses hs_id)
            const schoolNames = schoolsInCountry.map(s => s.name);
            if (schoolNames.length === 0) return [];

            // 2. Query programs for these schools
            const filteredPrograms = await db.programs
                .where('school_available')
                .anyOf(schoolNames) 
                .filter(program => {
                    // If degreeType is null, undefined, or the default placeholder, ignore the filter
                    if (!degreeType || degreeType.toLowerCase() === 'choose degree') {
                        return true;
                    }
                    
                    const dType = program.degree_type ? String(program.degree_type).toLowerCase() : "";
                    return dType === degreeType.toLowerCase();
                })
                .toArray();

            // 3. Extract, flatten, and clean the Area of Study list
            const cleanList = filteredPrograms
                .flatMap(p => p.area_of_study) // Handles strings or arrays of areas
                .filter(Boolean) 
                .map(item => String(item).trim());

            // 4. Return unique, alphabetically sorted results
            return [...new Set(cleanList)].sort((a, b) => a.localeCompare(b));

        } catch (error) {
            console.error("Error fetching unique areas of study:", error);
            return [];
        }
    };  

     $(document).ready(function() {
        // 1. Find the specific element
        var $heroSearch = $('#hero-school-search.full-form');

        if ($heroSearch.length > 0) {
            // 2. Find the parent section that contains the heroSearch
            var $currentSection = $heroSearch.closest('.hs_cos_wrapper');
            
            // 3. Find the very next section sibling after that parent section
            var $nextSection = $currentSection.nextAll('.hs_cos_wrapper').first();

            // 4. Add your class
            $nextSection.find('section').addClass('add-mobile-top');
        }
    });