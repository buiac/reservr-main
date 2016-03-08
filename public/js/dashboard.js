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
    }
  }

  var Dashboard = {
    
    // Initialization the functions
    init: function() {
      Dashboard.attachEventHandlers()
      Dashboard.initLibs()
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

    attachEventHandlers: function () {
      
      $('.event-image input').change(function(){
        Dashboard.readURL(this);
      });

    }

  }

  $(function() {
    Dashboard.init();

  });

})(window.jQuery);