'use strict';

// Jest auto-applies this to every test file for `require('node-fetch')` - no jest.mock()
// call needed. node-fetch v2 is CJS, `module.exports` is the fetch function itself.
// Covers controllers/registration.js's resendVcode now; reusable as-is for
// controllers/contacts.js's inviteUser in a later test pass.

module.exports = jest.fn().mockResolvedValue({
  json: () => Promise.resolve({ Status: 'Success' })
});
