const submitComparisonFormArray = [
{
    inputName: "comparison_first_name",
    objInputName: "firstname",
    inputType: "text",
    required: true,
    value: "",
  },
  {
    inputName: "comparison_last_name",
    objInputName: "lastname",
    inputType: "text",
    required: true,
    value: "",
  },
  {
    inputName: "comparison_email",
    objInputName: "email",
    inputType: "email",
    required: true,
    value: "",
  },
  {
    inputName: "comparison_phone",
    objInputName: "phone",
    inputType: "phone",
    required: true,
     value: "",
  },
];

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const rawIds = urlParams.get('school_ids');
    
    if (!rawIds) {
        window.location.href = "/school-search/search-results";
        return;
    }

    const allIds = rawIds.split(',');
    showLoadingState(true, $('#comparison-body'));

    try {
        // 1. Fetch schools to determine parent grouping
        const schools = await db.schools
            .where('hs_id')
            .anyOf(allIds)
            .toArray();

        // 2. Identify unique parent schools (or school names)
        // We maintain the order based on the first time a parent appears in the ID list
        const uniqueParents = [];
        const seenParents = new Set();

        allIds.forEach(id => {
            const school = schools.find(s => s.hs_id === id);
            if (school) {
                const parentKey = school.parent_school_name || school.name;
                if (!seenParents.has(parentKey)) {
                    seenParents.add(parentKey);
                    uniqueParents.push(parentKey);
                }
            }
        });

        // 3. Limit to 5 unique parent schools
        const limitedParents = uniqueParents.slice(0, 5);
        
        // 4. Filter allIds to only include IDs belonging to those 5 parents
        const filteredIds = allIds.filter(id => {
            const school = schools.find(s => s.hs_id === id);
            const parentKey = school ? (school.parent_school_name || school.name) : null;
            return limitedParents.includes(parentKey);
        });

        // 5. Update URL if the list was reduced
        if (filteredIds.length !== allIds.length) {
            urlParams.set('school_ids', filteredIds.join(','));
            window.history.replaceState({}, '', `${window.location.pathname}?${urlParams}`);
        }

        // 6. Render with the filtered (grouped) IDs
        setTimeout(() => renderComparison(filteredIds), 300);

    } catch (error) {
        console.error("Initialization Error:", error);
        window.location.href = "/school-search/search-results";
    }
});

// Assuming your Dexie instance is named 'db' and table is 'schools'
/**
 * Renders a side-by-side comparison of up to 5 schools.
 * Joins 'schools' and 'admissionRequirements' stores using school_name.
 */
