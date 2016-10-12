/* superadmin
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

  var counter = function (req, res, next) {
    db.events.find({}, function (err, events) {
      db.orgs.find({}, function (err, orgs) {
        db.reservations.find({}, function (err, reservations) {

          res.json({
            events: events.length,
            orgs: orgs.length,
            reservations: reservations.length
          })
          
        })
      })  
    })    
  }
    
  return {
    counter: counter
  };

};
