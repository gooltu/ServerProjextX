let Promise = require('bluebird');


exports.seed = function(knex) {
  // Deletes ALL existing entries

  return Promise.all(
    // Deletes ALL existing entries
    //knex('jeweltype').del()
    //knex('tasks').del(),
    //knex('taskdetails').del(),
    //knex('achievements').del(),
    //knex('factory').del(),
    //knex('factorymaterial').del()    
  )
  .then(()=>{
      return knex('jeweltype').insert({
        id: 0,
        name: 'diamond',
        min_cost: 5000
      });
  })
  .then(()=>{
      return knex('jeweltype').insert({
        id: 1,
        name: 'coin',
        min_cost: 5000
      });
  })
  .then(()=>{
      return knex('jeweltype').insert({
        id: 2,
        name: 'referred user',
        min_cost: 5000
      });
  })
  .then(()=>{
      return knex('jeweltype').insert({
        id: 3,
        name: 'j1',
        min_cost: 5000
      });
  })
  .then(()=>{
      return knex('jeweltype').insert({
        id: 4,
        name: 'j2',
        min_cost: 5000
      });
  })
  .then(()=>{
      return knex('jeweltype').insert({
        id: 5,
        name: 'j3',
        min_cost: 5000
      });
  })
  .then(()=>{
      return knex('jeweltype').insert({
        id: 6,
        name: 'j4',
        min_cost: 5000
      });
  })
  .then(()=>{
      return knex('jeweltype').insert({
        id: 7,
        name: 'j5',
        min_cost: 5000
      });
  })
  .then(()=>{
      return knex('jeweltype').insert({
        id: 8,
        name: 'j6',
        min_cost: 5000
      });
  })
  .then(()=>{
      return knex('jeweltype').insert({
        id: 9,
        name: 'j7',
        min_cost: 5000
      });
  })
  .then(()=>{
      return knex('jeweltype').insert({
        id: 10,
        name: 'j8',
        min_cost: 5000
      });
  })
  .then(()=>{
      return knex('jeweltype').insert({
        id: 11,
        name: 'j9',
        min_cost: 5000
      });
  })
  .then(()=>{
      return knex('jeweltype').insert({
        id: 12,
        name: 'j10',
        min_cost: 5000
      });
  })
  .then(()=>{
      return knex('jeweltype').insert({
        id: 13,
        name: 'j11',
        min_cost: 5000
      });
  })
  .then(()=>{
      return knex('jeweltype').insert({
        id: 14,
        name: 'j12',
        min_cost: 5000
      });
  })
  .then(()=>{
      return knex('jeweltype').insert({
        id: 15,
        name: 'j13',
        min_cost: 5000
      });
  })
  .then(()=>{
      return knex('jeweltype').insert({
        id: 16,
        name: 'j14',
        min_cost: 5000
      });
  })
  .then(()=>{
      return knex('jeweltype').insert({
        id: 17,
        name: 'j15',
        min_cost: 5000
      });
  })
  


  
};
