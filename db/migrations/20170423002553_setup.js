'use strict';

exports.up = function(knex, Promise) {  

  return knex.schema.createTable('jcusers', function(table){
      table.increments('id');      
      table.bigInteger('phone').unsigned().notNull();
      table.string('vcode').nullable(); 
      table.string('scode').nullable();      
      table.string('name').nullable();
      table.string('status', 1000).nullable().collate('utf8mb4_unicode_ci');      
      table.bigInteger('reference').unsigned().nullable();      
      table.string('push_service').nullable();
      table.string('device_id').nullable();      
      table.boolean('active').defaultTo(false);
      table.boolean('initialized').defaultTo(false); 
      table.text('address', 'longtext' ).nullable();
      table.string('gender').nullable();
      table.date('dob').nullable();
      table.string('upi').nullable();                 
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());        
      table.unique(['phone']);      
      table.index(['reference']);
      table.charset('utf8mb4');
      table.collate('utf8mb4_unicode_ci');
    })
  .then(() => {
    return knex.schema.createTable('invite', function(table){
      table.increments('id');
      table.integer('user_id').unsigned().notNull();      
      table.bigInteger('invitee').unsigned().notNull();
      table.index(['invitee']);
      table.unique([ 'user_id', 'invitee' ]);
    })
  })   
  .then(() => {
    return knex.schema.createTable('jeweltype', function(table){
      table.integer('id').unsigned().notNull().primary();
      table.string('name').notNull();
      table.integer('min_cost').notNull();      
    })
  })  
  .then(() => {
    return knex.schema.createTable('scores', function(table){
      table.increments('id');
      table.integer('user_id').unsigned().notNull();      
      table.integer('level').defaultTo(1).notNull();
      table.integer('points').defaultTo(5).notNull();
      table.integer('total_points').defaultTo(5).notNull();
      table.integer('max_level_points').defaultTo(55).notNull();      
      table.integer('storesize').defaultTo(25).notNull();
      table.integer('level_lastweek').defaultTo(1).notNull();
      table.index(['user_id']);
      table.index(['total_points']);
      table.foreign('user_id').references('jcusers.id');
    })
  })
  .then(() => {
    return knex.schema.createTable('jewels', function(table){
      table.increments('id');
      table.integer('user_id').unsigned().notNull();    
      table.integer('jeweltype_id').unsigned().notNull();     
      table.integer('count').defaultTo(0);
      table.integer('total_count').defaultTo(0);
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.index(['user_id']);
      table.foreign('user_id').references('jcusers.id');
      table.foreign('jeweltype_id').references('jeweltype.id');          
    })
  })
  .then(() => {
    return knex.schema.createTable('walletjewelprice', function(table){
      table.increments('id');
      table.integer('jeweltype_id').unsigned().notNull();
      table.integer('count').notNull();
      table.decimal('money', [5], [2] ).notNull();      
    })
  })
  .then(() => {
    return knex.schema.createTable('tasks', function(table){
      table.increments('id');      
      table.integer('coins').nullable();
      table.integer('points').notNull();            
    })
  })
  .then(() => {
    return knex.schema.createTable('taskdetails', function(table){
      table.increments('id');
      table.integer('task_id').unsigned().notNull();
      table.integer('jeweltype_id').unsigned().notNull();
      table.integer('count').notNull();      
      table.index(['task_id']);
      table.foreign('task_id').references('tasks.id');
      table.foreign('jeweltype_id').references('jeweltype.id');       
    })
  })
  .then(() => {
    return knex.schema.createTable('taskusers', function(table){
      table.increments('id');
      table.integer('task_id').unsigned().notNull();
      table.integer('user_id').unsigned().notNull();
      table.boolean('done').defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now()); 
      table.timestamp('completed_at').nullable(); 
      table.index(['user_id']);
      table.index(['task_id']);
      table.foreign('task_id').references('tasks.id');
      table.foreign('user_id').references('jcusers.id');      
    })
  })  
  .then(() => {
    return knex.schema.createTable('gifttasks', function(table){
      table.increments('id');
      table.integer('priority').nullable();
      table.boolean('enabled').defaultTo(true);
      table.boolean('cash').defaultTo(false);
      table.string('productname').nullable();
      table.string('productdetail', 1500).nullable().collate('utf8mb4_unicode_ci');     
      table.string('product_pic').nullable();       
      table.decimal('money', [5], [2] ).defaultTo(0.00).nullable();      
      table.integer('total_qty').nullable();
      table.integer('current_qty').nullable();
      table.integer('plus_level').nullable();
      table.string('productlinks', 1000).nullable();      
      table.timestamp('created_at').defaultTo(knex.fn.now());  
      table.index(['priority']); 
      table.index(['enabled']);     
    })
  })
  .then(() => {
    return knex.schema.createTable('gifttaskdetails', function(table){
      table.increments('id');
      table.integer('gifttask_id').unsigned().notNull();
      table.integer('jeweltype_id').unsigned().notNull();
      table.integer('count').notNull();      
      table.index(['gifttask_id']);
      table.foreign('gifttask_id').references('gifttasks.id');
      table.foreign('jeweltype_id').references('jeweltype.id');       
    })
  })
  .then(() => {
    return knex.schema.createTable('gifttaskusers', function(table){
      table.increments('id');
      table.integer('gifttask_id').unsigned().notNull();
      table.integer('user_id').unsigned().notNull();  
      table.integer('cycle').notNull();      
      table.integer('level').defaultTo(0);
      table.boolean('done').defaultTo(false);
      table.timestamp('expiration_at').nullable(); 
      table.timestamp('giftwon_at');
      table.string('status').nullable();
      table.index(['user_id']);
      table.index(['gifttask_id']);
      table.unique([ 'user_id', 'gifttask_id', 'cycle' ]);
      table.foreign('gifttask_id').references('gifttasks.id');
      table.foreign('user_id').references('jcusers.id');      
    })
  })
  .then(() => {
    return knex.schema.createTable('achievements', function(table){
      table.integer('id').unsigned().notNull().primary();
      table.integer('diamond').notNull();
      table.string('text').notNull();
      table.string('note').nullable();           
    })
  })
  .then(() => {
    return knex.schema.createTable('achievementusers', function(table){
      table.increments('id');
      table.integer('achievement_id').unsigned().notNull();
      table.integer('user_id').unsigned().notNull();
      table.integer('level').defaultTo(2);      
      table.index(['achievement_id']);
      table.foreign('achievement_id').references('achievements.id');      
    })
  })
  .then(() => {
    return knex.schema.createTable('factory', function(table){
      table.increments('id');
      table.integer('jeweltype_id').unsigned().notNull();
      table.integer('count').notNull();
      table.integer('level').notNull();
      table.integer('diamond').notNull(); 
      table.integer('duration').notNull();
      table.foreign('jeweltype_id').references('jeweltype.id');          
    })
  })
  .then(() => {
    return knex.schema.createTable('factorymaterial', function(table){
      table.increments('id');
      table.integer('factory_id').unsigned().notNull();
      table.integer('jeweltype_id').unsigned().notNull();
      table.integer('count').notNull();
      table.index(['factory_id']);      
      table.foreign('factory_id').references('factory.id'); 
      table.foreign('jeweltype_id').references('jeweltype.id');     
    })
  })
  .then(() => {
    return knex.schema.createTable('factoryuser', function(table){
      table.increments('id');
      table.integer('factory_id').unsigned().notNull();
      table.integer('user_id').unsigned().notNull();      
      table.timestamp('start_time').nullable();
      table.boolean('is_on').defaultTo(false);
      table.index(['factory_id']);
      table.index(['user_id']);
      table.foreign('factory_id').references('factory.id'); 
      table.foreign('user_id').references('jcusers.id');      
    })
  })
  .then(() => {
    return knex.schema.createTable('factorylogs', function(table){
      table.increments('id');
      table.integer('factory_id').unsigned().notNull();
      table.integer('user_id').unsigned().notNull(); 
      table.timestamp('start_time').nullable();    
      table.timestamp('end_time').nullable();
      table.boolean('diamond_used').defaultTo(false); 

      table.foreign('factory_id').references('factory.id'); 
      table.foreign('user_id').references('jcusers.id');      
    })
  })  
  .then(() => {
    return knex.schema.createTable('wallet', function(table){
      table.increments('id');
      table.integer('user_id').unsigned().notNull();
      table.decimal('money', [15], [2]).defaultTo(0.00).notNull();
      table.index(['user_id']);      
      table.foreign('user_id').references('jcusers.id');  
    })
  })  
  .then(() => {
    return knex.schema.createTable('walletlog', function(table){
      table.increments('id');
      table.integer('user_id').unsigned().notNull();
      table.decimal('money', [15], [2]).defaultTo(0.00).notNull();
      table.string('tag').notNull();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index(['user_id']);
      table.foreign('user_id').references('jcusers.id');
    })
  })
  .then(() => {
    return knex.schema.createTable('diamondlog', function(table){
      table.increments('id');
      table.integer('user_id').unsigned().notNull();
      table.integer('count').notNull();     
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.string('logtext').notNull();
      table.index(['user_id']);
      table.foreign('user_id').references('jcusers.id');
    })
  })
  .then(() => {
    return knex.schema.createTable('coinlog', function(table){
      table.increments('id');
      table.integer('user_id').unsigned().notNull();
      table.integer('count').notNull();     
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.string('logtext').notNull();
      table.index(['user_id']);

      table.foreign('user_id').references('jcusers.id');
    })
  })
  .then(() => {
    return knex.schema.createTable('pointlog', function(table){
      table.increments('id');
      table.integer('user_id').unsigned().notNull();
      table.integer('count').notNull();     
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.string('logtext').notNull();
      table.index(['user_id']);

      table.foreign('user_id').references('jcusers.id');
    })
  })
  .then(() => {
    return knex.schema.createTable('allgifts', function(table){
      table.increments('id');
      table.integer('user_id').unsigned().notNull();
      table.bigInteger('phone').unsigned().notNull();      
      table.string('productname').nullable();
      table.string('product_pic').nullable();      
      table.integer('gifttaskuser_id').unsigned().nullable();
      table.decimal('money', [5], [2] ).defaultTo(0.00).nullable();
      table.string('money_channel').nullable();
      table.string('status').nullable();
      table.string('notes').nullable();
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.foreign('user_id').references('jcusers.id');
    })

  })
  

}  

