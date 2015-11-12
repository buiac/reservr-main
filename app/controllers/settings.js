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

  var validateEmail = function (email) {
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
  }

  var viewSettings = function (req, res, next) {
    var user = req.user;
    user.validEmail = validateEmail(user.username);

    if (user.validEmail) {

      db.orgs.findOne({_id: req.params.orgId}, function (err, org) {

        // TODO error handling

        db.events.find({
          orgId: org._id
        }, function (err, events) {

          // TODO error handling
          
          res.render('settings', {
            errors: [],
            orgId: req.params.orgId,
            org: org,
            events: events,
            user: user
          });
        })
        
      });
      
    } else {
      res.redirect('/dashboard')
    }
    
  };

  var updateSettings = function (req, res, next) {
    req.checkBody('username', 'Username should not be empty').notEmpty();
    req.checkBody('orgName', 'Organization name should not be empty').notEmpty();
    req.checkBody('locale', 'Date locale name should not be empty').notEmpty();

    var errors = req.validationErrors();

    if (errors) {
      
      res.render('settings', {
        errors: errors,
        orgId: req.params.orgId,
        org: org,
        user: user
      });

      return;

    }

    var mailchimp = [];
    var orgName = req.body.orgName;
    var username = req.body.username;
    var orgId = req.params.orgId;
    var location = req.body.location;
    var locale = req.body.locale;
    var confirmationEmail = req.body.confirmationEmail || '';

    if (req.body.mailchimpName1) {
      mailchimp.push({
        name: req.body.mailchimpName1,
        account: req.body.mailchimpAccount1
      });
    }

    if (req.body.mailchimpName2) {
      mailchimp.push({
        name: req.body.mailchimpName2,
        account: req.body.mailchimpAccount2
      });
    }

    if (!confirmationEmail) {
      confirmationEmail = username;
    }
    
    db.orgs.findOne({_id: orgId}, function (err, org) {
      if (err) {
        res.render('settings', {
          errors: err,
          orgId: req.params.orgId,
          org: org,
          user: user
        });

        return;
      }

      var logo = '';

      if (req.files.logo) {
        logo = '/media/' + req.files.logo.originalname;
      } else if (org.logo) {
        logo = org.logo
      }

      db.orgs.update({
        _id: orgId
      }, {$set: { 
        name: orgName, 
        location: location, 
        locale: locale,
        logo: logo,
        mailchimp: mailchimp,
        confirmationEmail: confirmationEmail
      }},  function (err, num) {
        
        if (err) {
          res.render('settings', {
            errors: err,
            orgId: req.params.orgId,
            org: org,
            user: user
          });

          return;
        }

        db.orgs.findOne({_id: orgId}, function (err, org) {
          
          if (err) {
            res.render('settings', {
              errors: err,
              orgId: req.params.orgId,
              org: org,
              user: user
            });

            return;
          }

          // validate user email

          var validEmail = validateEmail(username);

          db.users.update({_id: org.userId}, {$set: {username: username, validEmail: validEmail}}, function (err, num) {
            if (err) {
              res.render('settings', {
               errors: err,
               orgId: req.params.orgId,
               org: org,
               user: user
              });

              return;
            }

            db.users.findOne({_id: org.userId}, function (err, user) {
              if (err) {
                res.render('settings', {
                 errors: err,
                 orgId: req.params.orgId,
                 org: org,
                 user: user
                });

                return;
              }

              db.events.find({
                orgId: org._id
              }, function (err, events) {

                res.render('settings', {
                  events: events,
                  errors: errors,
                  orgId: req.params.orgId,
                  org: org,
                  user: user
                });
              });
            })
          });
        });
      });
    });
  };

  var deleteAccount = function (req, res, next) {

    db.users.findOne({
      _id: req.params.userId
    }, function (err, user) {

      if (err) {
        res.render('settings', {
          errors: err,
          orgId: org.id,
          org: org,
          user: user
        });
        return;
      }
      
      db.orgs.findOne({
        userId: user._id
      }, function (err, org) {

        if (err) {
          res.render('settings', {
            errors: err,
            orgId: org.id,
            org: org,
            user: user
          });
          return;
        }
        
        db.events.remove({
          orgId: org._id
        },{
          multi: true
        }, function (err, num) {

          if (err) {
            res.render('settings', {
              errors: err,
              orgId: org.id,
              org: org,
              user: user
            });
            return;
          }

          db.orgs.remove({
            userId: user._id
          }, {
            multi: true
          }, function (err, num) {

            if (err) {
              res.render('settings', {
                errors: err,
                orgId: org.id,
                org: org,
                user: user
              });
              return;
            }

            db.users.remove({
              _id: req.params.userId
            }, function (err, num) {
              
              res.redirect('/dashboard/signout');

            });
          });
        });
      });
    });
  };

  return {
    viewSettings: viewSettings,
    updateSettings: updateSettings,
    deleteAccount: deleteAccount
  };

};
