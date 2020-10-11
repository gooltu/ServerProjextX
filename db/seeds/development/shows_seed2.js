let Promise = require('bluebird');
exports.seed = function(knex) {
  // Deletes ALL existing entries

  return Promise.join(
    // Deletes ALL existing entries
    
    knex('factorymaterial').del(),
    knex('factory').del()
       
  ) 
  .then(() => {    

        return knex.table('factory')
                   //.returning('id')
                   .insert({
                      jeweltype_id:4, count: 6, level: 0, diamond:5, duration:300 
                   })
                   .then(function(id){
                      
                      return Promise.join(
                        // Deletes ALL existing entries
                        knex.table('factorymaterial').insert({ factory_id: id, jeweltype_id: 3, count: 9 }),
                        knex.table('factorymaterial').insert({ factory_id: id, jeweltype_id: 1, count: 10 })
                         
                      );

                   });

  })
  .then(() => {    

        return knex.table('factory')
                   //.returning('id')
                   .insert({
                      jeweltype_id:5, count: 3, level: 0, diamond:7, duration:900 
                   })
                   .then(function(id){
                      
                      return Promise.join(
                        // Deletes ALL existing entries
                        knex.table('factorymaterial').insert({ factory_id: id, jeweltype_id: 4, count: 6 }),
                        knex.table('factorymaterial').insert({ factory_id: id, jeweltype_id: 1, count: 20 })
                         
                      );

                   });

  })
  .then(() => {    

        return knex.table('factory')
                   //.returning('id')
                   .insert({
                      jeweltype_id:7, count: 6, level: 0, diamond:7, duration:900 
                   })
                   .then(function(id){
                      
                      return Promise.join(
                        // Deletes ALL existing entries
                        knex.table('factorymaterial').insert({ factory_id: id, jeweltype_id: 6, count: 9 }),
                        knex.table('factorymaterial').insert({ factory_id: id, jeweltype_id: 1, count: 60 })
                         
                      );

                   });

  })
  .then(() => {    

        return knex.table('factory')
                   //.returning('id')
                   .insert({
                      jeweltype_id:8, count: 3, level: 0, diamond:9, duration:2700 
                   })
                   .then(function(id){
                      
                      return Promise.join(
                        // Deletes ALL existing entries
                        knex.table('factorymaterial').insert({ factory_id: id, jeweltype_id: 7, count: 6 }),
                        knex.table('factorymaterial').insert({ factory_id: id, jeweltype_id: 1, count: 120 })
                         
                      );

                   });

  })
  .then(() => {    

        return knex.table('factory')
                   //.returning('id')
                   .insert({
                      jeweltype_id:10, count: 3, level: 0, diamond:9, duration:2700 
                   })
                   .then(function(id){
                      
                      return Promise.join(
                        // Deletes ALL existing entries
                        knex.table('factorymaterial').insert({ factory_id: id, jeweltype_id: 9, count: 6 }),
                        knex.table('factorymaterial').insert({ factory_id: id, jeweltype_id: 1, count: 110 })
                         
                      );

                   });

  })
  .then(() => {    

        return knex.table('factory')
                   //.returning('id')
                   .insert({
                      jeweltype_id:11, count: 3, level: 0, diamond:11, duration:8100 
                   })
                   .then(function(id){
                      
                      return Promise.join(
                        // Deletes ALL existing entries
                        knex.table('factorymaterial').insert({ factory_id: id, jeweltype_id: 10, count: 3 }),
                        knex.table('factorymaterial').insert({ factory_id: id, jeweltype_id: 1, count: 220 })
                         
                      );

                   });

  })
  .then(() => {    

        return knex.table('factory')
                   //.returning('id')
                   .insert({
                      jeweltype_id:13, count: 3, level: 0, diamond:11, duration:8100 
                   })
                   .then(function(id){
                      
                      return Promise.join(
                        // Deletes ALL existing entries
                        knex.table('factorymaterial').insert({ factory_id: id, jeweltype_id: 12, count: 6 }),
                        knex.table('factorymaterial').insert({ factory_id: id, jeweltype_id: 1, count: 160 })
                         
                      );

                   });

  })
  .then(() => {    

        return knex.table('factory')
                   //.returning('id')
                   .insert({
                      jeweltype_id:14, count: 3, level: 0, diamond:13, duration:24300 
                   })
                   .then(function(id){
                      
                      return Promise.join(
                        // Deletes ALL existing entries
                        knex.table('factorymaterial').insert({ factory_id: id, jeweltype_id: 13, count: 3 }),
                        knex.table('factorymaterial').insert({ factory_id: id, jeweltype_id: 1, count: 320 })
                         
                      );

                   });

  })
  .then(() => {    

        return knex.table('factory')
                   //.returning('id')
                   .insert({
                      jeweltype_id:16, count: 3, level: 0, diamond:13, duration:24300 
                   })
                   .then(function(id){
                      
                      return Promise.join(
                        // Deletes ALL existing entries
                        knex.table('factorymaterial').insert({ factory_id: id, jeweltype_id: 15, count: 3 }),
                        knex.table('factorymaterial').insert({ factory_id: id, jeweltype_id: 1, count: 210 })
                         
                      );

                   });

  })
  .then(() => {    

        return knex.table('factory')
                   //.returning('id')
                   .insert({
                      jeweltype_id:17, count: 1, level: 0, diamond:15, duration:72900 
                   })
                   .then(function(id){
                      
                      return Promise.join(
                        // Deletes ALL existing entries
                        knex.table('factorymaterial').insert({ factory_id: id, jeweltype_id: 16, count: 3 }),
                        knex.table('factorymaterial').insert({ factory_id: id, jeweltype_id: 1, count: 415 })
                         
                      );

                   });

  })
  

};
