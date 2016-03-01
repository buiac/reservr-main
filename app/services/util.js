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

  var getWordsBetweenCurlies = function (str) {
    var results = []
    var re = /{([^}]+)}/g
    var text = re.exec(str)
    while (text) {
      results.push(text[1])
      text = re.exec(str)
    }
    return results
  };

  var uniqueTest = function (arr) {
    var n, y, x, i, r;
    var arrResult = {},
      unique = [];
    for (i = 0, n = arr.length; i < n; i++) {
      var item = arr[i];
      arrResult[item.title + " - " + item.artist] = item;
    }
    i = 0;
    for (var item in arrResult) {
      unique[i++] = arrResult[item];
    }
    return unique;
  }

  return {
    createHash: createHash,
    validateEmail: validateEmail,
    isValidPassword: isValidPassword,
    getWordsBetweenCurlies: getWordsBetweenCurlies,
    uniqueTest: uniqueTest
  };
}