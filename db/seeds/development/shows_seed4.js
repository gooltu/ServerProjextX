let Promise = require('bluebird');
exports.seed = function(knex) {
  // Deletes ALL existing entries

  return Promise.join(
    // Deletes ALL existing entries
    knex('money').del()
    //knex('tasks').del(),
    //knex('taskdetails').del(),
    //knex('achievements').del(),
    //knex('factory').del(),
    //knex('factorymaterial').del()    
  )
  .then(()=>{
      return knex('money').insert({
        money: 100.0       
      });
  })
  
    



  
};
