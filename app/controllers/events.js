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
  var q = require('q');
  var data = require('../services/data.js')(config, db);

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

  var deleteEvent = function (req, res, next) {
    
    // delete event from db
    db.events.remove({
      _id: req.params.eventId
    }, function (err, num) {
      
      res.redirect('/dashboard');

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

  // list events in dashboard
  var listEventsView = function (req, res, next) {
    
    if (!req.user) {
      res.redirect('/');
    }

    var user = req.user;
    user.validEmail = validateEmail(user.username);

    if (user.validEmail) {

      data.getOrgEvents({
        orgId: req.params.orgId
      }).then(function (events) {
        
        var arr = [];
        
        events.forEach(function (event) {
          arr.push(data.getEventReservations({
            eventId: event._id
          }));
        });

        q.all(arr).then(function (rez) {
          
          var reservations = [].concat.apply([], rez);

          events.forEach(function (event) {
            
            event.invited = 0;
            event.waiting = 0;

            reservations.forEach(function (reservation) {
              
              if (reservation.eventId === event._id) {

                if (reservation.waiting) {

                  event.waiting = event.waiting + reservation.seats;

                } else {

                  event.invited = event.invited + reservation.seats

                }
              }

            });

          });

          db.orgs.findOne({
            _id: req.params.orgId
          }, function (err, org) {

            res.render('events', {
              events: events,
              user: user,
              orgId: org._id,
              org: org
            });

          });

        });

      });

    } else {
      res.redirect('/dashboard')
    }
    
  };

  // one event in front end
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

        event.waiting = 0;
        event.invited = 0;

        db.reservations.find({
          eventId: event._id
        }, function (err, reservations) {

          if(err) {
            return res.send(err, 400);
          }
          
          reservations.forEach(function (reservation) {
            if (reservation.waiting) {

              event.waiting = event.waiting + reservation.seats;

            } else {

              event.invited = event.invited + reservation.seats

            }

          });

          res.render('event', {
            event: event,
            org: org
          }); 
        });
      });
    })
  };


  var listFrontEventsView = function (req, res, next) {

    data.getOrgByName({
      name: req.params.orgName
    }).then(function (org) {
      // body... 

      data.getOrgEvents({
        orgId: org._id,
        fromDate: new Date() // render events starting from now
      }).then(function (events) {
        
        var arr = [];
        
        events.forEach(function (event) {
          arr.push(data.getEventReservations({
            eventId: event._id
          }));
        });

        q.all(arr).then(function (rez) {

          // get all reservations
          var reservations = [].concat.apply([], rez);
          
          events.forEach(function (event) {
            
            event.invited = 0;
            event.waiting = 0;

            reservations.forEach(function (reservation) {
              
              if (reservation.eventId === event._id) {

                if (reservation.waiting) {

                  event.waiting = event.waiting + reservation.seats;

                } else {

                  event.invited = event.invited + reservation.seats

                }
              }

            });

          });

          res.render('events-front', {
            events: events,
            org: org
          });
        });
      });
    }).catch(function (err) {
      
      res.redirect('/');

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

    db.events.find({
        orgId: req.params.orgId
    }, function (err, events) {

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

          db.orgs.findOne({ _id: req.params.orgId}, function (err, org) {
            
            if(err) {
              return res.render('event-update', {errors: err});
            }

            res.render('event-update', {
              errors: [],
              events: events,
              theEvent: theEvent,
              orgId: req.params.orgId,
              org: org,
              user: user
            });

          })

        });

      } else {

        db.orgs.findOne({ _id: req.params.orgId}, function (err, org) {
          
          if(err) {
            return res.render('event-update', {errors: err});
          }

          res.render('event-update', {
            errors: [],
            theEvent: {
              date: moment().format(),
              user: req.user
            },
            events: events,
            user: user,
            orgId: req.params.orgId,
            org: org
          });

        });

      }

    });
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
    var mclistid = req.body.mclistid || '';

    var orgId = req.params.orgId;

    var theEvent = {
      name: name,
      description: description,
      images: images,
      date: new Date(req.body.date),
      seats: seats,
      location: location,
      activeImage: activeImage,
      // mclistid: mclistid, // mailchimp list id
      orgId: orgId
    };

    if (mclistid) {
      theEvent.mclistid = mclistid.trim();
    }

    if (eventId !== '') {
      theEvent._id = eventId;
    }
    
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

        db.events.findOne({_id: eventId}, function (err, event) {
          if (err) {
            res.render('event-update', {
              errors: err,
              theEvent: theEvent
            });
          }

          theEvent.reservedSeats = event.reservedSeats;

          db.events.update({
            _id: eventId
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

        });        

      } else {
        theEvent.reservedSeats = 0;

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

          // if (!ev) {
          //   res.send({error: 'error'}, 400);
          //   return;
          // }

          if (user.validEmail) {
            res.redirect('/dashboard/' + org._id + '/events/');
          } else {
            res.redirect('/dashboard/' + org._id + '/event/' + ev._id);
          }

        });
      }
    });
  };

  var updateTempEvent = function (req, res, next) {

    var event = req.body.event

    // convert strings to booleans
    if (typeof event.published === 'string') {
      event.published = (event.published === 'true')
    }
    
    if (typeof event.temp === 'string') {
      event.temp = (event.temp === 'true')
    }
    
    if (!event._id) {
      // this is a new event so we need to create a user and an org
      db.users.insert({
        timecreated: new Date(),
        username: 'guest-' + new Date().getTime(),
        password: '',
        validEmail:false
      }, function (err, user) {

        // TODO error handling
        
        db.orgs.insert({
          name: 'guest-' + new Date().getTime(),
          userId: user._id,
          logo: '/media/event-image-placeholder.jpg',
          mailchimp: [],
          confirmationEmail: 'contact@reservr.net'
        }, function (err, org) {

          // TODO error handling

          db.events.insert(event, function (err, event) {

            // TODO error handling
            
            res.json({
              userId: user._id,
              orgId: org._id,
              event: event
            })
          })
        })
      })

    } else {
      // the event has already been saved at least once

      db.orgs.findOne({
        _id: event.orgId
      }, function (err, org) {

        // TODO error handling
        
        db.users.findOne({
          _id: org.userId
        }, function (err, user) {
          
          // TODO error handling

          db.events.update({
            _id: event._id
          }, event, function (err, num) {

            // TODO error handling
            
            db.events.findOne({
              _id: event._id
            }, function (err, theEvent) {

              // TODO error handling

              res.json({
                userId: user._id,
                orgId: org._id,
                event: theEvent
              })
            })
          })
        })
      })
    }
  };

  var tempFrontEventView = function (req, res, next) {
    
    db.orgs.findOne({
      _id: req.params.orgId
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

        event.waiting = 0;
        event.invited = 0;

        db.reservations.find({
          eventId: event._id
        }, function (err, reservations) {

          if(err) {
            return res.send(err, 400);
          }
          
          reservations.forEach(function (reservation) {

            if (reservation.waiting) {

              event.waiting = event.waiting + reservation.seats;

            } else {

              event.invited = event.invited + reservation.seats

            }

          });

          console.log('\n\n\n\n')
          console.log('--------')
          console.log(err, event)
          console.log('--------')
          console.log('\n\n\n\n')

          res.render('event', {
            event: event,
            org: org
          }); 
        });
      });
    })
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
    eventDeleteImage: eventDeleteImage,
    deleteEvent: deleteEvent,
    updateTempEvent: updateTempEvent,
    tempFrontEventView: tempFrontEventView
  };

};
