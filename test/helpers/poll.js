'use strict';

// Several controllers under test kick off a fire-and-forget knex.transaction and respond
// to the HTTP request before that transaction commits (see the plan's documented races in
// utils/initializeGame.js and controllers/tasksgame.js's redeemTask/getNewTaskOnTaskCompletion).
// Tests asserting those side effects poll for them instead of checking immediately after
// the HTTP response returns.
async function pollUntil(conditionFn, { timeoutMs = 5000, intervalMs = 50 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const result = await conditionFn();
    if (result) return result;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error('pollUntil: condition not met within timeout');
}

module.exports = { pollUntil };
