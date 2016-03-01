module.exports = function(config, db) {
  var passport = require('passport');
  var LocalStrategy = require('passport-local').Strategy;
  var util = require('../services/util.js')(config, db);
  var nodemailer = require('nodemailer');
  var smtpTransport = require('nodemailer-smtp-transport');
  var transport = nodemailer.createTransport(smtpTransport(config.mandrill));

  // passport serializer
  passport.serializeUser(function(user, done) {

    done(null, user._id);

  });
  
  // passport deserializer
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

          req.checkBody('orgName', 'Organization name should not be empty').notEmpty();

          var errors = req.validationErrors();
          var orgName = req.body.orgName.trim();
        
          if (err){
            return done(err);
          }

          if (errors) {
            req.flash('errors', errors);
          }

          if (user) {
            
            return done(null, false, 
              req.flash('message', 'User Already Exists'));

          } else {

            // clean up org name
            orgName = orgName.replace(/\s/g, '-');
            orgName = orgName.replace(/\//g, '');
            orgName = orgName.replace(/\'/g, '');

            db.orgs.findOne({name: orgName }, function (err, org) {

              if (org) {
                
                return done(null, false, 
                  req.flash('message', 'This organization name has already been taken'));
              }

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
              
              // update org name
              org.name = orgName;


              var reminderEmailConfig = {
                from: 'contact@reservr.net', // user.username
                to: 'contact@reservr.net',
                subject: 'new signup',
                html: '<p>username: ' + org.name + ' </p><p>orgname: ' + newUser.username + ' </p>'
              };

              transport.sendMail(reminderEmailConfig, function (err, info) {
                console.log(err);
                console.log(info);
              });

              org.defaultTemplate = {
                userSubject: 'Reservation Confirmation',
                userSubjectWaiting: 'You\'ve been included on the waiting list',
                userBody: 'Hey,\n\n You\'ve made a reservation for {seats} seats for "{eventName}" which will take place on {eventDate}. \n\n You can always cancel by clicking this link: {deleteReservationLink} \n\n Have a great day.',
                userBodyWaiting: 'Hello, You\'ve been included on the waiting list with {seats} seats for "{eventName}" which will take place on {eventDate}. \n\n If anything changes we will contact you. \n\n You can always cancel your reservation by clicking this link: {deleteReservationLink} \n\n Have a great day.',
                orgSubject: 'A new reservation for "{eventName}"',
                orgBody: 'Hello, \n\n A new reservation of {seats} seats has been made for "{eventName}" which will take place on {eventDate} by {userName}, {userEmail}. \n\n Have a great day.',
                userUpdateSubject: 'Reservation Update',
                userUpdateBody: 'Hello, \n\n {seats} seats have just become available for "{eventName}" taking place on {eventDate} so we\'ve automatically added you to the invited list. \n\n You can always cancel your reservation by clicking this link: {deleteReservationLink} \n\n Have a great day.',
                userUpdateBodyPartial: 'Hello, \n\n {seatsAvailable} seats have just become available for "{eventName}" taking place on {eventDate} so we\'ve automatically added you to the invited list. \n\n We know you wanted more seats so we are working on it. If anything changes we will let you know. \n\n You can always cancel your reservation by clicking this link: {deleteReservationLink} \n\n Have a great day.',
                remindSubject: 'Reminder for event {eventName}',
                remindBody: 'Hello, \n\n This is a reminder that you have reservd seats for the "{eventName}" event, that will take place {eventDate} at {eventLocation}. Please try to get to the event 15 minutes earlier. \n\n In case you cannot make it to the event please delete your reservation by clicking this link: {deleteReservationLink}. \n\n Have a great day!',
              }

              org.userSubject = 'Reservation Confirmation',
              org.userSubjectWaiting = 'You\'ve been included on the waiting list',
              org.userBody = 'Hey,\n\n You\'ve made a reservation for {seats} seats for "{eventName}" which will take place on {eventDate}. \n\n You can always cancel by clicking this link: {deleteReservationLink} \n\n Have a great day.',
              org.userBodyWaiting = 'Hello, You\'ve been included on the waiting list with {seats} seats for "{eventName}" which will take place on {eventDate}. \n\n If anything changes we will contact you. \n\n You can always cancel your reservation by clicking this link: {deleteReservationLink} \n\n Have a great day.',
              org.orgSubject = 'A new reservation for "{eventName}"',
              org.orgBody = 'Hello, \n\n A new reservation of {seats} seats has been made for "{eventName}" which will take place on {eventDate} by {userName}, {userEmail}. \n\n Have a great day.'

              org.userUpdateSubject = 'Reservation Update'
              org.userUpdateBody = 'Hello, \n\n {seats} seats have just become available for "{eventName}" taking place on {eventDate} so we\'ve automatically added you to the invited list. \n\n You can always cancel your reservation by clicking this link: {deleteReservationLink} \n\n Have a great day.'
              org.userUpdateBodyPartial = 'Hello, \n\n {seatsAvailable} seats have just become available for "{eventName}" taking place on {eventDate} so we\'ve automatically added you to the invited list. \n\n We know you wanted more seats so we are working on it. If anything changes we will let you know. \n\n You can always cancel your reservation by clicking this link: {deleteReservationLink} \n\n Have a great day.'

              org.remindSubject = 'Reminder for event {eventName}';
              org.remindBody = 'Hello, \n\n This is a reminder that you have reservd seats for the "{eventName}" event, that will take place {eventDate} at {eventLocation}. Please try to get to the event 15 minutes earlier. \n\n In case you cannot make it to the event please delete your reservation by clicking this link: {deleteReservationLink}. \n\n Have a great day!';

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
            })

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

        if (!util.isValidPassword(user, password)) {
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