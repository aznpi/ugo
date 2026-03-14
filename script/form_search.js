let masterMaxTuition = null;

const   portalId = 5020112,
        schoolTableId = 169609632,
        programTableId = 170387831,
        admissionRequirementTableId = 177485357,
        areaOfStudyTableId = 178019487,
        dbName = 'UgoStoreDB',
        filterModalId = 'filterOptionPanel',
        //update to live url when ready
        // resultsPage = "/search-results",
        // quizResultsPage = "/quiz-results";
        resultsPage = "/ugo_dev/ugo_search_results.html",
        quizResultsPage = "/ugo_dev/ugo_quiz_results.html";
;

// 1. Declare the variable in the global scope (outside any functions)
let db; 

const initDatabase = () => {
    // 2. Assign the Dexie instance to that global variable
    db = new Dexie(dbName);
            
    db.version(1).stores({
        schools: 'hs_id, name, last_updated, city, state_province, country, overview_description, *tags, average_tuition_fees, starting_tuition',
        programs: 'hs_id, last_updated, name, overview, *school_available, *area_of_study, *degree_type',
        admissionRequirements: 'hs_id, last_updated, *school_name, ielts, toeflpb, duolingo, els_level',
        areaOfStudy: 'hs_id, last_updated, name'
    });

    return db.open();
};

