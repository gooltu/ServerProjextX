'use strict';

module.exports = async function globalTeardown() {
  // No-op: globalSetup owns and destroys its own, separate knex connection.
};
