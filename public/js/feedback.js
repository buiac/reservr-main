(function ($) {

  var org = {
    name: '',
    eventId: ''
  }

  var getOrgDetails = function () {
    var path = window.location.pathname.split('/')

    org.name = path[2]
    
    if (path.length > 3) {
      org.eventId = path[4]
    }
  }

  var showFeedback = function (e) {
    $(this).parent().addClass('rsv-feedback-form')
  }

  var closeFeedback = function (e) {
    e.preventDefault()

    $(this).parents('.rsv-feedback').removeClass('rsv-feedback-form') 
  }

  var submitFeedback = function (e) {
    e.preventDefault()
    
    var $container = $(this).parents('.rsv-feedback');
    var $form = $(this);
    var $email = $form.find('input')
    var $message = $form.find('textarea')
    var $button = $form.find('button')

    var loadingClass = 'btn-state-loading'
    var successClass = 'rsv-form-success'
    var errorClass = 'rsv-form-error'
    var url = '/f/feedback'

    var data = {
      email: $email.val(),
      message: $message.val(),
      orgName: org.name,
      eventId: org.eventId
    }

    $form.removeClass(successClass)
    $form.removeClass(errorClass)

    $button.addClass(loadingClass)

    $.ajax({
      url: url,
      method: 'POST',
      data: data
    }).done(function (res) {
      $button.removeClass(loadingClass)
      $form.addClass(successClass)

      setTimeout(function () {
        // clear form and hide
        $email.val('')
        $message.val('')

        $form.removeClass(successClass)
        $form.removeClass(errorClass)
        $container.removeClass('rsv-feedback-form')
      }, 4000)
    }).fail(function (err) {
      $button.removeClass(loadingClass)
      $form.addClass(errorClass)
    })

    return false;
  }

  getOrgDetails()

  $('body').on('click', '.rsv-feedback-button', showFeedback)
  $('body').on('click', '.rsv-feedback-close', closeFeedback)
  $('.rsv-feedback-form').on('submit', submitFeedback)
})(jQuery)