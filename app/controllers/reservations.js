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
  var nodemailer = require('nodemailer');
  var smtpTransport = require('nodemailer-smtp-transport');
  var moment = require('moment');
  var mcapi = require('../../node_modules/mailchimp-api/mailchimp');
  var mc = new mcapi.Mailchimp('7c3195803dbe692180ed207d6406fec3-us8');
  var q = require('q');
  var data = require('../services/data.js')(config, db);

  db.reservations.find({},function (err, reservations) {
    
    reservations.forEach(function (reservation) {
      if (reservation.waiting === 'false') {
        reservation.waiting = false;
        db.reservations.update({
          _id: reservation._id
        }, {
          $set: {
            waiting: false
          }
        });
      }

      if (reservation.waiting === 'true') {
        reservation.waiting = true;

        db.reservations.update({
          _id: reservation._id
        }, {
          $set: {
            waiting: true
          }
        });
      }

      if (reservation.waiting === undefined) {
        reservation.waiting = false;

        db.reservations.update({
          _id: reservation._id
        }, {
          $set: {
            waiting: false
          }
        });
      }
    });

  });


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
  moment.locale('ro');

  var transport = nodemailer.createTransport(smtpTransport({
    host: 'smtp.mandrillapp.com',
    port: 587,
    auth: {
      user: 'contact@reservr.net',
      pass: 'cQ0Igd-t1LfoYOvFLkB0Xg'
    }
  }));

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

    var params = {
      seats: reservation.seats,
      eventName: event.name,
      eventDate: moment(event.date).format('dddd, Do MMMM YYYY, HH:mm'),
      seatsAvaialable: reservation.seatsAvaialable || ''
    };

    var template = {
      subject: 'Update rezervare',
      body: 'Salut, <br /><br /> S-au eliberat {seats} locuri pentru evenimentul "{eventName}" de {eventDate} asa ca te-am mutat pe lista invitatilor. <br /><br /> Poti renunta oricand la rezervare dand click pe acest link: <a style="color:red" href="http://reservr.net/r/' + reservation._id + '">sterge rezervare</a> <br /><br /> O zi cat mai buna iti dorim.',      
      bodyPartial: 'Salut, <br /><br /> S-au eliberat {seatsAvaialable} locuri pentru evenimentul "{eventName}" de {eventDate} asa ca te-am mutat pe lista invitatilor. <br /><br /> Stim ca doreai mai multe locuri :(. Daca se mai elibereaza vreunul te anuntam. <br /><br /> Poti renunta oricand la rezervare dand click pe acest link: <a style="color:red" href="http://reservr.net/r/' + reservation._id + '">sterge rezervare</a> <br /><br /> O zi cat mai buna iti dorim.',
    };

    var bodyPlaceholders = getWordsBetweenCurlies(template.body);
    var bodyPartialPlaceholders = getWordsBetweenCurlies(template.bodyPartial);

    bodyPlaceholders.forEach(function (item) {
      template.body = template.body.replace('{' + item + '}', params[item]);
    });

    bodyPartialPlaceholders.forEach(function (item) {
      template.bodyPartial = template.bodyPartial.replace('{' + item + '}', params[item]);
    });

    db.orgs.findOne({
      _id: event.orgId
    }, function (err, org) {
      
      db.users.findOne({
        _id: org.userId
      }, function (err, user) {

        if (partial) {
          
          var userEmailConfig = {
            from: 'contact@reservr.net', // user.username
            to: reservation.email,
            subject: template.subject,
            html: template.bodyPartial
          };

          transport.sendMail(userEmailConfig, function (err, info) {
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
            console.log(err);
            console.log(info);
          });

        }

      });
    });
  };

  var sendConfirmationEmails = function (reservation, event) {

    // send confirmation to user
    var userEmail = reservation.email;

    var userParams = {
      seats: reservation.seats,
      eventName: event.name,
      eventDate: moment(event.date).format('dddd, Do MMMM YYYY, HH:mm')
    };

    var orgParams = {
      seats: reservation.seats,
      eventName: event.name,
      eventDate: moment(event.date).format('dddd, Do MMMM YYYY, HH:mm'),
      userName: reservation.name,
      userEmail: reservation.email
    }

    var template = {
      userSubject: 'Rezervarea a fost facuta',
      userSubjectWaiting: 'Ai fost inclus pe lista de asteptare',
      userBody: 'Salut, <br /><br /> Ai facut o rezervare de {seats} locuri pentru evenimentul "{eventName}" de {eventDate}. <br /><br /> Poti renunta oricand la rezervare dand click pe acest link: <a style="color:red" href="http://reservr.net/r/' + reservation._id + '">sterge rezervare</a> <br /><br /> O zi cat mai buna iti dorim.',
      userBodyWaiting: 'Salut, <br /><br /> Ai fost inclus pe lista de asteptare pentru {seats} locuri la evenimentul "{eventName}" de {eventDate}. <br /><br /> Daca se elibereaza un loc te vom contacta. <br /><br /> Poti renunta oricand la rezervare dand click pe acest link: <a style="color:red" href="http://reservr.net/r/' + reservation._id + '">sterge rezervare</a> <br /> <br /> O zi cat mai buna iti dorim.',
      orgSubject: 'O noua rezervare la "{eventName}"',
      orgBody: 'Salut, <br /><br /> O noua rezervare de {seats} locuri a fost facuta pentru evenimentul "{eventName}" de {eventDate} de catre {userName}, {userEmail}. <br /><br /> O zi cat mai buna iti dorim.'
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

    db.orgs.findOne({
      _id: event.orgId
    }, function (err, org) {
      
      db.users.findOne({
        _id: org.userId
      }, function (err, user) {
        
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

        transport.sendMail(orgEmailConfig, function (err, info) {
          console.log(err);
          console.log(info);
        });

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
            }, function (err, reservations) {

              // to be moved without seat number alteration
              var toBeMoved = [];

              // to be moved with seat number alteration
              var toBeMovedWithSeats = [];

              if (!rez.waiting) {
                
                // the number of seats that remain free after the rezervation is deleted
                var seats = rez.seats;

                // loop throgh the reservations until you 
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

                    return false;

                  } else if (reserv.waiting && seats !== 0 && seats < reserv.seats) {
                    
                    // split this reservation into 2

                    var clonedReserv = JSON.parse(JSON.stringify(reserv));

                    delete clonedReserv._id;
                    clonedReserv.waiting = false;
                    
                    db.reservations.update({
                      email: clonedReserv.email,
                      eventId: rez.eventId,
                      waiting: false
                    },{
                      $set: {
                        seats: seats
                      }
                    }, function (err, num) {

                      // notify user of change
                      reserv.seatsAvaialable = seats;
                      notifyUser(reserv, event, true)

                      if (!err && num === 0) {
                        
                        clonedReserv.seats = seats;
                        db.reservations.insert(clonedReserv);

                        db.reservations.update({
                          _id: reserv._id,
                          waiting: true
                        }, {
                          $set: {
                            seats: reserv.seats - seats
                          }
                        });
                      }

                    });

                    return true;

                  }

                });

              }

              if (req.user) {
                
                res.redirect('/dashboard/' + org._id + '/reservations/' + event._id);
              
              } else {

                res.render('deleted-reservation',{
                  org: org
                });
              
              }
            });
          });
        });
      });
    });
  };

  var viewReservation = function (req, res, next) {

    db.reservations.find({
      eventId: req.params.eventId
    }, function (err, reservations) {



      if (err) {
        res.status(400).json(err);
        return;
      }

      db.orgs.findOne({_id: req.params.orgId}, function (err, org) {
        
        if (err) {
          res.status(400).json(err);
          return;
        }

        res.render('reservations-view',{
          org: org,
          orgId: req.params.orgId,
          user: req.user,
          reservations: reservations,
          eventId: req.params.eventId
        });

      });
    });
    
  };

  var updateReservation = function (req, res, next) {
    req.checkBody('name', 'Va rugam sa completati numele.').notEmpty();
    req.checkBody('email', 'Va rugam sa completati email-ul.').notEmpty();
    req.checkBody('seats', 'Va rugam sa completati numarul de locuri.').notEmpty();

    var name = req.body.name.trim();
    var email = req.body.email.trim();
    var seats = req.body.seats;
    var eventId = req.params.eventId;
    var orgId = req.params.orgId;
    var mclistid = req.body.mclistid;

    var errors = req.validationErrors();

    if (errors) {
      res.status(400).json(errors);
      return;
    }

    var reservation = {
      name: name,
      email: email,
      seats: parseInt(seats),
      eventId: eventId,
      orgId: orgId,
      mclistid: mclistid,
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

                if (newReservation.mclistid) {
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

                  if (reserv.seats === reservation.seats) {
                    res.json({
                      message: 'Same seats',
                      reservation: reserv,
                      event: event
                    });
                    return;
                  }

                  if (reserv.seats < reservation.seats) {
                    reservedSeats = reservedSeats + (parseInt(reservation.seats) - reserv.seats);
                  }

                  if (reserv.seats > reservation.seats) {
                    reservedSeats = reservedSeats - (reserv.seats - parseInt(reservation.seats)); 
                  }

                  db.reservations.update(
                    {email: reservation.email, eventId: eventId},
                    {$set: {seats: reservation.seats}},
                    function (err, num) {
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

                        if (reservation.waiting) {
                          ev.waiting = ev.waiting + newReservation.seats
                        } else {
                          ev.invited = ev.invited + newReservation.seats
                        }

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
                          message: 'Update successful.',
                          reservation: reserv,
                          event: ev
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
      
      db.events.findOne({
        _id: reservation.eventId
      }, function (err, event) {
        
        db.orgs.findOne({
          _id: event.orgId
        }, function (err, org) {
          res.render('user-reservations-view',{
            reservation: reservation,
            event: event,
            org: org
          });
        });
      })
    });
  };

  var userReservationsDeleteView = function (req, res, next) {
    // body...
  };

  return {
    updateReservation: updateReservation,
    viewReservation: viewReservation,
    deleteReservation: deleteReservation,
    userReservationsView: userReservationsView,
    userReservationsDeleteView: userReservationsDeleteView
  };

};
