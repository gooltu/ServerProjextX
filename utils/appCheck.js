'use strict';

let getFirebaseAdmin = require('./firebaseAdmin');
let config = require('./config');

module.exports = function requireAppCheck(req, res, next) {

  if (!config.appCheckEnabled)
    return next();

  let token = req.header('X-Firebase-AppCheck');

  if (!token) {
    let err = new Error('Missing App Check token');
    err.status = 403;
    return next(err);
  }

  let admin = getFirebaseAdmin();

  admin.appCheck().verifyToken(token)
    .then(() => next())
    .catch(() => {
      let err = new Error('Invalid App Check token');
      err.status = 403;
      next(err);
    });

};
