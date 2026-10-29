'use strict';

const request = require('./helpers/app');
const { knex } = require('./helpers/db');
const {
  createAdmin,
  createTestUser,
  createScores,
  createTaskUserRow,
  setFutureTasks
} = require('./helpers/fixtures');
const { mintAccessToken, mintAdminToken } = require('./helpers/auth');

// Task catalog (from the real db/seeds/tasks.sql + taskdetails.sql dump):
// task 1: coins=2, points=12, requires jeweltype 9 x10
// task 3: coins=4, points=20
// task 101-150: bomb tasks by id convention (utils/taskConstants.js)

async function authedAdmin(overrides = {}) {
  const admin = await createAdmin(overrides);
  return { admin, token: mintAdminToken(admin.id) };
}

describe('admin.js', () => {

  describe('auth', () => {
    test('login with correct credentials returns a working admin token', async () => {
      const admin = await createAdmin();

      const res = await request().post('/admin/login').send({ email: 'ADMIN@example.com ', password: admin.password });
      expect(res.status).toBe(200);
      expect(res.body.admin).toEqual({ id: admin.id, email: admin.email, name: admin.name });

      const me = await request().get('/admin/me').set('Authorization', `Bearer ${res.body.token}`);
      expect(me.status).toBe(200);
      expect(me.body.admin.id).toBe(admin.id);

      const row = await knex('admins').where({ id: admin.id }).first();
      expect(row.last_login_at).not.toBeNull();
      expect(await knex('adminlogs').where({ admin_id: admin.id, action: 'login' })).toHaveLength(1);
    });

    test('login rejects a wrong password, an unknown email, and an inactive admin', async () => {
      const admin = await createAdmin();
      await createAdmin({ email: 'off@example.com', active: false });

      const cases = [
        { email: admin.email, password: 'wrong password' },
        { email: 'nobody@example.com', password: admin.password },
        { email: 'off@example.com', password: admin.password }
      ];
      for (const body of cases) {
        const res = await request().post('/admin/login').send(body);
        expect(res.status).toBe(401);
        expect(res.body.token).toBeUndefined();
      }
    });

    test('a player token is rejected on admin routes', async () => {
      const user = await createTestUser();
      const res = await request().get('/admin/me').set('Authorization', `Bearer ${mintAccessToken(user.id)}`);
      expect(res.status).toBe(401);
    });

    test('an admin token is rejected on player routes', async () => {
      const { token } = await authedAdmin();
      const res = await request().post('/getTasks').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
    });

    test('deactivating an admin revokes their outstanding token', async () => {
      const { admin, token } = await authedAdmin();
      await knex('admins').where({ id: admin.id }).update({ active: false });

      const res = await request().get('/admin/me').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
    });

    test('an expired admin token is rejected', async () => {
      const admin = await createAdmin();
      const token = mintAdminToken(admin.id, { expiresIn: -10 });
      const res = await request().get('/admin/me').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
    });
  });

  describe('CORS', () => {
    test('preflight from the configured origin is allowed', async () => {
      const res = await request().options('/admin/login').set('Origin', 'http://localhost:8081');
      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:8081');
    });

    test('preflight from any other origin gets no CORS headers', async () => {
      const res = await request().options('/admin/login').set('Origin', 'https://evil.example');
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('getSuspiciousUsers', () => {
    test('ranks users by points earned from tasks completed in the window', async () => {
      const { token } = await authedAdmin();
      const heavy = await createTestUser({ name: 'Heavy' });
      const light = await createTestUser({ name: 'Light' });
      const stale = await createTestUser({ name: 'Stale' });
      await createScores(heavy.id, { level: 7 });
      await createScores(light.id);

      const now = new Date();
      await createTaskUserRow(heavy.id, 3, { done: true, completed_at: now }); // 20 pts
      await createTaskUserRow(heavy.id, 3, { done: true, completed_at: now }); // 20 pts
      await createTaskUserRow(heavy.id, 120, { done: true, is_bomb: 1, bomb_status: 2, completed_at: now });
      await createTaskUserRow(light.id, 1, { done: true, completed_at: now }); // 12 pts
      await createTaskUserRow(light.id, 3, { done: false }); // not completed
      await createTaskUserRow(stale.id, 3, { done: true, completed_at: new Date(Date.now() - 3 * 60 * 60 * 1000) });
      await setFutureTasks(heavy.id, [{ task_id: 120, is_bomb: true }, { task_id: 121, is_bomb: true }]);

      const res = await request().get('/admin/users/suspicious?hours=1').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.users.map(u => u.user_id)).toEqual([heavy.id, light.id]);

      const [h, l] = res.body.users;
      expect(h).toMatchObject({
        name: 'Heavy', tasks_completed: 2, points_earned: 40, coins_earned: 8,
        bombs_defused: 1, bombs_exploded: 0, level: 7, queued: 2
      });
      expect(l).toMatchObject({ tasks_completed: 1, points_earned: 12, queued: 0 });
    });
  });

  describe('searchUsers / getUser', () => {
    test('search matches by id, phone, or name', async () => {
      const { token } = await authedAdmin();
      const alice = await createTestUser({ name: 'Alice Abuser' });
      await createTestUser({ name: 'Bob' });

      const byName = await request().get('/admin/users/search?q=abuse').set('Authorization', `Bearer ${token}`);
      expect(byName.body.users.map(u => u.id)).toEqual([alice.id]);

      const byPhone = await request().get(`/admin/users/search?q=${alice.phone}`).set('Authorization', `Bearer ${token}`);
      expect(byPhone.body.users.map(u => u.id)).toEqual([alice.id]);

      const byId = await request().get(`/admin/users/search?q=${alice.id}`).set('Authorization', `Bearer ${token}`);
      expect(byId.body.users.map(u => u.id)).toEqual([alice.id]);
    });

    test('user detail includes stats and queue but never OTP/refresh secrets', async () => {
      const { token } = await authedAdmin();
      const user = await createTestUser({ vcode: 'secret-v', scode: 'secret-s' });
      await createScores(user.id, { level: 4 });
      await createTaskUserRow(user.id, 1, { done: false });
      await setFutureTasks(user.id, [{ task_id: 120, is_bomb: true, bomb_minutes: 2 }]);

      const res = await request().get(`/admin/users/${user.id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(user.id);
      expect(res.body.user.vcode).toBeUndefined();
      expect(res.body.user.scode).toBeUndefined();
      expect(res.body.scores.level).toBe(4);
      expect(res.body.tasks).toHaveLength(1);
      expect(res.body.futuretasks).toEqual([{ task_id: 120, is_bomb: true, bomb_minutes: 2 }]);
    });

    test('unknown user is a 404', async () => {
      const { token } = await authedAdmin();
      const res = await request().get('/admin/users/999999').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('getTaskCatalog', () => {
    test('returns tasks with required jewels and the bomb flag', async () => {
      const { token } = await authedAdmin();
      const res = await request().get('/admin/tasks').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);

      const task1 = res.body.tasks.find(t => t.id === 1);
      expect(task1).toMatchObject({ coins: 2, points: 12, bomb: false });
      expect(task1.jewels).toEqual([expect.objectContaining({ jeweltype_id: 9, count: 10 })]);
      expect(res.body.tasks.find(t => t.id === 120).bomb).toBe(true);
    });
  });

  describe('futuretasks queue', () => {
    test('append creates the queue, appends to it, and logs before/after', async () => {
      const { admin, token } = await authedAdmin();
      const user = await createTestUser();

      let res = await request().post(`/admin/users/${user.id}/futuretasks`).set('Authorization', `Bearer ${token}`)
        .send({ entries: [{ task_id: 120, is_bomb: true, bomb_minutes: 3 }] });
      expect(res.status).toBe(200);
      expect(res.body.tasks).toEqual([{ task_id: 120, is_bomb: true, bomb_minutes: 3 }]);

      res = await request().post(`/admin/users/${user.id}/futuretasks`).set('Authorization', `Bearer ${token}`)
        .send({ entries: [{ task_id: 5, is_bomb: false }] });
      expect(res.body.tasks).toEqual([
        { task_id: 120, is_bomb: true, bomb_minutes: 3 },
        { task_id: 5, is_bomb: false }
      ]);

      const logs = await knex('adminlogs').where({ admin_id: admin.id, target_user_id: user.id }).orderBy('id');
      expect(logs.map(l => l.action)).toEqual(['futuretasks_append', 'futuretasks_append']);
      expect(logs[1].payload.before).toEqual([{ task_id: 120, is_bomb: true, bomb_minutes: 3 }]);
      expect(logs[1].payload.after).toHaveLength(2);
    });

    test('replace overwrites the whole queue', async () => {
      const { token } = await authedAdmin();
      const user = await createTestUser();
      await setFutureTasks(user.id, [{ task_id: 120, is_bomb: true }, { task_id: 5, is_bomb: false }]);

      const res = await request().put(`/admin/users/${user.id}/futuretasks`).set('Authorization', `Bearer ${token}`)
        .send({ entries: [{ task_id: 5, is_bomb: false }] });
      expect(res.status).toBe(200);
      expect((await knex('futuretasks').where({ user_id: user.id }).first()).tasks).toEqual([{ task_id: 5, is_bomb: false }]);
    });

    test('rejects invalid entries without touching the queue', async () => {
      const { token } = await authedAdmin();
      const user = await createTestUser();
      await setFutureTasks(user.id, [{ task_id: 5, is_bomb: false }]);

      const bad = [
        { task_id: 999999, is_bomb: false },            // unknown task
        { task_id: 5, is_bomb: 1 },                     // not a boolean
        { task_id: 5, is_bomb: false, bomb_minutes: 3 }, // timer on a normal task
        { task_id: 120, is_bomb: true, bomb_minutes: 0 },
        { task_id: 120, is_bomb: true, bomb_minutes: 61 }
      ];
      for (const entry of bad) {
        const res = await request().put(`/admin/users/${user.id}/futuretasks`).set('Authorization', `Bearer ${token}`)
          .send({ entries: [entry] });
        expect(res.status).toBe(400);
      }
      expect((await knex('futuretasks').where({ user_id: user.id }).first()).tasks).toEqual([{ task_id: 5, is_bomb: false }]);
    });

    test('caps the queue at 50 entries', async () => {
      const { token } = await authedAdmin();
      const user = await createTestUser();
      await setFutureTasks(user.id, Array(50).fill({ task_id: 5, is_bomb: false }));

      const res = await request().post(`/admin/users/${user.id}/futuretasks`).set('Authorization', `Bearer ${token}`)
        .send({ entries: [{ task_id: 5, is_bomb: false }] });
      expect(res.status).toBe(400);
      expect((await knex('futuretasks').where({ user_id: user.id }).first()).tasks).toHaveLength(50);
    });

    test('unknown user is a 404', async () => {
      const { token } = await authedAdmin();
      const res = await request().post('/admin/users/999999/futuretasks').set('Authorization', `Bearer ${token}`)
        .send({ entries: [{ task_id: 5, is_bomb: false }] });
      expect(res.status).toBe(404);
    });
  });
});
