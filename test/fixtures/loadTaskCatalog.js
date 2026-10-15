'use strict';

const fs = require('fs');
const path = require('path');

function extractInsert(sqlFilePath) {
  const content = fs.readFileSync(sqlFilePath, 'utf8');
  const match = content.match(/INSERT INTO[\s\S]*?;/i);
  if (!match) {
    throw new Error(`No INSERT statement found in ${sqlFilePath}`);
  }
  return match[0];
}

module.exports = async function loadTaskCatalog(knex) {
  const tasksInsert = extractInsert(path.join(__dirname, '../../db/seeds/tasks.sql'));
  const taskDetailsInsert = extractInsert(path.join(__dirname, '../../db/seeds/taskdetails.sql'));

  await knex.raw(tasksInsert);
  await knex.raw(taskDetailsInsert);
};
