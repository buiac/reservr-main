/* dashboard
 */

module.exports = function(config, db) {
  'use strict';

  var express = require('express');
  var request = require('superagent');
  var async = require('async');
  var fs = require('fs');
  var passport = require('passport');
  var data = require('../services/data.js')(config, db);
  var util = require('../services/util.js')(config, db);
  var marked = require('marked');
  var moment = require('moment');
  var q = require('q');

  var nodemailer = require('nodemailer');
  var smtpTransport = require('nodemailer-smtp-transport');
  var mcapi = require('../../node_modules/mailchimp-api/mailchimp');
  var mc = new mcapi.Mailchimp('7c3195803dbe692180ed207d6406fec3-us8');

  var transport = nodemailer.createTransport(smtpTransport(config.mandrill));

  // TODO move to util
  var uniqueTest = function (arr) {
    var n, y, x, i, r;
    var arrResult = {},
      unique = [];
    for (i = 0, n = arr.length; i < n; i++) {
      var item = arr[i];
      arrResult[item.title + " - " + item.artist] = item;
    }
    i = 0;
    for (var item in arrResult) {
      unique[i++] = arrResult[item];
    }
    return unique;
  }

  // TODO move to util
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

  var sendReminders = function (req, res, next) {
    // var lte = moment().add(24, 'hours').toDate();
    // var gte = moment().toDate();

    // if today it's 11 oclock in romania find all events taking place next day
    var date = new Date()

    if (date.getHours === 4) { //date.getHours === 4
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
            sent: {
              $ne: true
            }
          }).exec(function (err, events) {

            events.forEach(function (event) {
              
              // find the reservations for each of these events
              db.reservations.find({
                eventId: event._id
              }, function (err, reservations) {

                var arr = []

                reservations.forEach(function (reservation) {

                  // console.log(arr.indexOf(reservation.email))
                  if (arr.indexOf(reservation.email) === -1 ) {
                    
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

                    var bodyPlaceholders = getWordsBetweenCurlies(template.body)
                    var subjectPlaceholders = getWordsBetweenCurlies(template.body)

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
      
    }

    
    
    // db.events.find({
    //   start: {
    //     $lte: lte,
    //     $gte: gte
    //   },
    //   sent: {
    //     $ne: true
    //   }
    // }).sort(
    // {
    //   start: -1
    // }
    // ).exec(function (err, alerts) {

    // console.log('\n\n\n\n')
    // console.log('--------')
    // console.log(lte)
    // console.log(gte)
    // console.log('--------')
    // console.log('\n\n\n\n')
  }

  return {
    sendReminders: sendReminders
  };

};
