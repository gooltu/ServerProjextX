'use strict'

let knex = require('../db/knex');
let bcrypt = require('bcryptjs');
let jwt = require('jsonwebtoken');

let config = require('../utils/config');
let { BOMB_TASK_MIN, BOMB_TASK_MAX } = require('../utils/taskConstants');

let admin = module.exports;

const MAX_QUEUE_LENGTH = 50;
const MAX_BOMB_MINUTES = 60;

// Compared against when the email doesn't exist, so a miss costs the same as a wrong password.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);


function badRequest(res, message) {
  return res.status(400).json({ error: true, message });
}

function isBombTask(task_id) {
  return task_id >= BOMB_TASK_MIN && task_id <= BOMB_TASK_MAX;
}

function parseUserId(req) {
  let id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Returns { entries } normalized to { task_id, is_bomb, bomb_minutes? }, or { message } on the
// first invalid entry. Task existence is checked separately (needs the DB).
function normalizeEntries(entries) {
  if (!Array.isArray(entries))
    return { message: 'entries must be an array' };

  let out = [];
  for (let i = 0; i < entries.length; i++) {
    let e = entries[i] || {};
    if (!Number.isInteger(e.task_id) || e.task_id <= 0)
      return { message: `entries[${i}].task_id must be a positive integer` };
    if (typeof e.is_bomb !== 'boolean')
      return { message: `entries[${i}].is_bomb must be a boolean` };

    let entry = { task_id: e.task_id, is_bomb: e.is_bomb };
    if (e.bomb_minutes !== undefined) {
      if (!e.is_bomb)
        return { message: `entries[${i}].bomb_minutes is only allowed on bomb entries` };
      if (!Number.isInteger(e.bomb_minutes) || e.bomb_minutes < 1 || e.bomb_minutes > MAX_BOMB_MINUTES)
        return { message: `entries[${i}].bomb_minutes must be an integer from 1 to ${MAX_BOMB_MINUTES}` };
      entry.bomb_minutes = e.bomb_minutes;
    }
    out.push(entry);
  }
  return { entries: out };
}

async function findMissingTaskIds(entries) {
  let ids = [...new Set(entries.map(e => e.task_id))];
  if (ids.length === 0) return [];
  let found = await knex('tasks').whereIn('id', ids).pluck('id');
  return ids.filter(id => !found.includes(id));
}

// Thrown inside writeQueue's transaction to roll back and answer with `status`.
class QueueRejected extends Error {
  constructor(status, message, tasks) {
    super(message);
    this.status = status;
    this.tasks = tasks;
  }
}

// MySQL's JSON type reorders object keys, so queues are compared by value, not by JSON text.
function sameQueue(a, b) {
  let key = e => `${e.task_id}:${e.is_bomb}:${e.bomb_minutes || ''}`;
  return a.length === b.length && a.every((e, i) => key(e) === key(b[i]));
}

// Locks the user's futuretasks row (creating it if needed), applies buildQueue to the current
// queue, and writes the result plus an adminlogs row in one transaction. buildQueue may throw
// QueueRejected to abort. Returns the new queue.
function writeQueue(adminId, userId, action, buildQueue) {
  return knex.transaction(async trx => {
    await trx('futuretasks').insert({ user_id: userId }).onConflict('user_id').ignore();
    let row = await trx('futuretasks').where({ user_id: userId }).forUpdate().first('id', 'tasks');

    let before = row.tasks;
    let after = buildQueue(before);
    if (after.length > MAX_QUEUE_LENGTH)
      throw new QueueRejected(400, `Queue cannot exceed ${MAX_QUEUE_LENGTH} entries`);

    await trx('futuretasks').where({ id: row.id }).update({ tasks: JSON.stringify(after) });
    await trx('adminlogs').insert({
      admin_id: adminId,
      action,
      target_user_id: userId,
      payload: JSON.stringify({ before, after })
    });
    return after;
  });
}

async function handleQueueWrite(req, res, action, buildQueue) {
  let userId = parseUserId(req);
  if (!userId)
    return badRequest(res, 'Invalid user id');

  let { entries, message } = normalizeEntries(req.body.entries);
  if (message)
    return badRequest(res, message);

  // Optional optimistic-concurrency check: the queue the client's edit was based on. The game
  // pops entries as the player plays, so a stale full-queue replace could resurrect them.
  let expected = null;
  if (req.body.expected !== undefined) {
    let parsed = normalizeEntries(req.body.expected);
    if (parsed.message)
      return badRequest(res, parsed.message.replace(/^entries/, 'expected'));
    expected = parsed.entries;
  }

  let missing = await findMissingTaskIds(entries);
  if (missing.length > 0)
    return badRequest(res, `Unknown task_id: ${missing.join(', ')}`);

  // Checked up front: the INSERT ... IGNORE in writeQueue would downgrade a FK failure to a warning.
  let user = await knex('jcusers').where({ id: userId }).first('id');
  if (!user)
    return res.status(404).json({ error: true, message: 'User not found' });

  try {
    let tasks = await writeQueue(req.user.id, userId, action, current => {
      if (expected && !sameQueue(current, expected))
        throw new QueueRejected(409, 'Queue changed since it was loaded', current);
      return buildQueue(current, entries);
    });
    return res.json({ error: false, tasks });
  } catch (err) {
    if (!(err instanceof QueueRejected))
      throw err;
    return res.status(err.status).json({ error: true, message: err.message, tasks: err.tasks });
  }
}



admin.login = async function (req, res, next) {
  try {
    let email = String(req.body.email || '').trim().toLowerCase();
    let password = String(req.body.password || '');

    let row = await knex('admins').where({ email }).first();
    let ok = await bcrypt.compare(password, row ? row.password_hash : DUMMY_HASH);
    if (!row || !row.active || !ok)
      return res.status(401).json({ error: true, message: 'Invalid email or password' });

    await knex('admins').where({ id: row.id }).update({ last_login_at: new Date() });
    await knex('adminlogs').insert({ admin_id: row.id, action: 'login' });

    let token = jwt.sign({ id: row.id }, config.adminSecret, { audience: 'admin', expiresIn: '8h' });
    return res.json({ error: false, token, admin: { id: row.id, email: row.email, name: row.name } });
  } catch (err) {
    next(err);
  }
};

admin.me = function (req, res) {
  return res.json({ error: false, admin: req.user });
};

// Ranks users by what they earned from (non-bomb) tasks completed in the last `hours`.
admin.getSuspiciousUsers = async function (req, res, next) {
  try {
    let hours = Number(req.query.hours) || 1;
    let limit = Math.min(Number(req.query.limit) || 50, 200);
    if (hours <= 0 || hours > 24 * 30)
      return badRequest(res, 'hours must be between 0 and 720');

    let since = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Aggregated in a subquery so joining scores/futuretasks afterwards can't inflate the sums.
    let activity = knex('taskusers')
      .join('tasks', 'taskusers.task_id', '=', 'tasks.id')
      .where('taskusers.done', true)
      .where('taskusers.completed_at', '>=', since)
      .groupBy('taskusers.user_id')
      .select(
        'taskusers.user_id as user_id',
        knex.raw('CAST(SUM(taskusers.is_bomb = 0) AS SIGNED) as tasks_completed'),
        knex.raw('CAST(SUM(CASE WHEN taskusers.is_bomb = 0 THEN tasks.points ELSE 0 END) AS SIGNED) as points_earned'),
        knex.raw('CAST(SUM(CASE WHEN taskusers.is_bomb = 0 THEN COALESCE(tasks.coins, 0) ELSE 0 END) AS SIGNED) as coins_earned'),
        knex.raw('CAST(SUM(taskusers.bomb_status = 2) AS SIGNED) as bombs_defused'),
        knex.raw('CAST(SUM(taskusers.bomb_status = 1) AS SIGNED) as bombs_exploded')
      )
      .as('a');

    let users = await knex.select(
        'a.*', 'jcusers.name', 'jcusers.phone', 'scores.level', 'scores.total_points',
        knex.raw('COALESCE(JSON_LENGTH(futuretasks.tasks), 0) as queued')
      )
      .from(activity)
      .join('jcusers', 'jcusers.id', '=', 'a.user_id')
      .leftJoin('scores', 'scores.user_id', '=', 'a.user_id')
      .leftJoin('futuretasks', 'futuretasks.user_id', '=', 'a.user_id')
      .orderBy([{ column: 'a.points_earned', order: 'desc' }, { column: 'a.tasks_completed', order: 'desc' }])
      .limit(limit);

    return res.json({ error: false, since, users });
  } catch (err) {
    next(err);
  }
};

admin.searchUsers = async function (req, res, next) {
  try {
    let q = String(req.query.q || '').trim();
    if (!q)
      return badRequest(res, 'q is required');

    let query = knex('jcusers').select('id', 'phone', 'name', 'active', 'created_at').limit(20);
    if (/^\d+$/.test(q))
      query.where('id', Number(q)).orWhere('phone', q);
    else
      query.where('name', 'like', `%${q.replace(/[\\%_]/g, '\\$&')}%`);

    return res.json({ error: false, users: await query });
  } catch (err) {
    next(err);
  }
};

admin.getUser = async function (req, res, next) {
  try {
    let userId = parseUserId(req);
    if (!userId)
      return badRequest(res, 'Invalid user id');

    // Explicit column list: never expose vcode/scode (OTP/refresh secrets) or device tokens.
    let user = await knex('jcusers').where({ id: userId })
      .first('id', 'phone', 'name', 'status', 'active', 'initialized', 'reference', 'created_at', 'updated_at');
    if (!user)
      return res.status(404).json({ error: true, message: 'User not found' });

    let [scores, jewels, tasks, future] = await Promise.all([
      knex('scores').where({ user_id: userId }).first('level', 'points', 'total_points', 'max_level_points', 'storesize'),
      knex('jewels').where({ user_id: userId })
        .join('jeweltype', 'jewels.jeweltype_id', '=', 'jeweltype.id')
        .select('jewels.jeweltype_id', 'jeweltype.name', 'jewels.count', 'jewels.total_count'),
      knex('taskusers').where({ 'taskusers.user_id': userId })
        .join('tasks', 'taskusers.task_id', '=', 'tasks.id')
        .orderBy('taskusers.id', 'desc')
        .limit(50)
        .select('taskusers.id', 'taskusers.task_id', 'taskusers.is_bomb', 'taskusers.bomb_status', 'taskusers.done',
          'tasks.points', 'tasks.coins', 'taskusers.created_at', 'taskusers.completed_at'),
      knex('futuretasks').where({ user_id: userId }).first('tasks')
    ]);

    return res.json({ error: false, user, scores: scores || null, jewels, tasks, futuretasks: future ? future.tasks : [] });
  } catch (err) {
    next(err);
  }
};

admin.getTaskCatalog = async function (req, res, next) {
  try {
    let [tasks, details] = await Promise.all([
      knex('tasks').orderBy('id').select('id', 'coins', 'points'),
      knex('taskdetails')
        .join('jeweltype', 'taskdetails.jeweltype_id', '=', 'jeweltype.id')
        .select('taskdetails.task_id', 'taskdetails.jeweltype_id', 'jeweltype.name', 'taskdetails.count')
    ]);

    let byTask = {};
    for (let d of details)
      (byTask[d.task_id] = byTask[d.task_id] || []).push({ jeweltype_id: d.jeweltype_id, name: d.name, count: d.count });

    let catalog = tasks.map(t => ({ ...t, bomb: isBombTask(t.id), jewels: byTask[t.id] || [] }));
    return res.json({ error: false, tasks: catalog });
  } catch (err) {
    next(err);
  }
};

admin.appendFutureTasks = async function (req, res, next) {
  try {
    return await handleQueueWrite(req, res, 'futuretasks_append', (current, entries) => current.concat(entries));
  } catch (err) {
    next(err);
  }
};

admin.replaceFutureTasks = async function (req, res, next) {
  try {
    return await handleQueueWrite(req, res, 'futuretasks_replace', (current, entries) => entries);
  } catch (err) {
    next(err);
  }
};
