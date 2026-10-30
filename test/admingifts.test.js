'use strict';

const request = require('./helpers/app');
const { knex } = require('./helpers/db');
const { createAdmin, createTestUser } = require('./helpers/fixtures');
const { mintAccessToken, mintAdminToken } = require('./helpers/auth');

// jeweltype is seeded statically (globalSetup): 0 diamond, 1 coin, 3..17 j1..j15.

async function adminToken() {
  const admin = await createAdmin();
  return mintAdminToken(admin.id);
}

function giftBody(overrides = {}) {
  return {
    productname: 'Wireless Headphones',
    productdetail: 'Over-ear, 30h battery',
    product_pic: 'https://cdn.example.com/headphones.png',
    productlinks: 'https://shop.example.com/headphones',
    priority: 1,
    plus_level: 5,
    total_qty: 10,
    current_qty: 10,
    enabled: true,
    jewels: [{ jeweltype_id: 3, count: 20 }, { jeweltype_id: 0, count: 50 }],
    ...overrides
  };
}

async function insertGift(overrides = {}) {
  const [id] = await knex('gifttasks').insert({
    productname: 'Existing gift', product_pic: 'https://cdn.example.com/x.png',
    priority: 1, plus_level: 2, total_qty: 5, current_qty: 5, enabled: true, cash: false, money: 0,
    ...overrides
  });
  await knex('gifttaskdetails').insert({ gifttask_id: id, jeweltype_id: 4, count: 7 });
  return id;
}

