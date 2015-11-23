module.exports = function(config, db) {
	var express = require('express');
  var expressSession = require('express-session');
  var expressValidator = require('express-validator');
  var bCrypt = require('bcrypt-nodejs');
  var bodyParser = require('body-parser');
  var errorhandler = require('errorhandler');
  var flash = require('connect-flash');
  var passport = require('passport');
  var LocalStrategy = require('passport-local').Strategy;
  var util = require('../services/util.js')(config, db);

  // passport serializer
  passport.serializeUser(function(user, done) {

    done(null, user._id);

  });
   
  passport.deserializeUser(function(userId, done) {

    db.users.findOne({'_id':userId}, function (err, newUser) {
      
      done(err, newUser);

    });

  });

  passport.use('signup', new LocalStrategy({
      passReqToCallback : true
    },
    function (req, username, password, done) {
      var findOrCreateUser = function(){
        
        db.users.findOne({'username': username}, function (err, user) {
        
         if (err){
          
           return done(err);
         }

         if (user) {
          
           return done(null, false, 
             req.flash('message', 'User Already Exists'));

         } else {
           
          //if there is no user with that email
          // create the user
          var newUser = {
            timecreated: new Date()
          };

          var org = {}

          // set the user's local credentials
          newUser.username = username;
          newUser.password = util.createHash(password);

          // validate user email
          newUser.validEmail = util.validateEmail(newUser.username);
          
          // set calendar default name
          org.name = 'guest-' + new Date().getTime();

           // save the user
          db.users.insert(newUser, function (err, newDoc) {
            
            if (err) {
              return done(err);
            } else {

              // insert the calendar
              org.userId = newDoc._id;
              db.orgs.insert(org, function (err, newOrg) {
                
                // var newEvent = {
                //   orgId: newOrg._id,
                //   userId: newDoc._id
                // };

                return done(null, newDoc, req);  

                // db.events.insert(newEvent, function (err, newEv) {
                  
                // });

              });
            }
          });

         }
        });
      } // findorcreateuser

      process.nextTick(findOrCreateUser);

    }
  ));

  var signup = passport.authenticate('signup', {
    failureRedirect: '/signup',
    successRedirect: '/dashboard',
    failureFlash : true
  });

  var signupView = function(req, res, next) {

    res.render('signup', {
      info: req.flash("message")
    });
  };

  // helper methods
  var isValidPassword = function(user, password){
    return bCrypt.compareSync(password, user.password);
  };

  // passport signin method
  passport.use('signin', new LocalStrategy({
      passReqToCallback : true
    },
    function (req, username, password, done) {
      db.users.findOne({username: username}, function (err, user) {

        if (err){

         return done(err);
        }

        if (!user) {

         return done(null, false, 
           req.flash('message', 'User does not exist'));

        }

        if (!isValidPassword(user, password)) {
          return done(null, false, 
            req.flash('message', 'Invalid Password'));
        }

        return done(null, user);

      });

    }
  ));

  var signin = passport.authenticate('signin', {
    successRedirect: '/dashboard',
    failureRedirect: '/signin',
    failureFlash : true
  });

  var signinView = function(req, res, next) {

    res.render('signin', {info: req.flash("message")});
    
  };


  return {
    signupView: signupView,
    signup: signup,
    signinView: signinView,
    signin: signin
  };

};