'use strict';

const request = require('./helpers/app');
const { knex } = require('./helpers/db');
const { createTestUser, createJewels, createFactoryUserRow, backdateFactoryStart } = require('./helpers/fixtures');
const { mintAccessToken } = require('./helpers/auth');

async function authedUser(overrides = {}) {
  const user = await createTestUser(overrides);
  return { user, token: mintAccessToken(user.id) };
}

// Factory id 1 (seeded by shows_seed2.js): output jeweltype_id 4, count 6, diamond 5, duration 300.
// Requires materials: jeweltype 3 x9, jeweltype 1 (coins) x10.
const FACTORY_ID = 1;

describe('factory.js', () => {

  describe('startFactory', () => {
    test('happy path consumes materials and turns the factory on', async () => {
      const { user, token } = await authedUser();
      await createFactoryUserRow(user.id, FACTORY_ID, { is_on: false });
      await createJewels(user.id, { 3: 10, 1: 20 });

      const res = await request().post('/startFactory').set('Authorization', `Bearer ${token}`)
        .send({ factory_id: FACTORY_ID });

      expect(res.body.error).toBe(false);
      expect(res.body.start_time).toBeTruthy();

      const j3 = await knex('jewels').where({ user_id: user.id, jeweltype_id: 3 }).first();
      const j1 = await knex('jewels').where({ user_id: user.id, jeweltype_id: 1 }).first();
      expect(j3.count).toBe(1);
      expect(j3.total_count).toBe(1);
      expect(j1.count).toBe(10);
      expect(j1.total_count).toBe(10);

      const fu = await knex('factoryuser').where({ user_id: user.id, factory_id: FACTORY_ID }).first();
      expect(fu.is_on).toBe(1);
      expect(fu.start_time).toBeTruthy();
    });

    test('rejects when the user lacks enough materials', async () => {
      const { user, token } = await authedUser();
      await createFactoryUserRow(user.id, FACTORY_ID, { is_on: false });
      await createJewels(user.id, { 3: 5, 1: 20 }); // 3 needs 9, only have 5

      const res = await request().post('/startFactory').set('Authorization', `Bearer ${token}`)
        .send({ factory_id: FACTORY_ID });

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/Not Enough Jewels/);
    });

    test('rejects starting a factory that is already on', async () => {
      const { user, token } = await authedUser();
      await createFactoryUserRow(user.id, FACTORY_ID, { is_on: true, start_time: new Date() });
      await createJewels(user.id, { 3: 10, 1: 20 });

      const res = await request().post('/startFactory').set('Authorization', `Bearer ${token}`)
        .send({ factory_id: FACTORY_ID });

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/Invalid Operations/);
    });
  });

  describe('stopFactory (early stop, diamond cost)', () => {
    test('happy path: elapsed <= duration, enough diamonds', async () => {
      const { user, token } = await authedUser();
      await createFactoryUserRow(user.id, FACTORY_ID, { is_on: true, start_time: new Date() });
      await createJewels(user.id, { 0: 10, 4: 0 }); // 10 diamonds (need >= 5), output row pre-exists at 0

      const res = await request().post('/stopFactory').set('Authorization', `Bearer ${token}`)
        .send({ factory_id: FACTORY_ID });

      expect(res.body.error).toBe(false);

      const diamond = await knex('jewels').where({ user_id: user.id, jeweltype_id: 0 }).first();
      expect(diamond.count).toBe(5);

      const log = await knex('diamondlog').where({ user_id: user.id }).first();
      expect(log.count).toBe(-5);

      const output = await knex('jewels').where({ user_id: user.id, jeweltype_id: 4 }).first();
      expect(output.count).toBe(6);

      const fu = await knex('factoryuser').where({ user_id: user.id, factory_id: FACTORY_ID }).first();
      expect(fu.is_on).toBe(0);
      expect(fu.start_time).toBeNull();
    });

    test('rejects once elapsed time exceeds the factory duration', async () => {
      const { user, token } = await authedUser();
      await createFactoryUserRow(user.id, FACTORY_ID, { is_on: true });
      await backdateFactoryStart(user.id, FACTORY_ID, 400); // duration is 300
      await createJewels(user.id, { 0: 10 });

      const res = await request().post('/stopFactory').set('Authorization', `Bearer ${token}`)
        .send({ factory_id: FACTORY_ID });

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/Invalid Operation/);
    });

    test('rejects when the user lacks enough diamonds', async () => {
      const { user, token } = await authedUser();
      await createFactoryUserRow(user.id, FACTORY_ID, { is_on: true, start_time: new Date() });
      await createJewels(user.id, { 0: 2 }); // needs >= 5

      const res = await request().post('/stopFactory').set('Authorization', `Bearer ${token}`)
        .send({ factory_id: FACTORY_ID });

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/Invalid Operation/);
    });
  });

  describe('flushFactory (discard, no reward)', () => {
    test('past duration: resets factoryuser with no jewel/diamond changes', async () => {
      const { user, token } = await authedUser();
      await createFactoryUserRow(user.id, FACTORY_ID, { is_on: true });
      await backdateFactoryStart(user.id, FACTORY_ID, 400);
      await createJewels(user.id, { 0: 10, 4: 0 });

      const res = await request().post('/flushFactory').set('Authorization', `Bearer ${token}`)
        .send({ factory_id: FACTORY_ID });

      expect(res.body.error).toBe(false);

      const diamond = await knex('jewels').where({ user_id: user.id, jeweltype_id: 0 }).first();
      expect(diamond.count).toBe(10); // untouched

      const output = await knex('jewels').where({ user_id: user.id, jeweltype_id: 4 }).first();
      expect(output.count).toBe(0); // untouched

      const fu = await knex('factoryuser').where({ user_id: user.id, factory_id: FACTORY_ID }).first();
      expect(fu.is_on).toBe(0);
      expect(fu.start_time).toBeNull();
    });

    test('rejects before the duration has elapsed', async () => {
      const { user, token } = await authedUser();
      await createFactoryUserRow(user.id, FACTORY_ID, { is_on: true, start_time: new Date() });

      const res = await request().post('/flushFactory').set('Authorization', `Bearer ${token}`)
        .send({ factory_id: FACTORY_ID });

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/Invalid Operation/);
    });
  });

  describe('transferJewelsFromFactory (collect output)', () => {
    test('past duration with enough store space: credits output jewels', async () => {
      const { user, token } = await authedUser();
      await createFactoryUserRow(user.id, FACTORY_ID, { is_on: true });
      await backdateFactoryStart(user.id, FACTORY_ID, 400);
      await createJewels(user.id, { 4: 0 });

      const res = await request().post('/transferJewelsFromFactory').set('Authorization', `Bearer ${token}`)
        .send({ factory_id: FACTORY_ID });

      expect(res.body.error).toBe(false);

      const output = await knex('jewels').where({ user_id: user.id, jeweltype_id: 4 }).first();
      expect(output.count).toBe(6);
      expect(output.total_count).toBe(6);

      const fu = await knex('factoryuser').where({ user_id: user.id, factory_id: FACTORY_ID }).first();
      expect(fu.is_on).toBe(0);
      expect(fu.start_time).toBeNull();
    });

    test('rejects (and leaves state untouched) when there is not enough store space', async () => {
      const { user, token } = await authedUser();
      await createFactoryUserRow(user.id, FACTORY_ID, { is_on: true });
      await backdateFactoryStart(user.id, FACTORY_ID, 400);
      await createJewels(user.id, { 4: 0, 3: 20 }); // sum=20 > 25-6=19

      const res = await request().post('/transferJewelsFromFactory').set('Authorization', `Bearer ${token}`)
        .send({ factory_id: FACTORY_ID });

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/Not Enough Space in Jewel Store/);

      const output = await knex('jewels').where({ user_id: user.id, jeweltype_id: 4 }).first();
      expect(output.count).toBe(0); // rolled back, untouched

      const fu = await knex('factoryuser').where({ user_id: user.id, factory_id: FACTORY_ID }).first();
      expect(fu.is_on).toBe(1); // rolled back - user can retry after freeing space
    });

    test('rejects before the duration has elapsed', async () => {
      const { user, token } = await authedUser();
      await createFactoryUserRow(user.id, FACTORY_ID, { is_on: true, start_time: new Date() });

      const res = await request().post('/transferJewelsFromFactory').set('Authorization', `Bearer ${token}`)
        .send({ factory_id: FACTORY_ID });

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/Invalid Operation/);
    });
  });
});