describe('admingifts.js', () => {

  test('gift routes require an admin token', async () => {
    const user = await createTestUser();
    const res = await request().get('/admin/gifts').set('Authorization', `Bearer ${mintAccessToken(user.id)}`);
    expect(res.status).toBe(401);
  });

  test('lists jewel types for the requirement picker', async () => {
    const token = await adminToken();
    const res = await request().get('/admin/jeweltypes').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.jeweltypes[0]).toEqual({ id: 0, name: 'diamond' });
  });

  test('creates a product gift that the game section then lists', async () => {
    const token = await adminToken();

    const res = await request().post('/admin/gifts').set('Authorization', `Bearer ${token}`).send(giftBody());
    expect(res.status).toBe(200);
    expect(res.body.gift).toMatchObject({
      productname: 'Wireless Headphones', cash: false, money: 0, enabled: true, total_qty: 10, current_qty: 10, won: 0,
      jewels: [{ jeweltype_id: 3, name: 'j1', count: 20 }, { jeweltype_id: 0, name: 'diamond', count: 50 }]
    });

    const log = await knex('adminlogs').where({ action: 'gift_create' }).first();
    expect(log.payload.after.id).toBe(res.body.gift.id);

    const player = await createTestUser();
    const game = await request().post('/getGiftTasks').set('Authorization', `Bearer ${mintAccessToken(player.id)}`)
      .send({ page: 0 });
    expect(game.body.gifttasks.map(g => g.id)).toEqual([res.body.gift.id]);

    const details = await request().post('/getGiftTasksElements').set('Authorization', `Bearer ${mintAccessToken(player.id)}`)
      .send({ gifttask_id: res.body.gift.id });
    expect(details.body.gifttaskdetails).toHaveLength(2);
  });

  test('rejects invalid gifts without writing anything', async () => {
    const token = await adminToken();
    const bad = [
      { productname: '' },
      { product_pic: 'http://cdn.example.com/x.png' },
      { product_pic: 'not a url' },
      { priority: -1 },
      { plus_level: 1.5 },
      { total_qty: 0 },
      { current_qty: 11 },
      { enabled: 'yes' },
      { jewels: [] },
      { jewels: [{ jeweltype_id: 3, count: 0 }] },
      { jewels: [{ jeweltype_id: 3, count: 1 }, { jeweltype_id: 3, count: 2 }] },
      { jewels: [{ jeweltype_id: 999, count: 1 }] }
    ];
    for (const overrides of bad) {
      const res = await request().post('/admin/gifts').set('Authorization', `Bearer ${token}`).send(giftBody(overrides));
      expect(res.status).toBe(400);
    }
    expect(await knex('gifttasks')).toHaveLength(0);
  });

  test('lists every gift, disabled ones included, with won counts', async () => {
    const token = await adminToken();
    const user = await createTestUser();
    const a = await insertGift({ priority: 2 });
    const b = await insertGift({ priority: 1, enabled: false });
    await knex('gifttaskusers').insert({ gifttask_id: a, user_id: user.id, cycle: 202644, done: true });

    const res = await request().get('/admin/gifts').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.gifts.map(g => [g.id, g.enabled, g.won])).toEqual([[b, false, 0], [a, true, 1]]);
    expect(res.body.gifts[0].jewels).toEqual([{ jeweltype_id: 4, name: 'j2', count: 7 }]);
  });

  test('updates fields and replaces jewel requirements', async () => {
    const token = await adminToken();
    const id = await insertGift();

    const res = await request().put(`/admin/gifts/${id}`).set('Authorization', `Bearer ${token}`)
      .send(giftBody({ total_qty: 20, current_qty: 15, expected_current_qty: 5, jewels: [{ jeweltype_id: 5, count: 3 }] }));
    expect(res.status).toBe(200);
    expect(res.body.gift).toMatchObject({ id, productname: 'Wireless Headphones', total_qty: 20, current_qty: 15 });
    expect(await knex('gifttaskdetails').where({ gifttask_id: id }).select('jeweltype_id', 'count'))
      .toEqual([{ jeweltype_id: 5, count: 3 }]);

    const log = await knex('adminlogs').where({ action: 'gift_update' }).first();
    expect(log.payload.before.current_qty).toBe(5);
    expect(log.payload.after.current_qty).toBe(15);
  });

  test('a stale update is rejected with 409 so redeemed gifts are not restocked', async () => {
    const token = await adminToken();
    const id = await insertGift();
    await knex('gifttasks').where({ id }).decrement('current_qty', 1); // a player redeemed one meanwhile

    const res = await request().put(`/admin/gifts/${id}`).set('Authorization', `Bearer ${token}`)
      .send(giftBody({ total_qty: 5, current_qty: 5, expected_current_qty: 5 }));
    expect(res.status).toBe(409);
    expect(res.body.gift.current_qty).toBe(4);
    expect((await knex('gifttasks').where({ id }).first()).productname).toBe('Existing gift');
  });

  test('update requires expected_current_qty, and 404s for an unknown gift', async () => {
    const token = await adminToken();
    const id = await insertGift();

    const missing = await request().put(`/admin/gifts/${id}`).set('Authorization', `Bearer ${token}`).send(giftBody());
    expect(missing.status).toBe(400);

    const unknown = await request().put('/admin/gifts/999999').set('Authorization', `Bearer ${token}`)
      .send(giftBody({ expected_current_qty: 10 }));
    expect(unknown.status).toBe(404);
  });

  test('cash gifts cannot be edited, only enabled or disabled', async () => {
    const token = await adminToken();
    const id = await insertGift({ cash: true, money: 29 });

    const edit = await request().put(`/admin/gifts/${id}`).set('Authorization', `Bearer ${token}`)
      .send(giftBody({ expected_current_qty: 5 }));
    expect(edit.status).toBe(400);

    const toggle = await request().put(`/admin/gifts/${id}/enabled`).set('Authorization', `Bearer ${token}`)
      .send({ enabled: false });
    expect(toggle.status).toBe(200);
    expect(toggle.body.gift).toMatchObject({ id, enabled: false, cash: true, money: 29 });
    expect(await knex('adminlogs').where({ action: 'gift_enable' })).toHaveLength(1);
  });

  test('a disabled gift disappears from the game section', async () => {
    const token = await adminToken();
    const id = await insertGift();

    await request().put(`/admin/gifts/${id}/enabled`).set('Authorization', `Bearer ${token}`).send({ enabled: false });

    const player = await createTestUser();
    const game = await request().post('/getGiftTasks').set('Authorization', `Bearer ${mintAccessToken(player.id)}`)
      .send({ page: 0 });
    expect(game.body.gifttasks).toEqual([]);
  });
});
