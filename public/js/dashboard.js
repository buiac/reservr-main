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

      if (!$eventPage.length) {
        return;
      }

      var $inputs = $eventPage.find('[name]');

      $.each($inputs, function (i, input) {
        if (input.name) {
          
          console.log('--------')
          console.log(input.name + ':' + input.value)
          
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

      var reader = new FileReader();

      reader.onload = function (e) {
        $image.attr('src', e.target.result);
        $image.removeAttr('style');
      }

      reader.readAsDataURL(input.files[0]); 
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

    attachEventHandlers: function () {
      
      $('.event-image input').change(function(){
        Dashboard.readURL(this);
      });

      $('body').on('click', 'a.preview-description', Dashboard.previewDescription);
      $('body').on('click', '.event-description a.close', Dashboard.hidePreviewDescription);
      $('body').on('click', '.event-add-price', Dashboard.addPrice);
      $('body').on('click', '.event-remove-price', Dashboard.removePrice);
      $('body').on('click', '.btn-publish', Dashboard.publishEvent);
    },

    syncData: function() {

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

      Dashboard.eventModel.prices = prices

      // add the date
      var date = $('[name="date"]').val()
      var time = $('[name="time"]').val()
      Dashboard.eventModel.date = date + ' ' + time

      // add the location
      var location = $('[name="location"]').val()
      Dashboard.eventModel.location = location

      // add the seats
      var seats = $('[name="seats"]').val()
      Dashboard.eventModel.seats = seats

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