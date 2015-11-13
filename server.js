#!/bin/env node
/* server
 */

module.exports = (function() {
  'use strict';

  var express = require('express');
  var expressSession = require('express-session');

  // validation library for whatever comes in through the forms
  var expressValidator = require('express-validator');

  //var async = require('async');
  var fs = require('fs');

  var sugar = require('sugar');

  var bodyParser = require('body-parser');
  var errorhandler = require('errorhandler');
  var flash = require('connect-flash');
  var passport = require('passport');
  var LocalStrategy = require('passport-local').Strategy;
  var multer = require('multer');
  var moment = require('moment');
  var marked = require('marked');

  var app = express();
  
  app.use(expressSession({
    secret: 'mySecretKey',
    saveUninitialized: true,
    resave: true       
  }));

  app.use(flash());
  app.use(passport.initialize());
  app.use(passport.session());

  // configs
  var config = require('./config/config.js');

  // Chekcs if user is authenticated
  var isAuthenticated = function (req,res,next){
    
    if (req.hostname === 'localhost') { //
      db.users.findOne({
        username: 'sebi.kovacs@gmail.com'
      }, function (err, user) {

        req.user = user;
        return next()
        
      })

    } else {

      if (req.isAuthenticated()){
        return next();
      } else {
        res.redirect("/signin"); 
      }
    }

  };



  // config express
  app.use(bodyParser.json({
    limit: '50mb'
  }));

  app.use(bodyParser.urlencoded({
    limit: '50mb',
    extended: true
  }));

  // globals in templates
  app.use(function(req, res, next){
    res.locals.moment = moment;
    res.locals.marked = marked;
    res.locals.JSON = JSON;
    next();
  });

  // config file uploads folder
  app.use(multer({
    dest: config.dataDir + config.publicDir + '/media',
    rename: function (fieldname, filename) {
      return filename;
    },
    onFileUploadStart: function (file) {
        console.log(file.originalname + ' is starting ...');
    }
  }));

  app.use(expressValidator());

  app.set('views', __dirname + '/app/views');
  app.set('view engine', 'ejs');

  app.use(express.static(__dirname + config.publicDir));
  app.use(express.static(config.dataDir + config.publicDir));

  app.use(errorhandler());

  // allow self-signed ssl
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  // CORS headers
  app.all('*', function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');

    next();
  });

  // datastore
  var Datastore = require('nedb');
  var db = {};


  db.events = new Datastore({
    filename: config.dataDir + config.dbDir + '/events.db',
    autoload: true
  });

  db.users = new Datastore({
    filename: config.dataDir + config.dbDir + '/users.db',
    autoload: true
  });

  db.orgs = new Datastore({
    filename: config.dataDir + config.dbDir + '/orgs.db',
    autoload: true
  });

  db.reservations = new Datastore({
    filename: config.dataDir + config.dbDir + '/reservations.db',
    autoload: true
  });


  // events
  var events = require('./app/controllers/events.js')(config, db);
  var users = require('./app/controllers/users.js')(config, db);
  var reservations = require('./app/controllers/reservations.js')(config, db);
  var settings = require('./app/controllers/settings.js')(config, db);

  // Backend routes
  // events
  app.get('/dashboard', isAuthenticated, events.redirectToEventUpdate);
  app.get('/dashboard/:orgId/events', isAuthenticated, events.listEventsView);
  app.get('/dashboard/:orgId/event/:eventId', isAuthenticated, events.updateEventView);
  app.get('/dashboard/:orgId/event', isAuthenticated, events.updateEventView);
  app.post('/dashboard/:orgId/event', isAuthenticated, events.updateEvent);
  app.get('/dashboard/:orgId/event/:eventId/deleteimage/:pictureIndex', isAuthenticated, events.eventDeleteImage);
  app.get('/dashboard/:orgId/delete-event/:eventId', isAuthenticated, events.deleteEvent);

  // settings
  app.get('/dashboard/:orgId/settings', isAuthenticated, settings.viewSettings);
  app.post('/dashboard/:orgId/settings', isAuthenticated, settings.updateSettings);
  app.get('/dashboard/delete-account/:userId', isAuthenticated, settings.deleteAccount);
  
  // reservations  
  app.get('/dashboard/:orgId/reservations/:eventId', isAuthenticated, reservations.viewReservation);
  app.get('/dashboard/:orgId/event/:eventId/delete/:reservationId', isAuthenticated, reservations.deleteReservation);

  
  /* Front-end routes
  */

  // homepage
  app.post('/tempEvent', events.updateTempEvent);

  // temoporary event
  app.get('/t/:orgId/event/:eventId', events.tempFrontEventView);

  // update user
  app.post('/updateUser', users.updateUser);

  // events
  app.get('/u/:orgName', events.listFrontEventsView);
  app.get('/u/:orgName/event/:eventId', events.frontEventView);

  // reservations
  app.post('/u/:orgId/reservations/:eventId', reservations.updateReservation);

  // user reservations management
  app.get('/r/:reservationId', reservations.userReservationsView);
  app.get('/u/delete-reservation/:reservationId', isAuthenticated, reservations.deleteReservation);
  app.get('/r/delete-reservation/:reservationId', reservations.deleteReservation);
  app.get('/r/deleted-reservation', reservations.userReservationsDeleteView);  

  
  /* Auth routes
  */

  var auth = require('./app/controllers/authenticate.js')(config, db);

  
  
  app.post('/createTempUser', auth.createTempUser);

  app.get('/signin', auth.signinView);
  app.post('/signin', auth.signin);

  app.get('/signup', auth.signupView);

  // Logout
  app.get('/dashboard/signout', function(req, res) {
    req.logout();
    res.redirect('/signin');
  });

  // API routes
  app.get('/api/1/events/:orgId', events.listEvents);

  // start express server
  app.listen(config.port, config.ipAddress, function() {
    console.log(
      '%s: Node server started on %s:%d ...',
      Date(Date.now()),
      config.ipAddress,
      config.port
    );
  });

  return app;

}());
