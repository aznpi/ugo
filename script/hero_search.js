document.addEventListener('DOMContentLoaded', function() {
    const searchForm = document.getElementById('schoolSearchForm');
    if (!searchForm) return; // Exit early if the form isn't on this page

    // Update to live URL when ready
    //const resultsPage = "/search-results";
    const resultsPage = "/ugo_dev/ugo_search_results.html";

   // GUARD 2: Check for children safely
    // We use searchForm?.querySelector to be extra safe
    const countryButtons = searchForm.querySelectorAll('.btn-list .btn') || [];
    const degreeOptions = searchForm.querySelectorAll('.dropdown-item') || [];
    
    const locationHidden = searchForm.querySelector('input[name="school_country_search"]');
    const degreeHidden   = searchForm.querySelector('input[name="degree_type_search"]');
    const studyAreaInput = searchForm.querySelector('input[name="study_area_search"]');
    const degreeBtn      = searchForm.querySelector('.dropdown-toggle');

    // 2. Click Logic for Country Buttons
    if (countryButtons.length > 0 && locationHidden) {
        countryButtons.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                countryButtons.forEach(b => b.classList.replace('btn-blue', 'btn-grey'));
                this.classList.replace('btn-grey', 'btn-blue');
                locationHidden.value = this.getAttribute('data-value');
            });
        });
    }

    // 3. Click Logic for Degree Dropdown
    if (degreeOptions.length > 0 && degreeBtn && degreeHidden) {
        degreeOptions.forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const val = this.getAttribute('data-value');
                degreeBtn.textContent = val;
                degreeHidden.value = val;
                degreeBtn.classList.remove('border-danger');
            });
        });
    }

    // 4. Submit & Validation
    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();

        console.log("Form submitted, validating inputs...");

        // Safety check for inputs before accessing .value
        const locVal = locationHidden ? locationHidden.value : "";
        const degVal = degreeHidden ? degreeHidden.value : "";
        const studyVal = studyAreaInput ? studyAreaInput.value.trim() : "";

        if (!locVal) {
            alert("Please select a school location (USA, Australia, etc.).");
            return;
        }

        if (!degVal) {
            if (degreeBtn) degreeBtn.classList.add('border', 'border-danger');
            alert("Please select a Degree Type.");
            return;
        }

        if (!studyVal) {
            if (studyAreaInput) {
                studyAreaInput.classList.add('is-invalid');
                studyAreaInput.focus();
            }
            return;
        }

        const filteredParams = {
            school_country_search: locVal,
            degree_type_search: degVal,
            study_area_search: studyVal
        };

        if (window.location.pathname.includes(resultsPage)) {
            // Ensure query function exists before calling
            if (typeof queryIndexedDBAndDisplay === 'function') {
                queryIndexedDBAndDisplay(serializeContainer('#schoolSearchForm'));
            }
            console.log("Already on results page, querying IndexedDB with:", filteredParams);
        } else {
            const queryParams = new URLSearchParams(filteredParams);
            window.location.href = `${resultsPage}?${queryParams.toString()}`;
            console.log("Redirecting to results page with query params:", filteredParams);
        }
    });

    // Event listener safety for the input
    if (studyAreaInput) {
        studyAreaInput.addEventListener('input', function() {
            this.classList.remove('is-invalid');
        });
    }
});