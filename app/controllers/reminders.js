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

  var sendReminders = function (req, res, next) {
    // var lte = moment().add(24, 'hours').toDate();
    // var gte = moment().toDate();

    // if today it's 11 oclock in romania find all events taking place next day
    var date = new Date()

    if (true) { //date.getHours === 4
      var lte = moment().add(1, 'day').endOf('day').toDate()
      var gte = moment().add(1, 'day').startOf('day').toDate()

      db.events.find({
        date: {
          $lte: lte,
          $gte: gte
        },
        sent: {
          $ne: true
        }
      }).exec(function (err, events) {
        
        var arr = [];
              
        events.forEach(function (event) {
          arr.push(data.getEventReservations({
            eventId: event._id
          }));
        });

        q.all(arr).then(function (rez) {
          var reservations = [].concat.apply([], rez);
          var arr = [];

          reservations.forEach(function (reservation, i) {
            // if the user has reservations for more than one event the next day
            // createa a list of those event

            if (!reservation.waiting) {
              arr.push({
                email: reservation.email,
                eventId: reservation.eventId
              })
            }
          })

          arr = uniqueTest(arr)

          arr.forEach(function (reservation) {
            events.forEach(function (event) {
              
              if (reservation.eventId === event._id) {
                reservation.event = event;
              }

            })

            console.log(reservation)

            var userEmailConfig = {
              from: 'contact@reservr.net', // user.username
              to: reservation.email,
              subject: 'Reminder for event "' + reservation.event.name + '"',
              html: marked('Hello, \n\n This is a reminder that you have reservd seats for the "' + reservation.event.name + '", that will take place ' + moment(reservation.event.date).format() + ' at ' + reservation.event.location + '. Please try to get to the event 15 minutes earlier. \n\n In case you cannot make it to the event please delete your reservation by clicking this link: <a href="http://reservr.net/r/">delete reservation</a>. \n\n Have a great day!')
            };

            transport.sendMail(userEmailConfig, function (err, info) {
              console.log(err);
              console.log(info);
            });
          })

        })

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
