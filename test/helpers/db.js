'use strict';

const knex = require('../../db/knex');

// Mutable, per-user tables touched by the in-scope controllers (registration, game,
// factory, tasksgame, admin). Static lookups seeded once in globalSetup (jeweltype, tasks,
// taskdetails, achievements, factory, factorymaterial) are deliberately left alone.
const MUTABLE_TABLES = [
  'jcusers',
  'invite',
  'scores',
  'jewels',
  'taskusers',
  'achievementusers',
  'factoryuser',
  'factorylogs',
  'diamondlog',
  'coinlog',
  'pointlog',
  'futuretasks',
  'admins',
  'adminlogs'
];

async function truncateAll() {
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of MUTABLE_TABLES) {
    await knex(table).truncate();
  }
  await knex.raw('SET FOREIGN_KEY_CHECKS = 1');
}

module.exports = { knex, truncateAll, MUTABLE_TABLES };
