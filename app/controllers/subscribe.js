/* superadmin
 */

module.exports = function(config, db) {
  'use strict';

  var nodemailer = require('nodemailer');
  var smtpTransport = require('nodemailer-smtp-transport');
  var transport = nodemailer.createTransport(smtpTransport(config.mandrill));

  var newsletter = function (req, res, next) {
    var userEmailConfig = {
      from: 'contact@reservr.net', // user.username
      to: 'contact@reservr.net',
      subject: 'reservr newsletter',
      html: 'user ' + req.body.email + ' just singed up for newsletter'
    };

    transport.sendMail(userEmailConfig, function (err, info) {
      
      res.json({
        status: 'success'
      })
    });
  }
    
  return {
    newsletter: newsletter
  };

};
