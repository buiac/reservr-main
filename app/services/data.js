module.exports = function( config, db ) {
    var q = require( "q" );
    var moment = require( "moment" );

    var getOrgEvents = function ( params ) {
        var deferred = q.defer();
        var parrams = {
            orgId: params.orgId || params._id
        };

        if ( params.fromDate ) {
            parrams.date = {
                $gte: params.fromDate
            };
        }

        db.events.find( parrams ).sort( {
            date: 1
        } ).exec( function ( err, events ) {
            var arr = [];

            events.forEach( function ( event ) {
                arr.push( getEventReservations( {
                    eventId: event._id
                } ) );
            } );

            q.all( arr ).then( function ( rez ) {
                var reservations = [].concat.apply( [], rez );

                events.forEach( function ( event ) {
                    event.invited = 0;
                    event.waiting = 0;

                    reservations.forEach( function ( reservation ) {
                        if ( reservation.eventId === event._id ) {
                            if ( reservation.waiting ) {
                                event.waiting = event.waiting + reservation.seats;
                            } else {
                                event.invited = event.invited + reservation.seats;
                            }
                        }
                    } );
                } );

                if ( err ) {
                    deferred.reject( err );
                } else {
                    deferred.resolve( events );
                }
            } );
        } );

        return deferred.promise;
    };

    var getAvailableSeats = function ( params ) {
        var deferred = q.defer();

    // get the event so we know how many seats are available
        db.events.findOne( {
            _id: params.eventId
        }, function ( err, event ) {
            if ( err ) {
                deferred.reject( err );
            }

            db.reservations.find( {
                eventId: params.eventId,
                waiting: false
            }, function ( err, reservations ) {
                if ( err ) {
                    deferred.reject( err );
                }

                var reservationsNumber = 0;

                reservations.forEach( function ( reservation ) {
                    reservationsNumber = reservationsNumber + reservation.seats;
                } );

                deferred.resolve( event.seats - reservationsNumber );
            } );
        } );

        return deferred.promise;
    };

    var getEventReservations = function ( params ) {
        var deferred = q.defer();

        db.reservations.find( {
            eventId: params.eventId
        }, function ( err, reservations ) {
            if ( err ) {
                deferred.reject( err );
            } else {
                deferred.resolve( reservations );
            }
        } );

        return deferred.promise;
    };

    var getEventReservationsTotal = function ( params ) {
        var deferred = q.defer();

        db.reservations.find( {
            eventId: params.eventId
        }, function ( err, reservations ) {
            if ( err ) {
                deferred.reject( err );
            } else {
        // deferred.resolve(reservations);
                var totalRes = 0;
                reservations.forEach( function ( reservation ) {
                    totalRes = totalRes + reservation.seats;
                } );

                deferred.resolve( totalRes );
            }
        } );

        return deferred.promise;
    };

    var getEventReservationsByType = function ( params ) {
        var deferred = q.defer();

        db.reservations.find( {
            eventId: params.eventId
        }, function ( err, reservations ) {
            if ( err ) {
                deferred.reject( err );
            } else {
                var reservationsByType = {
                    invited: 0,
                    waiting: 0
                };

                reservations.forEach( function ( reservation ) {
                    if ( reservation.waiting ) {
                        reservationsByType.waiting = reservationsByType.waiting + reservation.seats;
                    } else {
                        reservationsByType.invited = reservationsByType.invited + reservation.seats;
                    }
                } );

                deferred.resolve( reservationsByType );
            }
        } );

        return deferred.promise;
    };

    var getOrgByName = function ( params ) {
        var deferred = q.defer();

        db.orgs.findOne( {
            name: params.name
        }, function ( err, org ) {
            if ( err ) {
                deferred.reject( err );
            } else {
                deferred.resolve( org );
            }
        } );

        return deferred.promise;
    };

    var getOrgById = function ( params ) {
        var deferred = q.defer();

        db.orgs.findOne( {
            _id: params.id
        }, function ( err, org ) {
            if ( err ) {
                deferred.reject( err );
            } else {
                deferred.resolve( org );
            }
        } );

        return deferred.promise;
    };

    return {
        getOrgEvents: getOrgEvents,
        getEventReservations: getEventReservations,
        getOrgByName: getOrgByName,
        getOrgById: getOrgById,
        getAvailableSeats: getAvailableSeats,
        getEventReservationsTotal: getEventReservationsTotal,
        getEventReservationsByType: getEventReservationsByType
    };
};
