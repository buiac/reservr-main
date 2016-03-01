/* dashboard
 */

module.exports = function(config, db) {
  'use strict';

  var nodemailer = require('nodemailer');
  var smtpTransport = require('nodemailer-smtp-transport');
  var moment = require('moment');
  var mcapi = require('../../node_modules/mailchimp-api-wherewolf/mailchimp');
  var q = require('q');
  var data = require('../services/data.js')(config, db);
  var util = require('../services/util.js')(config, db);
  var marked = require('marked');
  var transport = nodemailer.createTransport(smtpTransport(config.mandrill));

  // configure moment
  moment.defaultFormat = 'YYYY-MM-DD LT';


  // create an object with all the mailchimp api keys
  var mc = {}

  var addUserToMailingList = function (opts) {

    if (!opts.apikey) {
      return;
    }

    if (!mc[opts.listId]) {
      mc[opts.listId] = new mcapi.Mailchimp(opts.apikey, true);  
    }

    var params = {
      update_existing: true,
      double_optin: false,
      send_welcome: false,
      id: opts.listId,
      email: {
        email: opts.email
      },
      merge_vars: {
        FNAME: opts.name.split(' ')[0] || '',
        LNAME: opts.name.split(' ')[1] || ''
      }
    };

    mc[opts.listId].lists.subscribe(params, function(data) {
      
      console.log('--------')
      console.log('mailchimp success')
      console.log(data);
      console.log('--------')

    }, function(err) {

      console.log('--------')
      console.log('mailchimp error')
      console.log(err);
      console.log('--------')      

    });
  };

  var notifyUser = function (reservation, event, partial) {
    // send waiting user a notification that a seat is available

    db.orgs.findOne({
      _id: event.orgId
    }, function (err, org) {
      
      db.users.findOne({
        _id: org.userId
      }, function (err, user) {

        var params = {
          seats: reservation.seats,
          eventName: event.name,
          eventDate: moment(event.date).format('dddd, Do MMMM YYYY, HH:mm'),
          seatsAvailable: reservation.seatsAvailable || '',
          deleteReservationLink: '<a style="color:red" href="http://reservr.net/r/' + reservation._id + '">Delete Reservation</a>'
        };

        var template = {
          subject: org.userUpdateSubject, //'Update rezervare'
          body: marked(org.userUpdateBody), //'Salut, <br /><br /> S-au eliberat {seats} locuri pentru evenimentul "{eventName}" de {eventDate} asa ca te-am mutat pe lista invitatilor. <br /><br /> Poti renunta oricand la rezervare dand click pe acest link: <a style="color:red" href="http://reservr.net/r/' + reservation._id + '">sterge rezervare</a> <br /><br /> O zi cat mai buna iti dorim.'
          bodyPartial: marked(org.userUpdateBodyPartial) // 'Salut, <br /><br /> S-au eliberat {seatsAvaialable} locuri pentru evenimentul "{eventName}" de {eventDate} asa ca te-am mutat pe lista invitatilor. <br /><br /> Stim ca doreai mai multe locuri :(. Daca se mai elibereaza vreunul te anuntam. <br /><br /> Poti renunta oricand la rezervare dand click pe acest link: <a style="color:red" href="http://reservr.net/r/' + reservation._id + '">sterge rezervare</a> <br /><br /> O zi cat mai buna iti dorim.',
        };

        var bodyPlaceholders = util.getWordsBetweenCurlies(template.body);
        var bodyPartialPlaceholders = util.getWordsBetweenCurlies(template.bodyPartial);

        bodyPlaceholders.forEach(function (item) {
          template.body = template.body.replace('{' + item + '}', params[item]);
        });

        bodyPartialPlaceholders.forEach(function (item) {
          template.bodyPartial = template.bodyPartial.replace('{' + item + '}', params[item]);
        });

        var userEmailConfig = {
          from: 'contact@reservr.net', // user.username
          to: reservation.email,
          subject: template.subject,
          html: template.body
        };

        if (partial) {
          userEmailConfig.html = template.bodyPartial;
        } 

        transport.sendMail(userEmailConfig, function (err, info) {
          console.log('notifyUser')
          console.log(err);
          console.log(info);
        });
      });
    });
  };

  var sendConfirmationEmails = function (reservation, event) {
    
    db.orgs.findOne({
      _id: event.orgId
    }, function (err, org) {
      
      db.users.findOne({
        _id: org.userId
      }, function (err, user) {

        // send confirmation to user
        var userEmail = reservation.email;

        var userParams = {
          seats: reservation.seats,
          eventName: event.name,
          eventDate: moment(event.date).format('dddd, Do MMMM YYYY, HH:mm'),
          deleteReservationLink: '<a style="color:red" href="http://reservr.net/r/' + reservation._id + '">Delete Reservation</a>'
        };

        var orgParams = {
          seats: reservation.seats,
          eventName: event.name,
          eventDate: moment(event.date).format('dddd, Do MMMM YYYY, HH:mm'),
          userName: reservation.name,
          userEmail: reservation.email
        }

        var template = {
          userSubject: org.userSubject, 
          userSubjectWaiting: org.userSubjectWaiting, 
          userBody: marked(org.userBody), 
          userBodyWaiting: marked(org.userBodyWaiting), 
          orgSubject: org.orgSubject,
          orgBody: marked(org.orgBody)
        };

        var userPlaceholders = util.getWordsBetweenCurlies(template.userBody);
        var userWaitingPlaceholders = util.getWordsBetweenCurlies(template.userBodyWaiting);
        var orgPlaceholders = util.getWordsBetweenCurlies(template.orgBody);
        var orgSubjectPlacholders = util.getWordsBetweenCurlies(template.orgSubject);

        userPlaceholders.forEach(function (item) {
          template.userBody = template.userBody.replace('{' + item + '}', userParams[item]);
        });

        userWaitingPlaceholders.forEach(function (item) {
          template.userBodyWaiting = template.userBodyWaiting.replace('{' + item + '}', userParams[item]);
        });

        orgPlaceholders.forEach(function (item) {
          template.orgBody = template.orgBody.replace('{' + item + '}', orgParams[item]);
        });

        orgSubjectPlacholders.forEach(function (item) {
          template.orgSubject = template.orgSubject.replace('{' + item + '}', orgParams[item]);
        });

        
        var userEmailConfig = {
          from: 'contact@reservr.net',
          to: reservation.email,
          subject: template.userSubject,
          html: template.userBody
        };

        var userWaitingEmailConfig = {
          from: 'contact@reservr.net',
          to: reservation.email,
          subject: template.userSubjectWaiting,
          html: template.userBodyWaiting
        };

        var orgEmailConfig = {
          from: 'contact@reservr.net',
          to: org.confirmationEmail,
          subject: template.orgSubject,
          html: template.orgBody
        };

        if (reservation.waiting) {
          transport.sendMail(userWaitingEmailConfig, function (err, info) {
            
            console.log(err);
            console.log(info);
          });
        } else {
          transport.sendMail(userEmailConfig, function (err, info) {
            
            console.log(err);
            console.log(info);
          });
        }

        if (org.notifications) {
          transport.sendMail(orgEmailConfig, function (err, info) {
            
            console.log(err);
            console.log(info);
          });  
        }

      });

    });
  };

  var distributeWaitingList = function (orgId, eventId, seats) {
    
    db.orgs.findOne({
      _id: orgId
    }, function (err, org) {

      db.events.findOne({
        _id: eventId
      }, function (err, event) {

        db.reservations.find({
          eventId: event._id,
          waiting: true
        }).sort({
          timestamp: 1
        }).exec(function (err, reservations) {

          // loop throgh the waiting reservations until you 
          // remain out of seats
          reservations.some(function (reserv) {
            
            if (seats >= reserv.seats) {

              // number of free seats is greater than the number of needed
              // by next on the waiting list

              // update the number of seats so we can continue the countdown
              seats = parseInt(seats, 10) - parseInt(reserv.seats, 10);

              db.reservations.update({
                _id: reserv._id
              }, {
                $set: {
                  waiting: false
                }
              }, function (err, num) {
                
                if (!err) {
                  notifyUser(reserv, event, false)
                }

                mergeReservations(event._id)

              });

              // we return false so the loop continues until all free seats are distributed
              return false;

            } else if ((seats !== 0) && (seats < reserv.seats)) {
              
              // number of seats available is less than the number of needed
              // by next on the waiting list

              // create a new reservation object model by cloning the
              // the next Waiting reservation
              var clonedReserv = JSON.parse(JSON.stringify(reserv));

              // delete it's ID so we can later insert it
              delete clonedReserv._id;

              // put the reservation on the Invited list
              clonedReserv.waiting = false;

              db.reservations.findOne({
                email: clonedReserv.email,
                eventId: eventId,
                waiting: false
              }, function (err, reservation) {
                
                if (reservation) {
                  db.reservations.update({
                    _id: reservation._id    
                  },{
                    $set: {
                      seats: reservation.seats + seats
                    }
                  })

                } else {

                  // // add the available seats to the cloned model
                  clonedReserv.seats = seats;
                  
                  // // insert the model into the database
                  db.reservations.insert(clonedReserv);

                }
              })

              // update the waiting reservation's seat number 
              // by subtracting the seats that have been redistributed
              db.reservations.update({
                _id: reserv._id
              }, {
                $set: {
                  seats: reserv.seats - seats
                }
              }, function (err, num) {
                
                // add the number of seats that have been attributed to
                // the waiting user so it can be used in the 
                // email message that is sent to notify her
                reserv.seatsAvailable = seats;

                // send the message setting the partial parameter to 'true'
                // this will change the template of the message
                notifyUser(reserv, event, true)

                mergeReservations(event._id)

              });

              return true;

            }

          });        
          
        });
      });
    });
  };

  var deleteReservation = function (req, res, next) {

    db.reservations.findOne({
      _id: req.params.reservationId
    }, function (err, rez) {

      if (!rez) {
        res.redirect('/');
        return;
      }
      
      db.reservations.remove({
        _id: req.params.reservationId
      }, function (err, num) {

        if (!rez.waiting) {
          distributeWaitingList(rez.orgId, rez.eventId, rez.seats)  
        }
        

        db.orgs.findOne({
          _id: rez.orgId
        }, function (err, org) {
          
          db.events.findOne({
            _id: rez.eventId
          }, function (err, event) {
            
            if (req.user) {
              
              res.redirect('/dashboard/' + org._id + '/reservations/' + event._id);
            
            } else {

              res.render('frontend/user-reservation-deleted',{
                org: org,
                event: event
              });
            
            }

          })
        })

      });
    });
  };

  var viewReservations = function (req, res, next) {

    db.reservations.find({
      eventId: req.params.eventId
    }).sort({
      timestamp: 1
    })
    .exec( function (err, reservations) {

      if (err) {
        res.status(400).json(err);
        return;
      }

      data.getOrgEvents({
        orgId: req.params.orgId,
        fromDate: new Date()
      }).then(function (events) {

        db.orgs.findOne({
          _id: req.params.orgId
        }, function (err, org) {
          db.events.findOne({
            _id: req.params.eventId
          }, function (err, event) {

            res.render('backend/reservations-view',{
              org: org,
              orgId: req.params.orgId,
              user: req.user,
              reservations: reservations,
              eventId: req.params.eventId,
              events: events,
              event: event
            });
          })
        });
      });
    });
  };

  var updateReservationTmp = function (req, res, next) {
    
    req.checkBody('name', 'Please add your name.').notEmpty();
    req.checkBody('email', 'Please add your email address.').notEmpty();
    req.checkBody('seats', 'Please select number of seats.').notEmpty();

    var errors = req.validationErrors();

    if (errors) {
      res.status(400).json(errors);
      return;
    }

    var reservation = {
      name: req.body.name.trim(),
      email: req.body.email.trim(),
      seats: parseInt(req.body.seats, 10),
      eventId: req.params.eventId,
      orgId: req.params.orgId,
      mclistid: req.body.mclistid,
      waiting: false
    };

    data.getOrgEvents({
      orgId: req.params.orgId,
      fromDate: new Date()
    }).then(function (events) {

      var event = events.filter(function (item) {
        return item._id === req.params.eventId
      })

      event = event[0]
      
      db.reservations.update({
        email: req.body.email.trim()
      }, {
        $set: reservation
      }, {
        upsert: true
      }, function (err, numReplaced, upsert) {

        res.json({
          reservation: reservation,
          message: '',
          event: event
        })
      })
    });
  }

  var updateReservation = function (req, res, next) {
    
    var email = req.body.email;
    var seats = parseInt(req.body.seats);
    var mclistid = req.body.mclistid
    var eventId = req.params.eventId
    var orgId = req.params.orgId


    // get number of seats this event has
    db.events.findOne({
      _id: eventId
    }, function (err, event) {
      
      var totalSeats = event.seats

      // get the total reservations
      data.getEventReservationsTotal({
        eventId: eventId
      }).then(function (totalReservations) {
        
        // does this person have a  reservation already?
        db.reservations.find({
          email: email,
          eventId: eventId
        }, function (err, prevReservations) {
          
          var prevReservation;

          if (prevReservations.length > 1) {
            prevReservations.forEach(function (prevRez) {
              if (!prevRez.waiting) {
                prevReservation = prevRez
              }
            })
          } else {

            prevReservation = prevReservations[0]

          }

          // send an error message if user has a previous reservation, is not waiting
          // and he wants to update to a greater number of seats

          var seatsLeft = totalSeats - totalReservations;

          var newReservation = {
            name: req.body.name,
            email: email,
            seats: seats,
            timestamp: req.body.timestamp,
            eventId: eventId,
            orgId: orgId,
            waiting: false
          }

          if (prevReservation) {

            // has a previous reservation and is not on the waiting list
            if (!prevReservation.waiting) {
              
              // is the user downgrading?
              if (newReservation.seats < prevReservation.seats) {

                db.reservations.update({
                  _id: prevReservation._id,
                  email: email,
                  eventId: eventId
                }, {
                  $set:{
                    seats: seats
                  }
                }, function (err, num) {

                  db.mcapikeys.findOne({
                    orgId: orgId
                  }, function (err, key) {

                    if (key) {
                      addUserToMailingList({
                        email:email, 
                        name: req.body.name,
                        listId: mclistid,
                        apikey: key.key
                      })
                    }
            
                  })

                  data.getEventReservationsByType({
                    eventId: event._id
                  }).then(function (reservationsByType) {

                    // update the event with invited and waiting seats
                    event.invited = reservationsByType.invited
                    event.waiting = reservationsByType.waiting

                    // distribute waiting list
                    var seats = prevReservation.seats - newReservation.seats;
                    distributeWaitingList(orgId, event._id, seats)

                    res.json({
                      message: 'Update successful.',
                      reservation: newReservation,
                      event: event
                    })
                  })
                })
                return;
              }

              // are there enough seats left?
              if(seatsLeft > 0 && seats <= seatsLeft) {

                db.reservations.update({
                  email: email,
                  eventId: eventId,
                  _id: prevReservation._id
                }, {
                  $set:{
                    seats: seats
                  }
                }, function (err, num) {

                  db.mcapikeys.findOne({
                    orgId: orgId
                  }, function (err, key) {

                    if (key) {
                      addUserToMailingList({
                        email:email, 
                        name: req.body.name,
                        listId: mclistid,
                        apikey: key.key
                      })
                    }
                    
                  })

                  data.getEventReservationsByType({
                    eventId: event._id
                  }).then(function (reservationsByType) {

                    // update the event with invited and waiting seats
                    event.invited = reservationsByType.invited
                    event.waiting = reservationsByType.waiting
              
                    res.json({
                      message: 'Update successful.',
                      reservation: newReservation,
                      event: event
                    })

                  })
                  
                })
                return;

              }

              // not waiting but wants more seats than available
              res.status(400).json({
                message: 'You already have a reservation for ' + prevReservation.seats + ' seats. Since there are no more seats left you can only downgrade. \n\n Use a different email address if you want to get on the Waiting list',
                resCode: 1,
                reservation: newReservation,
                event: event
              });
              return;

            }

            // reservation is waiting
            db.reservations.update({
              email: email,
              eventId: eventId,
              _id: prevReservation._id
            }, {
              $set:{
                seats: seats
              }
            }, function (err, num) {

              db.mcapikeys.findOne({
                orgId: orgId
              }, function (err, key) {

                if (key) {
                  addUserToMailingList({
                    email:email, 
                    name: req.body.name,
                    listId: mclistid,
                    apikey: key.key
                  })
                }

              })
              
              res.json({
                message: 'Update successful.',
                reservation: newReservation,
                event: event
              })
              

            })
            return;
          }

          // are there any seats left?
          if (seatsLeft <= 0) {
            newReservation.waiting = true;
          }

          db.reservations.insert(newReservation, function (err, reservation) {

            // send a confirmation email
            sendConfirmationEmails(reservation, event);

            db.mcapikeys.findOne({
              orgId: orgId
            }, function (err, key) {

              if (key) {
                addUserToMailingList({
                  email:email, 
                  name: req.body.name,
                  listId: mclistid,
                  apikey: key.key
                })
              }
              
            })

            data.getEventReservationsByType({
              eventId: event._id
            }).then(function (reservationsByType) {
              
              // update the event with invited and waiting seats
              event.invited = reservationsByType.invited
              event.waiting = reservationsByType.waiting

              res.json({
                message: 'Create successful.',
                reservation: newReservation,
                event: event
              })
              return;
            })
          })
        })
      })
    })
  };

  var userReservationsView = function (req, res, next) {

    db.reservations.findOne({
      _id: req.params.reservationId
    }, function (err, reservation) {
      
      if (!reservation) {
        res.redirect('/')
        return;
      }

      db.events.findOne({
        _id: reservation.eventId
      }, function (err, event) {
        
        db.orgs.findOne({
          _id: event.orgId
        }, function (err, org) {
          res.render('frontend/user-reservations',{
            reservation: reservation,
            event: event,
            org: org
          });
        });
      })
    });
  };

  // updates the number of seats in reservations view (admin and user)
  var updateReservationJSON = function (req, res, next) {

    var requestedSeats = parseInt(req.body.seats)

    if (typeof requestedSeats !== 'number' || isNaN(requestedSeats)) {
      res.status(400).json({
        message: 'You must enter a number of seats.'
      });
      return;
    }

    if (requestedSeats < 1) {
      res.status(400).json({
        message: 'You must enter a number of seats equal or larger than 1.'
      });
      return;
    }

    db.reservations.findOne({
      _id: req.params.reservationId
    }, function (err, reservation) {

      var currentSeats = reservation.seats;

      if (reservation.waiting) {

        if (requestedSeats > 8) {
          res.status(400).json({
            message: 'We are sorry but you cannot reserv more than 8 seats.'
          });
          return;
        }

        db.reservations.update({
          _id: reservation._id
        }, {
          $set: {
            seats: requestedSeats
          }
        }, function (err, num) {
          
          res.json({
            message: 'Your seats have been successfully updated.'
          });

          return;

        })
      }

      data.getAvailableSeats({
        eventId: reservation.eventId
      }).then(function (availableSeats) {


        // update the number of seats only if the requested seats is less than the current seats
        // or if the number of requested seats is less or equal to the number of available seats
        if ((requestedSeats - currentSeats) > 0 && availableSeats <= 0) {
          res.status(400).json({
            message: 'We are sorry but there are no more available seats.'
          });
          return;
        }

        if ((requestedSeats - currentSeats) > availableSeats) {
          res.status(400).json({
            message: 'We are sorry but there are only ' + availableSeats + ' available seats.'
          });
          return;
        }


        if (requestedSeats > 8) {
          res.status(400).json({
            message: 'We are sorry but you cannot reserv more than 8 seats.'
          });
          return;
        }


        db.reservations.update({
          _id: reservation._id
        }, {
          $set: {
            seats: requestedSeats
          }
        }, function (err, num) {

          if (currentSeats > requestedSeats) {
            distributeWaitingList(reservation.orgId, reservation.eventId, currentSeats - requestedSeats)
          }
          
          res.json({
            message: 'Your seats have been successfully updated.'
          });
          return;

        })
      })
    })
  };

  return {
    updateReservation: updateReservation,
    viewReservations: viewReservations,
    deleteReservation: deleteReservation,
    userReservationsView: userReservationsView,
    updateReservationTmp: updateReservationTmp,
    updateReservationJSON: updateReservationJSON
  };

};
