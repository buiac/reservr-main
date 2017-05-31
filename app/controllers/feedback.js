/* superadmin
 */

module.exports = function( config, db ) {
    "use strict";

    var marked = require( "marked" );

  // Mailgun configuration
    var Mailgun = require( "mailgun-js" );
    var mailgun_api_key = config.mailgun.apikey;
    var domain = "reservr.net";
    var mailgun = new Mailgun( { apiKey: mailgun_api_key, domain: domain } );

    var send = function ( req, res, next ) {
        var email = req.body.email;
        var message = req.body.message;
        var orgName = req.body.orgName;
        var eventId = req.body.eventId || "";

        db.orgs.findOne( {
            name: orgName
        }, function ( err, org ) {
            db.users.findOne( {
                _id: org.userId
            }, function ( err, user ) {
                db.events.findOne( {
                    _id: eventId
                }, function ( err, event ) {
                    var html = "New message from " + email + "\n\n" + "\"" + message + "\"";

                    if ( event && event.name ) {
                        html = html + "\n\nMessage sent from " + event.name + " page.";
                    }

                    var emailMessage = {
                        from: "contact@reservr.net",
                        to: user.username,
                        subject: "new message from site Reservr.net",
                        html: marked( html )
                    };

          //Invokes the method to send emails given the above data with the helper library
                    mailgun.messages().send( emailMessage, function ( err, body ) {
              //If there is an error, render the error page
                        if ( err ) {
                            console.log( "\n\n\n\n" );
                            console.log( "----error mailgun----" );
                            console.log( "got an error: ", err );
                            console.log( "--------" );
                            console.log( "\n\n\n\n" );
                        } else {
                            console.log( "\n\n\n\n" );
                            console.log( "----success mailgun----" );
                            console.log( body );
                            console.log( "--------" );
                            console.log( "\n\n\n\n" );
                        }
                    } );

                    res.status( 200 ).send( {
                        message: "success"
                    } );
                } );
            } );
        } );
    };

    return {
        send: send
    };
};
