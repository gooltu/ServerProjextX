'use strict';

// Jest auto-applies this to every test file for `require('aws-sdk')` - no jest.mock() call
// needed. Covers controllers/registration.js's module-load-time `AWS.config.update(...)`
// global mutation (neutralized here as a no-op) and its Cognito `awsToken` handler, plus
// controllers/uploads.js's S3 presigned URLs for a later test pass.

const getSignedUrlPromise = jest.fn().mockResolvedValue('https://mock-s3-url.test/signed');
const getOpenIdTokenForDeveloperIdentity = jest.fn((params, cb) => {
  cb(null, { IdentityId: 'mock-identity-id', Token: 'mock-token' });
});

function S3() {
  return { getSignedUrlPromise };
}

function CognitoIdentity() {
  return { getOpenIdTokenForDeveloperIdentity };
}

module.exports = {
  config: {
    update: jest.fn(),
    apiVersions: {}
  },
  S3,
  CognitoIdentity,
  __mocks: { getSignedUrlPromise, getOpenIdTokenForDeveloperIdentity }
};
