/* dashboard
 */

module.exports = function(config, db) {
  'use strict';

  var express = require('express');
  var request = require('superagent');
  var async = require('async');
  var fs = require('fs');
  var passport = require('passport');
  var nodemailer = require('nodemailer');
  var smtpTransport = require('nodemailer-smtp-transport');
  var moment = require('moment');
  var mcapi = require('../../node_modules/mailchimp-api/mailchimp');
  var mc = new mcapi.Mailchimp(config.mailchimp.apikey);
  var q = require('q');
  var data = require('../services/data.js')(config, db);
  var marked = require('marked');

  var addUserToMailingList = function (reservation) {
    var params = {
      update_existing: true,
      double_optin: false,
      send_welcome: false,
      id: reservation.mclistid,
      email: {
        email: reservation.email
      },
      merge_vars: {
        FNAME: reservation.name.split(' ')[0] || '',
        LNAME:  reservation.name.split(' ')[1] || '' 
      }
    };

    mc.lists.subscribe(params, function(data) {
      console.log('\n\n\n\n')
      console.log('--------')
      console.log('mailchimp success')
      console.log('--------')
      console.log('\n\n\n\n')
      console.log(data);

    }, function(err) {

      console.log('\n\n\n\n')
      console.log('--------')
      console.log('mailchimp error')
      console.log('--------')
      console.log('\n\n\n\n')
      console.log(err);

    });
  };

  // configure moment
  moment.defaultFormat = 'YYYY-MM-DD LT';

  var transport = nodemailer.createTransport(smtpTransport(config.mandrill));

  var getWordsBetweenCurlies = function (str) {
    var results = []
    var re = /{([^}]+)}/g
    var text = re.exec(str)
    while (text) {
      results.push(text[1])
      text = re.exec(str)
    }
    return results
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
          seatsAvaialable: reservation.seatsAvaialable || ''
        };

        var template = {
          subject: org.userUpdateSubject, //'Update rezervare'
          body: marked(org.userUpdateBody), //'Salut, <br /><br /> S-au eliberat {seats} locuri pentru evenimentul "{eventName}" de {eventDate} asa ca te-am mutat pe lista invitatilor. <br /><br /> Poti renunta oricand la rezervare dand click pe acest link: <a style="color:red" href="http://reservr.net/r/' + reservation._id + '">sterge rezervare</a> <br /><br /> O zi cat mai buna iti dorim.'
          bodyPartial: marked(org.userUpdateBodyPartial) // 'Salut, <br /><br /> S-au eliberat {seatsAvaialable} locuri pentru evenimentul "{eventName}" de {eventDate} asa ca te-am mutat pe lista invitatilor. <br /><br /> Stim ca doreai mai multe locuri :(. Daca se mai elibereaza vreunul te anuntam. <br /><br /> Poti renunta oricand la rezervare dand click pe acest link: <a style="color:red" href="http://reservr.net/r/' + reservation._id + '">sterge rezervare</a> <br /><br /> O zi cat mai buna iti dorim.',
        };

        var bodyPlaceholders = getWordsBetweenCurlies(template.body);
        var bodyPartialPlaceholders = getWordsBetweenCurlies(template.bodyPartial);

        bodyPlaceholders.forEach(function (item) {
          template.body = template.body.replace('{' + item + '}', params[item]);
        });

        bodyPartialPlaceholders.forEach(function (item) {
          template.bodyPartial = template.bodyPartial.replace('{' + item + '}', params[item]);
        });

        if (partial) {
          
          var userEmailConfig = {
            from: 'contact@reservr.net', // user.username
            to: reservation.email,
            subject: template.subject,
            html: template.bodyPartial
          };

          transport.sendMail(userEmailConfig, function (err, info) {
            console.log('notifyUser')
            console.log(err);
            console.log(info);
          });

        } else {

          var userEmailConfig = {
            from: 'contact@reservr.net', // user.username
            to: reservation.email,
            subject: template.subject,
            html: template.body
          };

          transport.sendMail(userEmailConfig, function (err, info) {
            console.log('notifyUser')
            console.log(err);
            console.log(info);
          });

        }

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
          userSubject: org.userSubject, // 'Rezervarea a fost facuta'
          userSubjectWaiting: org.userSubjectWaiting, // 'Ai fost inclus pe lista de asteptare'
          userBody: marked(org.userBody), // 'Salut, <br /><br /> Ai facut o rezervare de {seats} locuri pentru evenimentul "{eventName}" de {eventDate}. <br /><br /> Poti renunta oricand la rezervare dand click pe acest link: <a style="color:red" href="http://reservr.net/r/' + reservation._id + '">sterge rezervare</a> <br /><br /> O zi cat mai buna iti dorim.'
          userBodyWaiting: marked(org.userBodyWaiting), // 'Salut, <br /><br /> Ai fost inclus pe lista de asteptare pentru {seats} locuri la evenimentul "{eventName}" de {eventDate}. <br /><br /> Daca se elibereaza un loc te vom contacta. <br /><br /> Poti renunta oricand la rezervare dand click pe acest link: <a style="color:red" href="http://reservr.net/r/' + reservation._id + '">sterge rezervare</a> <br /> <br /> O zi cat mai buna iti dorim.'
          orgSubject: org.orgSubject,
          orgBody: marked(org.orgBody)
        };

        var userPlaceholders = getWordsBetweenCurlies(template.userBody);
        var userWaitingPlaceholders = getWordsBetweenCurlies(template.userBodyWaiting);
        var orgPlaceholders = getWordsBetweenCurlies(template.orgBody);
        var orgSubjectPlacholders = getWordsBetweenCurlies(template.orgSubject);

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
            console.log('sendConfirmationEmails 1')
            console.log(err);
            console.log(info);
          });
        } else {
          transport.sendMail(userEmailConfig, function (err, info) {
            console.log('sendConfirmationEmails 2')
            console.log(err);
            console.log(info);
          });
        }

        if (org.notifications) {
          transport.sendMail(orgEmailConfig, function (err, info) {
            console.log('sendConfirmationEmails 3')
            console.log(err);
            console.log(info);
          });  
        }

      });

    });
  };

  var distributeWaitingList = function (event) {
    db.reservations.find({
      eventId: event._id
    }, function (err, reservations) {

      var seatsTaken = 0;
      var waiting = []
      
      // how many seats are left
      reservations.forEach(function (reservation) {

        if (reservation.waiting) {
          waiting.push(reservation)
        } else {
          seatsTaken = seatsTaken + reservation.seats
        }

      });
      
      var seatsLeft = parseInt(event.seats, 10) - parseInt(seatsTaken, 10);
      var i = 0;

      while (seatsLeft > 0) {
        
        var nextReservation = waiting[i];

        if (seatsLeft >= nextReservation.seats) {

          // update the reservations seats 
          db.reservations.update({
            _id: nextReservation._id
          }, {
            $set: {
              waiting: false
            }
          });

          seatsLeft = seatsLeft - nextReservation.seats
          i = i + 1;
        }
      }
    })
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
        
        db.orgs.findOne({
          _id: rez.orgId
        }, function (err, org) {

          db.events.findOne({
            _id: rez.eventId
          }, function (err, event) {

            db.reservations.find({
              eventId: event._id
            }).sort({
              timestamp: 1
            }).exec(function (err, reservations) {

              // to be executed only if the deleted reservation is 
              // from the invited list thus making a seats available
              if (!rez.waiting) {
                
                // the number of seats that remain free after the rezervation is deleted
                var seats = rez.seats;

                // loop throgh the waiting reservations until you 
                // remain out of seats
                reservations.some(function (reserv) {
                  
                  if (reserv.waiting && seats >= reserv.seats) {

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
                    });

                    // we return false so the loop continues ... well, looping
                    return false;

                  } else if (reserv.waiting && seats !== 0 && seats < reserv.seats) {
                    
                    // number of seats available is less than the number of needed
                    // by next on the waiting list

                    // create a new reservation object model by cloning the
                    // the next Waiting reservation
                    var clonedReserv = JSON.parse(JSON.stringify(reserv));

                    // delete it's ID so we can later insert it
                    delete clonedReserv._id;

                    // put the reservation on the Invited list
                    clonedReserv.waiting = false;

                    // add the available seats to the cloned model
                    clonedReserv.seats = seats;
                    
                    // insert the model into the database
                    db.reservations.insert(clonedReserv);

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
                      reserv.seatsAvaialable = seats;

                      // send the message setting the partial parameter to 'true'
                      // this will change the template of the message
                      notifyUser(reserv, event, true)

                    });

                    return true;

                  }

                });

              }

              if (req.user) {
                
                res.redirect('/dashboard/' + org._id + '/reservations/' + event._id);
              
              } else {

                res.render('frontend/user-reservation-deleted',{
                  org: org,
                  event: event
                });
              
              }
            });
          });
        });
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

          var event = events.filter(function (ev) {
            return ev._id === req.params.eventId
          })

          res.render('backend/reservations-view',{
            org: org,
            orgId: req.params.orgId,
            user: req.user,
            reservations: reservations,
            eventId: req.params.eventId,
            events: events,
            event: event[0]
          });

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


        

        if (!upsert) {
          // update

        } else {
          // insert

        }

        res.json({
          reservation: reservation,
          message: '',
          event: event
        })

      })
      
    });
      
    

    // notify user about the reservation

  }

  var updateReservation = function (req, res, next) {
    req.checkBody('name', 'Va rugam sa completati numele.').notEmpty();
    req.checkBody('email', 'Va rugam sa completati email-ul.').notEmpty();
    req.checkBody('seats', 'Va rugam sa completati numarul de locuri.').notEmpty();

    var name = req.body.name.trim();
    var email = req.body.email.trim();
    var seats = req.body.seats;
    var timestamp = req.body.timestamp;
    var eventId = req.params.eventId;
    var orgId = req.params.orgId;
    var mclistid = req.body.mclistid;
    var mcoptin = null;

    if (req.body.mcoptin !== 'null') {
      mcoptin = (req.body.mcoptin === 'true')
    }

    var errors = req.validationErrors();

    if (errors) {
      res.status(400).json(errors);
      return;
    }

    var reservation = {
      name: name,
      email: email,
      seats: parseInt(seats),
      timestamp: new Date(timestamp),
      eventId: eventId,
      orgId: orgId,
      mclistid: mclistid,
      mcoptin: mcoptin,
      waiting: false
    };

    data.getEventReservations({
      eventId: eventId
    }).then(function (reservations) {

      data.getOrgById({
        id: orgId
      }).then(function (org) {
        
        db.users.findOne({
          _id: org.userId
        }, function (err, user) {
          
          var reservedSeats = 0;

          // prevent user from making multiple reservations
          var prevRes = false;

          // determine the number of reservations that have already been made
          reservations.forEach(function (item) {
            
            if (!item.waiting) {
              reservedSeats = reservedSeats + parseInt(item.seats, 10);
            }

            if (item.email === reservation.email && reservation.email !== user.username) {
              prevRes = true;
            }
          });

          db.events.findOne({_id: eventId}, function (err, event) {
            if (err) {
              res.status(400).json(err);
              return;
            }

            var totalSeats = event.seats;
           
            // if there are no more seats left put the user on the waiting list
            if (seats > (totalSeats - reservedSeats)) {
              reservation.waiting = true;
            }
            
            if (!prevRes) {

              db.reservations.insert(reservation, function (err, newReservation) {

                if (err) {
                  res.status(400).json(err);
                  return;
                }

                if (newReservation.mclistid && (newReservation.mcoptin === true || newReservation.mcoptin === null)) {
                  addUserToMailingList(newReservation);
                }
                
                // update number of reservations on event object
                db.events.update(
                  {_id: eventId}, 
                  {$set: { reservedSeats: parseInt(reservedSeats, 10) + parseInt(seats, 10)}},
                  function (err, num) {
                    if (err) {
                      res.status(400).json(err);
                      return;
                    }

                    db.events.findOne({_id: eventId}, function (err, event) {
                      if (err) {
                        res.status(400).json(err);
                        return;
                      }

                      sendConfirmationEmails(newReservation, event);

                      // update invited and waiting parameters
                      event.invited = 0;
                      event.waiting = 0;

                      if (newReservation.waiting) {
                        event.waiting = event.waiting + newReservation.seats
                      } else {
                        event.invited = event.invited + newReservation.seats
                      }

                      reservations.forEach(function (reservation) {
                        
                        if (reservation.eventId === event._id) {

                          if (reservation.waiting) {

                            event.waiting = event.waiting + reservation.seats;

                          } else {

                            event.invited = event.invited + reservation.seats

                          }
                        }

                      });

                      res.json({
                        message: 'Create successful.',
                        reservation: newReservation,
                        event: event
                      });

                    });
                  }
                );
              });

            } else {

              // more seats or less seats?
              db.reservations.findOne({
                eventId: eventId,
                email: reservation.email
              }, function (err, reserv) {

                  // if user has made a previous reservations with the same number of seats
                  if (reserv.seats === reservation.seats) {
                    res.json({
                      message: 'A reservation with your email address was made before so we just updated the number of seats.',
                      resCode: 1,
                      reservation: reserv,
                      event: event
                    });
                    return;
                  }

                  db.reservations.update(
                    {email: reservation.email, eventId: eventId},
                    {$set: {seats: reservation.seats}},
                    function (err, num) {
                      // update the previous number of seats with the new ones
                      if (err) {
                        res.status(400).json(err);
                        return;
                      }

                      db.events.findOne({_id: eventId}, function (err, ev) {
                        if (err) {
                          res.status(400).json(err);
                          return;
                        }

                        sendConfirmationEmails(reservation, ev);

                        // update invited and waiting parameters
                        ev.invited = 0;
                        ev.waiting = 0;

                        data.getEventReservations({
                          eventId: ev._id
                        }).then(function (reservations) {

                          reservations.forEach(function (reservation) {
                            
                            if (reservation.eventId === ev._id) {

                              if (reservation.waiting) {

                                ev.waiting = ev.waiting + reservation.seats;

                              } else {

                                ev.invited = ev.invited + reservation.seats

                              }
                            }

                          });

                          res.json({
                            message: 'A reservation with your email address was made before so we just updated the number of seats.',
                            resCode: 1,
                            reservation: reserv,
                            event: ev
                          });

                        });

                      });
                    }
                  );
              });
            }
          });

        });
      });
    }
    );
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
