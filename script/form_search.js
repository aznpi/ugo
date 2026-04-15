let masterMaxTuition = null,
    masterCityList = [],
    masterSchoolNames = [],
    isInitialized = false;

const   dbName = 'UgoStoreDB',
        filterModalId = 'filterOptionPanel',
        schoolSearchDir = "school-search",
        //update to live url when ready
        // resultsPage = "/"+schoolSearchDir+"/search-results",
        // quizResultsPage = "/"+schoolSearchDir+"/quiz-results";
        resultsPage = "/ugo_dev/"+schoolSearchDir+"/ugo_search_results.html",
        quizResultsPage = "/ugo_dev/"+schoolSearchDir+"/ugo_quiz_results.html";
;

// 1. Declare the variable in the global scope (outside any functions)
let db; 

const initDatabase = () => {
    // 2. Assign the Dexie instance to that global variable
    db = new Dexie(dbName);
            
    db.version(3).stores({
        schools: 'hs_id, name, last_updated, city, state_province,*country_name, *region,overview_description, *tags, average_tuition_fees, starting_tuition',
        programs: 'hs_id, last_updated, name, overview, *school_available, *area_of_study, *degree_type',
        admissionRequirements: 'hs_id, last_updated, *school_name, ielts, toeflpb, duolingo, els_level',
        areaOfStudy: 'hs_id, last_updated, name',
        degreeTypes: 'hs_id, last_updated, name, *countries, *regions'
    });

    return db.open();
};

