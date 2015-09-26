/* dashboard
 */

module.exports = function(config, db) {
  'use strict';

  var express = require('express');
  var request = require('superagent');
  var async = require('async');
  var fs = require('fs');
  var util = require('util');
  var passport = require('passport');
  var moment = require('moment');
  var bCrypt = require('bcrypt-nodejs');

  moment.defaultFormat = 'YYYY-MM-DD LT';
  moment.locale('ro');

  var validateEmail = function (email) {
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
  };

  var createHash = function(password){
    return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
  };

  var eventDeleteImage = function(req, res, next) {
    
    var eventId = req.params.eventId;
    var pictureIndex = req.params.pictureIndex;
    
    db.events.findOne({
      _id: eventId
    }).exec(function (err, event) {

      if(event.images && event.images.length) {
        event.images.splice(pictureIndex, 1);
      }
        
      db.events.update({
        '_id': eventId
      }, event, function (err, num, newEvent) {

        res.redirect('/dashboard/' + req.params.orgId + '/event/' + eventId);

      });

    });
    
  };

  var listEvents = function(req, res, next) {

    db.events.find({
      orgId: req.params.orgId
    }).sort({
      date: -1
    }).exec(function (err, events) {

      if(err) {
        return res.send(err, 400);
      }

      if (!events.length) {
        events = [];
      }

      res.json(events);

    });

  };

  var listEventsView = function (req, res, next) {
    
    if (!req.user) {
      res.redirect('/');
    }

    var user = req.user;
    user.validEmail = validateEmail(user.username);

    if (user.validEmail) {
      db.events.find({
        orgId: req.params.orgId
      }).sort({
        date: -1
      }).exec(function (err, events) {

        if(err) {
          return res.send(err, 400);
        }

        if (!events.length) {
          events = [];
        }

        res.render('events', {
          events: events,
          user: user,
          orgId: req.params.orgId
        });

      });
    } else {
      res.redirect('/dashboard')
    }
    
  };

  var frontEventView = function (req, res, next) {
    db.orgs.findOne({
      name: req.params.orgName
    }, function (err, org) {
      
      if (err) {
        res.send({ error: 'error'}, 400);
        return
      }

      if (!org) {
        res.redirect('/');
        return
      }

      db.events.findOne({
        _id: req.params.eventId
      }).exec(function (err, event) {
        
        if(err) {
          return res.send(err, 400);
        }

        res.render('event', {
          event: event,
          org: org
        });

      });
    })
  };

  var listFrontEventsView = function (req, res, next) {

      db.orgs.findOne({
        name: req.params.orgName
      }, function (err, org) {
        
        if (err) {
          res.send({ error: 'error'}, 400);
          return
        }

        if (!org) {
          res.redirect('/');
          return
        }

        db.events.find({
          orgId: org._id
        }).sort({
          date: -1
        }).exec(function (err, events) {

          if(err) {
            return res.send(err, 400);
          }

          if (!events.length) {
            events = [];
          }

          res.render('events-front', {
            events: events,
            org: org
          });

        });
      })
    
  };

  var redirectToEventsList = function (req, res, next) {

    db.orgs.findOne({'userId': req.user._id}, function (err, org) {
      
      if (!org) {
        res.send({error: 'error'}, 400);
      }
      
      if (org) {

        res.redirect('/dashboard/' + org._id + '/events');

      }

    });

  };

  var updateEventView = function (req, res, next) {

    var user = req.user;
    user.validEmail = validateEmail(user.username);

    if (req.params.eventId) {

      db.events.findOne({
        _id: req.params.eventId
      }).exec(function (err, theEvent) {

        if(err) {
          return res.render('event-update', {errors: err});
        }

        if (!theEvent) {
          theEvent = {};
        }

        res.render('event-update', {
          errors: [],
          theEvent: theEvent,
          orgId: req.params.orgId,
          user: user
        });

      });

    } else {

      res.render('event-update', {
        errors: [],
        theEvent: {
          date: moment().format(),
          user: req.user
        },
        user: user,
        orgId: req.params.orgId
      });

    }
    
  };

  var updateEvent = function (req, res, next) {

    req.checkBody('name', 'Event name should not be empty').notEmpty();
    req.checkBody('description', 'Event description should not be empty').notEmpty();
    req.checkBody('seats', 'Event seats should not be empty').notEmpty();
    req.checkBody('location', 'Event location should not be empty').notEmpty();

    var errors = req.validationErrors();
    var images = [];
    
    var name = (req.body.name) ? req.body.name.trim() : '';
    var description = (req.body.description) ? req.body.description.trim() : '';
    var eventId = (req.body._id) ? req.body._id.trim() : '';
    var seats = (req.body.seats) ? req.body.seats.trim() : '';
    var location = (req.body.location) ? req.body.location.trim() : '';
    var activeImage = parseInt(req.body.activeImage || 0);
    // var mclistid = req.body.mclistid.trim();
    var orgId = req.params.orgId;

    var theEvent = {
      name: name,
      description: description,
      _id: eventId || '',
      images: images,
      date: new Date(req.body.date),
      seats: seats,
      location: location,
      activeImage: activeImage,
      reservedSeats: 0,
      // mclistid: mclistid, // mailchimp list id
      orgId: orgId
    };
    
    // check if there's an image
    if (!req.files.images) {
            
      // for existing events,
      // if we don't add any new images, leave the old ones alone.
      if(req.body.existingImages) {

        theEvent.images = JSON.parse(req.body.existingImages);

        theEvent.images.forEach(function (image, i) {
          if (i === activeImage) {
            image.active = true;
          } else {
            image.active = false;
          }
        });

      } else {

        errors = errors || [];

        errors.push({
          msg: 'Please upload an event image'
        });  
        
      }

    } else if (!req.files.images.length) {

      images.push({
        path: '/media/' + req.files.images.originalname 
      });

    } else if (req.files.images.length) {

      req.files.images.forEach(function (image, i) {

        images.push({
          path: '/media/' + image.originalname
        });

      });

    }

    if (errors) {
      
      res.render('event-update', {
        theEvent: theEvent,
        orgId: orgId,
        errors: errors,
        user: req.user
      });

      return;

    }

    // check if email is valid
    var user = req.user;
    user.validEmail = validateEmail(user.username);

    if (user.validEmail) {
      
      if (eventId) {

        db.events.update({
          '_id': eventId
        }, theEvent, function (err, num, newEvent) {

          if (err) {
            res.render('event-update', {
              errors: err,
              theEvent: theEvent
            });
          }

          if (num > 0) {
            
            res.redirect('/dashboard');

          }


        });

      } else {

        db.events.insert(theEvent, function (err, newEvent) {

          if (err) {
            res.render('event-update', {errors: err});
          }

          res.redirect('/dashboard');

        });

      }
    
    } else {

      // change username, org name and password and after that save the event
      req.checkBody('username', 'Username should not be empty').notEmpty();
      req.checkBody('org_name', 'Organization name should not be empty').notEmpty();
      req.checkBody('password', 'Password should not be empty').notEmpty();
      
      if (errors) {
        
        res.render('event-update', {
          theEvent: theEvent,
          orgId: orgId,
          errors: errors,
          user: user
        });

        return;

      }

      var username = req.body.username;
      var orgName = req.body.org_name;
      var password = createHash(req.body.password);

      // TODO further validate email
      user.username = username;
      user.validEmail = validateEmail(username);

      var updateEvent = function (err, num) {
        if (err) {
         res.render('event-update', {errors: err, user: user, orgId: orgId});
        }

        res.redirect('/dashboard');
      };

      var updateOrg = function (err, num) {

        if (err) {
         res.render('event-update', {errors: err});
        }

        //find event by org id and update the event
        db.events.update({
          'orgId': orgId
        }, theEvent, updateEvent)

      };

      var updateUser = function (err, num) {
        
        if (err) {
         res.render('event-update', {errors: err});
        }

         //find org by user id and update org name
        db.orgs.update({
          'userId': user._id
        }, {$set: { name: orgName}}, updateOrg)

      };

      // find user by id than update the username
      db.users.update({
        '_id': user._id
      }, {$set: { username: user.username}}, updateUser);

    }

  };

  var redirectToEventUpdate = function (req, res, next) {

    var user = req.user;
    user.validEmail = validateEmail(user.username);

    db.orgs.findOne({'userId': req.user._id}, function (err, org) {
          
      if (!org) {
        res.send({error: 'error'}, 400);
      }
      
      if (org) {

        db.events.findOne({orgId: org._id}, function (err, ev) {

          if (!ev) {
            res.send({error: 'error'}, 400);
          }

          if (user.validEmail) {
            res.redirect('/dashboard/' + org._id + '/events/');
          } else {
            res.redirect('/dashboard/' + org._id + '/event/' + ev._id);
          }

        });
      }
    });
  };
  
  return {
    listEventsView: listEventsView,
    listEvents: listEvents,
    redirectToEventsList: redirectToEventsList,
    redirectToEventUpdate: redirectToEventUpdate,
    updateEventView: updateEventView,
    updateEvent: updateEvent,
    listFrontEventsView: listFrontEventsView,
    frontEventView: frontEventView,
    eventDeleteImage: eventDeleteImage
  };

};
