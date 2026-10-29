'use strict';

const jwt = require('jsonwebtoken');
const config = require('../../utils/config');

// utils/passport.js's verifyPayload trusts the JWT payload as-is (no DB lookup), so any
// token signed with config.secret and an `id` claim is valid for passport.authenticate('jwt').
function mintAccessToken(userId) {
  return jwt.sign({ id: userId }, config.secret);
}

// Matches the refresh token shape issued by controllers/registration.js's verifyCode.
function mintRefreshToken(userId, scode) {
  return jwt.sign({ id: userId, scode }, config.secret, { noTimestamp: true });
}

// Matches the admin token shape issued by controllers/admin.js's login.
function mintAdminToken(adminId, options = {}) {
  return jwt.sign({ id: adminId }, config.adminSecret, { audience: 'admin', expiresIn: '8h', ...options });
}

module.exports = { mintAccessToken, mintRefreshToken, mintAdminToken };
