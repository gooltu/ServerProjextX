'use strict';

module.exports = {
  test: {
    client: 'mysql2',
    connection: {
      host: process.env.TEST_DB_HOST || '127.0.0.1',
      port: Number(process.env.TEST_DB_PORT) || 13307,
      user: process.env.TEST_DB_USER || 'root',
      password: process.env.TEST_DB_PASSWORD || 'test',
      database: process.env.TEST_DB_NAME || 'gameserver_test',
      charset: 'utf8',
      dateStrings: true
    },
    migrations: {
      directory: './db/migrations'
    },
    pool: { min: 1, max: 5 }
  }
};
