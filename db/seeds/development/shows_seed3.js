let Promise = require('bluebird');
exports.seed = function(knex) {
  // Deletes ALL existing entries

  return Promise.all(
    // Deletes ALL existing entries
    knex('jcusers').del()
    //knex('tasks').del(),
    //knex('taskdetails').del(),
    //knex('achievements').del(),
    //knex('factory').del(),
    //knex('factorymaterial').del()    
  )
  .then(()=>{
      return knex('jcusers').insert({
        id: 1,
        phone: 910000000000,
        name: 'Team JewelChat',
        status: 'Keep collecting...'        
      });
  })
  .then(()=>{
      return knex('scores').insert({
        user_id: 1               
      });
  })
  .then(()=>{
      return knex('jewels').insert({
        user_id: 1,
        jeweltype_id: 0,
        count: 1,
        total_count:1               
      });
  })    
  .then(()=>{
      return knex('jewels').insert({
        user_id: 1,
        jeweltype_id: 1,
        count: 50,
        total_count: 50              
      });
  })
  .then(()=>{
      return knex('jewels').insert({
        user_id: 1,
        jeweltype_id: 2,
        count: 0,
        total_count: 0              
      });
  })
  .then(()=>{
      return knex('jewels').insert({
        user_id: 1,
        jeweltype_id: 3,
        count: 5,
        total_count: 5              
      });
  }) 
  .then(()=>{
      return knex('jewels').insert({
        user_id: 1,
        jeweltype_id: 4,
        count: 0,
        total_count: 0             
      });
  })
  .then(()=>{
      return knex('jewels').insert({
        user_id: 1,
        jeweltype_id: 5,
        count: 0,
        total_count: 0              
      });
  }) 
  .then(()=>{
      return knex('jewels').insert({
        user_id: 1,
        jeweltype_id: 6,
        count: 4,
        total_count: 4              
      });
  }) 
  .then(()=>{
      return knex('jewels').insert({
        user_id: 1,
        jeweltype_id: 7,
        count: 0,
        total_count: 0              
      });
  }) 
  .then(()=>{
      return knex('jewels').insert({
        user_id: 1,
        jeweltype_id: 8,
        count: 0,
        total_count: 0              
      });
  }) 
  .then(()=>{
      return knex('jewels').insert({
        user_id: 1,
        jeweltype_id: 9,
        count: 3,
        total_count: 3              
      });
  }) 
  .then(()=>{
      return knex('jewels').insert({
        user_id: 1,
        jeweltype_id: 10,
        count: 0,
        total_count: 0              
      });
  }) 
  .then(()=>{
      return knex('jewels').insert({
        user_id: 1,
        jeweltype_id: 11,
        count: 0,
        total_count: 0              
      });
  }) 
  .then(()=>{
      return knex('jewels').insert({
        user_id: 1,
        jeweltype_id: 12,
        count: 2,
        total_count: 2              
      });
  }) 
  .then(()=>{
      return knex('jewels').insert({
        user_id: 1,
        jeweltype_id: 13,
        count: 0,
        total_count: 0              
      });
  }) 
  .then(()=>{
      return knex('jewels').insert({
        user_id: 1,
        jeweltype_id: 14,
        count: 0,
        total_count: 0              
      });
  }) 
  .then(()=>{
      return knex('jewels').insert({
        user_id: 1,
        jeweltype_id: 15,
        count: 1,
        total_count: 1              
      });
  }) 
  .then(()=>{
      return knex('jewels').insert({
        user_id: 1,
        jeweltype_id: 16,
        count: 0,
        total_count: 0             
      });
  })
  .then(()=>{
      return knex('jewels').insert({
        user_id: 1,
        jeweltype_id: 17,
        count: 0,
        total_count: 0             
      });
  })  



  
};
