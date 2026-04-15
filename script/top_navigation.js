var $el, leftPos, newWidth;

/* Add Magic Line markup via JavaScript, because it ain't gonna work without */
$("#main-nav").append("<li id='magic-line'></li>");

/* Cache it */
var $magicLine = $("#magic-line");

$("#main-nav li.nav-item")
  .find("a.nav-link").mouseenter(function() {
	  
    leftPos = $(this).position().left;
    newWidth = $(this).parent().width();

    $magicLine.stop().animate({
        left: leftPos,
        width: newWidth
      }).addClass('magic-active');;
    
    
  }).mouseleave(function() {
	  
    $magicLine.css({
      "left": $magicLine.data('origLeft'),
      "width": $magicLine.data('origWidth')
    });
    $('.dropdown').on('hidden.bs.dropdown', function() {
		$magicLine.removeClass('magic-active');
	});
    $(this).parent().parent().removeClass('menu-hide');
  });
  
  $('.navbar-nav li.nav-item').mouseleave(function() {
	 
	  if(!$('ul.navbar-nav').hasClass('menu-show')){
		$magicLine.removeClass('magic-active');
	 }
		 
  });

$('#main-nav .navbar-nav .dropdown').on('hidden.bs.dropdown', function() {
    let parentElement = $(this).parents().eq(1),
        $magicLineTarget = $('#magic-line',parentElement);

    $('ul.navbar-nav').addClass('menu-hide');
    $('ul.navbar-nav').removeClass('menu-show');
    $magicLineTarget.removeClass('magic-active');
});
$('#main-nav .navbar-nav .dropdown').on('shown.bs.dropdown', function() {
    let parentElement = $(this).parents().eq(1),
        $magicLineTarget = $('#magic-line',parentElement);

    $('ul.navbar-nav').addClass('menu-show');
    $('ul.navbar-nav').removeClass('menu-hide');
    $magicLineTarget.addClass('magic-active');
});


const myCollapse = document.getElementById('navCollapse'); // Use your actual ID
const backdrop = document.querySelector('.navbar-backdrop');

myCollapse.addEventListener('show.bs.collapse', () => {
    backdrop.classList.add('show');
});

myCollapse.addEventListener('hide.bs.collapse', () => {
    backdrop.classList.remove('show');
});

// Close menu if user clicks the backdrop
backdrop.addEventListener('click', () => {
    const bsCollapse = new bootstrap.Collapse(myCollapse);
    bsCollapse.hide();
});