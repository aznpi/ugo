document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const rawIds = urlParams.get('school_ids');
    
    if (!rawIds) {
        window.location.href = "/search-results";
        return;
    }

    // Limit to exactly 5 schools
    let schoolIds = rawIds.split(',').slice(0, 5);
    
    // Update URL if we had to slice it
    if (rawIds.split(',').length > 5) {
        urlParams.set('school_ids', schoolIds.join(','));
        window.history.replaceState({}, '', `${window.location.pathname}?${urlParams}`);
    }

    renderComparison(schoolIds);
});

// Assuming your Dexie instance is named 'db' and table is 'schools'
/**
 * Renders a side-by-side comparison of up to 5 schools.
 * Joins 'schools' and 'admissionRequirements' stores using school_name.
 */
const renderComparison = async (schoolIds) => {
    const headerRow = document.getElementById('header-row');
    const body = document.getElementById('comparison-body');
    const usdFormatter = new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD', 
        maximumFractionDigits: 0 
    });

    body.innerHTML = `<tr><td colspan="${schoolIds.length + 1}" class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
        <p class="mt-2">Calculating requirements and comparing data...</p>
    </td></tr>`;

    try {
        const schoolsData = await db.schools
            .where('hs_id')
            .anyOf(schoolIds)
            .toArray();

        if (!schoolsData.length) {
            body.innerHTML = `<tr><td colspan="6" class="text-center py-5">No schools found in selection.</td></tr>`;
            return;
        }

        schoolsData.sort((a, b) => schoolIds.indexOf(a.hs_id) - schoolIds.indexOf(b.hs_id));
        const schoolNames = schoolsData.map(s => s.name).filter(Boolean);

        const requirementsData = await db.admissionRequirements
            .where('school_name')
            .anyOf(schoolNames)
            .toArray();

        const reqStatsMap = new Map();

        requirementsData.forEach(req => {
            const rawName = Array.isArray(req.school_name) ? req.school_name[0] : req.school_name;
            const normalizedName = rawName.toLowerCase().trim();
            
            if (!reqStatsMap.has(normalizedName)) {
                reqStatsMap.set(normalizedName, { 
                    ielts: [], toeflpb: [], duolingo: [], els_level: [], 
                    cla: [], direct_admission_service: [] 
                });
            }
            const group = reqStatsMap.get(normalizedName);
            if (req.ielts) group.ielts.push(parseFloat(req.ielts));
            if (req.toeflpb) group.toeflpb.push(parseFloat(req.toeflpb));
            if (req.duolingo) group.duolingo.push(parseFloat(req.duolingo));
            if (req.els_level) group.els_level.push(parseFloat(req.els_level));
            
            // Push raw Y/N values for boolean fields
            if (req.cla) group.cla.push(req.cla);
            if (req.direct_admission_service) group.direct_admission_service.push(req.direct_admission_service);
        });

        const calculateMin = (arr) => {
            const validNums = arr.filter(n => !isNaN(n) && n !== null);
            if (!validNums.length) return 'N/A';
            const minScore = Math.min(...validNums);
            return (minScore % 1 === 0) ? minScore.toString() : minScore.toFixed(1);
        };

        // Helper for Y/N Checkmarks
        const formatBoolean = (arr) => {
            if (!arr || !arr.length) return '<i class="fas fa-times text-danger"></i>';
            // If any associated program has 'Y', we show a checkmark
            const hasYes = arr.some(val => val === 'Y' || val === 'Yes');
            return hasYes 
                ? '<i class="fas fa-check text-success"></i>' 
                : '<i class="fas fa-times text-danger"></i>';
        };

        // Render Headers
        let headerHTML = `<th class="sticky-col"></th>`;
        schoolsData.forEach(school => {
            const hasLogo = school.logo && school.logo.url && school.logo.url.trim() !== "";
            headerHTML += `
                <th class="school-column position-relative" data-school-id="${school.hs_id}">
                    <div class="header-details d-flex flex-column align-items-center text-center p-3">
                        ${hasLogo ? `<div class="logo-container me-2"><img src="${school.logo.url}" class="img-fluid" style="object-fit:cover;"></div>` : ''}
                        <span class="school-name d-block fw-bold flex-grow-1" title="${school.name}">${school.name}</span>
                        <button class="btn-remove-column ms-3" onclick="removeColumn(this)">&times;</button>
                    </div>
                </th>`;
        });
        headerRow.innerHTML = headerHTML;

        const rowDefinitions = [
            { label: 'Ranking', key: 'rankings' },
            { label: 'Location', type: 'location' }, 
            { label: 'Avg. Tuition', key: 'average_tuition_fees', isCurrency: true },
            { label: 'Scholarships', key: 'scholarship_details' },
            // Boolean Requirements
            { label: 'Conditional Admission', key: 'cla', isRequirement: true, isBoolean: true },
            { label: 'Direct Admission Service', key: 'direct_admission_service', isRequirement: true, isBoolean: true },
            // Numeric Requirements
            { label: 'Min. ELS Level<sup>*</sup>', key: 'els_level', isRequirement: true },
            { label: 'Min. IELTS<sup>*</sup>', key: 'ielts', isRequirement: true },
            { label: 'Min. TOEFL<sup>*</sup>', key: 'toeflpb', isRequirement: true },
            { label: 'Min. Duolingo<sup>*</sup>', key: 'duolingo', isRequirement: true },
            { label: '', key: 'page_link', isButton: true },
        ];

        body.innerHTML = rowDefinitions.map(row => `
            <tr>
                <td class="fw-bold sticky-col">${row.label}</td>
                ${schoolsData.map(school => {
                    let displayValue = 'N/A';

                    if (row.isRequirement) {
                        const lookupName = school.name.toLowerCase().trim();
                        const stats = reqStatsMap.get(lookupName);
                        
                        if (stats) {
                            if (row.isBoolean) {
                                displayValue = formatBoolean(stats[row.key]);
                            } else {
                                displayValue = calculateMin(stats[row.key]);
                            }
                        }
                    } else {
                        if (row.type === 'location') {
                            displayValue = [school.city, school.state_province, school.country].filter(p => p?.trim()).join(', ');
                        } 
                        else if (row.isCurrency) {
                            displayValue = school[row.key] ? usdFormatter.format(school[row.key]) : 'Varies';
                        }
                        else if (row.isButton) {
                            displayValue = `<a href="/school${school[row.key]}" class="btn btn-outline btn-sm">Learn More</a>`;
                        }
                        else {
                            displayValue = school[row.key] || 'N/A';
                        }
                    }
                    return `<td class="text-center">${displayValue}</td>`;
                }).join('')}
            </tr>
        `).join('');

    } catch (error) {
        console.error("Comparison Error:", error);
        body.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-5">Error fetching data.</td></tr>`;
    }
};

const clearAllComparison = () => {
    if(confirm("Are you sure you want to clear your comparison list?")) {
        window.location.href = "/search-results";
        //window.location.href = "/ugo_search_results.html";
    }
}

const removeColumn = (btn) => {
    const table = document.getElementById('comparison-table');
    const headerCell = btn.closest('th');
    const columnIndex = headerCell.cellIndex;
    const schoolId = headerCell.getAttribute('data-school-id');

    // 1. Remove the column from all rows
    Array.from(table.rows).forEach(row => {
        row.deleteCell(columnIndex);
    });

    // 2. Update the URL parameters so the removal persists
    const urlParams = new URLSearchParams(window.location.search);
    let schoolIds = urlParams.get('school_ids').split(',');
    
    // Filter out the removed ID
    schoolIds = schoolIds.filter(id => id !== schoolId);
    
    // Update URL without reloading page
    if (schoolIds.length > 0) {
        urlParams.set('school_ids', schoolIds.join(','));
        const newUrl = window.location.pathname + '?' + urlParams.toString();
        window.history.replaceState({path: newUrl}, '', newUrl);
    } else {
        // If no schools left, redirect to search
        window.location.href = "/search-results";
    }
}

