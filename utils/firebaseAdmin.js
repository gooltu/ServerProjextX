'use strict';

let admin = require('firebase-admin');

// Lazy, not eager: this module is required unconditionally by utils/appCheck.js (and thus
// by routes/index.js at boot), but admin.credential.cert() throws synchronously if the
// Firebase service-account env vars aren't set - which they currently aren't in this repo's
// .env. Initializing eagerly here would crash the whole server on startup regardless of
// whether App Check is even enabled. Deferring it means it only runs the first time a
// request actually reaches the enabled middleware.
module.exports = function getFirebaseAdmin() {

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        project_id: process.env.project_id,
        private_key: process.env.private_key && process.env.private_key.replace(/\\n/g, '\n'),
        client_email: process.env.client_email
      })
    });
  }

  return admin;

};
