$(document).ready(function () {

   // toggle full description
  var toggleDescription = function() {
    
    var $this = $(this);
    var $description = $this.prev('.event-description');
    
    $description.toggleClass('event-description--show');
    
  };
  
  $('.event-toggle-description').on('click', toggleDescription);

  var toggleReservationBox = function() {

    var $container = $(this).parent('.container-reserve');
    
    $container.toggleClass('container-reserve--active');

  };

  $('.container-reserve-btn').on('click', toggleReservationBox);

  var submitReserveForm = function() {
    
    var $this = $(this);
    var name = $this.find('.reserve-name').val();
    var email = $this.find('.reserve-email').val();
    var seats = parseInt($this.find('.reserve-seats').val(), 10);
    var eventId = $this.find('.reserve-id').val();
    var orgId = $this.find('.reserve-orgId').val();
    var waiting = $this.find('.reserve-waiting').val();
    var mclistid = $this.find('.reserve-newsletter').val();
    var seatsLeft = parseInt($($this.parents('.reserve-actions')).find('#seats-left').html());
    
    if (seats <= seatsLeft || seatsLeft === 0 || waiting === 'true' ) {
      $this.removeClass('container-reserve-form--success container-reserve-form--error');
      
      $this.addClass('container-reserve-form--loading');
      
      $.ajax('/u/' +orgId + '/reservations/' + eventId, {
        type: 'POST',
        data: {
          name: name,
          email: email,
          seats: seats,
          mclistid: mclistid,
          waiting: waiting
        },
        success: function(res) {

          $this.addClass('container-reserve-form--success');

          seatsLeft = res.event.seats - res.event.reservedSeats;
          $('#seats-left').html(seatsLeft);
        },
        error: function(err) {
          
          $this.addClass('container-reserve-form--error');
          
          // allow me to try again 
          setTimeout(function() {
            
            $this.removeClass('container-reserve-form--error');
            
          }, 5000);
          
        },
        complete: function() {
         
          $this.removeClass('container-reserve-form--loading');
          
        }
      });
    } else {
      $this.addClass('container-reserve-form--error');
      $('span.container-reserve-form-error').html('Numarul locurilor rezervate nu poate fi mai mare decat numarul locurilor disponibile');

      // allow me to try again 
      setTimeout(function() {
        
        $this.removeClass('container-reserve-form--error');
        $('span.container-reserve-form-error').html('Rezervarea a esuat. Incercati mai tarziu.');
        
      }, 5000);
    }

    return false;
  };

  $('.container-reserve form').on('submit', submitReserveForm);

});