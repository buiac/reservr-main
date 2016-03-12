var Reservr = Reservr || {};


(function($) {

  'use strict';

  var Util = {
    validateImageExtension: function (oInput) {

      var _validFileExtensions = ['.jpg', '.jpeg', '.png'];
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
    },
    cleanInputValues: function (el) {
      var $inputs = $(el).find('input[type=text]')

      $inputs.each(function (i, input) {
        input.value = ''
      })

      return el;
    }
  };

  // var eventModel = {
  //   name: 'Demo event title',
  //   description: 'This is an event description that will take place in the heart of our beloved city. One of it\'s kind, it will be a transformative experience. Check out the items list:\n\n- some strings\n- glue\n- paper\n- [links are included](http://google.com)',
  //   images: [
  //     {
  //       path: '/images/reservr-placeholder-2.png'
  //     }
  //   ],
  //   date: defaultEventDate,
  //   seats: 120,
  //   orgId: '',
  //   temp: true,
  //   published: false
  // };

  /*
  
  Event model:
  - _id
  - name
  - description
  - date
  - images [{path: ''}]
  - date
  - seats
  - prices
  - location

  */ 

  var Dashboard = {
    
    // Initialization the functions
    init: function() {
      Dashboard.attachEventHandlers()
      Dashboard.initLibs()
      Dashboard.dateTime()
      Dashboard.initEventModel()
      Dashboard.parseFieldsOnLoad()
      Dashboard.initLocalVars()
    },

    initLocalVars: function () {
      Dashboard.reloadPage = false;

      Dashboard.config = {
        baseUrl: ''
      }

      if (window.location.hostname.indexOf('localhost') !== -1) {
        Dashboard.config.baseUrl = 'http://localhost:8080'
      }
    },

    initEventModel: function () {
      var $eventPage = $('.event-create-update');

      if (!$eventPage.length) {
        return;
      }

      Dashboard.eventModel = {
        _id: '',
        orgId: '',
        temp: '',
        published: '',
        name: '',
        description: '',
        images: [{path: ''}],
        existingImages: '',
        date: '',
        time: '',
        seats: '',
        prices: '',
        location: '',
        existingImages: '',
        reminders: '',
        reservationsOpen: '',
        mailchimp: '',
        toggleMailchimpOptin: ''
      }
    },

    parseFieldsOnLoad: function () {
      var $eventPage = $('.event-create-update');
      var $eventStatusInputs = $('.event-create-update .dropdown-menu').find('input')

      $eventStatusInputs.each(function (e, input) {
        Dashboard.eventModel[input.name] = input.checked
      })

      if (!$eventPage.length) {
        return;
      }

      var $inputs = $eventPage.find('[name]');

      $.each($inputs, function (i, input) {
        if (input.name) {
          Dashboard.eventModel[input.name] = input.value
        }

        if (input.name === 'existingImages') {
          Dashboard.eventModel.images = JSON.parse(input.value)
        }
      })
      
    },

    initLibs: function () {
      
      // this will resize the textareas to fit the text in them
      autosize(document.querySelectorAll('textarea'));

    },

    readURL: function(input) {

      var $image = $('.event-preview-image img');

      if (!input.files && !input.files[0]) {
        return;
      }

      if (!Util.validateImageExtension(input)) {
        return;
      }

      // show an error message if the size of the image is too big
      if ((input.files[0].size / 1000) > 1200) {
        // if file is bigger than 100kb
        swal({
          title: 'Try a smaller image!',
          text: 'Image file is too big (' + parseInt(input.files[0].size / 1000, 10) + 'kb). Max. size is 1MB.',
          type: 'error',
          confirmButtonText: 'Oke, got it'
        });

        return;
      }

      // show the image to the user
      var reader = new FileReader();

      reader.onload = function (e) {
        $image.attr('src', e.target.result);
        $image.removeAttr('style');
      }

      reader.readAsDataURL(input.files[0]);

      // attach image to object
      Dashboard.eventModel.images = [{
        path: '/media/' + input.files[0].name
      }]

      // send image to the server
      var formData = new FormData()
      formData.append('image', input.files[0])

      if (Dashboard.eventModel.orgId) {
        formData.append('orgId', Dashboard.eventModel.orgId)  
      }
      
      if (Dashboard.eventModel._id) {
        formData.append('eventId', Dashboard.eventModel._id)
      }
      
      for (var key in Dashboard.eventModel) {
        
        if (key === 'images') {
          formData.append('event[' + key + '][0][path]', Dashboard.eventModel[key][0].path)
        } else {
          formData.append('event[' + key + ']', Dashboard.eventModel[key])
        }
        
      }

      $.ajax({
        url: Dashboard.config.baseUrl + '/tempEvent',
        data: formData,
        cache: false,
        contentType: false,
        processData: false,
        type: 'POST',
        success: function(res){
          Dashboard.eventModel.orgId = res.org._id
          Dashboard.eventModel._id = res.event._id
        }
      });

    },

    previewDescription: function (e) {
      
      e.preventDefault();

      var $description = $('.event-description');
      var $descriptionPreview = $description.find('.preview-description');
      var descriptionText = $description.find('textarea').val();

      $description.addClass('preview-description--show');
      $descriptionPreview.html(marked(descriptionText))
      $descriptionPreview.prepend('<a href="" class="close" style="font-size: 25px; color:#000">&times;</a>')
    },

    hidePreviewDescription: function (e) {
      e.preventDefault();

      var $description = $('.event-description');
      $description.removeClass('preview-description--show');
    },

    dateTime: function () {

      var dateElement = $('[name="date"]')[0]
      var timeElement = $('[name="time"]')[0]

      if (dateElement) {
        var date = rome(dateElement, { time: false })
      }

      if (timeElement) {
        var time = rome(timeElement, { date: false })
      }
    },

    addPrice: function (e) {
      e.preventDefault()

      var $this = $(this);
      var $price = $this.prev();
      var $priceWrap = $this.parent();

      var $priceTier = Util.cleanInputValues($price.clone());

      $this.before($priceTier)

    },

    removePrice: function (e) {
      e.preventDefault()

      $(this).parent().remove()

      if ($('.event-price .event-price-group').length === 1) {
        $('.event-price .event-price-group').find('.event-remove-price').remove()
      }
    },

    stopPropagation: function (e) {
      e.stopPropagation()      
    },

    togglePublish: function (e) {
      Dashboard.eventModel.published = e.target.checked

      console.log('\n\n\n\n')
      console.log('----toggle publish----')
      console.log(Dashboard.eventModel.published)
      console.log('--------')
      console.log('\n\n\n\n')
      
      Dashboard.syncData()
    },

    toggleReminders: function (e) {
      Dashboard.eventModel.reminders = e.target.checked

      console.log('\n\n\n\n')
      console.log('----toggle reminders----')
      console.log(Dashboard.eventModel.reminders)
      console.log('--------')
      console.log('\n\n\n\n')

      Dashboard.syncData()
    },

    toggleReservations: function (e) {
      Dashboard.eventModel.reservationsOpen = e.target.checked

      console.log('\n\n\n\n')
      console.log('----toggle reservations----')
      console.log(Dashboard.eventModel.reservationsOpen)
      console.log('--------')
      console.log('\n\n\n\n')

      Dashboard.syncData()
    },

    toggleMailchimp: function (e) {
      
      $(this).parents('li').toggleClass('event-menu-drawer--open')

      Dashboard.eventModel.toggleMailchimp = e.target.checked

      console.log('\n\n\n\n')
      console.log('----toggle toggle mailchimp----')
      console.log(Dashboard.eventModel.toggleMailchimp)
      console.log('--------')
      console.log('\n\n\n\n')

      if (Dashboard.eventModel.toggleMailchimp) {
        Dashboard.eventModel.mailchimp = $(this).parents('li').find('select[name="mailchimp"]').val()
      } else {
        Dashboard.eventModel.mailchimp = ''
      }

      Dashboard.syncData()
      
    },

    toggleMailchimpOptin: function (e) {
      
      Dashboard.eventModel.toggleMailchimpOptin = e.target.checked

      Dashboard.syncData()
      
    },

    attachEventHandlers: function () {
      
      $('.event-image input').change(function(){
        Dashboard.readURL(this);
      });

      $('body').on('click', 'a.preview-description', Dashboard.previewDescription);
      $('body').on('click', '.event-description a.close', Dashboard.hidePreviewDescription);
      $('body').on('click', '.event-add-price', Dashboard.addPrice);
      $('body').on('click', '.event-remove-price', Dashboard.removePrice);
      $('body').on('click', '.btn-publish', Dashboard.publishEvent);
      $('body').on('click', '.switch-material', Dashboard.stopPropagation)

      $('body').on('change', '[name="published"]', Dashboard.togglePublish)
      $('body').on('change', '[name="reminders"]', Dashboard.toggleReminders)
      $('body').on('change', '[name="reservationsOpen"]', Dashboard.toggleReservations)
      $('body').on('change', '[name="toggleMailchimp"]', Dashboard.toggleMailchimp)
      $('body').on('change', '[name="toggleMailchimpOptin"]', Dashboard.toggleMailchimpOptin)
    },

    parseEventSavePrices: function () {
      var eventId = $('[name=_id]')[0].value

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
          eventId: eventId
        }

        if (price.name !== '' && price.amount !== '') {
          prices.push(price)
        }
        
      })

      Dashboard.eventModel.prices = prices
    },

    parseEventSaveDate: function () {
      // add the date
      var date = $('[name="date"]').val()
      var time = $('[name="time"]').val()
      Dashboard.eventModel.date = date + ' ' + time

    },

    parseEventSaveLocation: function () {
      
      // add the location
      var location = $('[name="location"]').val()
      Dashboard.eventModel.location = location

    },

    parseEventSaveSeats: function () {
      
      // add the seats
      var seats = $('[name="seats"]').val()
      
      Dashboard.eventModel.seats = seats
    },

    parseEventSaveName: function () {
      // add the name
      var name = $('[name="name"]').val()
      
      Dashboard.eventModel.name = name
    },

    parseEventSaveDescription: function () {
      // add the name
      var description = $('textarea[name="description"]').val()
      
      Dashboard.eventModel.description = description
    },

    parseEventSaveImages: function () {
      var existingImages = $('input[name="existingImages"]').val()

      Dashboard.eventModel.existingImages = existingImages
    },

    parseEventSaveToggles: function () {
      $('.event-create-update .dropdown-menu').find('input').each(function (i, input) {
        Dashboard.eventModel[input.name] = input.checked;
      })
    },

    parseEventSave: function () {
      Dashboard.parseEventSaveName()
      Dashboard.parseEventSaveDescription()
      Dashboard.parseEventSaveDate()
      Dashboard.parseEventSaveLocation()
      Dashboard.parseEventSaveSeats()
      Dashboard.parseEventSavePrices()
      Dashboard.parseEventSaveImages()
      Dashboard.parseEventSaveToggles()
    },

    syncData: function() {

      var eventId = $('[name=_id]')[0].value;

      Dashboard.parseEventSave();

      if (!eventId) {
        delete Dashboard.eventModel._id;
      }

      // send the data to the server
      $.ajax({
        method: 'POST',
        url: Dashboard.config.baseUrl + '/tempEvent',
        data: {
          event: Dashboard.eventModel
        }
      }).done(function (res) {
        
        // set the event orgId
        Dashboard.eventModel.org = res.org
        Dashboard.eventModel.orgId = res.orgId || res.org._id
        Dashboard.eventModel._id = res.event._id
        

        if (res.event.published) {
          // update the unique event url
          // updateEventUrl()

          if (Dashboard.reloadPage) {
            if (eventId && !eventId) {
              window.location = window.location.href + '/' + res.event._id
            } else if (eventId && eventId) {
              window.location = window.location.href
            }
          }
          
        }

      }).fail(function (err) {
        
        console.log('error')
        console.log(err)

      })
    },
    publishEvent: function (e) {
      var $this = $(this)
      var $parent = $this.parents('.event-publish')

      $this.addClass('btn-state-loading')

      Dashboard.eventModel.published = true;
      Dashboard.reloadPage = true;

      Dashboard.syncData()
    }
  }

  $(function() {
    Dashboard.init();

  });

})(window.jQuery);