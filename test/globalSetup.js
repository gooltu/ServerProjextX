'use strict';

const knexLib = require('knex');
const knexfile = require('../knexfile_test.js').test;
const loadTaskCatalog = require('./fixtures/loadTaskCatalog');

module.exports = async function globalSetup() {
  const knex = knexLib(knexfile);

  try {
    // Ensure a clean slate on every run (the test DB's tmpfs volume only resets on
    // container restart, and globalSetup itself is not otherwise idempotent).
    await knex.migrate.rollback({}, true);
    await knex.migrate.latest();

    // Static lookup data reused from the dev seeds (skip shows_seed3.js, which
    // deletes/re-inserts a fixed jcusers row and would clash with per-test truncation).
    await require('../db/seeds/development/shows_seed.js').seed(knex); // jeweltype
    await require('../db/seeds/development/shows_seed1.js').seed(knex); // achievements
    await require('../db/seeds/development/shows_seed2.js').seed(knex); // factory/factorymaterial

    await loadTaskCatalog(knex); // tasks/taskdetails, from the real production dump
  } finally {
    await knex.destroy();
  }
};
