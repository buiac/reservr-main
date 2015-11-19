autosize(document.querySelectorAll('textarea'));

$(document).ready(function () {
  var $eventGroups = $('.event-group')
  var saveHover = false
  var calendar
  var eventModel = {
    name: 'My cool event name',
    description: 'This is an event description that will take place in the heart of our beloved city. One of it\'s kind, it will be a transformative experience. Check out the items list:\n\n- some strings\n- glue\n- paper\n- [links are included](http://google.com)',
    images: [
      {
        path: '/images/reservr-placeholder-2.png'
      }
    ],
    date: new Date(),
    seats: 120,
    price: '12$ / pers',
    location: 'London, 106 Lower Marsh, Waterloo, SE1 7AB',
    orgId: '',
    temp: true,
    published: false
  };

  var config = {
    baseUrl: ''
  }

  moment.defaultFormat = 'YYYY-MM-DD LT';


  if (window.location.hostname.indexOf('localhost') !== -1) {
    config.baseUrl = 'http://localhost:8080'
  }

  function toggleGroup (e) {

    var $this = $(this)
    var $parent = $this.parent()
    var $fields = $parent.find('[name]')
    var toggleClass = 'event-group--toggle-placeholder'

    if ($parent.hasClass(toggleClass)) {
      $parent.removeClass(toggleClass)
    } else {
      if (!$parent.hasClass('event-image')) {
        $parent.addClass(toggleClass)

        // focus input
        $fields.each(function (i, field) {
          var data = $(field).val()

          $(field).focus()

          $(field).val('').val(data)

          if (field.type === 'textarea') {
            var evt = document.createEvent('Event');
            evt.initEvent('autosize:update', true, false);
            field.dispatchEvent(evt);
          }

          if ($parent.hasClass('event-date')) {
            setTimeout(function () {
              calendar.show()
            }, 10)
          }
        })
      }
    }
  }

  function hideGroup (e) {
    var $this = $(this)
    var $parent = $(this).parents('.event-group')
    var toggleClass = 'event-group--toggle-placeholder'
    var isDate = $this.parents('.event-group').hasClass('event-date')

    if ($parent.hasClass(toggleClass) && !saveHover && !isDate) {
      $parent.removeClass(toggleClass)
    }
  }

  function updateEventUrl () {

    var $eventLink = $('.event-link')
    var $parent = $eventLink.parents('.event-details')
    var $button = $parent.find('.btn-publish')
    var $icon = $eventLink.find('.fa')
    var url = config.baseUrl + '/u/' + eventModel.org.name + '/event/' + eventModel._id

    $eventLink.html(url)
    $eventLink.prepend($icon)
    $eventLink.attr('href', url)

    $button.removeClass('btn-state-loading')

    // show overlay
    $parent.addClass('event-publish--published')
  }

  function syncData() {

    eventModel.date = new Date(eventModel.date)

    $.ajax({
      method: 'POST',
      url: config.baseUrl + '/tempEvent',
      data: {
        event: eventModel
      }
    }).done(function (res) {
      
      // set the event orgId
      eventModel.org = res.org
      eventModel.orgId = res.orgId || res.org._id
      eventModel._id = res.event._id

      if (res.event.published) {
        // update the unique event url
        updateEventUrl()
      }

    }).fail(function (err) {
      
      console.log('error')
      console.log(err)

    })
  }

  function saveData (e) {
    var $this = $(e.target)
    var $parent = $this.parents('.event-group')
    var $placeholder = $parent.find('.event-placeholder')
    var $icon = $placeholder.find('.fa')
    var field = $parent.find('[name]')[0]
    var toggleClass = 'event-group--toggle-placeholder'
    var value = $(field).val()
    

    if (!$icon.length) {
      $icon = $placeholder.find('.icomoon')
    }

    if (value && field.type === 'textarea') {
      $placeholder.html(marked($(field).val()))
    } else {
      $placeholder.html($(field).val())
    }

    if ($parent.hasClass('event-seats')) {
      $placeholder.html($placeholder.html() + ' seats')
    }


    if ($icon) {
      $placeholder.prepend($icon)
    }
    

    if ($parent.hasClass(toggleClass)) {
      $parent.removeClass(toggleClass)
    }

    eventModel[field.name] = field.value

    syncData()
  }


  function saveDataEnter (e) {
    var code = e.keyCode || e.which;
    var isDescription = $(e.target).parents('.event-group').hasClass('event-description')

    if (code === 13 && !isDescription) {
      saveData(e)
    }
  }

  $eventGroups.each(function (i, group) {
    var $group = $(group)
    var $fields = $group.find('[name]')
  
    $fields.each(function (i, field) {
      $(field).blur(hideGroup)
      $(field).keypress(saveDataEnter)
    })
  })

  function preventBlur (e) {
    saveHover = true
  }

  function unpreventBlur (e) {
    saveHover = false
  }

  function parseFields () {
    var $eventGroups = $('.rzv-lightbox .event-group')

    $eventGroups.each(function (i, eventGroup) {

      var field = $(eventGroup).find('[name]')[0]
      var $placeholder = $(eventGroup).find('.event-placeholder')
      var value = $(field).val()
      var $icon = $(eventGroup).find('.fa')[0] || $(eventGroup).find('.icomoon')[0]
      
      if ($(eventGroup).hasClass('event-seats')) {
        

        if (value) {
          $placeholder.append(' seats')  
        } else {

          $placeholder.html('Event seats')
        }

        if ($icon) {
          $placeholder.prepend($icon)
        }
      }

      if (field && field.type !== 'file' && value) {

        
        if (field.type === 'textarea') {
          $placeholder.html(marked(value))
        } else {
          $placeholder.html(value)

          if ($icon) {
            $placeholder.prepend($icon)
          }

          if ($(eventGroup).hasClass('event-seats')) {
            if (value) {
              $placeholder.append(' seats')  
            } else {
              $placeholder.html('Event seats')              
            }
          }
        }
      }
    });
  }

  function checkImage () {
    var $eventImage = $('.event-image')
    var $preview = $eventImage.find('.event-preview')
  }

  function setupCalendar () {
    var dateElement = $('.event-date input')[0]
    if (dateElement) {
      calendar = rome(dateElement)  
    }
  }

  function initBootstrapWidgets (argument) {
    // Bootstrap widgets
    $('.event-free').tooltip()
    $('.fa-info-circle').tooltip()
  }

  function updateDateField () {
    // add todays date to the date field

    $date = $('[name=date]')

    var date = moment().format('YYYY')
    date += '-' + moment().format('MM')
    date += '-' + moment().format('DD')
    date += ' ' + moment().format('HH:mm')

    if (!$date.val()) {
      $date.val(date)
    } else {
      $date.val($date.val())
    }
  }

  function updateHiddenFields () {
    var $hidden = $('[type=hidden]');

    $hidden.each(function (i, field) {
      if (field.name === 'temp' || field.name === 'published') {
        eventModel[field.name] = (field.value === 'true')  
      } else {
        if (field.value !== '') {
          eventModel[field.name] = field.value
        }
      }
      
    });
  }

  function init () {
    // updateDateField()
    parseFields()
    checkImage()
    setupCalendar()
    initBootstrapWidgets()
    updateHiddenFields()
  }

  function updateEventPrice (e) {
    var $this = $(this)
    var $parent = $this.parents('.event-group')
    var $placeholder = $this.parent()
    var $icon = $placeholder.find('.fa')
    var $change = $('<a>').html('Change')

    $placeholder.html('Free Event ')
    $placeholder.prepend($icon)
    $placeholder.append($change)

    e.stopPropagation()
  }

  function publishEvent (e) {
    var $this = $(this)
    var $parent = $this.parents('.event-publish')

    $this.addClass('btn-state-loading')

    eventModel.published = true;

    syncData()
  }

  function createAccount (e) {
    var $this = $(this)
    var $form = $this.parents('.event-save')
    var email = $form.find('[name=email]').val()
    var loadingClass = 'event-save--loading';
    var successClass = 'event-save--success';
    var errorClass = 'event-save--error';
    var $dashboardlink = $('.event-dashboard')

    $form.addClass(loadingClass)

    $.ajax({
      method: 'POST',
      url: config.baseUrl + '/updateUser',
      data: {
        email: email,
        orgId: eventModel.orgId
      }
    }).done(function (res) {
      
      $form.removeClass(loadingClass)      
      $form.addClass(successClass)

      // update href of the dashboard redirect link
      $dashboardlink.attr('href', config.baseUrl + '/signin?email=' + email)

    }).fail(function (err) {

      $form.removeClass(loadingClass)
      $form.addClass(errorClass)

      $form.find('.event-error p').html(err.responseJSON.message)

      setTimeout(function() {
        $form.removeClass(errorClass)
      }, 4000);
    })

    // $form.removeClass(loadingClass)
    // $form.addClass(successClass)
  }

  function readURL(input) {

    if (input.files && input.files[0]) {
      var reader = new FileReader();

      eventModel.images = [{
        path: '/media/' + input.files[0].name
      }]

      reader.onload = function (e) {
        $('.event-preview-image img').attr('src', e.target.result);
      }

      reader.readAsDataURL(input.files[0]);

      // send image to the server
      var formData = new FormData()
      formData.append('image', input.files[0])

      if (eventModel.orgId) {
        formData.append('orgId', eventModel.orgId)  
      }
      
      if (eventModel._id) {
        formData.append('eventId', eventModel._id)
      }
      
      for (var key in eventModel) {
        
        if (key === 'images') {
          formData.append('event[' + key + '][0][path]', eventModel[key][0].path)
        } else {
          formData.append('event[' + key + ']', eventModel[key])
        }
        
      }

      $.ajax({
        url: config.baseUrl + '/tempEvent',
        data: formData,
        cache: false,
        contentType: false,
        processData: false,
        type: 'POST',
        success: function(res){
          eventModel.orgId = res.org._id
          eventModel._id = res.event._id
        }
      });
    }

  }

  function toggleDescription (e) {
    var $this = $(this)
    var $eventDescription = $this.parent().prev()

    $eventDescription.toggleClass('event-description--show')
  }

    function toggleFormFields (e) {
    var $this = $(this)
    var $form = $this.parents('.event-form')

    $form.addClass('event-form--show-fields')
  }

  

  function preventSubmitOnEnter (e) {
    
    var code = e.keyCode || e.which;
    if (code == 13) { 
      e.preventDefault();
      return false;
    }
  }

  function formAccountSubmit (e) {
    
    var $form = $(this)
    var email = $form.find('[name=email]').val()
    var orgName = $form.find('[name=orgname]').val()
    var orgId = $form.find('[name=orgid]').val()

    var loadingClass = 'form--loading';
    var successClass = 'form--success';
    var errorClass = 'form--error';

    $form.addClass(loadingClass)

    $.ajax({
      method: 'POST',
      url: config.baseUrl + '/updateUser',
      data: {
        email: email,
        orgId: orgId,
        orgName: orgName
      }
    }).done(function (res) {
      
      $form.removeClass(loadingClass)      
      $form.addClass(successClass)

      // update url with org name and redirect to it
      var oldOrgName = window.location.pathname.split('/')[2]
      var newPath = window.location.pathname.replace(oldOrgName, res.orgName)
      var origin = window.location.origin;
      var href = origin + newPath

      setTimeout(function () {
        window.location = href
      }, 3000)


    }).fail(function (err) {

      console.log('\n\n\n\n')
      console.log('--------')
      console.log('futai')
      console.log('--------')
      console.log('\n\n\n\n')

      $form.removeClass(loadingClass)
      $form.addClass(errorClass)

      $('.form-error-message .form-message').html(err.responseJSON.message)

      setTimeout(function() {
        $form.removeClass(errorClass)
      }, 4000);
    })

    // // $form.removeClass(loadingClass)
    // // $form.addClass(successClass)

    return false;
  }

  var submitReserveForm = function() {
      
    var $this = $(this);

    var $eventform = $this.parent();
    var name = $this.find('.reserve-name').val();
    var email = $this.find('.reserve-email').val();
    var seats = parseInt($this.find('.reserve-seats').val(), 10);
    var eventId = $this.find('.reserve-id').val();
    var orgId = $this.find('.reserve-orgId').val();
    var invited = parseInt($this.find('.reserve-invited').val(), 10);
    var waiting = parseInt($this.find('.reserve-waiting').val(), 10);
    var totalSeats = parseInt($this.find('.reserve-total-seats').val(), 10);
    var seatsLeft = totalSeats - invited;

    if (seats <= seatsLeft || seatsLeft === 0 ) {

      $eventform.removeClass('event-form--success event-form--error');
      $eventform.addClass('event-form--loading');
      
      $.ajax('/u/' +orgId + '/reservations/' + eventId, {
        type: 'POST',
        data: {
          name: name,
          email: email,
          seats: seats,
          // mclistid: mclistid
        },
        success: function(res) {

          $eventform.removeClass('event-form--loading');
          $eventform.addClass('event-form--success');
          

          // update the number of seats invited
          $('.seats-invited').html(res.event.invited)

          console.log('\n\n\n\n')
          console.log('--------')
          console.log(res)
          console.log('--------')
          console.log('\n\n\n\n')

          // // clear the form fields
          // $this.find('.reserve-name').val('');
          // $this.find('.reserve-email').val('');
          // $this.find('.reserve-seats').val('');


          // setTimeout(function() {
            
          //   $eventform.removeClass('event-form--loading');
          //   $eventform.removeClass('event-form--success');
            
          // }, 5000);

          // seatsLeft = parseInt(res.event.seats) - (res.event.invited + res.event.waiting);
          // $('#seats-left').html(Math.abs(seatsLeft));
        },
        error: function(err) {
          
          // $eventform.removeClass('event-form--loading');
          // $eventform.addClass('event-form--error');
          
          // // allow me to try again 
          // setTimeout(function() {
            
          //   $eventform.removeClass('event-form--loading event-form--error');
            
          // }, 5000);
          
        },
        complete: function() {
          
          // setTimeout(function() {
          //   $eventform.removeClass('event-form--error event-form--loading event-form--success');
          // })
        }

      });

    } else {

      $eventform.addClass('event-form--error');

      $defaultErrorMessage = $('.form-error .reservation-message').html()
      $tempErrorMessage = $('<p></p>').html('Not enough seats left. Please select less seats.')

      $('.form-error .reservation-message').html($tempErrorMessage)

      // allow me to try again 
      setTimeout(function() {
        
        $eventform.removeClass('event-form--error');
        $('.form-error .reservation-message').html($defaultErrorMessage);
        
      }, 5000);
    }

    return false;
  };

  function closeAlert (e) {
    e.preventDefault();
    $(this).parent().hide()
  };

  $('body').on('submit', '.form-account', formAccountSubmit)
  $('body').on('submit', '.form-reserve', submitReserveForm);
  $('body').on('click','.btn-toggle-fields', toggleFormFields)
  $('body').on('click', '.event-placeholder', toggleGroup);
  $('body').on('click', '.btn-event-save', saveData);
  $('body').on('mouseover', '.btn-event-save', preventBlur);
  $('body').on('mouseout', '.btn-event-save', unpreventBlur);
  $('body').on('click', '.event-free', updateEventPrice);
  $('body').on('click', '.btn-publish', publishEvent);
  $('body').on('click', '.btn-create-account', createAccount);
  $('body').on('click', '.event-toggle-description a', toggleDescription)
  $('body').on('click', '.alert a.close', closeAlert)
  $('body').on('click', '.form-error-message .close, .form-success-message .close', closeAlert)
  
  $('.event-update-form').on('keyup keypress', preventSubmitOnEnter);

  $('.event-image input').change(function(){
    readURL(this);
  });

  init()

})
