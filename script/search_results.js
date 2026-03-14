document.addEventListener('DOMContentLoaded', function() {
    initDataSync();
    initSchoolComparison();
});

$(document).on('click','.school-card-item a.school-link',(e)=>{
    e.preventDefault();
    const filterParam = serializeContainer('#hero-school-search');
    const target = $(e.currentTarget).attr('data-target');
    const length = Object.keys(filterParam).length;
    
    if(length > 0){
        const queryParam = new URLSearchParams(filterParam);
        window.location.href = `${target}?${queryParam.toString()}`;
    }else{
        window.location.href = `${target}`;
    }
})