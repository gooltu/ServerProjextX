'use strict'

// Task catalog id ranges. Nothing in the tasks table marks a task as a bomb; it's purely
// this id convention, shared by tasksgame.js (generation) and admin.js (catalog/queue).
module.exports = {
	NORMAL_TASK_MIN: 1,
	NORMAL_TASK_MAX: 100,
	BOMB_TASK_MIN: 101,
	BOMB_TASK_MAX: 150,
	DEFAULT_BOMB_MINUTES: 5
};
