/* superadmin
 */

module.exports = function(config, db) {
  'use strict';

  var dashboard = function (req, res, next) {
    db.orgs.find({}, function (err, orgs) {
      
      db.users.find({}, function (err, users) {

        orgs.forEach(function (org) {
          users.forEach(function (user) {
            
            
            if (org.userId === user._id) {
              user.orgName = org.name;
              org.username = user.username;
            }
            
            
          })
        })
        
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
