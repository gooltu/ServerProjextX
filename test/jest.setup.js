'use strict';

const { truncateAll, knex } = require('./helpers/db');

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await knex.destroy();
});
