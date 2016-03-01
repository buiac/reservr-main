module.exports = function(config, db) {
  var bCrypt = require('bcrypt-nodejs');

  // Generates hash using bCrypt
  var createHash = function(password){
    return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
  };

  var validateEmail = function (email) {
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
  };

  var isValidPassword = function(user, password){
    return bCrypt.compareSync(password, user.password);
  };

  return {
    createHash: createHash,
    validateEmail: validateEmail,
    isValidPassword: isValidPassword
  };
}