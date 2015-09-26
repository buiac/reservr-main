$(document).ready(function () {
  
  var toggleReservationBox = function() {
    console.log('dasdasd');
    var $container = $(this).parent('.container-reserve');
    
    $container.toggleClass('container-reserve--active');

  };

  $('.container-reserve-btn').on('click', toggleReservationBox);

  var submitReserveForm = function() {
    
    var $this = $(this);
    var name = $this.find('.reserve-name').val();
    var email = $this.find('.reserve-email').val();
    var seats = $this.find('.reserve-seats').val();
    var eventId = $this.find('.reserve-id').val();
    var orgId = $this.find('.reserve-orgId').val();
    var waiting = $this.find('.reserve-waiting').val();
    var mclistid = $this.find('.reserve-newsletter').val();
    var seatsLeft = parseInt($('#seats-left').html());

    // send nothing if user does not check checkbox
    if (!$this.find('.reserve-newsletter')[0].checked) {
      mclistid = '';
    }
    
    if (seats <= seatsLeft || seatsLeft === 0 || waiting ) {
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