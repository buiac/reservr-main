/* dashboard
 */

module.exports = function(config, db) {
  'use strict';

  var data = require('../services/data.js')(config, db);
  var util = require('../services/util.js')(config, db);
  var marked = require('marked');

  var viewSettings = function (req, res, next) {
    var user = req.user;
    user.validEmail = util.validateEmail(user.username);

    if (user.validEmail) {

      data.getOrgEvents({
        orgId: req.params.orgId,
        fromDate: new Date()
      }).then(function (events) {
        
        db.orgs.findOne({
          _id: req.params.orgId
        }, function (err, org) {

          db.mcapikeys.findOne({
            orgId: org._id
          }, function (err, key) {

            res.render('backend/settings', {
              errors: [],
              orgId: req.params.orgId,
              org: org,
              events: events,
              user: user,
              mcapikey: key
            });
          })
        });
      });
    } else {
      res.redirect('/dashboard')
    }
  };

  var updateSettings = function (req, res, next) {

    req.checkBody('username', 'Username should not be empty').notEmpty();
    req.checkBody('orgName', 'Organization name should not be empty').notEmpty();
    req.checkBody('locale', 'Date locale name should not be empty').notEmpty();
    
    // TODO get the org and user and do the rest there so you can send a

    var errors = req.validationErrors();

    if (errors) {
      
      res.render('backend/settings', {
        errors: errors,
        orgId: req.params.orgId,
        org: org,
        user: user
      });

      return;
    }

    var mailchimp = [];
    // var orgName = req.body.orgName.trim();
    var username = req.body.username;
    var orgId = req.params.orgId;
    var location = req.body.location;
    var locale = req.body.locale;
    var confirmationEmail = req.body.confirmationEmail || '';
    var notifications = false;
    var mcapikey = req.body.mcapikey;


    // format the org name
    // orgName = orgName.replace(/\s/g, '-');
    // orgName = orgName.replace(/\//g, '');
    // orgName = orgName.replace(/\'/g, '');

    
    // templates 
    var userSubject = req.body.userSubject;
    var userSubjectWaiting = req.body.userSubjectWaiting;
    var userBody = req.body.userBody;
    var userBodyWaiting = req.body.userBodyWaiting;
    var orgSubject = req.body.orgSubject;
    var orgBody = req.body.orgBody;

    // reservation update templates
    var userUpdateSubject = req.body.userUpdateSubject;
    var userUpdateBody = req.body.userUpdateBody;

    // reservation reminder templates
    var remindSubject = req.body.remindSubject;
    var remindBody = req.body.remindBody;


    // TODO create a subject for the partial as well
    var userUpdateBodyPartial = req.body.userUpdateBodyPartial;
    
    if (req.body.notifications) {
      notifications = true      
    }

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
        res.render('backend/settings', {
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
        // name: orgName,
        location: location, 
        locale: locale,
        logo: logo,
        mailchimp: mailchimp,
        confirmationEmail: confirmationEmail,
        notifications: notifications,
        userSubject: userSubject,
        userSubjectWaiting: userSubjectWaiting,
        userBody: userBody,
        userBodyWaiting: userBodyWaiting,
        orgSubject: orgSubject,
        orgBody: orgBody,
        userUpdateSubject: userUpdateSubject,
        userUpdateBody: userUpdateBody,
        userUpdateBodyPartial: userUpdateBodyPartial,
        remindSubject: remindSubject,
        remindBody: remindBody
      }},  function (err, num) {
        
        if (err) {
          res.render('backend/settings', {
            errors: err,
            orgId: req.params.orgId,
            org: org,
            user: user
          });

          return;
        }

        db.orgs.findOne({_id: orgId}, function (err, org) {
          
          if (err) {
            res.render('backend/settings', {
              errors: err,
              orgId: req.params.orgId,
              org: org,
              user: user
            });

            return;
          }

          // validate user email

          var validEmail = util.validateEmail(username);

          db.users.update({_id: org.userId}, {$set: {username: username, validEmail: validEmail}}, function (err, num) {
            if (err) {
              res.render('backend/settings', {
               errors: err,
               orgId: req.params.orgId,
               org: org,
               user: user
              });

              return;
            }

            db.users.findOne({_id: org.userId}, function (err, user) {
              if (err) {
                res.render('backend/settings', {
                 errors: err,
                 orgId: req.params.orgId,
                 org: org,
                 user: user
                });

                return;
              }

              db.events.find({
                orgId: org._id,
                date: {
                  $gte: new Date()
                }
              }, function (err, events) {

                // update api key
                db.mcapikeys.findOne({
                  orgId: org._id
                }, function (err, key) {
                  
                  if (!key) {
                    db.mcapikeys.insert({
                      key: mcapikey,
                      orgId: org._id
                    }, function (err, key) {
                      
                      res.render('backend/settings', {
                        events: events,
                        errors: errors,
                        orgId: req.params.orgId,
                        org: org,
                        user: user,
                        mcapikey: key
                      });
                    })
                  } else {
                    db.mcapikeys.update({
                      orgId: org._id
                    }, {
                      $set: {
                        key: mcapikey
                      }
                    }, function (err, num) {
                      
                      res.render('backend/settings', {
                        events: events,
                        errors: errors,
                        orgId: req.params.orgId,
                        org: org,
                        user: user,
                        mcapikey: {
                          key: mcapikey || ''
                        }
                      });
                    })
                  }
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
        res.render('backend/settings', {
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
          res.render('backend/settings', {
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
            res.render('backend/settings', {
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
              res.render('backend/settings', {
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
