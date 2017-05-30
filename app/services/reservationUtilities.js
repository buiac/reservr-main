module.exports = function(config, db) {
    var redistributeSeats = function( eventId, eventSeats ) {
        db.reservations.find( {
            eventId: eventId
        }, function( err, reservations ) {
            var totalSeats = eventSeats;
            var takenSeats = getTakenSeats( reservations );
            var waitingSeats = getWaitingSeats( reservations );

            if ( totalSeats > takenSeats ) {
                db.reservations.find( {
                    eventId: eventId,
                    waiting: true
                }, function( err, reservations ) {
                    reservations.forEach( function( reservation ) {
                        var seatsLeft = totalSeats - takenSeats;
                        if ( seatsLeft <= 0 ) {
                            return;
                        }

                        if ( seatsLeft >= reservation.seats ) {
                            makeReservationAvailable( reservation );
                            takenSeats += reservation.seats;
                        }

                        if ( seatsLeft < reservation.seats ) {
                            splitReservation( reservation, seatsLeft );
                            takenSeats += seatsLeft;
                        }
                    } );
                } );
            }
        } );
    };

    var makeReservationAvailable = function( reservation ) {
        db.reservations.update( {
            _id: reservation._id
        }, {
            $set: {
                waiting: false
            }
        }, function( err, reservation) {
            if ( err ) {
                console.log( err );
            }
        } );
    };

    var splitReservation = function( reservation, seats ) {
        console.log( "split reservation" );
        updateWaitingReservation( reservation, seats );
        insertNewReservation( reservation, seats );
    };

    var updateWaitingReservation = function( reservation, seats ) {
        console.log( 'updateWaitingReservation' )
        db.reservations.update( {
            _id: reservation._id
        }, {
            $set: {
                seats: reservation.seats - seats
            }
        }, function( err, updated ) {
            if ( err ) {
                console.log( err );
            }
        } );
    };

    var insertNewReservation = function( reservation, seats ) {
        var clonedReservation = cloneReservation( reservation );

        clonedReservation.seats = seats;
        clonedReservation.waiting = false;

        db.reservations.insert( clonedReservation, function( err, doc ) {
            if ( err ) {
                console.log( err );
            }
        } );
    };

    var cloneReservation = function( reservation ) {
        var clonedReservation = JSON.parse( JSON.stringify( reservation ) );
        delete clonedReservation._id;
        return clonedReservation;
    };

    var getTakenSeats = function ( reservations ) {
        return reservations.filter( function( reservation ) {
            return !reservation.waiting;
        } ).map( function( reservation ) {
            return reservation[ "seats" ];
        } ).reduce( function( acc, value ) {
            return acc + value;
        }, 0 );
    };

    var getWaitingSeats = function( reservations ) {
        return reservations.filter( function( reservation ) {
            return reservation.waiting;
        } ).map( function( reservation ) {
            return reservation[ "seats" ];
        } ).reduce( function( acc, value ) {
            return acc + value;
        }, 0 );
    };

  return {
    redistributeSeats: redistributeSeats
  };
}
