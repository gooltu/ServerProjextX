'use strict';

const bcrypt = require('bcryptjs');
const { knex } = require('./db');

let nextPhone = 919000000001;

function uniquePhone() {
  return nextPhone++;
}

async function createTestUser(overrides = {}) {
  const row = {
    phone: overrides.phone !== undefined ? overrides.phone : uniquePhone(),
    name: overrides.name !== undefined ? overrides.name : 'Test User',
    active: overrides.active !== undefined ? overrides.active : true,
    initialized: overrides.initialized !== undefined ? overrides.initialized : true,
    vcode: overrides.vcode !== undefined ? overrides.vcode : null,
    scode: overrides.scode !== undefined ? overrides.scode : null,
    reference: overrides.reference !== undefined ? overrides.reference : null
  };

  if (overrides.id !== undefined) row.id = overrides.id;

  const [insertId] = await knex('jcusers').insert(row);
  return { ...row, id: overrides.id !== undefined ? overrides.id : insertId };
}

async function createScores(userId, overrides = {}) {
  const row = {
    user_id: userId,
    level: overrides.level !== undefined ? overrides.level : 1,
    points: overrides.points !== undefined ? overrides.points : 5,
    total_points: overrides.total_points !== undefined ? overrides.total_points : 5,
    max_level_points: overrides.max_level_points !== undefined ? overrides.max_level_points : 55,
    storesize: overrides.storesize !== undefined ? overrides.storesize : 25
  };
  await knex('scores').insert(row);
  return row;
}

// countsByType: { [jeweltype_id]: count }
async function createJewels(userId, countsByType = {}) {
  const rows = Object.entries(countsByType).map(([jeweltypeId, count]) => ({
    user_id: userId,
    jeweltype_id: Number(jeweltypeId),
    count,
    total_count: count
  }));
  if (rows.length === 0) return [];
  return knex('jewels').insert(rows);
}

async function createFactoryUserRow(userId, factoryId, overrides = {}) {
  const row = {
    user_id: userId,
    factory_id: factoryId,
    is_on: overrides.is_on !== undefined ? overrides.is_on : false,
    start_time: overrides.start_time !== undefined ? overrides.start_time : null
  };
  const [id] = await knex('factoryuser').insert(row);
  return id;
}

async function createTaskUserRow(userId, taskId, overrides = {}) {
  const row = {
    user_id: userId,
    task_id: taskId,
    is_bomb: overrides.is_bomb !== undefined ? overrides.is_bomb : 0,
    bomb_status: overrides.bomb_status !== undefined ? overrides.bomb_status : -1,
    done: overrides.done !== undefined ? overrides.done : false,
    completed_at: overrides.completed_at !== undefined ? overrides.completed_at : null
  };
  const [id] = await knex('taskusers').insert(row);
  return id;
}

// Directly backdates factoryuser.start_time so factory.js's
// `TIMESTAMPDIFF(SECOND, start_time, NOW()) > duration` checks see elapsed time,
// without needing a real sleep.
async function backdateFactoryStart(userId, factoryId, secondsAgo) {
  await knex('factoryuser')
    .where({ user_id: userId, factory_id: factoryId })
    .update({ start_time: knex.raw('NOW() - INTERVAL ? SECOND', [secondsAgo]) });
}

// tasksgame.js's redeemTask requires `taskusers.created_at < curr_time` (computed at request
// time), so a taskuser row inserted with the DB's default NOW() needs to be a little further
// in the past to avoid same-second boundary flakiness.
async function backdateTaskUserCreatedAt(taskUserId, secondsAgo) {
  await knex('taskusers')
    .where({ id: taskUserId })
    .update({ created_at: knex.raw('NOW() - INTERVAL ? SECOND', [secondsAgo]) });
}

// Low bcrypt cost keeps login tests fast; the real hash cost lives in scripts/createAdmin.js.
async function createAdmin(overrides = {}) {
  const password = overrides.password !== undefined ? overrides.password : 'correct horse battery';
  const row = {
    email: overrides.email !== undefined ? overrides.email : 'admin@example.com',
    name: overrides.name !== undefined ? overrides.name : 'Test Admin',
    active: overrides.active !== undefined ? overrides.active : true,
    password_hash: bcrypt.hashSync(password, 4)
  };
  const [id] = await knex('admins').insert(row);
  return { ...row, id, password };
}

async function setFutureTasks(userId, tasks) {
  await knex('futuretasks').insert({ user_id: userId, tasks: JSON.stringify(tasks) });
}

module.exports = {
  createAdmin,
  setFutureTasks,
  createTestUser,
  createScores,
  createJewels,
  createFactoryUserRow,
  createTaskUserRow,
  backdateFactoryStart,
  backdateTaskUserCreatedAt
};