const renderComparison = async (schoolIds) => {
    const headerRow = document.getElementById('header-row');
    const body = document.getElementById('comparison-body');

    body.innerHTML = `<tr><td colspan="${schoolIds.length + 1}" class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
        <p class="mt-2">Comparing school data and tags...</p>
    </td></tr>`;

    try {
        const urlParams = window.location.search;
        const queryParam = new URLSearchParams(urlParams);
        const cleanedSearchData = {
            study_area_search: queryParam.get('study_area_search') || "",
            degree_type_search: queryParam.get('degree_type_search') || ""
        };
        const filterContainer = document.getElementById('search-criteria-results');
        const queryString = new URLSearchParams(cleanedSearchData);
        
        filterContainer.innerHTML = renderFilterListHTML(urlParams);

        // 1. Fetch Raw School Data
        const rawSchools = await db.schools
            .where('hs_id')
            .anyOf(schoolIds)
            .toArray();

        if (!rawSchools.length) {
            body.innerHTML = `<tr><td colspan="6" class="text-center py-5">No schools found.</td></tr>`;
            return;
        }

        // --- NEW: Grouping Logic by parent_school_name ---
        const groupedMap = rawSchools.reduce((acc, school) => {
            // Fallback to school name if parent_school_name is missing
            const groupKey = school.parent_school_name || school.name;
            
            if (!acc[groupKey]) {
                acc[groupKey] = {
                    ...school,
                    name: groupKey, // Use parent name as the display title
                    campuses: [],
                    all_tags: new Set(),
                    all_ids: []
                };
            }
            
            acc[groupKey].campuses.push(school);
            acc[groupKey].all_ids.push(school.hs_id);
            if (Array.isArray(school.tags)) {
                school.tags.forEach(t => acc[groupKey].all_tags.add(t));
            }
            return acc;
        }, {});

        const schoolsData = Object.values(groupedMap);
        // Sort based on the original order of IDs passed in
        schoolsData.sort((a, b) => schoolIds.indexOf(a.all_ids[0]) - schoolIds.indexOf(b.all_ids[0]));

        // 2. PRE-CHECK: Direct Admission
        const hasAnyDirectAdmission = schoolsData.some(school => 
            school.all_tags.has('Direct Admission')
        );

        // 3. Fetch Requirements
        // Using all unique school names within the groups to fetch requirements
        const allCampusNames = rawSchools.map(s => s.name).filter(Boolean);
        const requirementsData = await db.admissionRequirements
            .where('school_name')
            .anyOf(allCampusNames)
            .toArray();

        const reqStatsMap = new Map();
        requirementsData.forEach(req => {
            const rawName = Array.isArray(req.school_name) ? req.school_name[0] : req.school_name;
            const normalizedName = rawName.toLowerCase().trim();
            if (!reqStatsMap.has(normalizedName)) {
                reqStatsMap.set(normalizedName, { ielts: [], toeflpb: [], duolingo: [], els_level: [] });
            }
            const group = reqStatsMap.get(normalizedName);
            if (req.ielts) group.ielts.push(parseFloat(req.ielts));
            if (req.toeflpb) group.toeflpb.push(parseFloat(req.toeflpb));
            if (req.duolingo) group.duolingo.push(parseFloat(req.duolingo));
            if (req.els_level) group.els_level.push(parseFloat(req.els_level));
        });

        // Helpers
        const calculateMin = (arr) => {
            const validNums = arr ? arr.filter(n => !isNaN(n)) : [];
            if (!validNums.length) return 'N/A';
            const minScore = Math.min(...validNums);
            return (minScore % 1 === 0) ? minScore.toString() : minScore.toFixed(1);
        };

        const formatTagCheck = (tagSet, tagName) => {
            return tagSet.has(tagName) 
                ? '<i class="fas fa-check text-success"></i>' 
                : '<i class="fas fa-times text-danger"></i>';
        };

        // 4. Render Headers
        headerRow.innerHTML = `<th class="sticky-col"></th>` + schoolsData.map(school => `
            <th class="school-column text-center p-3 position-relative" data-school-ids="${school.all_ids.join(',')}">
                ${school.logo?.url ? `<div class="header-details d-flex flex-column align-items-center text-center p-3">
                        <div class="logo-container mb-2"><img src="${school.logo.url}" class="img-fluid" style="object-fit:cover;"></div>` : ''}
                <span class="school-name d-block fw-bold flex-grow-1">${school.name}</span>
                <button class="btn-remove-column" onclick="removeColumn(this)">&times;</button></div>
            </th>`).join('');

        // 5. Define Rows
        const rowDefinitions = [
            { label: 'Ranking', key: 'rankings', isList: true },
            { label: 'Campuses', type: 'location' }, 
            { label: 'Avg. Tuition<sup>*</sup>', key: 'average_tuition_fees', isCurrency: true },
            { label: 'Scholarships', key: 'scholarship_details', disableTextCenter: true },
            { label: 'Conditional Admission', tagName: 'Conditional Admission', isTag: true },
            ...(hasAnyDirectAdmission ? [{ label: 'Direct Admission Service', tagName: 'Direct Admission', isTag: true }] : []),
            { label: 'Min. ELS Level', key: 'els_level', isRequirement: true },
            { label: 'Min. IELTS', key: 'ielts', isRequirement: true },
            { label: 'Min. TOEFL', key: 'toeflpb', isRequirement: true },
            { label: 'Min. Duolingo', key: 'duolingo', isRequirement: true },
            { label: '', key: 'page_link', isButton: true },
        ];

        // 6. Build Body
        body.innerHTML = rowDefinitions.map(row => `
            <tr>
                <td class="fw-bold sticky-col">${row.label}</td>
                ${schoolsData.map(school => {
                    let cellContent = 'N/A';
                    
                    if (row.isTag) {
                        cellContent = formatTagCheck(school.all_tags, row.tagName);
                    } else if (row.isRequirement) {
                        // Aggregate requirement scores across all campuses in the group
                        const allScores = [];
                        school.campuses.forEach(campus => {
                            const stats = reqStatsMap.get(campus.name.toLowerCase().trim());
                            if (stats && stats[row.key]) allScores.push(...stats[row.key]);
                        });
                        cellContent = calculateMin(allScores);

                    } else if (row.type === 'location') {
                        // Group locations by country for clarity
                        const countryGroups = school.campuses.reduce((acc, c) => {
                            const country = c.country_name || 'Other';
                            if (!acc[country]) acc[country] = new Set();
                            if (c.city) acc[country].add(c.city);
                            return acc;
                        }, {});

                        cellContent = Object.keys(countryGroups).map(country => {
                            return `<strong>${country}:</strong> ${Array.from(countryGroups[country]).join(', ')}`;
                        }).join('<br>');

                    } else if (row.isList) {
                        // Aggregate rankings from all campuses
                        const allRankings = [...new Set(school.campuses.flatMap(c => c[row.key]?.split(';') || []))].map(i => i.trim()).filter(Boolean);
                        cellContent = allRankings.length ? `<ul class="list-unstyled mb-0 text-center">` + allRankings.map(i => `<li class="badge bg-secondary my-1 text-wrap me-1 my-1 py-2"><i class="fa-solid fa-trophy me-1"></i>${i}</li>`).join('') + `</ul>` : 'N/A';

                    } else if (row.isCurrency) {
                        // Get the minimum tuition found across all campuses in the group
                        const tuitions = school.campuses.map(c => parseFloat(c[row.key])).filter(n => !isNaN(n));
                        const minTuition = tuitions.length ? Math.min(...tuitions) : null;
                        cellContent = minTuition ? formatCurrencyAmount(minTuition, school.currency?.name || 'USD') : 'Varies';

                    } else if (row.isButton) {
                        const path = school.country_name?.includes("USA") ? "/usa" : school.country_name?.includes("CA") ? "/canada" : "/australia";
                        cellContent = `<a href="/school${path}${school[row.key]}?${queryString}" class="btn btn-outline btn-sm">Learn More</a>`;
                    } else {
                        cellContent = school[row.key] || 'N/A';
                    }

                    return `<td class="${row.disableTextCenter && cellContent !== 'N/A' ? 'text-start' : 'text-center'} ${row.isList ? 'align-top' : ''}">${cellContent}</td>`;
                }).join('')}
            </tr>
        `).join('');

    } catch (error) {
        console.error("Comparison Error:", error);
        body.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-5">Error generating comparison.</td></tr>`;
    }
};

