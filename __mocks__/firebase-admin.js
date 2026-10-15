'use strict';

// Jest auto-applies this to every test file for `require('firebase-admin')` - no
// jest.mock() call needed. Covers utils/firebaseAdmin.js's init + utils/appCheck.js's
// admin.appCheck().verifyToken() call, without needing real Firebase credentials or a
// network call. Also reusable, unmodified, for a future mongooseim.js test pass.

const verifyToken = jest.fn().mockResolvedValue({ appId: 'mock-app-id' });

module.exports = {
  apps: [],
  initializeApp: jest.fn(),
  credential: { cert: jest.fn() },
  appCheck: () => ({ verifyToken }),
  __mocks: { verifyToken }
};
