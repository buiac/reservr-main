autosize(document.querySelectorAll('textarea'));

$(document).ready(function () {

  var defaultEventDate = new Date(new Date().getTime() + (3 * 24 * 60 * 60 * 1000))
  var $eventGroups = $('.event-group')
  var saveHover = false
  var calendar
  var reloadPage = false
  var eventModel = {
    name: 'Demo event title',
    description: 'This is an event description that will take place in the heart of our beloved city. One of it\'s kind, it will be a transformative experience. Check out the items list:\n\n- some strings\n- glue\n- paper\n- [links are included](http://google.com)',
    images: [
      {
        path: '/images/reservr-placeholder-2.png'
      }
    ],
    date: defaultEventDate,
    seats: 120,
    orgId: '',
    temp: true,
    published: false
  };

  var config = {
    baseUrl: ''
  }

  swal.setDefaults({
    confirmButtonColor: '#02766C',
    animation: false
  });

  var _validFileExtensions = ['.jpg', '.jpeg', '.png'];

  moment.defaultFormat = 'YYYY-MM-DD LT';

  if (window.location.hostname.indexOf('localhost') !== -1) {
    config.baseUrl = 'http://localhost:8080'
  }

  function validateImageExtension(oInput) {

    var sFileName = oInput.value;
    
    if (sFileName.length > 0) {
      var blnValid = false;
      for (var j = 0; j < _validFileExtensions.length; j++) {
        var sCurExtension = _validFileExtensions[j];
        if (sFileName.substr(sFileName.length - sCurExtension.length, sCurExtension.length).toLowerCase() == sCurExtension.toLowerCase()) {
          blnValid = true;
          break;
        }
      }

      if (!blnValid) {
        swal({
          title: 'This is not an image file!',
          text: 'Supported file extensions are: .jpg, .jpeg and .png',
          type: 'error',
          confirmButtonText: 'Oke, got it'
        });
        return false;
      }
    }
    

    return true;

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

    if ($('.rzvr-homepage').length) {
      swal({
        title: 'Your unique event link:',
        text: '<a href="' + url + '" target="_blank" class="event-link">' + url + '</a>',
        type: 'success',
        confirmButtonText: 'Oke, got it',
        html: true
      });
    }

    // show overlay
    $parent.addClass('event-publish--published')
  }

  function syncData() {

    var eventId = $('[name=_id]')[0]

    // add Prices to the event model
    var prices = []

    var $eventPrices = $('.event-price-group');

    
    $eventPrices.each(function (i, price) {
      
      var $price = $(price)
      
      var name = $price.find('.event-price-name').val()
      var amount = $price.find('.event-price-amount').val()
      var currency = $price.find('.event-price-currency').val()

      var price = {
        name: name,
        amount: amount,
        currency: currency,
        eventId: eventId.value
      }

      if (price.name !== '' && price.amount !== '') {
        prices.push(price)
      }
      
    })

    eventModel.prices = prices

    // add the date
    var date = $('[name="date"]').val()
    var time = $('[name="time"]').val()
    eventModel.date = date + ' ' + time

    // add the location
    var location = $('[name="location"]').val()
    eventModel.location = location

    // add the seats
    var seats = $('[name="seats"]').val()
    eventModel.seats = seats

    // send the data to the server
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

        if (reloadPage) {
          if (eventId && !eventId.value) {
            window.location = window.location.href + '/' + res.event._id
          } else if (eventId && eventId.value) {
            window.location = window.location.href
          }
        }
        
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

      if (field.name === 'date') {
        setTimeout(function () {
          $placeholder.html(moment($(field).val()).format('LLLL'))
          
          if ($icon) {
            $placeholder.prepend($icon)
          }
        }, 100)
      }
      
    }

    if ($parent.hasClass('event-seats') && $placeholder.html().indexOf < 0) {
      $placeholder.html($placeholder.html() + ' seats')
    }

    if ($icon) {
      $placeholder.prepend($icon)
    }
    
    

    if ($parent.hasClass(toggleClass)) {
      $parent.removeClass(toggleClass)
    }

    eventModel[field.name] = field.value
    reloadPage = false

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
      
      $(field).blur(saveData)
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

  function parseFieldsOnLoad () {
    var $eventGroups = $('.rzv-lightbox .event-group')
    var $eventStatusInputs = $('.event-details .event-menu').find('input')

    $eventStatusInputs.each(function (e, input) {
      eventModel[input.name] = input.checked
    })

    $eventGroups.each(function (i, eventGroup) {

      var field = $(eventGroup).find('[name]')[0]
      var $placeholder = $(eventGroup).find('.event-placeholder')
      var value = $(field).val()
      var $icon = $(eventGroup).find('.fa')[0] || $(eventGroup).find('.icomoon')[0]
      
      eventModel[field.name] = field.value

      if (field.name === 'existingImages') {
        eventModel.images = JSON.parse(field.value)
      }
    
      if ($(eventGroup).hasClass('event-seats')) {
        if (value && (value !== 'Event seats')) {
          $placeholder.append(' seats')  
        } else {

          $placeholder.html(' Event seats')
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

          if (field.name === 'date') {
            $placeholder.html(moment(value).format('LLLL'))            
          }

          

          if ($(eventGroup).hasClass('event-seats')) {
            if (value && (value !== 'Event seats')) {
              $placeholder.append(' seats')  
            } else {
              $placeholder.html('Event seats')              
            }
          }
          
          if ($icon) {
            $placeholder.prepend($icon)
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

    var dateElement = $('[name="date"]')[0]
    var timeElement = $('[name="time"]')[0]

    if (dateElement ) {
      var date = rome(dateElement, { time: false })
    }

    if (timeElement) {
      var time = rome(timeElement, { date: false })
    }
  }

  function initBootstrapWidgets (argument) {
    // Bootstrap widgets
    $('.event-free').tooltip()
    $('.fa-info-circle').tooltip()
  }

  function updateDateField () {
    var isHomepage = $('.rzvr-homepage').length

    if (isHomepage) {
      $date = $('[name=date]')
      $date.val(moment(defaultEventDate).format('LLLL'))  
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

  function scrollEventList () {
    var $eventActive = $('.event-summary.event-active');
    var $eventList = $('.event-list');

    if ($eventActive.length) {

      $('.event-list').animate({
        scrollTop: $eventActive.offset().top - $eventList.offset().top
      }, 300);

    }

  }

  function fixListZindex () {
    var $eventList = $('.event-list');

    if ($eventList.length) {
      var num = $eventList.find('.event-summary').length

      if (num > 0) {
        $eventList.find('.event-summary').each(function (i, event) {
          $(event).css('z-index', num - i)
        })                  
      }
    }
  }

  function initTableSorter () {
    if ($('.table-reservations').length) {
      $('.table-reservations').tablesorter()     
    }

    if ($('.sa-table').length) {
      $('.sa-table').tablesorter()      
    }
  }

  function init () {
    updateDateField()
    parseFieldsOnLoad()
    checkImage()
    setupCalendar()
    initBootstrapWidgets()
    updateHiddenFields()
    scrollEventList()
    fixListZindex()
    initTableSorter()
    
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
    reloadPage = true

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

      
      if (!validateImageExtension(input)) {
        return
      }

      var reader = new FileReader();

      // if ((input.files[0].size / 1000) > 100) {
      //   // if file is bigger than 100kb
      //   swal({
      //     title: 'Try a smaller image!',
      //     text: 'Image file is too big (' + parseInt(input.files[0].size / 1000, 10) + 'kb). Max. size is 100kb.',
      //     type: 'error',
      //     confirmButtonText: 'Oke, got it'
      //   });

      //   return;
      // }
      

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
    var $eventDescription = $this.parent()

    $eventDescription.toggleClass('event-description--show')
  }
    
  function toggleFormFields (e) {
    
    var $this = $(this)
    var $form = $this.parents('.event-form')

    $form.addClass('event-form--show-fields')

    if ($('.event-temporary').length) {
      swal({
        title: 'You\'ll need a FREE account for that',
        text: "This way you can check who signed up for your awesome event.",
        type: "warning"
      }); 
    }
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
    var timestamp = $this.find('.reserve-timestamp').val()
    var eventId = $this.find('.reserve-id').val();
    var orgId = $this.find('.reserve-orgId').val();
    var invited = parseInt($this.find('.reserve-invited').val(), 10);
    var waiting = parseInt($this.find('.reserve-waiting').val(), 10);
    var totalSeats = parseInt($this.find('.reserve-total-seats').val(), 10);
    var mclistid = $this.find('.reserve-newsletter').val();
    var mcoptin = 'null';
    var seatsLeft = totalSeats - invited;

    if ($this.find('.reserve-newsletter-optin').length) {

      mcoptin = $this.find('.reserve-newsletter-optin')[0].checked

    }


    if (seats <= seatsLeft || seatsLeft === 0 ) {

      $eventform.removeClass('event-form--success event-form--error');
      $eventform.addClass('event-form--loading');
      
      $.ajax({
        url: '/u/' +orgId + '/reservations/' + eventId,
        type: 'POST',
        data: {
          name: name,
          email: email,
          seats: seats,
          timestamp: timestamp,
          mclistid: mclistid,
          mcoptin: mcoptin
        }
      }).done(function(res) {

          $eventform.removeClass('event-form--loading');
          $eventform.addClass('event-form--success');
          

          // update the number of seats invited
          $('.seats-left').html(parseInt(res.event.seats, 10) - parseInt(res.event.invited, 10))

          if ($('.seats-waiting')) {
            $('.seats-waiting').html(res.event.waiting)            
          }

          // update the reservation link
          $eventform.find('.form-success a').html('http://reservr.net/r/' + res.reservation._id).attr('href','http://reservr.net/r/' + res.reservation._id)

          // if a reservation is made with the same email
          if (res.resCode) {
            var h4 = $eventform.find('.form-success h4')
            var p = $('<p></p>').html(res.message)
            h4.after(p)

          }

        }).fail(function (err) {
          var error = JSON.parse(err.responseText)

          $eventform.addClass('event-form--error');
          $eventform.removeClass('event-form--loading');

          $defaultErrorMessage = $('.form-error .reservation-message').html()
          $tempErrorMessage = $('<p></p>').html(error.message)

          $('.form-error .reservation-message').html($tempErrorMessage)

          // allow me to try again 
          setTimeout(function() {
            
            $eventform.removeClass('event-form--error event-form--success event-form--loading');
            $('.form-error .reservation-message').html($defaultErrorMessage);
            
          }, 10000);

        })
        // error: function(err) {
          
        //   // $eventform.removeClass('event-form--loading');
        //   // $eventform.addClass('event-form--error');
          
        //   // // allow me to try again 
        //   // setTimeout(function() {
            
        //   //   $eventform.removeClass('event-form--loading event-form--error');
            
        //   // }, 5000);
          
        // },
        // complete: function() {
          
        //   // setTimeout(function() {
        //   //   $eventform.removeClass('event-form--error event-form--loading event-form--success');
        //   // })
        // }

      // });

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

  function togglePublish (e) {
    eventModel.published = e.target.checked
    
    syncData()
  }

  function toggleReminders (e) {
    eventModel.reminders = e.target.checked

    syncData()
  }

  function toggleReservations (e) {
    eventModel.reservationsOpen = e.target.checked

    syncData()
  }

  function toggleMailchimp (e) {
    
    $(this).parents('li').toggleClass('event-menu-drawer--open')

    eventModel.toggleMailchimp = e.target.checked

    if (eventModel.toggleMailchimp) {
      eventModel.mailchimp = $(this).parents('li').find('select[name="mailchimp"]').val()
    } else {
      eventModel.mailchimp = ''
    }

    syncData()
    
  }

  function toggleMailchimpOptin (e) {
    
    eventModel.toggleMailchimpOptin = e.target.checked

    syncData()
    
  }

  function removeItem (e) {
    e.preventDefault()

    var title = e.target.dataset.message
    var href = e.target.href

    swal({
      title: title,
      text: "You will not be able to recover the data after this.",
      type: "warning",
      showCancelButton: true,
      confirmButtonColor: "#DD6B55",
      confirmButtonText: "Yes, delete it!",
      closeOnConfirm: false
    }, function() {
      window.location = href
    });
  }

  function toggleNotificationEmail (e) {
    if (!this.checked) {
      $(this).parents('.rzv-panel').addClass('rzv-notifications--disabled')
    } else {
      $(this).parents('.rzv-panel').removeClass('rzv-notifications--disabled')
    }
  }

  function displayPanels (e) {
    e.preventDefault()

    var $panelContainer = $('.rzv-panel-container');
    var classes = 'rzv-panel--notifications,rzv-panel--account,rzv-panel--organization,rzv-panel--integrations,rzv-panel--templates'.split(',');
    var panelName = $(this).attr('href').slice(1)
    var $navListEls = $('.rzv-vnav li a')

    
    // remove previous classes
    classes.forEach(function (className) {
      $panelContainer.removeClass(className)
    })

    // add name of the panel to parent element
    $panelContainer.addClass('rzv-panel--' + panelName)

    // update nav list
    $navListEls.removeClass('active-item')

    $(this).addClass('active-item')
  }

  function goToEvent (e) {
    var $this = $(this)
    var eventHref = $this.find('.event-title').attr('href')
    window.location = eventHref
  }

  function goToReservations (e) {
    e.preventPropagation()
    window.location = $(this).attr('href')
  }

  function toggleEventContextMenu (e) {
    e.preventDefault()
    e.stopPropagation()

    var $this = $(this)
    $this.parent().toggleClass('event-menu--open')

  }

  function preventPropagation (e) {
    e.stopPropagation()
  }

  function cleanInputValues (el) {
    $inputs = $(el).find('input[type=text]')
    $selects = $(el).find('select')

    $inputs.each(function (i, input) {
      input.value = ''
    })

    return el;
  }

  function addPrice (e) {
    e.preventDefault()

    var $this = $(this);
    var $price = $this.prev();
    var $priceWrap = $this.parent();

    var $priceTier = cleanInputValues($price.clone());

    $this.before($priceTier)

  }

  function removePrice (e) {
    e.preventDefault()

    $(this).parent().remove()
  }

  function updateSeats (e) {
    e.preventDefault()

    var seats = $(this).prev().val()
    var reservationId = $(this).data('reservationid')
    var $btn = $(this)
    var $alertSuccess = $('.alert-success-seats')
    var $alertWarning = $('.alert-warning-seats')

    // add loading state
    $btn.addClass('btn-state-loading');

    $alertSuccess.hide()
    $alertWarning.hide()

    $.ajax({
      method: 'POST',
      url: config.baseUrl + '/r/update/' + reservationId,
      data: {
        seats: seats
      }
    }).done(function (res) {
      
      $btn.removeClass('btn-state-loading')

      // show success message
      $alertSuccess.find('p').html(res.message)
      $alertSuccess.show()

      // hide fields
      $btn.parents('.field-update').removeClass('field-update--show')
      $btn.parents('.field-update').find('span.seats').html(seats)


      setTimeout(function() {
        $alertSuccess.hide()
      }, 3000);

    }).fail(function (err) {

      $btn.removeClass('btn-state-loading')
      
      // show error message
      $alertWarning.find('p').html(err.responseJSON.message)
      $alertWarning.show()

      setTimeout(function() {
        $alertWarning.hide()
      }, 3000);

    })

  }

  function hideWarning (e) {
    e.preventDefault()

    $(this).parent().hide()
  }

  function showUpdateFields (e) {
    e.preventDefault()

    $(this).parents('.field-update').addClass('field-update--show')
  }

  function hideUpdateFields (e) {
    e.preventDefault()

    $(this).parents('.field-update').removeClass('field-update--show')
  }

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
  $('body').on('click', '.event-toggle-description', toggleDescription)
  $('body').on('click', '.alert a.close', closeAlert)
  $('body').on('click', '.form-error-message .close, .form-success-message .close', closeAlert)
  $('body').on('click', '.event-group-cancel', hideGroup)
  $('body').on('click', '.btn-remove-item', removeItem)
  $('body').on('change', '[name=notifications]', toggleNotificationEmail)
  $('body').on('click', '.rzv-vnav li a', displayPanels)
  $('body').on('click', '.event-add-price', addPrice)
  $('body').on('click', '.event-remove-price', removePrice)
  $('body').on('click', '.alert-warning .close', hideWarning)
  $('body').on('click', '.btn-cancel-fields', hideUpdateFields)

  $('body').on('change', '[name="published"]', togglePublish)
  $('body').on('change', '[name="reminders"]', toggleReminders)
  $('body').on('change', '[name="reservationsOpen"]', toggleReservations)
  $('body').on('change', '[name="toggleMailchimp"]', toggleMailchimp)
  $('body').on('change', '[name="toggleMailchimpOptin"]', toggleMailchimpOptin)
  
  $('body').on('click', '.event-menu-button', toggleEventContextMenu)
  $('body').on('click', '.event-menu-dropdown a', preventPropagation)
  $('body').on('click', '.field-update-seats .btn-save', updateSeats)
  
  $('.event-update-form').on('keyup keypress', preventSubmitOnEnter);

  $('body').on('click', '.field-update-placeholder .btn', showUpdateFields)
  

  

  $('.event-image input').change(function(){
    readURL(this);
  });

  init()

})