const renderFilterListHTML = (queryString) => {
    const params = new URLSearchParams(queryString);
    const excludedKeys = ['school_ids','schoolIds', 'sortFilter'];
    const selectedCountry = params.get('school_country_search') || 'USA';

    const currencyConfig = {
        'Canada': { locale: 'en-CA', currency: 'CAD' },
        'Australia': { locale: 'en-AU', currency: 'AUD' },
        'USA': { locale: 'en-US', currency: 'USD' },
        'India': { locale: 'en-IN', currency: 'INR' },
        'Malaysia': { locale: 'en-MY', currency: 'MYR' },
        'Europe': { locale: 'de-DE', currency: 'EUR' }
    };

    const activeConfig = currencyConfig[selectedCountry] || { locale: 'en-US', currency: 'USD' };

    let html = `<div class="my-3 p-3">`;
    html += `<h4 class="mb-3 fw-bold">Search Filters</h4>`;
    html += `<ul class="list-unstyled mb-0 d-flex flex-wrap gap-2">`;

    const labelMap = {
        'school_country_search': 'Country',
        'degree_type_search': 'Degree Level',
        'study_area_search': 'Area of Study',
        'filterSchoolSearchTerm': 'School Name',
        'filterCitySearchTerm': 'City',
        'filterLocationType': 'City Size',
        'tuitionRangeMinFilter': 'Min Tuition',
        'tuitionRangeMaxFilter': 'Max Tuition'
    };

    let hasActiveFilters = false;

    params.forEach((value, key) => {
        if (excludedKeys.includes(key)) return;
        if (!value || value.trim() === "" || key === 'sortFilter') return;
        if (key === 'tuitionRangeMinFilter' && value === "0") return;
        if (key === 'tuitionRangeMaxFilter' && value === "1000000") return;

        hasActiveFilters = true;
        const label = labelMap[key] || key.replace(/_/g, ' ');
        
        // 2. Format Logic: Check if the key is a tuition field
        let displayValue = value;

        if (key.toLowerCase().includes('tuition')) {
            const numValue = parseFloat(value.replace(/[^0-9.-]+/g, ""));
            displayValue = !isNaN(numValue) ? formatCurrencyAmount(numValue, activeConfig.currency, false) : value;
        } else {
            // Your existing logic for comma-separated values
            displayValue = value.includes('%2C') || value.includes(',') 
                ? value.split(/[%,]/).filter(v => v && v !== '2C').join(', ') 
                : value;
        }

        html += `
            <li class="d-flex py-2 align-items-center justify-content-start">
                <span class="badge bg-light-blue me-2 mb-2 p-2 d-inline-flex align-items-center fs-5">${label}:&nbsp;${displayValue}</span>
            </li>
        `;
    });

    if (!hasActiveFilters) {
        html += `<li class="text-muted italic small">No specific filters applied.</li>`;
    }

    html += `</ul></div>`;
    return html;
};

