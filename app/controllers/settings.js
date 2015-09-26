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
        res.render('settings', {
          errors: [],
          orgId: req.params.orgId,
          org: org,
          user: user
        });
      });
      
    } else {
      res.redirect('/dashboard')
    }
    
  };

  var updateSettings = function (req, res, next) {
    req.checkBody('username', 'Username should not be empty').notEmpty();
    req.checkBody('orgName', 'Organization name should not be empty').notEmpty();

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

    var orgName = req.body.orgName;
    var username = req.body.username;
    var orgId = req.params.orgId;

    db.orgs.update({
      _id: orgId
    }, {$set: { name: orgName }},  function (err, num) {
      
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
            
            res.render('settings', {
              errors: errors,
              orgId: req.params.orgId,
              org: org,
              user: user
            });

          })

        });
      });
    });

    // db.orgs.update({_id: req.body.orgId}, {$set: {name: orgName}}, function (err, num) {
    //   console.log('update org');

    //   if (err) {
    //     res.render('settings', {
    //       errors: err,
    //       orgId: req.params.orgId,
    //       org: org,
    //       user: user
    //     });

    //     return;
    //   }

    //   console.log(num);
    //   if (num > 0) {
    //     db.orgs.findOne({_id: req.params.orgId}, function (err, org) {
         
    //      console.log('find org');

    //       // if (err) {
    //       //   res.render('settings', {
    //       //     errors: err,
    //       //     orgId: req.params.orgId,
    //       //     org: org,
    //       //     user: user
    //       //   });
            
    //       //   return;
    //       // }

    //       // db.users.update({_id: org.userId}, {$set: {username: username}}, function (err, num) {
    //       //   console.log('update user');
    //       //   if (err) {
    //       //     res.render('settings', {
    //       //       errors: err,
    //       //       orgId: req.params.orgId,
    //       //       org: org,
    //       //       user: user
    //       //     });
              
    //       //     return;
    //       //   }

    //       //   res.render('settings', {
    //       //     errors: errors,
    //       //     orgId: org.orgId,
    //       //     org: org,
    //       //     user: user
    //       //   });
    //       // });


    //     });
    //   }
    // });

  };

  return {
    viewSettings: viewSettings,
    updateSettings: updateSettings
  };

};
