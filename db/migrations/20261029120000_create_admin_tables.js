'use strict';

exports.up = function (knex) {
	return knex.schema.createTable('admins', function (table) {
		table.increments('id');
		table.string('email').notNull();
		table.string('password_hash').notNull();
		table.string('name').nullable();
		table.boolean('active').defaultTo(true).notNull();
		table.timestamp('created_at').defaultTo(knex.fn.now());
		table.timestamp('last_login_at').nullable();
		table.unique(['email']);
	})
	.then(() => {
		return knex.schema.createTable('adminlogs', function (table) {
			table.increments('id');
			table.integer('admin_id').unsigned().notNull();
			table.string('action').notNull();
			table.integer('target_user_id').unsigned().nullable();
			table.json('payload').nullable();
			table.timestamp('created_at').defaultTo(knex.fn.now());
			table.index(['admin_id']);
			table.index(['target_user_id']);
			table.foreign('admin_id').references('admins.id');
			table.foreign('target_user_id').references('jcusers.id');
		});
	});
};

exports.down = function (knex) {
	return knex.schema.dropTableIfExists('adminlogs')
		.then(() => knex.schema.dropTableIfExists('admins'));
};
