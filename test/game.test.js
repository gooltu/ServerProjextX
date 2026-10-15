'use strict';

const jwt = require('jsonwebtoken');
const config = require('../utils/config');
const request = require('./helpers/app');
const { knex } = require('./helpers/db');
const { createTestUser, createScores, createJewels } = require('./helpers/fixtures');
const { mintAccessToken } = require('./helpers/auth');

async function authedUser(overrides = {}) {
  const user = await createTestUser(overrides);
  return { user, token: mintAccessToken(user.id) };
}

async function storeSum(userId) {
  const row = await knex('jewels')
    .where({ user_id: userId })
    .whereNotIn('jeweltype_id', [0, 1, 2])
    .sum('count as sum')
    .first();
  return Number(row.sum) || 0;
}

describe('game.js', () => {

  describe('getGameState', () => {
    test('returns the user\'s scores and jewels', async () => {
      const { user, token } = await authedUser();
      await createScores(user.id, { level: 3, points: 10 });
      await createJewels(user.id, { 0: 2, 3: 5 });

      const res = await request().get('/getGameState').set('Authorization', `Bearer ${token}`);

      expect(res.body.error).toBe(false);
      expect(res.body.scores.level).toBe(3);
      expect(res.body.jewels).toHaveLength(2);
    });
  });

  describe('pickJewel', () => {
    test('increments a legal jewel type under capacity', async () => {
      const { user, token } = await authedUser();
      await createJewels(user.id, { 3: 1 });

      const res = await request().post('/pickJewel').set('Authorization', `Bearer ${token}`)
        .send({ jeweltype: 3 });

      expect(res.body.error).toBe(false);
      const row = await knex('jewels').where({ user_id: user.id, jeweltype_id: 3 }).first();
      expect(row.count).toBe(2);
    });

    test('rejects an illegal jewel type', async () => {
      const { token } = await authedUser();

      const res = await request().post('/pickJewel').set('Authorization', `Bearer ${token}`)
        .send({ jeweltype: 4 });

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/Illegal Operation/);
    });

    test('rejects when the store is already full (sum >= 25)', async () => {
      const { user, token } = await authedUser();
      await createJewels(user.id, { 3: 25 });

      const res = await request().post('/pickJewel').set('Authorization', `Bearer ${token}`)
        .send({ jeweltype: 6 });

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/Jewel Store is full/);
      expect(await storeSum(user.id)).toBe(25);
    });

    test('concurrent picks at capacity-1: exactly one succeeds, store ends at exactly 25', async () => {
      const { user, token } = await authedUser();
      await createJewels(user.id, { 3: 24 });

      const [a, b] = await Promise.all([
        request().post('/pickJewel').set('Authorization', `Bearer ${token}`).send({ jeweltype: 3 }),
        request().post('/pickJewel').set('Authorization', `Bearer ${token}`).send({ jeweltype: 6 })
      ]);

      const results = [a, b];
      const successes = results.filter(r => r.body.error === false);
      const failures = results.filter(r => r.status === 500);

      expect(successes).toHaveLength(1);
      expect(failures).toHaveLength(1);
      expect(failures[0].body.message).toMatch(/Jewel Store is full/);
      expect(await storeSum(user.id)).toBe(25);
    });
  });

  describe('bulkPickJewel', () => {
    test('applies every legal entry when there is enough capacity', async () => {
      const { user, token } = await authedUser();
      await createJewels(user.id, { 3: 0, 6: 0 });

      const res = await request().post('/bulkPickJewel').set('Authorization', `Bearer ${token}`)
        .send({ jewelarray: [{ type: 3 }, { type: 6 }] });

      expect(res.body.error).toBe(false);
      const rows = await knex('jewels').where({ user_id: user.id }).whereIn('jeweltype_id', [3, 6]);
      rows.forEach(r => expect(r.count).toBe(1));
    });

    test('silently truncates to remaining capacity, ignoring the rest of the array', async () => {
      const { user, token } = await authedUser();
      // sum = 23 across a non-0/1/2 type, leaving exactly 2 slots of capacity.
      await createJewels(user.id, { 3: 23, 6: 0, 9: 0, 12: 0, 15: 0 });

      const res = await request().post('/bulkPickJewel').set('Authorization', `Bearer ${token}`)
        .send({ jewelarray: [{ type: 6 }, { type: 9 }, { type: 12 }, { type: 15 }] });

      expect(res.body.error).toBe(false);

      const [j6, j9, j12, j15] = await Promise.all([
        knex('jewels').where({ user_id: user.id, jeweltype_id: 6 }).first(),
        knex('jewels').where({ user_id: user.id, jeweltype_id: 9 }).first(),
        knex('jewels').where({ user_id: user.id, jeweltype_id: 12 }).first(),
        knex('jewels').where({ user_id: user.id, jeweltype_id: 15 }).first()
      ]);

      // Only the first 2 (remaining-capacity count) entries are applied; the rest are dropped.
      expect(j6.count).toBe(1);
      expect(j9.count).toBe(1);
      expect(j12.count).toBe(0);
      expect(j15.count).toBe(0);
    });

    test('rejects an empty array', async () => {
      const { token } = await authedUser();

      const res = await request().post('/bulkPickJewel').set('Authorization', `Bearer ${token}`)
        .send({ jewelarray: [] });

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/Invalid data/);
    });
  });

  describe('bulkPickJewelVerified', () => {
    function mintCode(userId, overrides = {}) {
      return jwt.sign(
        { id: userId, ts: Date.now(), nonce: 'test-nonce', ...overrides },
        config.secret,
        { noTimestamp: true }
      );
    }

    test('applies every legal entry when all codes are valid for this user', async () => {
      const { user, token } = await authedUser();
      await createJewels(user.id, { 3: 0, 6: 0 });

      const res = await request().post('/bulkPickJewelVerified').set('Authorization', `Bearer ${token}`)
        .send({
          jewelarray: [
            { type: 3, code: mintCode(user.id) },
            { type: 6, code: mintCode(user.id, { nonce: 'another-draw' }) }
          ]
        });

      expect(res.body.error).toBe(false);
      const rows = await knex('jewels').where({ user_id: user.id }).whereIn('jeweltype_id', [3, 6]);
      rows.forEach(r => expect(r.count).toBe(1));
    });

    test('still truncates to remaining capacity and skips illegal types, same as bulkPickJewel', async () => {
      const { user, token } = await authedUser();
      await createJewels(user.id, { 3: 23, 6: 0, 9: 0 });

      const res = await request().post('/bulkPickJewelVerified').set('Authorization', `Bearer ${token}`)
        .send({
          jewelarray: [
            { type: 6, code: mintCode(user.id) },
            { type: 9, code: mintCode(user.id) }
          ]
        });

      expect(res.body.error).toBe(false);
      const j6 = await knex('jewels').where({ user_id: user.id, jeweltype_id: 6 }).first();
      const j9 = await knex('jewels').where({ user_id: user.id, jeweltype_id: 9 }).first();
      expect(j6.count).toBe(1);
      expect(j9.count).toBe(1);
    });

    test('rejects the whole request if any item\'s code belongs to a different user, crediting nothing', async () => {
      const { user, token } = await authedUser();
      const otherUser = await createTestUser({ phone: 919000000902 });
      await createJewels(user.id, { 3: 0, 6: 0 });

      const res = await request().post('/bulkPickJewelVerified').set('Authorization', `Bearer ${token}`)
        .send({
          jewelarray: [
            { type: 3, code: mintCode(user.id) },
            { type: 6, code: mintCode(otherUser.id) } // wrong user
          ]
        });

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/Invalid Code/);

      const j3 = await knex('jewels').where({ user_id: user.id, jeweltype_id: 3 }).first();
      const j6 = await knex('jewels').where({ user_id: user.id, jeweltype_id: 6 }).first();
      expect(j3.count).toBe(0); // nothing credited, not even the item with a valid code
      expect(j6.count).toBe(0);
    });

    test('rejects the whole request if any item\'s code is garbage/malformed', async () => {
      const { user, token } = await authedUser();
      await createJewels(user.id, { 3: 0 });

      const res = await request().post('/bulkPickJewelVerified').set('Authorization', `Bearer ${token}`)
        .send({
          jewelarray: [
            { type: 3, code: mintCode(user.id) },
            { type: 6, code: 'not-a-real-jwt' }
          ]
        });

      expect(res.status).toBe(500);
      const j3 = await knex('jewels').where({ user_id: user.id, jeweltype_id: 3 }).first();
      expect(j3.count).toBe(0);
    });

    test('rejects an empty array', async () => {
      const { token } = await authedUser();

      const res = await request().post('/bulkPickJewelVerified').set('Authorization', `Bearer ${token}`)
        .send({ jewelarray: [] });

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/Invalid data/);
    });
  });

  describe('getJewels', () => {
    test('returns 25 jewels, all drawn from the legal basic set, plus a decodable code', async () => {
      const { user, token } = await authedUser();

      const res = await request().get('/getJewels').set('Authorization', `Bearer ${token}`);

      expect(res.body.error).toBe(false);
      expect(res.body.jewels).toHaveLength(25);
      res.body.jewels.forEach(j => expect([3, 6, 9, 12, 15]).toContain(j));

      const decoded = jwt.verify(res.body.code, config.secret);
      expect(decoded.id).toBe(user.id);
      expect(decoded.ts).toBeDefined();
      expect(decoded.nonce).toBeDefined();
    });

    test('two calls for the same user produce different codes', async () => {
      const { token } = await authedUser();

      const [a, b] = await Promise.all([
        request().get('/getJewels').set('Authorization', `Bearer ${token}`),
        request().get('/getJewels').set('Authorization', `Bearer ${token}`)
      ]);

      expect(a.body.code).not.toBe(b.body.code);
    });
  });

  describe('checkJewelCode', () => {
    test('a code issued to this user reports valid:true with a small, non-negative age', async () => {
      const { user, token } = await authedUser();
      const code = jwt.sign({ id: user.id, ts: Date.now() - 2000, nonce: 'abc' }, config.secret, { noTimestamp: true });

      const res = await request().post('/checkJewelCode').set('Authorization', `Bearer ${token}`)
        .send({ code });

      expect(res.body.error).toBe(false);
      expect(res.body.valid).toBe(true);
      expect(res.body.ageSeconds).toBeGreaterThanOrEqual(2);
      expect(res.body.ageSeconds).toBeLessThan(10);
    });

    test('a code issued to a different user is rejected', async () => {
      const { token } = await authedUser();
      const otherUser = await createTestUser({ phone: 919000000901 });
      const code = jwt.sign({ id: otherUser.id, ts: Date.now(), nonce: 'abc' }, config.secret, { noTimestamp: true });

      const res = await request().post('/checkJewelCode').set('Authorization', `Bearer ${token}`)
        .send({ code });

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/Invalid Code/);
    });

    test('a tampered/garbage code is rejected with jsonwebtoken\'s own error', async () => {
      const { token } = await authedUser();

      const res = await request().post('/checkJewelCode').set('Authorization', `Bearer ${token}`)
        .send({ code: 'not-a-real-jwt' });

      expect(res.status).toBe(500);
      expect(res.body.message).toBeTruthy();
    });
  });
});
