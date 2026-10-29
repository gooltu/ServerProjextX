'use strict';

exports.up = function (knex) {
	return knex.schema.createTable('futuretasks', function (table) {
		table.increments('id');
		table.integer('user_id').unsigned().notNull();
		// Array of { task_id: <int>, is_bomb: <bool>, bomb_minutes?: <int> } objects, consumed
		// front-first by tasksgame.getNewTaskOnTaskCompletion. is_bomb here is a plain JSON
		// boolean, unlike taskusers.is_bomb (integer bomb-type code: 0 = none, 1+ = bomb type).
		table.json('tasks').notNull().defaultTo([]);
		table.unique(['user_id']);
		table.foreign('user_id').references('jcusers.id');
	});
};

exports.down = function (knex) {
	return knex.schema.dropTableIfExists('futuretasks');
};
