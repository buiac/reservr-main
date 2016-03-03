/* superadmin
 */

module.exports = function(config, db) {
  'use strict';

  var view = function (req, res, next) {

    db.orgs.findOne({
      userId: req.user._id
    }, function (err, org) {
      
      res.render('dashboard/dashboard', {
        user: req.user,
        org: org
      });

    })
    
  }
    
  return {
    view: view
  };

};
