var validateEmail = function (email) {
  var re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
  return re.test(email);
};

$(document).ready(function () {

  $('body').on('click', '.event-images .event-image-thumb .th', function (e) {
    
    e.preventDefault();
    $(this).parent().children().each(function (el) {
      $(this).removeClass('active-image');
    });
    $(this).addClass('active-image');

  });

})