const clearAllComparison = () => {
    if(confirm("Are you sure you want to clear your comparison list?")) {
        window.location.href = "/search-results";
        //window.location.href = "/ugo_search_results.html";
    }
}

const removeColumn = (btn) => {
    const table = document.getElementById('comparison-table');
    const headerRow = document.getElementById('header-row');
    
    // 1. Check if this is the last remaining school column
    // (We subtract 1 to account for the first empty 'sticky-col' <th>)
    const schoolColumns = headerRow.querySelectorAll('th.school-column');
    if (schoolColumns.length <= 1) {
        alert("You must have at least one school to compare.");
        return;
    }

    const headerCell = btn.closest('th');
    const columnIndex = headerCell.cellIndex;
    
    // Get the ID(s) associated with this column (could be a single ID or a comma-separated list)
    const schoolIdAttr = headerCell.getAttribute('data-school-ids') || headerCell.getAttribute('data-school-id');

    // 2. Remove the column from all rows in the DOM
    Array.from(table.rows).forEach(row => {
        if (row.cells[columnIndex]) {
            row.deleteCell(columnIndex);
        }
    });

    // 3. Update the URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const rawIdString = urlParams.get('school_ids');
    
    if (rawIdString) {
        let currentIds = rawIdString.split(',');
        const idsToRemove = schoolIdAttr.split(',');
        
        // Filter out all IDs that were part of this specific column group
        const updatedIds = currentIds.filter(id => !idsToRemove.includes(id));
        
        // Update URL without reloading page
        urlParams.set('school_ids', updatedIds.join(','));
        const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
        window.history.replaceState({path: newUrl}, '', newUrl);
    }
};

const submitComparisonForm = () => {

    let url =
        "https://api.hsforms.com/submissions/v3/integration/submit/" +
        portalId +
        "/" +
        comparisonGuid;
    url = encodeURI(url);
    
    const currentUrl = window.location.href;
    const formData =  serializeContainer('#studentInfoForm');
    const hubspotFields = submitComparisonFormArray
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
        { name: "ugo_comparison_result_link", value: currentUrl },
        { name: "ugo_school_comparison_results", value: '' },
    ];

    let formArray = {
      fields: [...hubspotFields, ...manualFields],
      context: {
        pageUri: pageUriComparison,
        pageName: "UGO School Comparison",
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

    $.ajax({
        type: "POST",
        url: url,
        data: JSON.stringify(formArray),
        contentType: "application/json",
        dataType: "json",
        success: function () {         
            const thankYouMessage = `<div class="text-center p-4">
                <h2 class="mb-3">Thank you for submitting your information!</h2>
                <p class="mb-0">An email of your school comparison results has been sent. Our admissions representatives will review your comparison results and contact you soon.</p>
            </div>`;

            $('.modal-body','#comparisonEmailPanel').html(thankYouMessage);
        }

    });
}
$(document).on('click', 'button#studentInfoSubmit', (event) => {
    let el = $(event.currentTarget),
        formEl = el.closest('form')[0];
    if(formEl){
        validateForm(event,formEl,submitComparisonForm)
    }
});