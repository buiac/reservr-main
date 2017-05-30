module.exports = function(config, db) {
    // Mailgun configuration
    var Mailgun = require( "mailgun-js" );
    var moment = require( "moment" );
    var marked = require( "marked" );
    var util = require( "./util.js" )( config, db );
    var domain = 'reservr.net';
    var mailgun_api_key = config.mailgun.apikey;
    var mailgun = new Mailgun( {
        apiKey: mailgun_api_key,
        domain: domain
    } );

    // var postRedistributionUpdate = function( orgId ) {
    //
    // };

    var sendUpgradeNotification = function( reservation ) {
        db.events.findOne( {
            _id: reservation.eventId
        }, function( err, event ) {
            if ( err ) {
                console.log( err );
            }

            db.orgs.findOne( {
                _id: event.orgId
            }, function( err, org ) {
                if ( err ) {
                    console.log( err );
                }

                var message = buildUpgradeMessage( event, org, reservation );

                sendMessage( message );
            } );
        } );
    };

    var sendPartialUpgradeNotification = function( reservation, availableSeats ) {
        db.events.findOne( {
            _id: reservation.eventId
        }, function( err, event ) {
            if ( err ) {
                console.log( err );
            }

            db.orgs.findOne( {
                _id: event.orgId
            }, function( err, org ) {
                if ( err ) {
                    console.log( err );
                }

                var message = buildPartialUpgradeMessage( event, org, reservation, availableSeats );

                sendMessage( message );
            } );
        } );


        //sendMessage( message );
    };

    var buildUpgradeMessage = function( event, org, reservation ) {
        var params = {
          seats: reservation.seats,
          eventName: event.name,
          eventDate: moment( event.date ).format( "dddd, Do MMMM YYYY, HH:mm" ),
          deleteReservationLink: "<a style='color:red' href='http://reservr.net/r/" + reservation._id + "'>Delete Reservation</a>"
        };

        var template = {
          subject: org.userUpdateSubject,
          body: marked( org.userUpdateBody )
        };

        var bodyPlaceholders = util.getWordsBetweenCurlies( template.body );

        bodyPlaceholders.forEach( function ( item ) {
          template.body = template.body.replace( "{" + item + "}", params[ item ] );
        } );

        return {
          from: 'contact@reservr.net',
          to: reservation.email,
          subject: template.subject,
          html: template.body
        };
    };

    var buildPartialUpgradeMessage = function( event, org, reservation, availableSeats ) {
        var params = {
          seatsAvailable: availableSeats,
          eventName: event.name,
          eventDate: moment( event.date ).format( "dddd, Do MMMM YYYY, HH:mm" ),
          deleteReservationLink: "<a style='color:red' href='http://reservr.net/r/" + reservation._id + "'>Delete Reservation</a>"
        };

        var template = {
          subject: org.userUpdateSubject,
          body: marked( org.userUpdateBodyPartial )
        };

        var bodyPlaceholders = util.getWordsBetweenCurlies( template.body );

        bodyPlaceholders.forEach( function ( item ) {
          template.body = template.body.replace( "{" + item + "}", params[ item ] );
        } );

        return {
          from: 'contact@reservr.net',
          to: reservation.email,
          subject: template.subject,
          html: template.body
        };
    };

    // sendSeatsUpgradeNotification
    // sendSeatsPartialUpgradeNotification

    // buildSeatsUpgradeMessage
    // buildPartialSeatsUpgradeMessage

    /* prams
       @message:
        message = {
          from: 'contact@reservr.net',
          to: userEmail,
          subject: templateSubject,
          html: templateBody
        };
    */
    var sendMessage = function( message ) {
        mailgun.messages().send( message, function ( err, body ) {
            if ( err ) {
                console.log('\n\n\n\n')
                console.log('----error mailgun----')
                console.log("got an error: ", err);
                console.log('--------')
                console.log('\n\n\n\n')
            }
            else {
                console.log('\n\n\n\n')
                console.log('----success mailgun----')
                console.log(body);
                console.log('--------')
                console.log('\n\n\n\n')
            }
        });
    }

    return {
        sendMessage: sendMessage,
        sendUpgradeNotification: sendUpgradeNotification,
        sendPartialUpgradeNotification: sendPartialUpgradeNotification
    };
}
