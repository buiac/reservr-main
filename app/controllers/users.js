/* dashboard
 */

module.exports = function(config, db) {
  'use strict';

  var express = require('express');
  var request = require('superagent');
  var async = require('async');
  var fs = require('fs');
  var passport = require('passport');
  var bCrypt = require('bcrypt-nodejs');
  var nodemailer = require('nodemailer');
  var smtpTransport = require('nodemailer-smtp-transport');
  var transport = nodemailer.createTransport(smtpTransport({
    host: 'smtp.mandrillapp.com',
    port: 587,
    auth: {
      user: 'contact@reservr.net',
      pass: 'cQ0Igd-t1LfoYOvFLkB0Xg'
    }
  }));
  var util = require('../services/util.js')(config, db);

  var view = function(req, res, next) {

    db.users.findOne({'_id': req.user._id}, function (err, user) {

      if (!user) {
        res.send({error: err}, 400);
      }
      
      if (user) {
        
        res.render('settings', {
          user: user,
        });

      }

    });
  };

  var updateUser = function (req, res, next) {
    var username = req.body.email
    var orgId = req.body.orgId

    // check if user already exists
    db.users.findOne({
      username: username
    }, function (err, user) {
      
      if (user) {
        res.status(400).json({
          message: 'User already exists'
        })
      } else {

        // find user by orgId
        db.orgs.findOne({
          _id: orgId
        }, function (err, org) {
          
          // TODO error handling

          db.users.findOne({
            _id: org.userId
          }, function (err, user) {
            // TODO error handling

            // create temporary password
            var randompass = Math.random().toString(36).slice(-8);

            // hash password
            var password = util.createHash(randompass)

            // send response
            if (util.validateEmail(username)) {

              // change temp parameter of events of this org
              db.events.update({
                orgId: org._id
              }, {
                $set: {
                  temp: false
                }
              },{
                multi: true
              });

              // update username and password
              db.users.update({
                _id: user._id
              }, {
                $set: {
                  username: username,
                  password: password,
                  validEmail: util.validateEmail(username)
                }
              }, function (err, num) {
                
                // send user an email with the password
                var userEmailConfig = {
                  from: 'contact@reservr.com',
                  to: username,
                  subject: 'reservr account and password',
                  html: 'Hello, <br /><br /> You signed up with <strong>' + username + '</strong> and your temporary password is <strong>' + randompass + '</strong>. <br /><br /> You can change it anytime in the Settings panel. <br /><br /> Cheers.'
                };

                transport.sendMail(userEmailConfig, function (err, info) {
                  console.log(err);
                  console.log(info);
                });

                res.json({
                  message: 'done'
                })
                
              })

            } else {
              res.status(400).json({
                message: 'Email address is not valid.'
              })
            }

          })
        })
      }
    })
  }

  return {
    updateUser: updateUser
  };

};