exports.down = function(knex, Promise) {  
  return Promise.all([
    knex.schema.dropTableIfExists('jcusers'),
    knex.schema.dropTableIfExists('invite'),
    knex.schema.dropTableIfExists('blocked'),    
    knex.schema.dropTableIfExists('groups'),
    knex.schema.dropTableIfExists('groupmembers'),
    knex.schema.dropTableIfExists('chats'),
    knex.schema.dropTableIfExists('groupchats'),
    knex.schema.dropTableIfExists('scores'),
    knex.schema.dropTableIfExists('jeweltype'),
    knex.schema.dropTableIfExists('jewels'),
    knex.schema.dropTableIfExists('taskdetails'),
    knex.schema.dropTableIfExists('taskusers'),
    knex.schema.dropTableIfExists('achievements'),
    knex.schema.dropTableIfExists('achievementusers'),
    knex.schema.dropTableIfExists('factory'),
    knex.schema.dropTableIfExists('factorymaterial'),
    knex.schema.dropTableIfExists('factoryuser'),
    knex.schema.dropTableIfExists('factorylogs'),
    knex.schema.dropTableIfExists('market'),
    knex.schema.dropTableIfExists('wallet'),
    knex.schema.dropTableIfExists('moneytogive'),
    knex.schema.dropTableIfExists('prize'),
    knex.schema.dropTableIfExists('diamondlog'), 
    knex.schema.dropTableIfExists('coinlog'), 
    knex.schema.dropTableIfExists('pointlog')
  ])
};