// Initialize it immediately
    const initializeApp = async () => {
    // 1. Exit early if already initialized
        if (isInitialized) return;

        try {
            await initDatabase();
            await initDataSync();
            
            // 2. Set the flag to true
            isInitialized = true;
            console.log("App initialization complete.");
        } catch (error) {
            console.error("Initialization failed:", error);
        }
    };

    initializeApp();
    
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
            tableId: schoolTableEUId,
            storeName: 'schools',
            lastSyncedKey: 'last_sync_schools',
            filters: {
                // Example filter: only fetch schools in the US
                // country: 'United States'
            }
        },
         {
            tableId: schoolTableCAId,
            storeName: 'schools',
            lastSyncedKey: 'last_sync_schools',
            filters: {
                // Example filter: only fetch schools in the US
                // country: 'United States'
            }
        },
         {
            tableId: schoolTableAUId,
            storeName: 'schools',
            lastSyncedKey: 'last_sync_schools',
            filters: {
                // Example filter: only fetch schools in the US
                // country: 'United States'
            }
        },
         {
            tableId: schoolTableMAId,
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
            tableId: programTableEUId,
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
            tableId: admissionRequirementTableEUId,
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
        },
        {
            tableId: degreeTypesTableId,
            storeName: 'degreeTypes',
            lastSyncedKey: 'last_sync_degreeTypes',
            filters: {
                // Example filter: only fetch degree types with "Biology" in the name
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

            const results = data.results || [];
            if (results.length > 0) {
                const recordsToStore = [];
                const idsToDelete = [];

                results.forEach(row => {
                    const rawValues = row.values;
                    
                    // 1. CHECK FOR DISABLED STATUS
                    // Change 'enable' to the internal name of your HubDB column
                    // We also check HubSpot's native 'isDeleted' flag if available
                    const isInactive = rawValues.enable === 0 || row.isDeleted === true;

                    if (isInactive) {
                        idsToDelete.push(row.id);
                        return; // Skip mapping and move to the next row
                    }

                    // 2. Map and Flatten values for active rows
                    const processedValues = {};
                    for (const key in rawValues) {
                        const value = rawValues[key];
                        if (Array.isArray(value)) {
                            processedValues[key] = value.map(item => {
                                if (typeof item === 'object' && item !== null) {
                                    return item.name || item.label || item.id || JSON.stringify(item);
                                }
                                return item;
                            });
                        } else {
                            processedValues[key] = value;
                        }
                    }

                    recordsToStore.push({
                        hs_id: row.id,
                        last_updated: Math.floor(new Date(row.updatedAt).getTime() / 1000),
                        ...processedValues,
                    });
                });

                // 3. EXECUTE DEXIE OPERATIONS
                // Delete disabled rows first
                if (idsToDelete.length > 0) {
                    await db[storeName].bulkDelete(idsToDelete);
                    console.log(`🗑️ Removed ${idsToDelete.length} inactive items from ${storeName}`);
                }

                // Update/Insert active rows
                if (recordsToStore.length > 0) {
                    await db[storeName].bulkPut(recordsToStore);
                    
                    // Update the sync timestamp based on the latest record processed
                    const latestTimestamp = Math.max(...recordsToStore.map(r => r.last_updated));
                    localStorage.setItem(lastSyncedKey, latestTimestamp);
                    console.log(`✅ Synced ${recordsToStore.length} items to ${storeName}`);
                }

                // Handle pagination
                nextUrl = data.paging?.next?.link || null;
            }
        } catch (error) {
            console.error("Filtered sync failed:", error);
        }
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
        // 1. RESET persistence variables for a fresh search
        masterMaxTuition = null;
        masterCityList = [];
        masterSchoolNames = [];

        const resultsName = 'last_school_results';
        const resultsContainer = document.getElementById('search-result-container');
        const resultsContainerEl = $('#search-result-container');

        // 2. Extract and normalize the data from the input
        // Handles both the quiz result format and the direct search form format
        const schoolIds = input.school_ids ? Array.from(input.school_ids) : [];
        const filters = input.school_filter && input.school_filter.length > 0 ? input.school_filter[0] : input;

        if (!resultsContainer) return;

        // Show visual loading state
        showLoadingState(true, resultsContainerEl);

        // Remove old "Load More" UI elements
        const existingBtn = document.getElementById('load-more-container');
        if (existingBtn) existingBtn.remove();

        // Small delay to allow the loading spinner to render smoothly
        setTimeout(async () => {
            try {
                // --- STEP A: Program-based filtering (Major & Degree) ---
                // We find programs first to get a list of schools that offer them
                let programCollection;
                if (filters.study_area_search && filters.study_area_search !== "") {
                    programCollection = db.programs.where('area_of_study').equals(filters.study_area_search);
                } else {
                    programCollection = db.programs.toCollection();
                }

                const matchingPrograms = await programCollection
                    .filter(p => {
                        const matchesDegree = !filters.degree_type_search || 
                                            (p.degree_type && p.degree_type.includes(filters.degree_type_search));
                        return matchesDegree;
                    })
                    .toArray();

                // Extract unique school names from the matching programs
                const uniqueNamesFromPrograms = [...new Set(matchingPrograms.flatMap(p => p.school_available || []))];

                // --- STEP B: Construct the School Query ---
                let schoolQuery;
                if (schoolIds.length > 0) {
                    schoolQuery = db.schools.where('hs_id').anyOf(schoolIds);
                } else if (uniqueNamesFromPrograms.length > 0) {
                    schoolQuery = db.schools.where('name').anyOf(uniqueNamesFromPrograms);
                } else {
                    // If no specific program was searched, we look at all schools
                    schoolQuery = db.schools.toCollection();
                }

                // --- STEP C: Final Refinement (Country & Tags) ---
                const matchedSchools = await schoolQuery
                    .filter(item => {
                        // 1. Country Filter
                        const matchesCountry = !filters.school_country_search || (
                            filters.school_country_search === 'Europe' 
                                ? (item.region && item.region.includes('Europe')) 
                                : (item.country_name && item.country_name.includes(filters.school_country_search))
                        );
                        
                        // 2. School Tags Filter (Handles comma-delimited strings)
                        let matchesTags = true;
                        if (filters.tags_search && filters.tags_search.trim() !== "") {
                            // Split "tag1, tag2" into ["tag1", "tag2"]
                            const requestedTags = filters.tags_search.split(',').map(t => t.trim().toLowerCase());
                            const schoolTags = Array.isArray(item.tags) ? item.tags.map(t => t.toLowerCase()) : [];
                            
                            // Check if school has EVERY tag requested
                            matchesTags = requestedTags.every(tag => schoolTags.includes(tag));
                        }


                        // 3. Program Linkage (Ensures school actually has the selected study area)
                        const matchesProgramLink = uniqueNamesFromPrograms.length > 0 
                            ? uniqueNamesFromPrograms.includes(item.name) 
                            : true;

                        return matchesCountry && matchesTags && matchesProgramLink;
                    })
                    .toArray();

                // --- STEP D: Persistence & Rendering ---
                // 1. Determine if we need to group results
                // Logic: If country is selected AND it is not USA, we group by parent_school_name
                const selectedCountry = filters.school_country_search;
                const shouldGroup = selectedCountry && selectedCountry !== "USA";

                let finalDisplayData;

                if (shouldGroup) {
                    // Group by parent_school_name
                    const grouped = matchedSchools.reduce((acc, school) => {
                        const key = school.parent_school_name || 'no-parent';
                        if (!acc[key]) {
                            acc[key] = { ...school, is_group: true, matching_variants: [] };
                        }
                        acc[key].matching_variants.push(school);
                        return acc;
                    }, {});

                    finalDisplayData = Object.values(grouped);
                } else {
                    finalDisplayData = matchedSchools;
                }

                // Store the processed results (grouped or flat) in localStorage
                localStorage.setItem(resultsName, JSON.stringify(finalDisplayData));

                // Hide loading and render
                showLoadingState(false, resultsContainerEl);
                
                // Note: Ensure renderSchoolResults is updated to handle items with 'matching_variants'
                renderSchoolResults(finalDisplayData);

            } catch (error) {
                console.error("Query Error:", error);
                showLoadingState(false, resultsContainerEl);
                resultsContainer.innerHTML = `
                    <div class="alert alert-danger">
                        An error occurred while fetching results. Please try refreshing.
                    </div>`;
            }
        }, 500); 
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
            // 1. Determine if we should clean the name (only for grouped results)
            const displayName = school.is_group 
                ? school.parent_school_name || school.name
                : school.name;

            // 2. NEW: Collect IDs for Comparison
            // If it's a group, join all variant IDs; otherwise, use the single hs_id
            const allIds = school.is_group && school.matching_variants
                ? school.matching_variants.map(v => v.hs_id).join(',')
                : school.hs_id;
                
            const hideClass = index >= itemsPerPage ? 'd-none' : '';
            const logoHtml = school.logo?.url 
                ? `<img src="${school.logo.url}" alt="${displayName} logo" class="img-fluid">` 
                : '';
            const currency = school.currency.name || 'USD';
            
            // Handle Country Directory Pathing
            const countryDir = school.country_name ? school.country_name.includes("USA") ? "/usa" : school.country_name.includes("Canada") ? "/canada" : school.country_name.includes("Australia") ? "/australia" : school.country_name.includes("Malaysia") ? "/malaysia" : "/europe" : "";

            // --- NEW: Handle Campus Location List ---
            let locationHtml = '';
            if (school.is_group && school.matching_variants) {
                // 1. Group cities by their country_name
            const countryGroups = school.matching_variants.reduce((acc, v) => {
                const country = v.country_name || 'Other';
                const city = v.city;
                
                if (!acc[country]) acc[country] = new Set();
                if (city) acc[country].add(city);
                
                return acc;
            }, {});

            // 2. Format the groups into "Country: City, City"
            const formattedGroups = Object.keys(countryGroups).map(country => {
                const cities = Array.from(countryGroups[country]);
                return `<strong>${country}:</strong> ${cities.join(', ')}`;
            });

            locationHtml = `
                <div class="campus-group-container">
                    <p class="campus-list mb-0 fw-bold">Locations:</p>
                    <p class="campus-list mb-0 ps-3">${formattedGroups.join('<br>')}</p>
                </div>`;
            } else {
                // Default single location display
                const locationParts = [school.city, school.state_province, school.country_name].filter(Boolean);
                locationHtml = `<p>${locationParts.join(', ')}</p>`;
            }

            const rankingString = school.rankings 
                ? `<li class="badge text-wrap bg-light-grey align-items-center me-1 my-1 py-2 w-100">
                    <i class="fa-solid fa-trophy me-2"></i>${school.rankings.split(';')[0]}
                </li>`
                : '';

            const scholarshipString = school.scholarship_details
                ? `<li class="badge text-wrap bg-light-grey align-items-center me-1 my-1 py-2 w-100">
                    <i class="fa-solid fa-dollar-sign me-2"></i>Scholarships Available
                </li>`
                : '';

            const schoolCard = `
                <div class="col-md-3 mb-4 school-card-item ${hideClass}">
                    <div class="box-card">
                        <div class="result-header">
                            <div class="title"><h5>${displayName}</h5></div>
                            <div class="logo-container">${logoHtml}</div>
                        </div>
                        <div class="location">
                            ${locationHtml}
                        </div>
                        <div class="school-details">
                            <ul>
                                <li class="tuition fw-bold">Average Tuition: ${school.average_tuition_fees ? formatCurrencyAmount(school.average_tuition_fees, currency) : 'Contact for fees'}</li>
                            </ul>
                            ${rankingString ? `<ul class="list-unstyled mb-0 text-center">${rankingString}</ul>` : ''}
                            ${scholarshipString ? `<ul class="list-unstyled mb-0 text-center">${scholarshipString}</ul>` : ''}
                        </div>
                        <div class="description">
                            <p>${school.overview_description || 'No description available.'}</p>
                        </div>
                        <div class="btn-container">
                            <a href="#" data-target="${school.page_link ? '/school'+ countryDir + school.page_link : '/'}" class="btn btn-outline school-link">Learn More</a>
                            <div class="btn-group" role="group">
                                <input type="checkbox" id="compare-${school.hs_id}" name="school_compare" value="${allIds}" 
                                    class="compare-check" data-id="${allIds}" data-name="${school.name}" 
                                    data-logo="${school.logo?.url || ''}" autocomplete="off">
                                <label for="compare-${school.hs_id}">Compare</label>
                            </div>
                        </div>
                    </div>
                </div>`;
            
            resultsContainer.insertAdjacentHTML('beforeend', schoolCard);
        });

        // Cleanup and UI behaviors
        updateFilterOptions(schools);
        renderFilterTags('.tag-filter-container');

        setTimeout(() => {
            resizeSectionBoxes(['.box-card .result-header','.box-card .location','.box-card .description','.box-card .school-details'], $(resultsContainer));
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
        const filterModal = document.getElementById(filterModalId);
        const criteria = {};
        const urlParams = new URLSearchParams(window.location.search);

        // 1. Primary Data Source: Form or URL Fallback
        if (mainForm) {
            const mainData = new FormData(mainForm);
            for (let [key, value] of mainData.entries()) {
                criteria[key] = value;
            }
        } else {
            criteria.school_country_search = urlParams.get('school_country_search') || '';
            criteria.degree_type_search = urlParams.get('degree_type_search') || '';
            criteria.study_area_search = urlParams.get('study_area_search') || '';
        }

        // --- NEW: Handle schoolIds specifically ---
        // Extract school_ids from URL if they exist (e.g., ?school_ids=123,456 or multiple school_ids params)
        const rawIds = urlParams.get('school_ids');
        if (rawIds) {
            // Handle comma-separated strings or single values, converting to an array of numbers/strings
            criteria.schoolIds = rawIds.split(',').map(id => id.trim());
        } else {
            criteria.schoolIds = [];
        }

        // 2. Add Sort Filter (Global)
        const sortInput = document.querySelector('input[name="sortFilter"]');
        criteria.sortFilter = sortInput ? sortInput.value : '';

        /**
         * Helper to check if a specific accordion section is open
         */
        const isSectionOpen = (selector) => {
            if (!filterModal) return false;
            const el = filterModal.querySelector(selector);
            return el && el.classList.contains('show');
        };

        // 3. Conditional Serialization (Modal Accordions)
        if (filterModal) {
            if (isSectionOpen('#collapseOne')) {
                criteria.schoolName = filterModal.querySelector('#collapseOne .input-search')?.value.toLowerCase().trim() || '';
            }

            if (isSectionOpen('#collapseTwo')) {
                criteria.city = filterModal.querySelector('#collapseTwo .input-search')?.value.toLowerCase().trim() || '';
            }
            
            if (isSectionOpen('#collapseThree')) {
                criteria.locationTypes = Array.from(filterModal.querySelectorAll('input[name="filterLocationType"]:checked')).map(input => input.value);
            } else {
                criteria.locationTypes = []; 
            }

            if (isSectionOpen('#collapseFour')) {
                criteria.tuitionRangeMinFilter = parseInt(filterModal.querySelector('.min')?.value) || 0;
                criteria.tuitionRangeMaxFilter = parseInt(filterModal.querySelector('.max')?.value) || 50000;
            } else {
                criteria.tuitionRangeMinFilter = 0;
                criteria.tuitionRangeMaxFilter = 1000000; 
            }
        }

        return criteria;
    };
    const executeSerializedSearch = async (clearFilter = false) => {
        const criteria = getSerializedCriteria();
        const resultsContainerEl = $('#search-result-container');
        showLoadingState(true, resultsContainerEl);


        try {
            // --- STEP 1: Query Programs Store ---
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

            const validSchoolNames = [...new Set(matchingPrograms.flatMap(p => p.school_available || []))];

            // --- STEP 2: Query Schools Store ---
            let schoolQuery;
            if (criteria.schoolIds && criteria.schoolIds.length > 0) {
                // If specific IDs exist, prioritize them (convert to numbers if hs_id is an integer)
                schoolQuery = db.schools.where('hs_id').anyOf(criteria.schoolIds);
            } else {
                if (validSchoolNames.length > 0) {
                    schoolQuery = db.schools.where('name').anyOf(validSchoolNames);
                } else if (!criteria.study_area_search && !criteria.degree_type_search) {
                    schoolQuery = db.schools.toCollection();
                } else {
                    setTimeout(() => renderSchoolResults([]), 1000);
                    return;
                }
            }

            let matchedSchools = await schoolQuery
                .filter(school => {
                    const matchCountry = !criteria.school_country_search || school.country_name.includes(criteria.school_country_search);
                    // --- CONDITIONAL MODAL FILTERS ---
                    // If clearFilter is true, we force these matches to 'true'
                    const matchName = clearFilter || !criteria.schoolName || 
                        school.name.toLowerCase().includes(criteria.schoolName.toLowerCase());
                    
                    const matchCity = clearFilter || !criteria.city || 
                        school.city?.toLowerCase().includes(criteria.city.toLowerCase());

                    const activeLocationTags = Object.values(criteria.locationTypes || {})
                        .filter(value => typeof value === 'string' && value.trim() !== "");

                    const matchLocation = clearFilter || activeLocationTags.length === 0 || 
                        activeLocationTags.some(tag => school.tags && tag.includes(school.tags));

                    const tuition = parseFloat(school.average_tuition_fees) || 0;
                    const minT = parseFloat(criteria.tuitionRangeMinFilter) || 0;
                    const maxT = parseFloat(criteria.tuitionRangeMaxFilter) || 1000000;
                    const matchTuition = clearFilter || (tuition >= minT && tuition <= maxT);

                    return matchCountry && matchName && matchCity && matchLocation && matchTuition;
                })
                .toArray();

            // --- NEW STEP: Apply Sorting Logic ---
            if (criteria.sortFilter) {
                matchedSchools.sort((a, b) => {
                    const tuitionA = parseFloat(a.average_tuition_fees) || 0;
                    const tuitionB = parseFloat(b.average_tuition_fees) || 0;
                    const nameA = a.name.toLowerCase();
                    const nameB = b.name.toLowerCase();

                    switch (criteria.sortFilter) {
                        case 'low-to-high':
                            return tuitionA - tuitionB;
                        case 'high-to-low':
                            return tuitionB - tuitionA;
                        case 'school-name-a-to-z':
                            return nameA.localeCompare(nameB);
                        case 'school-name-z-to-a':
                            return nameB.localeCompare(nameA);
                        default:
                            return 0;
                    }
                });
            }

            // --- STEP 3: Render & Cleanup ---
            setTimeout(() => renderSchoolResults(matchedSchools), 1000);
            
            if (typeof countFilter === 'function') countFilter();

            const modalEl = document.getElementById(filterModalId);
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();

        } catch (error) {
            console.error("Serialized search failed:", error);
        }
    };

    const updateFilterOptions = (currentSchools) => {
        if (!currentSchools || currentSchools.length === 0) return;

        // 1. Extract Unique, Sorted Values
        const uniqueSchoolNames = [...new Set(currentSchools.map(s => s.name))].sort();
        const uniqueCities = [...new Set(currentSchools.map(s => s.city).filter(Boolean))].sort();

        if(masterCityList.length === 0){
            masterCityList = uniqueCities;
        }

        if(masterSchoolNames.length === 0){
            masterSchoolNames = uniqueSchoolNames;
        }

        // 2. Target the specific inputs in your accordion sections
        const schoolInput = document.querySelector('#collapseOne .input-search');
        const cityInput = document.querySelector('#collapseTwo .input-search');

        // 3. Initialize your existing setupAutocomplete function
        if (schoolInput && typeof setupAutocomplete === 'function') {
            setupAutocomplete('#filterSchoolSearchTerm','filter-school-name', masterSchoolNames);
        }

        if (cityInput && typeof setupAutocomplete === 'function') {
            setupAutocomplete('#filterCitySearchTerm','filter-city-name', masterCityList);
        }

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
        //updateLocationCheckboxes(currentSchools);
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
        const availableTypes = new Set(currentSchools.map(s => s.tags).flat());
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

    const renderFilterTags = (containerSelector) => {
        const criteria = getSerializedCriteria();
        const tagContainer = document.querySelector(containerSelector);
        if (!tagContainer) return;

        tagContainer.innerHTML = ''; // Clear existing tags

        // Helper to create the HTML for a tag
        const createTag = (label, key, value = null, isPrimary = false) => {
            const tag = document.createElement('span');
            tag.className = `badge ${isPrimary ? 'bg-primary' : 'bg-light-grey'} me-2 mb-2 p-2 d-inline-flex align-items-center`;
            tag.innerHTML = `
                ${label}
                <i class="ms-2 cursor-pointer bi bi-x-lg" 
                onclick="removeFilterTag('${key}', ${value ? `'${value}'` : 'null'})">
                &times;
                </i>
            `;
            return tag;
        };

        if (criteria.school_country_search) {
            tagContainer.appendChild(createTag(`Country: ${criteria.school_country_search}`, 'school_country_search', null, true));
        }
        if (criteria.degree_type_search) {
            tagContainer.appendChild(createTag(`Degree: ${criteria.degree_type_search}`, 'degree_type_search', null, true));
        }
        
        if (criteria.study_area_search) {
            tagContainer.appendChild(createTag(`Study Area: ${criteria.study_area_search}`, 'study_area_search', null, true));
        }
        if (criteria.sortFilter) {
            const sortLabel = criteria.sortFilter
                .replace(/-/g, ' ')
                .replace(/\b\w/g, char => char.toUpperCase());
            tagContainer.appendChild(createTag(`Sort: ${sortLabel}`, 'sortFilter',null,false));
        }

        // 1. School Name Tag
        if (criteria.schoolName) {
            tagContainer.appendChild(createTag(`School: ${criteria.schoolName}`, 'schoolName', null, false));
        }

        // 2. City Tag
        if (criteria.city) {
            tagContainer.appendChild(createTag(`City: ${criteria.city}`, 'city', null, false));
        }

        // 3. Location Type Tags (Multiple)
        if (criteria.locationTypes && criteria.locationTypes.length > 0) {
            criteria.locationTypes.forEach(type => {
                tagContainer.appendChild(createTag(`City Size: ${type}`, 'filterLocationType', type, false));
            });
        }

        // 4. Tuition Tag (Only if modified from defaults)
        if (criteria.tuitionRangeMinFilter > 0 || criteria.tuitionRangeMaxFilter < 1000000) {
            const label = `Tuition: $${criteria.tuitionRangeMinFilter} - $${criteria.tuitionRangeMaxFilter}`;
            tagContainer.appendChild(createTag(label, 'tuitionRange'));
        }
    };

   const removeFilterTag = (key, value) => {
        const filterModal = document.getElementById(filterModalId);
        
        if (key === 'school_country_search') {
            $('input[name="school_country_search"]','.hero').val('');
            $('.dropdown-country-toggle','.hero').text('Study Country');
        } 
        else if (key === 'degree_type_search') {
            $('input[name="degree_type_search"]','.hero').val('');
            $('.dropdown-degree-toggle','.hero').text('Degree Type');
        } 
        else if (key === 'study_area_search') {
            $('input[name="study_area_search"]','.hero').val('');            
        } 
        else if (key === 'schoolName') {
            filterModal.querySelector('#filterSchoolSearchTerm').value = '';
        }
        else if (key === 'sortFilter') {
            $('input[name="sortFilter"]','#sort-dropdown-filter').val('');
            $('.dropdown-toggle','#sort-dropdown-filter').text('-----');
        }  
        else if (key === 'city') {
            filterModal.querySelector('#filterCitySearchTerm').value = '';
        } 
        else if (key === 'filterLocationType') {
            const checkbox = filterModal.querySelector(`input[name="filterLocationType"][value="${value}"]`);
            if (checkbox) checkbox.checked = false;
        } 
        else if (key === 'tuitionRange') {
            // Reset the tuition slider to master bounds (assuming initializeRangeSlider is available)
            // You can also just reset the input values directly
            $('#collapseFour','#'+filterModalId).removeClass('show').parent().find('.accordion-button').attr('aria-expanded', 'false').addClass('collapsed');
        }

        // Re-run the search with the updated (cleared) values
        executeSerializedSearch();
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
                  urlParams.has('tags_search') || 
                  schoolIdSet.size > 0;

    if (hasParams) {
        const initialLocation = urlParams.get('school_country_search') || "";
        const initialDegree = urlParams.get('degree_type_search') || "";
        const initialStudy = urlParams.get('study_area_search') || "";
        const initialTags = urlParams.get('tags_search') || "";

        if(window.location.pathname.includes(resultsPage)){
            const searchForm = document.getElementById('schoolSearchForm');

            const locationHidden = searchForm.querySelector('input[name="school_country_search"]');
            const degreeHidden = searchForm.querySelector('input[name="degree_type_search"]');
            const studyAreaInput = searchForm.querySelector('input[name="study_area_search"]');
            const countryBtn = searchForm.querySelector('.dropdown-country-toggle');
            const degreeBtn = searchForm.querySelector('.dropdown-degree-toggle');

            // Update UI elements for Location
            if (initialLocation) {
                locationHidden.value = initialLocation;
                countryBtn.innerHTML = `<span>${initialLocation}</span>`;
                updateDegreeDropdown(initialLocation, false);
            }

            // Update UI elements for Degree
            if (initialDegree) {
                degreeHidden.value = initialDegree;
                degreeBtn.innerHTML = `<span>${initialDegree}</span>`;
               
            }

            // Update UI elements for Study Area
            if (initialStudy) {
                studyAreaInput.value = initialStudy;
                
                setTimeout(async () => {
                    setupAutocomplete('#heroStudyAreaSearchTerm', 'auto-area-study', await getUniqueAreasOfStudy(initialLocation, initialDegree));
                }, 60);
            }

        }
        

        // 3. Auto-trigger search using the specific structure required by your function
        if (window.location.pathname.includes(schoolSearchDir)) {
            
            queryIndexedDBAndDisplay({
                school_ids: schoolIdSet, // Passing the Set of IDs
                school_filter: [{
                    school_country_search: initialLocation,
                    degree_type_search: initialDegree,
                    study_area_search: initialStudy,
                    tags_search: initialTags
                }]
            });
        }
    }else{
        renderNoResults(document.getElementById('search-result-container'));
    }
    
    //Hero School Search Form Script
    $('.dropdown-menu .dropdown-item','.hero').on('click', function(e) {
        e.preventDefault();
        var selectedValue = $(this).attr('data-value');
        var dropdownButton = $(this).closest('.dropdown').find('.dropdown-toggle');
        var textValue = $(this).text().trim();
        dropdownButton.text(textValue);
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

    $('.dropdown-menu .dropdown-item','#sort-dropdown-filter').on('click', function(e) {
        e.preventDefault();
        var selectedValue = $(this).attr('data-value');
        var textValue = $(this).text().trim();
        var dropdownButton = $(this).closest('.dropdown').find('.dropdown-toggle');
        dropdownButton.text(textValue);
        dropdownButton.val(selectedValue);
        $('input[name="sortFilter"]').val(selectedValue);
        executeSerializedSearch();
    });

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

    const clearFilterFields = () =>{
        $('.filter-field:not([type=range])','#'+filterModalId + ' .accordion-item .accordion-collapse').each(function() {
            let fieldType = $(this).attr('type');
            // Check if the value of the current input is not empty
            if (fieldType === 'checkbox' || fieldType === 'radio'){
                $(this).prop('checked', false);
            }else{
                $(this).val('');
            }            
        });
        setTimeout(() => executeSerializedSearch(true), 50);
    }

    const initSchoolComparison = () => {
        const banner = document.getElementById('compare-banner');
        const itemsContainer = document.getElementById('compare-items');
        const clearBtn = document.getElementById('compare-clear');
        
        let selectedSchools = [];

        const updateBanner = () => {
            banner.style.display = selectedSchools.length > 0 ? 'block' : 'none';
            itemsContainer.innerHTML = selectedSchools.map(school => {
                const hasLogo = school.logo && school.logo.trim() !== '';
                const logoContent = hasLogo 
                    ? `<img src="${school.logo}" alt="${school.name}" class="img-thumbnail w-100 h-100 object-fit-contain" title="${school.name}">`
                    : `<div class="w-100 h-100 d-flex align-items-center justify-content-center text-center p-1 bg-light border rounded small" style="font-size: 10px; line-height: 1.1;">${school.name}</div>`;

                return `
                    <div class="position-relative me-2 mb-1" style="width: 60px; height: 60px;">
                        ${logoContent}
                        <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill remove-badge cursor-pointer" 
                            onclick="removeCompareItem('${school.id}')" 
                            style="z-index: 2; background-color: #dc3545; color: #fff; border: 1px solid white;">
                            &times;
                        </span>
                    </div>
                `;
            }).join('');
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
                const logo = e.target.getAttribute('data-logo') || '';

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

        // --- UPDATED SUBMIT LOGIC ---
        document.getElementById('compare-submit')?.addEventListener('click', () => {
            // 1. Get the selected school IDs from your array
            const ids = selectedSchools.map(s => (s.id || s.hs_id)).join(',');

            // 2. Get your current serialized filter data
            // Assuming serializeContainer or getSerializedCriteria returns an object like { country: 'USA' }
            const currentFilters = typeof getSerializedCriteria === 'function' ? getSerializedCriteria() : {};

            // 3. Create a new URLSearchParams object
            const params = new URLSearchParams({
                ...currentFilters, // Spread existing filters (e.g., degree_type_search: 'Bachelor')
                school_ids: ids    // Add the specific schools for comparison
            });

            // 4. Redirect with the full query string
            //const targetUrl = `/compare?${params.toString()}`;
            const targetUrl = `/ugo_dev/ugo_comparison.html?${params.toString()}`;
            window.location.href = targetUrl;
        });
    };


    $('.filter-submit','#'+filterModalId).on('click',function(){
        // Select all inputs with the class 'myInput'
        executeSerializedSearch();
    });

    $('.clear-filter','#'+filterModalId).on('click',function(){
        $('.collapse.show','#'+filterModalId).collapse('hide');
        
        // Optional: If using Bootstrap 5's default accordion component structure, 
        // also ensure the buttons/headers get the 'collapsed' class and lose 'active' if used
        $('.accordion-button','#'+filterModalId).addClass('collapsed');
        $('.accordion-button','#'+filterModalId).attr('aria-expanded', false);
        clearFilterFields();
    });