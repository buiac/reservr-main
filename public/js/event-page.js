$(document).ready(function () {



  function toggleFormFields (e) {
    var $this = $(this)
    var $form = $this.parents('.event-form')

    $form.addClass('event-form--show-fields')
  }


  $('body').on('click','.btn-toggle-fields', toggleFormFields)
})