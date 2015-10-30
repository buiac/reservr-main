$(document).ready(function () {



  function toggleFormFields (e) {
    var $this = $(this)
    var $form = $this.parents('.event-form')

    $form.addClass('event-form--show-fields')
  }

  function makeReservation (e) {
    var $this = $(this)
    var $form = $this.parents('.event-form')

    $form.addClass('event-form--loading')

    setTimeout(function() {
      $form.removeClass('event-form--loading')
      $form.addClass('event-form--success')

      setTimeout(function() {
        $form.removeClass('event-form--show-fields')  
        $form.removeClass('event-form--success')
      }, 10000);
    }, 1000);


  }


  $('body').on('click','.btn-toggle-fields', toggleFormFields)
  $('body').on('click','.btn-reserv', makeReservation)
})