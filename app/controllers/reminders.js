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

  var sendReminders = function (req, res, next) {
    
    // if today it's 11 oclock in romania find all events taking place next day
    var date = new Date()

    if (date.getHours() === 4) {
      var lte = moment().add(1, 'day').endOf('day').toDate()
      var gte = moment().add(1, 'day').startOf('day').toDate()

      db.orgs.find({}, function (err, orgs) {
        orgs.forEach(function (org) {
          
          db.events.find({
            orgId: org._id,
            date: {
              $lte: lte,
              $gte: gte
            },
            waiting: {
              $ne: true
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
                eventId: event._id
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

                    transport.sendMail(reminderEmailConfig, function (err, info) {
                      console.log(err);
                      console.log(info);
                    });

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