// Initialize it immediately
    initDatabase().catch(err => {
    console.error("Failed to open db: " + err);
    });
    
    const tableQueryArray = [
        {
            tableId: schoolTableId,
            storeName: 'schools',
            lastSyncedKey: 'last_sync_schools',
            filters: {
                // Example filter: only fetch schools in the US
                // country: 'United States'
            }
        },
        {
            tableId: programTableId,
            storeName: 'programs',
            lastSyncedKey: 'last_sync_programs',
            filters: {
                // Example filter: only fetch programs with "Computer Science" in the name
                // name__contains: 'Computer Science'
            }
        },
        {
            tableId: admissionRequirementTableId,
            storeName: 'admissionRequirements',
            lastSyncedKey: 'last_sync_admissionRequirements',
            filters: {
                // Example filter: only fetch admission requirements with "English" in the name
                // name__contains: 'English'
            }
        },
        {
            tableId: areaOfStudyTableId,
            storeName: 'areaOfStudy',
            lastSyncedKey: 'last_sync_areaOfStudy',
            filters: {
                // Example filter: only fetch area of studies with "Biology" in the name
                // name__contains: 'Biology'
            }
        }
    ]

    const initDataSync = async () => {
         for (const {tableId, storeName, lastSyncedKey, filters} of tableQueryArray) {
            await syncFilteredData(tableId, portalId, storeName, lastSyncedKey, filters);
        }
    }

    const getHubDBUrl = (tableId, portalId, filters, lastSyncTime = 0)=>  {
        const baseUrl = `https://api.hubapi.com/cms/v3/hubdb/tables/${tableId}/rows`;
        const params = new URLSearchParams({
            portalId: portalId,
            limit: 10000,
            ...filters,
            hs_updated_at__gt: lastSyncTime // Spread your custom filters here
        });
        
        return `${baseUrl}?${params.toString()}`;
    }

    const syncFilteredData = async (tableId, portalId, storeName, lastSyncedKey, filters = {}) => {
        // Start with the parameterized URL
        let query = getHubDBUrl(tableId, portalId, filters, localStorage.getItem(lastSyncedKey) || 0);

        try {
            const response = await fetch(query);
            const data = await response.json();

            // 1. Extract the "results" array from the response
            const results = data.results || [];
            // 2. Map HubDB "results" array to flat objects for Dexie
            if (results.length > 0) {
                // 2. Map and Flatten any array properties automatically
                const recordsToStore = results.map(row => {
                    const rawValues = row.values;
                    const processedValues = {};
                    // Iterate through every key in the HubDB row
                    for (const key in rawValues) {
                         const value = rawValues[key];
                         if (Array.isArray(value)) {
                            // If the value is an array, flatten it (extract 'name', 'label', or the value itself)
                            processedValues[key] = value.map(item => {
                                if (typeof item === 'object' && item !== null) {
                                    return item.name || item.label || item.id || JSON.stringify(item);
                                }
                                return item;
                            });
                        } else {
                            // Otherwise, just copy the value
                            processedValues[key] = value;
                        }
                    }

                    return {
                        hs_id: row.id,
                        last_updated: Math.floor(new Date(row.updatedAt).getTime() / 1000), // Map timestamp for your index
                        ...processedValues,
                            
                        };
                });

                // Write batch to Dexie
                await db[storeName].bulkPut(recordsToStore);

                const latestTimestamp = Math.max(...recordsToStore.map(r => r.last_updated));
                localStorage.setItem(lastSyncedKey, latestTimestamp);

                // HubSpot's next link preserves your filters automatically
                nextUrl = data.paging?.next?.link || null;
                
            }
            /*
            const batch = data.results.map(row => ({
                hs_id: row.id,
                last_updated: Math.floor(new Date(row.updatedAt).getTime() / 1000),
                ...row.values
            }));
            */
            
            
        } catch (error) {
            console.error("Filtered sync failed:", error);
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

    const getValueFromStorage = (dataName,storageName) => {
        // 1. Pull the raw string from localStorage
        const storedData = localStorage.getItem(storageName);

        // 2. Check if it exists
        if (!storedData) {
            console.warn("No data found in localStorage for '" + storageName + "'");
            return [];
        }

        try {
            // 3. Convert the string back into a JavaScript Array
            const parsedArray = JSON.parse(storedData);

            // 4. Extract only the "name" property from each object
            const val = parsedArray.flatMap(item => {
                const value = item[dataName];
                
                // Check if value exists, isn't null, and isn't just empty whitespace
                return (value !== undefined && value !== null && String(value).trim() !== "") 
                    ? [value] 
                    : [];
            });

            // 5. Remove any duplicates and return
            return [...new Set(val)];

        } catch (error) {
            console.error("Error parsing JSON from localStorage", error);
            return [];
        }
    }

    const getValueFromIndexedDB = async (dataName,storeName) => {
        try {
            const allRecords = await db[storeName].toArray();
            const val = allRecords.flatMap(item => {
                const value = item[dataName];
                
                // Check if value exists, isn't null, and isn't just empty whitespace
                return (value !== undefined && value !== null && String(value).trim() !== "") 
                    ? [value] 
                    : [];
            });

            // Remove duplicates and return
            return [...new Set(val)];
        } catch (error) {
            console.error("Error fetching data from IndexedDB", error);
            return [];
        }
    }

    const filterSchoolSearchResults = (filterParamArray, resultsStorageName, dataFilter, clearFilters = false) => {
        
        const results = JSON.parse(localStorage.getItem(resultsStorageName)) || [];
        // 1. Safety check for inputs
        if (!Array.isArray(results) || !filterParamArray || typeof filterParamArray !== 'object') {
            console.error("Invalid data or filter parameters provided.");
            return [];
        }

        let filteredResults = results.filter(school => {
            let isMatch = true;

            // 2. Loop through each filter key-value pair
            Object.entries(filterParamArray).forEach(([key, value]) => {
                // Skip logic if the filter is empty, null, or default "0"
                if (value === "" || value === null || (key === "tuitionRangeMinFilter" && value === "0")) {
                    return;
                }

                const lowerSearchValue = value.toString().toLowerCase();
                const schoolTuition = school.average_tuition_fees || 0;

                // 3. Conditional Logic per Key
                switch (key) {
                    case "schoolNameFilter":
                        if (!school.name?.toLowerCase().includes(lowerSearchValue)) {
                            isMatch = false;
                        }
                        break;

                    case "cityFilter":
                        if (!school.city?.toLowerCase().includes(lowerSearchValue)) {
                            isMatch = false;
                        }
                        break;

                    case "tuitionRangeMinFilter":
                        if (schoolTuition < parseFloat(value)) {
                            isMatch = false;
                        }
                        break;

                    case "tuitionRangeMaxFilter":
                        if (schoolTuition > parseFloat(value)) {
                            isMatch = false;
                        }
                        break;
                }
            });

            return isMatch;
        });

        filteredResults = clearFilters ? results : filteredResults;

        localStorage.setItem(filteredResultsName, JSON.stringify(filteredResults));

        if (dataFilter === "quiz") {
            const   containerEl = $('.schools-results-container','#'+quizContainerId),
                    slideCount = localStorage.getItem('quiz_slide_count') || 4;

            showLoadingState(true,containerEl);
            if ($slider.hasClass('slick-initialized')) {
                $slider.slick('unslick');
            }
            $slider.empty();
            displayQuizResults(filteredResults);
            
            setTimeout(()=>{              
                $slider.slick(sliderSettings(slideCount));
                setTimeout(()=>{
                    $slider.slick('setPosition');
                    resizeSectionBoxes(['.box-card .result-header'],resultsContainer);
                },50)
                showLoadingState(false,containerEl);
            },100)
        }
    }

    const queryIndexedDBAndDisplay = async (input) => {
        // RESET the persistence variable when a new primary search starts
        masterMaxTuition = null;
        
        const resultsName = 'last_school_results';
        const resultsContainer = document.getElementById('search-result-container');
        const resultsContainerEl = $('#search-result-container');

        // 1. Extract and normalize the data
        const schoolIds = input.school_ids ? Array.from(input.school_ids) : [];
        const filters = input.school_filter && input.school_filter.length > 0 ? input.school_filter[0] : input;

        if (!resultsContainer) return;

        showLoadingState(true, resultsContainerEl);

        // Remove old Load More buttons
        const existingBtn = document.getElementById('load-more-container');
        if (existingBtn) existingBtn.remove();

        // Use a small delay for UI transition smoothness
        setTimeout(async () => {
            try {
                // 2. Program-based filtering (Major/Degree)
                let programCollection = (filters.study_area_search && filters.study_area_search !== "") 
                    ? db.programs.where('area_of_study').equals(filters.study_area_search) 
                    : db.programs.toCollection();

                const matchingPrograms = await programCollection
                    .filter(p => {
                        const matchesDegree = !filters.degree_type_search || 
                                            (p.degree_type && p.degree_type.includes(filters.degree_type_search));
                        return matchesDegree;
                    })
                    .toArray();

                const uniqueNamesFromPrograms = [...new Set(matchingPrograms.flatMap(p => p.school_available || []))];

                // 3. Construct the School Query
                let schoolQuery;
                if (schoolIds.length > 0) {
                    schoolQuery = db.schools.where('hs_id').anyOf(schoolIds);
                } else if (uniqueNamesFromPrograms.length > 0) {
                    schoolQuery = db.schools.where('name').anyOf(uniqueNamesFromPrograms);
                } else {
                    schoolQuery = db.schools.toCollection();
                }

                // 4. Final refinement
                const matchedSchools = await schoolQuery
                    .filter(item => {
                        const matchesCountry = !filters.school_country_search || item.country === filters.school_country_search;
                        const matchesProgramLink = uniqueNamesFromPrograms.length > 0 
                            ? uniqueNamesFromPrograms.includes(item.name) 
                            : true;

                        return matchesCountry && matchesProgramLink;
                    })
                    .toArray();

                // Store in localStorage for persistence
                localStorage.setItem(resultsName, JSON.stringify(matchedSchools));

                // 5. CALL THE RENDER FUNCTION
                renderSchoolResults(matchedSchools);

            } catch (error) {
                console.error("Query Error:", error);
                resultsContainer.innerHTML = '<div class="alert alert-danger">An error occurred while fetching results.</div>';
            }
        }, 500); // Reduced timeout from 2000 to 500 for better UX
    };

    const renderSchoolResults = (schools) => {
        const resultsContainer = document.getElementById('search-result-container');
        const itemsPerPage = 12;

        if (!resultsContainer) return;

        // Update result count UI
        $('.filter-details-container').find('span.results-count').text(schools.length);

        if (schools.length === 0) {
            renderNoResults(resultsContainer);
            return;
        }

        resultsContainer.innerHTML = ''; 
        
        // Generate HTML
        schools.forEach((school, index) => {
            const hideClass = index >= itemsPerPage ? 'd-none' : '';
            const logoHtml = school.logo?.url 
                ? `<img src="${school.logo.url}" alt="${school.name} logo" class="img-fluid">` 
                : '';

            const schoolCard = `
                <div class="col-md-3 mb-4 school-card-item ${hideClass}">
                    <div class="box-card">
                        <div class="result-header">
                            <div class="title"><h5>${school.name}</h5></div>
                            <div class="logo-container">${logoHtml}</div>
                        </div>
                        <div class="location">
                            <p>${[school.city, school.state_province, school.country].filter(Boolean).join(', ')}</p>
                        </div>
                        <div class="school-details">
                            <ul>
                                <li class="tuition fw-bold">Average Tuition: ${school.average_tuition_fees ? usdFormatter.format(school.average_tuition_fees) : 'Contact for fees'}</li>
                            </ul>
                        </div>
                        <div class="description">
                            <p>${school.overview_description || 'No description available.'}</p>
                        </div>
                        <div class="btn-container">
                            <a href="#" data-target="${school.page_link ? '/school' + school.page_link : '/'}" class="btn btn-outline school-link">Learn More</a>
                            <div class="btn-group" role="group">
                                <input type="checkbox" id="compare-${school.hs_id}" name="school_compare" value="${school.hs_id}" 
                                    class="compare-check" data-id="${school.hs_id}" data-name="${school.name}" 
                                    data-logo="${school.logo?.url || ''}" autocomplete="off">
                                <label for="compare-${school.hs_id}">Compare</label>
                            </div>
                        </div>
                    </div>
                </div>`;
            
            resultsContainer.insertAdjacentHTML('beforeend', schoolCard);
        });

        updateFilterOptions(schools);

        // Handle equalization and pagination
        setTimeout(() => {
            resizeSectionBoxes(['.box-card .result-header','.box-card .description'], $(resultsContainer));
        }, 50);

        handleLoadMore(schools.length, itemsPerPage, resultsContainer);
    };

    const renderNoResults = (resultsContainer) => {
        if (!resultsContainer) return;

        // 1. Clear any existing content or loaders
        resultsContainer.innerHTML = '';

        // 2. Create the No Results UI
        const noResultsHTML = `
            <div class="no-results-wrapper text-center py-5">
                <div class="mb-4">
                    <i class="fas fa-search-minus fa-4x text-light-grey" style="opacity: 0.5;"></i>
                </div>
                <h3 class="fw-bold text-blue">No matching schools found</h3>
                <p class="text-muted mb-4">
                    We couldn't find any programs matching your current filters. <br>
                    Try adjusting your criteria or broadening your search.
                </p>
            </div>
        `;

        // 3. Inject into the container
        resultsContainer.insertAdjacentHTML('beforeend', noResultsHTML);
    };

    const handleLoadMore = (totalItems, itemsPerPage, container) => {
        // 1. Remove any existing load-more container to prevent duplicates
        const existingBtn = document.getElementById('load-more-container');
        if (existingBtn) {
            existingBtn.remove();
        }

        // 2. Only proceed if we actually have more items than the initial limit
        if (totalItems > itemsPerPage) {
            const loadMoreMarkup = `
                <div class="col-12 text-center my-4" id="load-more-container">
                    <button class="btn btn-primary" id="btn-show-more">Show More</button>
                </div>`;
            
            // 3. Inject the markup after the results container
            container.insertAdjacentHTML('afterend', loadMoreMarkup);

            // 4. Attach click event to reveal next batch
            document.getElementById('btn-show-more').addEventListener('click', function() {
                const hiddenCards = document.querySelectorAll('.school-card-item.d-none');
                
                // Show the next batch (matching the original itemsPerPage count)
                for (let i = 0; i < itemsPerPage && i < hiddenCards.length; i++) {
                    hiddenCards[i].classList.remove('d-none');
                }

                // 5. Clean up: Remove button if no more hidden cards remain
                if (document.querySelectorAll('.school-card-item.d-none').length === 0) {
                    document.getElementById('load-more-container').remove();
                }
            });
        }
    };

    const getSerializedCriteria = () => {
        const mainForm = document.getElementById('schoolSearchForm');
        const filterModal = document.getElementById('filterOptionPanel');
        const mainData = new FormData(mainForm);
        const criteria = {};

        // 1. Always Merge Main Form (Country, Degree, Area of Study)
        for (let [key, value] of mainData.entries()) {
            criteria[key] = value;
        }

        /**
         * Helper to check if a specific accordion section is open
         * @param {string} selector - The ID of the collapse element (e.g., '#collapseOne')
         */
        const isSectionOpen = (selector) => {
            const el = filterModal.querySelector(selector);
            return el && el.classList.contains('show');
        };

        // 2. Conditional Serialization based on Accordion State

        // School Name (Accordion #collapseOne)
        if (isSectionOpen('#collapseOne')) {
            criteria.schoolName = filterModal.querySelector('#collapseOne .input-search')?.value.toLowerCase().trim() || '';
        }

        // City Name (Accordion #collapseTwo)
        if (isSectionOpen('#collapseTwo')) {
            criteria.city = filterModal.querySelector('#collapseTwo .input-search')?.value.toLowerCase().trim() || '';
        }

        // Location Type Checkboxes (Accordion #collapseThree)
        if (isSectionOpen('#collapseThree')) {
            const modalData = new FormData(filterModal);
            criteria.locationTypes = modalData.getAll('filterLocationType');
        } else {
            criteria.locationTypes = []; // Empty if section closed
        }

        // Tuition Range Sliders (Accordion #collapseFour)
        if (isSectionOpen('#collapseFour')) {
            criteria.tuitionRangeMinFilter = parseInt(filterModal.querySelector('.min')?.value) || 0;
            criteria.tuitionRangeMaxFilter = parseInt(filterModal.querySelector('.max')?.value) || 50000;
        } else {
            // Optional: Set to widest possible range if filter is inactive
            criteria.tuitionRangeMinFilter = 0;
            criteria.tuitionRangeMaxFilter = 1000000; 
        }

        return criteria;
    };

    const executeSerializedSearch = async () => {
        const criteria = getSerializedCriteria();
        console.log("Serialized Search Criteria:", criteria);

        try {
            // --- STEP 1: Query Programs Store ---
            // Find programs that match the Area of Study and Degree Type
            let programQuery = db.programs;
            
            if (criteria.study_area_search && criteria.study_area_search !== "") {
                programQuery = programQuery.where('area_of_study').equals(criteria.study_area_search);
            } else {
                programQuery = programQuery.toCollection();
            }

            const matchingPrograms = await programQuery
                .filter(p => {
                    const matchesDegree = !criteria.degree_type_search || 
                                        (p.degree_type && p.degree_type.includes(criteria.degree_type_search));
                    return matchesDegree;
                })
                .toArray();

            // Extract unique school names from the filtered programs
            const validSchoolNames = [...new Set(matchingPrograms.flatMap(p => p.school_available || []))];

            // --- STEP 2: Query Schools Store ---
            let schoolQuery;
            
            // If we have program results, limit the school search to those specific school names
            if (validSchoolNames.length > 0) {
                schoolQuery = db.schools.where('name').anyOf(validSchoolNames);
            } else if (!criteria.study_area_search && !criteria.degree_type_search) {
                // If no program filters are active, allow all schools
                schoolQuery = db.schools.toCollection();
            } else {
                // Program filters were active but found nothing
                renderSchoolResults([]);
                return;
            }

            const matchedSchools = await schoolQuery
                .filter(school => {
                    // 1. Primary Filter: Country
                    const matchCountry = !criteria.school_country_search || 
                                    school.country === criteria.school_country_search;

                    // 2. Modal Filter: School Name (Text Search)
                    const matchName = !criteria.filterSchoolSearchTerm || 
                        school.name.toLowerCase().includes(criteria.filterSchoolSearchTerm.toLowerCase());
                    
                    // 3. Modal Filter: City
                    const matchCity = !criteria.filterCitySearchTerm || 
                        school.city?.toLowerCase().includes(criteria.filterCitySearchTerm.toLowerCase());

                    // 4. Modal Filter: Location Type (Checkboxes)
                    const matchLocation = !criteria.locationTypes || criteria.locationTypes.length === 0 || 
                        criteria.locationTypes.includes(school.location_type);

                    // 5. Modal Filter: Tuition Range
                    const tuition = parseFloat(school.average_tuition_fees) || 0;
                    // Note: Ensure your serialized keys match exactly what is in the object
                    const minT = parseFloat(criteria.tuitionRangeMinFilter) || 0;
                    const maxT = parseFloat(criteria.tuitionRangeMaxFilter) || 1000000;
                    const matchTuition = tuition >= minT && tuition <= maxT;

                    return matchCountry && matchName && matchCity && matchLocation && matchTuition;
                })
                .toArray();

            // --- STEP 3: Render & Cleanup ---
            renderSchoolResults(matchedSchools);
            
            // Update the visual filter counter
            if (typeof countFilter === 'function') countFilter();

            // Close modal
            const modalEl = document.getElementById('filterOptionPanel');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();

        } catch (error) {
            console.error("Serialized search failed:", error);
        }
    };

    const updateFilterOptions = (currentSchools) => {
        if (!currentSchools || currentSchools.length === 0) return;

        // ... (Autocomplete logic stays the same) ...

        // 2. Calculate Tuition Range
        const tuitionValues = currentSchools
            .map(s => parseFloat(s.average_tuition_fees))
            .filter(val => !isNaN(val) && val > 0);

        const currentMin = tuitionValues.length ? Math.floor(Math.min(...tuitionValues) / 100) * 100 : 0;
        const currentMax = tuitionValues.length ? Math.ceil(Math.max(...tuitionValues) / 100) * 100 : 50000;

        // PERSISTENCE LOGIC:
        // Only set the masterMaxTuition the first time this runs (or when master list is reset)
        if (masterMaxTuition === null) {
            masterMaxTuition = currentMax;
        }

        // ... (Autocomplete setup stays the same) ...

        // 4. Update Tuition Range Sliders & Labels
        const minSlider = document.querySelector('.double_range_slider .min');
        const maxSlider = document.querySelector('.double_range_slider .max');
        
        if (minSlider && maxSlider) {
            // We use masterMaxTuition for the slider's physical track limit
            minSlider.min = 0;
            minSlider.max = masterMaxTuition; 
            
            maxSlider.min = 0;
            maxSlider.max = masterMaxTuition;

            // Note: We set the 'value' to the current filtering context
            // so the handles move to the specific results found
            minSlider.value = currentMin;
            maxSlider.value = currentMax;

            // ... (Label updates and updateRangeTrack)
            updateRangeTrack(minSlider, maxSlider);
        }

         // 5. Update Checkboxes
        updateLocationCheckboxes(currentSchools);
    };

    /**
     * Helper to update the colored track background of the double range slider
     */
    const updateRangeTrack = (minEl, maxEl) => {
        const track = document.getElementById('range_track');
        if (!track) return;

        const min = parseFloat(minEl.min);
        const max = parseFloat(minEl.max);
        const valMin = parseFloat(minEl.value);
        const valMax = parseFloat(maxEl.value);

        // Calculate percentages for CSS placement
        const percent1 = ((valMin - min) / (max - min)) * 100;
        const percent2 = ((valMax - min) / (max - min)) * 100;

        track.style.left = percent1 + '%';
        track.style.width = (percent2 - percent1) + '%';

        initializeRangeSlider('filterSearchOptions', minEl, maxEl);
    };

    const updateLocationCheckboxes = (currentSchools) => {
        const availableTypes = new Set(currentSchools.map(s => s.location_type));
        const checkboxContainers = document.querySelectorAll('#collapseThree .input-group');

        checkboxContainers.forEach(container => {
            const checkbox = container.querySelector('input');
            if (checkbox) {
                // Hide the entire container if that location type isn't in the results
                if (!availableTypes.has(checkbox.value)) {
                    container.classList.add('d-none');
                } else {
                    container.classList.remove('d-none');
                }
            }
        });
    };

     // --- POPULATE FORM ONLY IF URL PARAMS EXIST ---
    const urlParams = new URLSearchParams(window.location.search);
    
    // 1. Get the school_ids from the URL (assuming a format like ?school_ids=123,456)
    const rawSchoolIds = urlParams.get('school_ids');
    let schoolIdSet = new Set();
    if (rawSchoolIds) {
        // Split the comma-separated string and add to the Set
        rawSchoolIds.split(',').forEach(id => schoolIdSet.add(id.trim()));
    }

    // 2. Check for other search parameters
    const hasParams = urlParams.has('school_country_search') || 
                  urlParams.has('degree_type_search') || 
                  urlParams.has('study_area_search') || 
                  schoolIdSet.size > 0;

    if (hasParams) {
        const initialLocation = urlParams.get('school_country_search') || "";
        const initialDegree = urlParams.get('degree_type_search') || "";
        const initialStudy = urlParams.get('study_area_search') || "";

        if(window.location.pathname.includes(resultsPage)){
            const searchForm = document.getElementById('schoolSearchForm');
            const countryButtons = searchForm.querySelectorAll('.btn-list .btn');
            const locationHidden = searchForm.querySelector('input[name="school_country_search"]');
            const degreeHidden = searchForm.querySelector('input[name="degree_type_search"]');
            const studyAreaInput = searchForm.querySelector('input[name="study_area_search"]');
            const degreeBtn = searchForm.querySelector('.dropdown-toggle');

            // Update UI elements for Location
            if (initialLocation) {
                locationHidden.value = initialLocation;
                countryButtons.forEach(btn => {
                    if (btn.getAttribute('data-value') === initialLocation) {
                        btn.classList.replace('btn-grey', 'btn-blue');
                    }
                });
            }

            // Update UI elements for Degree
            if (initialDegree) {
                degreeHidden.value = initialDegree;
                degreeBtn.textContent = initialDegree;
            }

            // Update UI elements for Study Area
            if (initialStudy) {
                studyAreaInput.value = initialStudy;
            }

        }
        

        // 3. Auto-trigger search using the specific structure required by your function
        if (window.location.pathname.includes(resultsPage) || window.location.pathname.includes(quizResultsPage)) {
            queryIndexedDBAndDisplay({
                school_ids: schoolIdSet, // Passing the Set of IDs
                school_filter: [{
                    school_country_search: initialLocation,
                    degree_type_search: initialDegree,
                    study_area_search: initialStudy
                }]
            });
        }
    }
    
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
        $('input[name="school_country_search"]','.hero').val(selectedValue);
    });

    //search filter modal
   let modalInstance = null; 

    const modalEl = document.getElementById(filterModalId);

    // 2. Only assign if the element exists
    if (modalEl) {
        modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
    } else {
        console.warn(`Modal element "${filterModalId}" not found. Instance remains null.`);
    }

    const countFilter = function(){
        let count = 0;

        $('.filter-field','#'+filterModalId + ' .accordion-item .accordion-collapse.show').each(function() {
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

    const clearFilterFields = function(dataFilter){
        $('.filter-field:not([type=range])','#'+filterModalId + ' .accordion-item .accordion-collapse.show').each(function() {
                let fieldType = $(this).attr('type');
                // Check if the value of the current input is not empty
                if (fieldType === 'checkbox' || fieldType === 'radio'){
                $(this).prop('checked', false);
            }else{
                $(this).val('');
            }            
        });
         const   formData = serializeContainer('#'+filterModalId);
        
        filterSchoolSearchResults(formData,resultsName,dataFilter,true);
    }

    const initSchoolComparison = () => {
        const banner = document.getElementById('compare-banner');
        const itemsContainer = document.getElementById('compare-items');
        const clearBtn = document.getElementById('compare-clear');
        
        let selectedSchools = []; // Array of {id, name, logo}

        const updateBanner = () => {
            banner.style.display = selectedSchools.length > 0 ? 'block' : 'none';

            // Render Logos instead of Names
            itemsContainer.innerHTML = selectedSchools.map(school => `
                <div class="position-relative me-2 mb-1" style="width: 60px; height: 60px;">
                    <img src="${school.logo}" alt="${school.name}" 
                        class="img-thumbnail w-100 h-100 object-fit-contain" 
                        title="${school.name}">
                    <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill remove-badge cursor-pointer" 
                        onclick="removeCompareItem('${school.id}')" 
                        style="z-index: 2;">
                        &times;
                    </span>
                </div>
            `).join('');
        };

        window.removeCompareItem = (id) => {
            selectedSchools = selectedSchools.filter(s => s.id !== id);
            const checkbox = document.querySelector(`.compare-check[data-id="${id}"]`);
            if (checkbox) checkbox.checked = false;
            updateBanner();
        };

        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('compare-check')) {
                const id = e.target.getAttribute('data-id');
                const name = e.target.getAttribute('data-name');
                const logo = e.target.getAttribute('data-logo') || 'placeholder-logo.png'; // Fallback

                if (e.target.checked) {
                    if (selectedSchools.length >= 5) {
                        alert("You can compare up to 5 schools at a time.");
                        e.target.checked = false;
                        return;
                    }
                    selectedSchools.push({ id, name, logo });
                } else {
                    selectedSchools = selectedSchools.filter(s => s.id !== id);
                }
                updateBanner();
            }
        });

        clearBtn?.addEventListener('click', () => {
            selectedSchools = [];
            document.querySelectorAll('.compare-check').forEach(cb => cb.checked = false);
            updateBanner();
        });

        document.getElementById('compare-submit')?.addEventListener('click', () => {
            const ids = selectedSchools.map(s => s.id).join(',');
            //window.location.href = `/compare?school_ids=${ids}`;
            window.location.href = `/ugo_dev/ugo_comparison.html?school_ids=${ids}`;
        });
    };


    $('.filter-submit','#'+filterModalId).on('click',function(){
        // Select all inputs with the class 'myInput'
        executeSerializedSearch();
    });

    $('.clear-filter','#'+filterModalId).on('click',function(){
        $('.collapse.show',filterModalId).collapse('hide');
        
        // Optional: If using Bootstrap 5's default accordion component structure, 
        // also ensure the buttons/headers get the 'collapsed' class and lose 'active' if used
        $('.accordion-button','#'+filterModalId).addClass('collapsed');
        $('.accordion-button','#'+filterModalId).attr('aria-expanded', false);
        clearFilterFields($(this).attr('data-filter'));
        executeSerializedSearch();
    });