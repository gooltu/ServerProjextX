'use strict';

const request = require('./helpers/app');
const { knex } = require('./helpers/db');
const {
  createTestUser,
  createScores,
  createJewels,
  createTaskUserRow,
  backdateTaskUserCreatedAt
} = require('./helpers/fixtures');
const { mintAccessToken } = require('./helpers/auth');
const { pollUntil } = require('./helpers/poll');

const level_max = [55, 289, 346, 313, 241, 220, 290, 410, 491, 481, 611, 567, 612, 726, 827, 843, 783, 723, 741, 842, 956, 999, 955, 885, 877, 959, 1079, 1147, 1124, 1053, 1053, 1124, 1147, 1079, 959, 877, 885, 955, 999, 956, 842, 741, 723, 783, 843, 827, 726, 612, 567, 611];

// Task catalog (from the real db/seeds/tasks.sql + taskdetails.sql dump):
// task 1: coins=2, points=12, requires jeweltype 9 x10
// task 3: coins=4, points=20, requires jeweltype 9 x9, jeweltype 4 x6, jeweltype 3 x2
// task 148: points=140 (bomb-eligible "recently completed" fixture, > 100 threshold)

async function authedUser(overrides = {}) {
  const user = await createTestUser(overrides);
  return { user, token: mintAccessToken(user.id) };
}

async function setupRedeemableTask1(user, { jewel9 = 10, coin = 0 } = {}) {
  await createJewels(user.id, { 9: jewel9, 1: coin });
  const taskUserId = await createTaskUserRow(user.id, 1, { done: false });
  await backdateTaskUserCreatedAt(taskUserId, 5);
  return taskUserId;
}

