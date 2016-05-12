/* dashboard
 */

module.exports = function(config, db) {
  'use strict';

  var util = require('../services/util.js')(config, db);
  var marked = require('marked');
  var moment = require('moment');
  var q = require('q');

  var nodemailer = require('nodemailer');
  var smtpTransport = require('nodemailer-smtp-transport');
  var transport = nodemailer.createTransport(smtpTransport(config.mandrill));

  // Mailgun configuration
  var Mailgun = require('mailgun-js');
  var mailgun_api_key = config.mailgun.apikey;
  var domain = 'reservr.net';
  var mailgun = new Mailgun({apiKey: mailgun_api_key, domain: domain});

  var sendReminders = function (req, res, next) {

    // if today it's 11 oclock in romania find all events taking place next day
    var date = new Date()

    if (date.getHours() === 4) {
      var lte = moment().add(1, 'day').endOf('day').toDate()
      var gte = moment().add(1, 'day').startOf('day').toDate()

      db.orgs.find({}, function (err, orgs) {
        orgs.forEach(function (org) {
          
          db.users.findOne({
            _id: org.userId
          }, function (err, user) {

            db.events.find({
              orgId: org._id,
              date: {
                $lte: lte,
                $gte: gte
              },
              sent: {
                $ne: true
              },
              reminders: {
                $ne: false
              }
            }).exec(function (err, events) {

              events.forEach(function (event) {
                
                // find the reservations for each of these events
                db.reservations.find({
                  eventId: event._id,
                  email: {
                    $ne: user.username
                  },
                  waiting: {
                    $ne: true
                  },
                }, function (err, reservations) {

                  var arr = []

                  reservations.forEach(function (reservation) {

                    if ((arr.indexOf(reservation.email) === -1)) {
                      
                      var params = {
                        eventName: event.name,
                        eventLocation: event.location,
                        eventDate: moment(event.date).format('dddd, Do MMMM YYYY, HH:mm'),
                        deleteReservationLink: '<a style="color:red" href="http://reservr.net/r/' + reservation._id + '">Delete Reservation</a>'
                      }

                      var template = {
                        subject: org.remindSubject,
                        body: org.remindBody
                      };

                      var bodyPlaceholders = util.getWordsBetweenCurlies(template.body)
                      var subjectPlaceholders = util.getWordsBetweenCurlies(template.body)

                      bodyPlaceholders.forEach(function (item) {
                        template.body = template.body.replace('{' + item + '}', params[item]);
                      });

                      subjectPlaceholders.forEach(function (item) {
                        template.subject = template.subject.replace('{' + item + '}', params[item]);
                      });

                      var reminderEmailConfig = {
                        from: 'contact@reservr.net', // user.username
                        to: reservation.email,
                        subject: template.subject,
                        html: marked(template.body)
                      };

                      //Invokes the method to send emails given the above data with the helper library
                      mailgun.messages().send(reminderEmailConfig, function (err, body) {
                          //If there is an error, render the error page
                          if (err) {
                              // res.render('error', { error : err});
                              console.log('\n\n\n\n')
                              console.log('----error mailgun----')
                              console.log("got an error: ", err);
                              console.log('--------')
                              console.log('\n\n\n\n')
                          }
                          //Else we can greet    and leave
                          else {
                              // //Here "submitted.jade" is the view file for this landing page 
                              // //We pass the variable "email" from the url parameter in an object rendered by Jade
                              // res.render('submitted', { email : req.params.mail });
                              console.log('\n\n\n\n')
                              console.log('----success mailgun----')
                              console.log(body);
                              console.log('--------')
                              console.log('\n\n\n\n')
                          }
                      });

                      // transport.sendMail(reminderEmailConfig, function (err, info) {
                      //   console.log(err);
                      //   console.log(info);
                      // });

                    }

                    arr.push(reservation.email)

                  });
                });

                // update event so we know that is has already sent out notifications
                db.events.update({
                  _id: event._id
                }, {
                  $set: {
                    sent: true
                  }
                })
              });
            })
          })
        })
      })

      res.json({
        status: 'sent'
      })
      
    } else {
      res.json({
        status: 'patience. time will come'
      })
    }
  }

  return {
    sendReminders: sendReminders
  };

};
