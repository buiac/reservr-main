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

  var dashboard = function (req, res, next) {
    db.orgs.find({}, function (err, orgs) {
      
      db.users.find({}, function (err, users) {
        
        res.render('superadmin/dashboard.ejs', {
          orgs: orgs,
          users: users
        })
      })
    })
    
  }

  var deleteUser = function (req, res, next) {    
    
    var id = req.params.userId;

    if (id) {

      db.users.remove({
        _id: id
      }, function (err, num) {
        
        res.redirect('/sa/dashboard')

      })

    } else {
      res.redirect('/sa/dashboard')
    }

  }

  var deleteOrg = function (req, res, next) {    
    
    var id = req.params.orgId;

    if (id) {

      db.orgs.remove({
        _id: id
      }, function (err, num) {
        
        res.redirect('/sa/dashboard')

      })

    } else {
      res.redirect('/sa/dashboard')
    }

  }
    
  return {
    dashboard: dashboard,
    deleteUser: deleteUser,
    deleteOrg: deleteOrg
  };

};
