/* superadmin
 */

module.exports = function(config, db) {
  'use strict';

  var q = require( "q" );

  var add = function( req, res ) {
      var orgId = req.params.orgId;
      var message = req.body.message;
      var seen = false;

      var model = {
          message: message,
          orgId: orgId,
          seen: seen
      };

      addToDb( model ).then( function( data ) {
          res.json( { status: "sucess", notification: data } );
      }, function( err ) {
          res.json( { status: "error", error: err } );
      } );
  };

  var list = function( req, res ) {
      var orgId = req.params.orgId;

      db.notifications.find( {
          orgId: orgId
      }, function( err, notifications )  {
          if ( err ) {
              res.json( { status: "error", error: err } );
              return;
          }
          res.json( { status: "success", notifications: notifications } );
      } );
  };

  var update = function( req, res ) {
    var orgId = req.params.orgId;
    var notificationId = req.params.id;

    db.notifications.update( {
        '_id': notificationId
    }, {
        $set: { seen: true }
    }, function ( err, num, newNotification ) {
        if ( err ) {
            res.json( { status: "error", error: err } );
            return;
        }
        res.json( { status: "success", num: num } );
    });
  };

  var getOne = function( req, res ) {
      var orgId = req.params.orgId;
      var notificationId = req.params.id;

      db.notifications.findOne( {
          _id: notificationId
      }, function( err, notification )  {
          if ( err ) {
              res.json( { status: "error", error: err } );
              return;
          }
          res.json( { status: "success", notification: notification } );
      } );
  };

  var remove = function( req, res ) {
      db.notifications.remove({
        _id: req.params.id
      }, function ( err, num ) {
          if ( err ) {
              res.json( { status: "error", error: err } );
              return;
          }
          res.json( { status: "success", num: num } );
      } );
  };

  // private functions
  var addToDb = function ( message ) {
      var deferred = q.defer();
      message.date = new Date();

      db.notifications.insert( message, function ( err, newMessage ) {

        if ( err ) {
          deferred.reject( err );
          return;
        }

        deferred.resolve( newMessage );
      });

      return deferred.promise;
  };

  return {
    add: add,
    list: list,
    update: update,
    getOne: getOne,
    remove: remove,
  };

};
