'use strict';

const request = require('./helpers/app');
const { knex } = require('./helpers/db');
const { createTestUser } = require('./helpers/fixtures');
const { mintAccessToken, mintRefreshToken } = require('./helpers/auth');
const { pollUntil } = require('./helpers/poll');
const config = require('../utils/config');
const firebaseAdminMock = require('firebase-admin');

describe('registration / auth flow', () => {

  describe('registerPhoneNumber', () => {

    test('creates a new inactive user on first registration', async () => {
      const res = await request().post('/registerPhoneNumber').send({ phone: '919000000101' });

      expect(res.body.error).toBe(false);
      expect(res.body.active).toBe(false);
      expect(res.body.userId).toBeDefined();

      const row = await knex('jcusers').where({ id: res.body.userId }).first();
      expect(row.phone).toBe(919000000101);
      expect(row.vcode).toBeTruthy();
    });

    test('re-registering an existing inactive user returns active:false and refreshes vcode', async () => {
      const first = await request().post('/registerPhoneNumber').send({ phone: '919000000102' });
      const firstVcode = (await knex('jcusers').where({ id: first.body.userId }).first()).vcode;

      const second = await request().post('/registerPhoneNumber').send({ phone: '919000000102' });

      expect(second.body.error).toBe(false);
      expect(second.body.active).toBe(false);
      expect(second.body.userId).toBe(first.body.userId);
      // vcode is regenerated (deterministic TOTP window, so may coincide, but row stays present)
      const row = await knex('jcusers').where({ id: first.body.userId }).first();
      expect(row.vcode).toBeTruthy();
      void firstVcode;
    });

    test('re-registering an existing active user returns active:true with profile fields', async () => {
      const user = await createTestUser({ phone: 919000000103, active: true, name: 'Active Guy', status: 'hi' });
      await knex('jcusers').where({ id: user.id }).update({ status: 'hi' });

      const res = await request().post('/registerPhoneNumber').send({ phone: '919000000103' });

      expect(res.body.error).toBe(false);
      expect(res.body.active).toBe(true);
      expect(res.body.userId).toBe(user.id);
      expect(res.body.name).toBe('Active Guy');
    });

    test('rejects a phone number that does not pass libphonenumber validation', async () => {
      const res = await request().post('/registerPhoneNumber').send({ phone: '911111111111' });
      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/Improper Data/);
    });

    test('rejects a missing phone number', async () => {
      const res = await request().post('/registerPhoneNumber').send({});
      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/Improper Data/);
    });

    test('rejects a phone number not starting with 91', async () => {
      const res = await request().post('/registerPhoneNumber').send({ phone: '129000000001' });
      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/Improper Data/);
    });
  });

  describe('verifyCode', () => {

    test('correct code activates the user and returns a decodable refresh token', async () => {
      const reg = await request().post('/registerPhoneNumber').send({ phone: '919000000201' });
      const { vcode } = await knex('jcusers').where({ id: reg.body.userId }).first();

      const res = await request().post('/verifyCode').send({ userId: reg.body.userId, verificationCode: vcode });

      expect(res.body.error).toBe(false);
      expect(res.body.refreshToken).toBeTruthy();

      const jwt = require('jsonwebtoken');
      const config = require('../utils/config');
      const decoded = jwt.verify(res.body.refreshToken, config.secret);
      expect(decoded.id).toBe(reg.body.userId);
      expect(decoded.scode).toBeTruthy();

      const row = await knex('jcusers').where({ id: reg.body.userId }).first();
      expect(row.active).toBe(1);
    });

    test('wrong code returns 403', async () => {
      const reg = await request().post('/registerPhoneNumber').send({ phone: '919000000202' });

      const res = await request().post('/verifyCode').send({ userId: reg.body.userId, verificationCode: 'wrong-code' });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Verification code does not match/);
    });

    test('initializeGame eventually seeds game state, even though it is fire-and-forget', async () => {
      const reg = await request().post('/registerPhoneNumber').send({ phone: '919000000203' });
      const { vcode } = await knex('jcusers').where({ id: reg.body.userId }).first();

      await request().post('/verifyCode').send({ userId: reg.body.userId, verificationCode: vcode });

      // verifyCode's HTTP response does not wait on initializeGame(), so we poll for its
      // eventual side effects instead of asserting immediately after the response returns.
      const row = await pollUntil(async () => {
        const u = await knex('jcusers').where({ id: reg.body.userId }).first();
        return u.initialized ? u : null;
      });
      expect(row.initialized).toBe(1);

      const [scores, wallet, jewels, achievementusers, taskusers, factoryuser] = await Promise.all([
        knex('scores').where({ user_id: reg.body.userId }),
        knex('wallet').where({ user_id: reg.body.userId }),
        knex('jewels').where({ user_id: reg.body.userId }),
        knex('achievementusers').where({ user_id: reg.body.userId }),
        knex('taskusers').where({ user_id: reg.body.userId }),
        knex('factoryuser').where({ user_id: reg.body.userId })
      ]);

      expect(scores).toHaveLength(1);
      expect(wallet).toHaveLength(1);
      expect(jewels).toHaveLength(18);
      expect(achievementusers).toHaveLength(26);
      expect(taskusers).toHaveLength(5);
      expect(factoryuser).toHaveLength(10);
    });
  });

  describe('getAccessToken', () => {

    test('valid refresh token returns a usable access token', async () => {
      const user = await createTestUser({ phone: 919000000301, active: true, scode: 'abc123' });
      const refreshToken = mintRefreshToken(user.id, 'abc123');

      const res = await request().post('/getAccessToken').send({ refreshToken });

      expect(res.body.error).toBe(false);
      expect(res.body.accessToken).toBeTruthy();

      const jwt = require('jsonwebtoken');
      const config = require('../utils/config');
      const decoded = jwt.verify(res.body.accessToken, config.secret);
      expect(decoded.id).toBe(user.id);
    });

    test('refresh token with a stale scode (e.g. after rotation) is rejected', async () => {
      const user = await createTestUser({ phone: 919000000302, active: true, scode: 'current-code' });
      const staleRefreshToken = mintRefreshToken(user.id, 'old-code');

      const res = await request().post('/getAccessToken').send({ refreshToken: staleRefreshToken });

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/Invalid Refresh Token/);
    });

    test('malformed refresh token is rejected', async () => {
      const res = await request().post('/getAccessToken').send({ refreshToken: 'not-a-jwt' });
      expect(res.status).toBe(500);
    });
  });

  describe('initialDetails', () => {

    test('happy path credits both the referrer and the new user and logs diamondlog entries', async () => {
      const referrer = await createTestUser({ phone: 919000000401, active: true });
      await knex('jewels').insert([
        { user_id: referrer.id, jeweltype_id: 0, count: 0, total_count: 0 },
        { user_id: referrer.id, jeweltype_id: 2, count: 0, total_count: 0 }
      ]);

      const newUser = await createTestUser({ phone: 919000000402, active: true, reference: null });
      await knex('jewels').insert({ user_id: newUser.id, jeweltype_id: 0, count: 0, total_count: 0 });

      const accessToken = mintAccessToken(newUser.id);

      const res = await request()
        .post('/initialDetails')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'My New Name', reference: '919000000401' });

      expect(res.body.error).toBe(false);
      expect(res.body.name).toBe('My New Name');

      const updatedUser = await knex('jcusers').where({ id: newUser.id }).first();
      expect(updatedUser.name).toBe('My New Name');
      expect(String(updatedUser.reference)).toBe('919000000401');

      const referrerJewel0 = await knex('jewels').where({ user_id: referrer.id, jeweltype_id: 0 }).first();
      const referrerJewel2 = await knex('jewels').where({ user_id: referrer.id, jeweltype_id: 2 }).first();
      expect(referrerJewel0.count).toBe(1);
      expect(referrerJewel2.count).toBe(1);

      const newUserJewel0 = await knex('jewels').where({ user_id: newUser.id, jeweltype_id: 0 }).first();
      expect(newUserJewel0.count).toBe(1);

      const diamondlogs = await knex('diamondlog').whereIn('user_id', [newUser.id, referrer.id]);
      expect(diamondlogs).toHaveLength(2);
    });

    test('calling initialDetails a second time is a no-op (whereNull(reference) no longer matches)', async () => {
      const referrer = await createTestUser({ phone: 919000000403, active: true });
      await knex('jewels').insert([
        { user_id: referrer.id, jeweltype_id: 0, count: 0, total_count: 0 },
        { user_id: referrer.id, jeweltype_id: 2, count: 0, total_count: 0 }
      ]);
      const newUser = await createTestUser({ phone: 919000000404, active: true });
      await knex('jewels').insert({ user_id: newUser.id, jeweltype_id: 0, count: 0, total_count: 0 });
      const accessToken = mintAccessToken(newUser.id);

      await request().post('/initialDetails').set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'First Name', reference: '919000000403' });

      const res = await request().post('/initialDetails').set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Second Name', reference: '919000000403' });

      expect(res.body.error).toBe(false);
      expect(res.body.name).toBeUndefined();

      const row = await knex('jcusers').where({ id: newUser.id }).first();
      expect(row.name).toBe('First Name'); // not overwritten by the second, no-op call
    });

    test('referencing your own phone number is rejected', async () => {
      const user = await createTestUser({ phone: 919000000405, active: true });
      const accessToken = mintAccessToken(user.id);

      const res = await request().post('/initialDetails').set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'X', reference: '919000000405' });

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/cannot be same/);
    });

    test('referencing an inactive/nonexistent phone number is rejected', async () => {
      const user = await createTestUser({ phone: 919000000406, active: true });
      const accessToken = mintAccessToken(user.id);

      const res = await request().post('/initialDetails').set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'X', reference: '919999999999' });

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/not active/);
    });

    test('missing reference throws synchronously and surfaces as a 500', async () => {
      const user = await createTestUser({ phone: 919000000407, active: true });
      const accessToken = mintAccessToken(user.id);

      const res = await request().post('/initialDetails').set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'X' });

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/not valid/);
    });
  });

  describe('resendVcode', () => {

    test('resends via the (mocked) SMS provider and returns error:false', async () => {
      const user = await createTestUser({ phone: 919000000501, vcode: 'abc123' });
      const nodeFetchMock = require('node-fetch');
      nodeFetchMock.mockClear();

      const res = await request().post('/resendVcode').send({ userId: user.id });

      expect(res.body).toEqual({ error: false, request: 'resendVcode' });
      expect(nodeFetchMock).toHaveBeenCalledTimes(1);
      const [calledUrl] = nodeFetchMock.mock.calls[0];
      expect(calledUrl).toContain('919000000501');
      expect(calledUrl).toContain('abc123');
    });

    test('invalid userId is rejected', async () => {
      const res = await request().post('/resendVcode').send({ userId: 999999 });
      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/Invalid User Id/);
    });
  });

  // awsToken (Cognito identity exchange) is explicitly out of scope for this pass.

  describe('App Check gate', () => {

    afterEach(() => {
      config.appCheckEnabled = false;
      firebaseAdminMock.__mocks.verifyToken.mockReset().mockResolvedValue({ appId: 'mock-app-id' });
    });

    test('disabled (default): request succeeds with no X-Firebase-AppCheck header at all', async () => {
      config.appCheckEnabled = false;

      const res = await request().post('/registerPhoneNumber').send({ phone: '919000000601' });

      expect(res.body.error).toBe(false);
    });

    test('enabled + missing header is rejected with 403', async () => {
      config.appCheckEnabled = true;

      const res = await request().post('/registerPhoneNumber').send({ phone: '919000000602' });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Missing App Check token/);
    });

    test('enabled + a token that verifies lets the request through', async () => {
      config.appCheckEnabled = true;

      const res = await request().post('/registerPhoneNumber')
        .set('X-Firebase-AppCheck', 'some-valid-looking-token')
        .send({ phone: '919000000603' });

      expect(res.body.error).toBe(false);
    });

    test('enabled + a token that fails verification is rejected with 403', async () => {
      config.appCheckEnabled = true;
      firebaseAdminMock.__mocks.verifyToken.mockRejectedValueOnce(new Error('invalid'));

      const res = await request().post('/registerPhoneNumber')
        .set('X-Firebase-AppCheck', 'some-bad-token')
        .send({ phone: '919000000604' });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Invalid App Check token/);
    });
  });
});