describe('tasksgame.js', () => {

  describe('getTasks / getTaskElements / checkTaskCompletion', () => {
    test('getTasks returns the user\'s undone tasks, newest first, limited to 5', async () => {
      const { user, token } = await authedUser();
      const id1 = await createTaskUserRow(user.id, 1, { done: false });
      const id2 = await createTaskUserRow(user.id, 2, { done: false });
      await createTaskUserRow(user.id, 3, { done: true }); // done, should be excluded

      const res = await request().post('/getTasks').set('Authorization', `Bearer ${token}`).send({});

      expect(res.body.error).toBe(false);
      expect(res.body.tasks.map(t => t.id)).toEqual([id2, id1]);
    });

    test('getTaskElements returns the material requirements for a task', async () => {
      const { token } = await authedUser();

      const res = await request().post('/getTaskElements').set('Authorization', `Bearer ${token}`)
        .send({ task_id: 1 });

      expect(res.body.error).toBe(false);
      expect(res.body.taskdetails).toHaveLength(1);
      expect(res.body.taskdetails[0]).toMatchObject({ task_id: 1, jeweltype_id: 9, count: 10 });
    });

    test('checkTaskCompletion returns the row when it exists, null otherwise', async () => {
      const { user, token } = await authedUser();
      const taskUserId = await createTaskUserRow(user.id, 1, { done: false });

      const found = await request().post('/checkTaskCompletion').set('Authorization', `Bearer ${token}`)
        .send({ id: taskUserId, task_id: 1 });
      expect(found.body.taskusers.id).toBe(taskUserId);

      const notFound = await request().post('/checkTaskCompletion').set('Authorization', `Bearer ${token}`)
        .send({ id: 999999, task_id: 1 });
      expect(notFound.body.taskusers).toBeNull();
    });
  });

  describe('redeemTask', () => {
    test('happy path: consumes materials, credits coins, and updates score (no level-up)', async () => {
      const { user, token } = await authedUser();
      await createScores(user.id, { level: 1, points: 5, total_points: 5, max_level_points: 55 });
      const taskUserId = await setupRedeemableTask1(user);

      const res = await request().post('/redeemTask').set('Authorization', `Bearer ${token}`)
        .send({ id: taskUserId, task_id: 1 });
      expect(res.body.error).toBe(false);

      // redeemTask's response is sent before its transaction commits (documented race) -
      // poll for the eventual DB state rather than asserting immediately.
      await pollUntil(async () => {
        const row = await knex('taskusers').where({ id: taskUserId }).first();
        return row.done ? row : null;
      });

      const jewel9 = await knex('jewels').where({ user_id: user.id, jeweltype_id: 9 }).first();
      const coin = await knex('jewels').where({ user_id: user.id, jeweltype_id: 1 }).first();
      const scores = await knex('scores').where({ user_id: user.id }).first();

      expect(jewel9.count).toBe(0); // 10 - 10
      expect(coin.count).toBe(2); // + task 1's coins
      expect(scores.level).toBe(1);
      expect(scores.points).toBe(17); // 5 + 12
      expect(scores.total_points).toBe(17);
      expect(scores.max_level_points).toBe(55);
    });

    test('happy path with a level-up crossing max_level_points', async () => {
      const { user, token } = await authedUser();
      await createScores(user.id, { level: 1, points: 50, total_points: 50, max_level_points: 55 });
      const taskUserId = await setupRedeemableTask1(user);

      await request().post('/redeemTask').set('Authorization', `Bearer ${token}`)
        .send({ id: taskUserId, task_id: 1 });

      await pollUntil(async () => {
        const row = await knex('taskusers').where({ id: taskUserId }).first();
        return row.done ? row : null;
      });

      const scores = await knex('scores').where({ user_id: user.id }).first();
      expect(scores.level).toBe(2);
      expect(scores.points).toBe(7); // (50+12) - 55
      expect(scores.total_points).toBe(62); // 50 + 12
      expect(scores.max_level_points).toBe(level_max[1]); // 289
    });

    test('rejects when the user lacks the required materials', async () => {
      const { user, token } = await authedUser();
      await createScores(user.id);
      const taskUserId = await setupRedeemableTask1(user, { jewel9: 5 }); // needs 10

      const res = await request().post('/redeemTask').set('Authorization', `Bearer ${token}`)
        .send({ id: taskUserId, task_id: 1 });

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/Task Not Completed/);
    });

    test('rejects an unknown taskuser row', async () => {
      const { user, token } = await authedUser();
      await createScores(user.id);
      await createJewels(user.id, { 9: 10 });

      const res = await request().post('/redeemTask').set('Authorization', `Bearer ${token}`)
        .send({ id: 999999, task_id: 1 });

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/Invalid Task/);
    });

    test('documents the double-response hazard: concurrent redemption of the same row ' +
      'both report success, but materials are only consumed once', async () => {
      const { user, token } = await authedUser();
      await createScores(user.id, { level: 1, points: 5, total_points: 5, max_level_points: 55 });
      const taskUserId = await setupRedeemableTask1(user, { jewel9: 10 });

      const [a, b] = await Promise.all([
        request().post('/redeemTask').set('Authorization', `Bearer ${token}`).send({ id: taskUserId, task_id: 1 }),
        request().post('/redeemTask').set('Authorization', `Bearer ${token}`).send({ id: taskUserId, task_id: 1 })
      ]);

      // redeemTask's res.json({error:false}) fires before the transaction commits, so BOTH
      // concurrent requests report success even though only one redemption can actually land.
      expect(a.body.error).toBe(false);
      expect(b.body.error).toBe(false);

      await pollUntil(async () => {
        const row = await knex('taskusers').where({ id: taskUserId }).first();
        return row.done ? row : null;
      });

      const jewel9 = await knex('jewels').where({ user_id: user.id, jeweltype_id: 9 }).first();
      const coin = await knex('jewels').where({ user_id: user.id, jeweltype_id: 1 }).first();
      // Only one of the two concurrent transactions actually committed its decrement/credit -
      // the other silently rolled back despite its HTTP response also claiming success.
      expect(jewel9.count).toBe(0); // 10 - 10, not -10
      expect(coin.count).toBe(2); // +2 once, not +4
    });

    test('redeeming against an already-expired bomb throws and triggers bombExplosion ' +
      '(fire-and-forget) instead of completing the task', async () => {
      const { user, token } = await authedUser();
      await createScores(user.id, { level: 1, points: 20, total_points: 100, max_level_points: 55 });
      await createJewels(user.id, { 9: 10, 1: 0 });
      const taskUserId = await createTaskUserRow(user.id, 1, {
        done: false,
        is_bomb: 1,
        bomb_status: 0,
        completed_at: new Date(Date.now() - 10 * 60 * 1000) // expired 10 minutes ago
      });
      await backdateTaskUserCreatedAt(taskUserId, 5);

      const res = await request().post('/redeemTask').set('Authorization', `Bearer ${token}`)
        .send({ id: taskUserId, task_id: 1 });

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/Bomb Exploded/);

      // bombExplosion() runs fire-and-forget off the back of the thrown error - poll for it.
      await pollUntil(async () => {
        const row = await knex('taskusers').where({ id: taskUserId }).first();
        return row.bomb_status === 1 ? row : null;
      });

      const row = await knex('taskusers').where({ id: taskUserId }).first();
      expect(row.done).toBe(1);

      // The task's own materials were never touched - the bomb branch bails before that.
      const jewel9 = await knex('jewels').where({ user_id: user.id, jeweltype_id: 9 }).first();
      expect(jewel9.count).toBe(10);

      const coin = await knex('jewels').where({ user_id: user.id, jeweltype_id: 1 }).first();
      expect(coin.count).toBe(-2); // bombExplosion decrements taskcoins regardless of sign

      const scores = await knex('scores').where({ user_id: user.id }).first();
      expect(scores.points).toBe(8); // 20 - 12
    });

    test('redeeming an active (not yet expired) bomb consumes materials and diffuses it, ' +
      'but grants no coin/score reward', async () => {
      const { user, token } = await authedUser();
      await createScores(user.id, { level: 1, points: 5, total_points: 5, max_level_points: 55 });
      await createJewels(user.id, { 9: 10, 1: 7 });
      const taskUserId = await createTaskUserRow(user.id, 1, {
        done: false,
        is_bomb: 1,
        bomb_status: 0,
        completed_at: new Date(Date.now() + 5 * 60 * 1000) // not yet expired
      });
      await backdateTaskUserCreatedAt(taskUserId, 5);

      const res = await request().post('/redeemTask').set('Authorization', `Bearer ${token}`)
        .send({ id: taskUserId, task_id: 1 });
      expect(res.body.error).toBe(false);

      await pollUntil(async () => {
        const row = await knex('taskusers').where({ id: taskUserId }).first();
        return row.done ? row : null;
      });

      const row = await knex('taskusers').where({ id: taskUserId }).first();
      expect(row.bomb_status).toBe(2); // diffused

      const jewel9 = await knex('jewels').where({ user_id: user.id, jeweltype_id: 9 }).first();
      expect(jewel9.count).toBe(0); // materials ARE consumed

      const coin = await knex('jewels').where({ user_id: user.id, jeweltype_id: 1 }).first();
      expect(coin.count).toBe(7); // unchanged - no coin reward while activebomb

      const scores = await knex('scores').where({ user_id: user.id }).first();
      expect(scores.points).toBe(5); // unchanged - no score reward while activebomb
    });
  });

  describe('explodeBomb', () => {
    test('simple de-level (mypoints > taskpoints) decrements coins and score in one step', async () => {
      const { user, token } = await authedUser();
      await createScores(user.id, { level: 1, points: 20, total_points: 100, max_level_points: 55 });
      await createJewels(user.id, { 1: 10 });
      const taskUserId = await createTaskUserRow(user.id, 1, {
        done: false,
        is_bomb: 1,
        bomb_status: 0,
        completed_at: new Date(Date.now() - 1000) // already eligible
      });

      const res = await request().post('/explodeBomb').set('Authorization', `Bearer ${token}`)
        .send({ id: taskUserId, task_id: 1 });

      // explodeBomb's response IS chained after bombExplosion's transaction - no race here.
      expect(res.body.error).toBe(false);

      const row = await knex('taskusers').where({ id: taskUserId }).first();
      expect(row.bomb_status).toBe(1);
      expect(row.done).toBe(1);

      const coin = await knex('jewels').where({ user_id: user.id, jeweltype_id: 1 }).first();
      expect(coin.count).toBe(8); // 10 - task 1's coins (2)

      const scores = await knex('scores').where({ user_id: user.id }).first();
      expect(scores.level).toBe(1);
      expect(scores.points).toBe(8); // 20 - 12
      expect(scores.total_points).toBe(88); // 100 - 12
      expect(scores.max_level_points).toBe(level_max[0]);
    });

    test('de-level-with-borrowing (mypoints <= taskpoints) drops a level and borrows its max', async () => {
      const { user, token } = await authedUser();
      await createScores(user.id, { level: 3, points: 5, total_points: 500, max_level_points: level_max[2] });
      await createJewels(user.id, { 1: 10 });
      const taskUserId = await createTaskUserRow(user.id, 3, {
        done: false,
        is_bomb: 1,
        bomb_status: 0,
        completed_at: new Date(Date.now() - 1000)
      });

      const res = await request().post('/explodeBomb').set('Authorization', `Bearer ${token}`)
        .send({ id: taskUserId, task_id: 3 });
      expect(res.body.error).toBe(false);

      const scores = await knex('scores').where({ user_id: user.id }).first();
      // sum = mypoints(5) + level_max[level-1-1] = 5 + level_max[1](289) = 294 > taskpoints(20)
      expect(scores.level).toBe(2);
      expect(scores.points).toBe(274); // 294 - 20
      expect(scores.total_points).toBe(480); // 500 - 20
      expect(scores.max_level_points).toBe(level_max[1]);
    });

    test('rejects when there is no matching eligible bomb row', async () => {
      const { token } = await authedUser();

      const res = await request().post('/explodeBomb').set('Authorization', `Bearer ${token}`)
        .send({ id: 999999, task_id: 1 });

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/Invalid Task/);
    });
  });

  describe('getNewTaskOnTaskCompletion', () => {
    let randomSpy;

    afterEach(() => {
      if (randomSpy) {
        randomSpy.mockRestore();
        randomSpy = undefined;
      }
    });

    test('big-bomb branch: >100 xp completed in the last hour inserts task 112', async () => {
      const { user, token } = await authedUser();
      await createScores(user.id, { level: 1 });
      await createTaskUserRow(user.id, 148, { done: true, completed_at: new Date() }); // points=140

      await request().get('/getNewTaskOnTaskCompletion').set('Authorization', `Bearer ${token}`);

      const row = await pollUntil(async () => {
        const r = await knex('taskusers').where({ user_id: user.id, task_id: 112 }).first();
        return r || null;
      });
      expect(row.is_bomb).toBe(1);
      expect(row.bomb_status).toBe(0);
    });

    test('probability-bomb branch: forced low roll at low level inserts task 149', async () => {
      const { user, token } = await authedUser();
      await createScores(user.id, { level: 1 });
      // mockReturnValue (not -Once): other code paths (bluebird/mysql2/etc.) may call
      // Math.random() too, which would otherwise consume a one-shot mock before the
      // controller's own call runs.
      randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0); // probablity_bomb = 1 (<=3)

      await request().get('/getNewTaskOnTaskCompletion').set('Authorization', `Bearer ${token}`);

      const row = await pollUntil(async () => {
        const r = await knex('taskusers').where({ user_id: user.id, task_id: 149 }).first();
        return r || null;
      });
      expect(row.is_bomb).toBe(1);
      expect(row.bomb_status).toBe(0);
    });

    test('normal-task branch: forced high roll at low level inserts a task id in [1,10]', async () => {
      const { user, token } = await authedUser();
      await createScores(user.id, { level: 1 });
      // A single constant mock value (not two queued -Once values): other code paths may
      // also call Math.random(), which would consume queued one-shot values out of order.
      // rand=0.5 -> probablity_bomb = floor(0.5*10)+1 = 6 (>3, normal branch) and, with the
      // same constant, taskid = floor(0.5*10)+1 = 6 (score_level<=5 -> range [1,10]).
      randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);

      await request().get('/getNewTaskOnTaskCompletion').set('Authorization', `Bearer ${token}`);

      const row = await pollUntil(async () => {
        const r = await knex('taskusers').where({ user_id: user.id, task_id: 6, is_bomb: 0 }).first();
        return r || null;
      });
      expect(row.bomb_status).toBe(-1);
    });

    test('short-circuits with no new task when 5 undone tasks already exist', async () => {
      const { user, token } = await authedUser();
      await createScores(user.id, { level: 1 });
      await Promise.all([1, 2, 3, 4, 5].map(taskId => createTaskUserRow(user.id, taskId, { done: false })));

      const res = await request().get('/getNewTaskOnTaskCompletion').set('Authorization', `Bearer ${token}`);
      expect(res.body.error).toBe(false);

      // Give any (incorrectly firing) fire-and-forget insert a moment to land, then confirm nothing changed.
      await new Promise(r => setTimeout(r, 200));
      const undone = await knex('taskusers').where({ user_id: user.id, done: false });
      expect(undone).toHaveLength(5);
    });
  });
});
