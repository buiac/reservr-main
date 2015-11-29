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

  var sendReminders = function (req, res, next) {
    // var lte = moment().add(24, 'hours').toDate();
    // var gte = moment().toDate();

    // if today it's 11 oclock in romania find all events taking place next day
    var date = new Date()

    if (true) { //date.getHours === 11
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

          reservations.forEach(function (reservation, i) {
            if (!reservation.waiting) {
              // send a reminders to the people to the persons
            }
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
