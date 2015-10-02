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

  var list = function (req, res, next) {
    // body...
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
      userBody: 'Salut, <br /><br /> Ai facut o rezervare de {seats} locuri pentru evenimentul "{eventName}" de {eventDate}. <br /><br /> O zi cat mai buna iti dorim.',
      userBodyWaiting: 'Salut, <br /><br /> Ai fost inclus pe lista de asteptare pentru {seats} locuri la evenimentul "{eventName}" de {eventDate}. <br /><br /> Daca se elibereaza un loc te vom contacta. <br /><br /> O zi cat mai buna iti dorim.',
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
          from: user.username,
          to: reservation.email,
          subject: template.userSubject,
          html: template.userBody
        };

        var userWaitingEmailConfig = {
          from: user.username,
          to: reservation.email,
          subject: template.userSubjectWaiting,
          html: template.userBodyWaiting
        };

        var orgEmailConfig = {
          from: 'contact@reservr.net',
          to: user.username,
          subject: template.orgSubject,
          html: template.orgBody
        };


        if (typeof reservation.waiting === 'boolean' && reservation.waiting) {
          transport.sendMail(userWaitingEmailConfig, function (err, info) {
            console.log(err);
            console.log(info);
          });
        } else if(reservation.waiting === 'false') {
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

  var deleteReservation = function (req, res, next) {
    
    db.reservations.findOne({
      _id: req.params.reservationId
    }, function (err, reservation) {
      
      var deletedRes = reservation;

      db.reservations.remove({
        _id: req.params.reservationId
      }, function (err, num) {
        
        if (err) {
          res.status(400).json(err);
          return;
        }

        // update the number of available seats
        db.events.findOne({
          _id: req.params.eventId
        }, function (err, event) {
          
          var reservedSeats = parseInt(event.reservedSeats, 10) - parseInt(deletedRes.seats);
          
          db.events.update({
            _id: req.params.eventId
          }, {$set: {
            reservedSeats: reservedSeats
          }});

        });

        db.reservations.find({
          eventId: req.params.eventId
        }, function (err, reservations) {
          if (err) {
            res.status(400).json(err);
            return;
          }

          db.orgs.findOne({
            _id: req.params.orgId
          }, function (err, org) {
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

        })

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
    var waiting = req.body.waiting;
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
      waiting: waiting,
      mclistid: mclistid
    };

    var findEventReservations = function (err, reservations) {
      if (err) {
        res.status(400).json(err);
        return;
      }

      var reservedSeats = 0;

      // prevent user from making multiple reservations
      var prevRes = false;

      // determine the number of reservations that have already been made
      reservations.forEach(function (item) {
        reservedSeats = reservedSeats + parseInt(item.seats, 10);
        
        if (item.email === reservation.email) {
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

          // upgrading or downgrading?
          db.reservations.findOne(
            {email: reservation.email}, 
            function (err, reserv) {

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

              // update reserved seats on the event
              db.events.update(
                {_id: eventId}, 
                {$set: { reservedSeats: reservedSeats}},
                function (err, num) {
                  if (err) {
                    res.status(400).json(err);
                    return;
                  }
                }
              );

              db.reservations.update(
                {email: reservation.email},
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
    };

    db.reservations.find({eventId: eventId}, findEventReservations);

  };

  return {
    // view: view,
    list: list,
    updateReservation: updateReservation,
    viewReservation: viewReservation,
    deleteReservation: deleteReservation
  };

};
