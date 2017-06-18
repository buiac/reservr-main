/* dashboard
 */
module.exports = function( config, db ) {
    "use strict";

    var spaDashboard = function( req, res, next ) {
        res.render( "backend/dashboard" );
    };

    var events = function( req, res, next ) {
        db.orgs.findOne( {
            userId: req.user._id
        }, function( err, org ) {
            sendErrors( err );

            db.events.find( {
                orgId: org._id
            }, function( err, events ) {
                sendErrors( err );
                res.send( events );
            } );
        } );
    };

    // helpers
    var sendErrors = function( err ) {
        if ( err ) {
            res.status( 500 ).send( err );
        }
    };

    return {
        spaDashboard: spaDashboard,
        events: events
    };
};
