'use strict';

let knex = require('../db/knex');


module.exports = function(userid) {

  console.log('GAME INITIALIZATION');
  //factory 
  knex.transaction( trx => {      

        knex('factoryuser').insert([{ factory_id:1, user_id: userid },
                                   { factory_id:2, user_id: userid },
                                   { factory_id:3, user_id: userid },
                                   { factory_id:4, user_id: userid },
                                   { factory_id:5, user_id: userid },
                                   { factory_id:6, user_id: userid },
                                   { factory_id:7, user_id: userid },
                                   { factory_id:8, user_id: userid },
                                   { factory_id:9, user_id: userid },
                                   { factory_id:10, user_id: userid }]     
                                  ).transacting(trx)        
        .then(()=>{
            return knex('scores').insert({
              user_id: userid               
            }).transacting(trx);
        })
        .then(()=>{
            return knex('wallet').insert({
              user_id: userid             
            }).transacting(trx);
        })
        .then(()=>{
            return knex('jewels')
            .insert([{
                      user_id: userid,
                      jeweltype_id: 0,
                      count: 1,
                      total_count:1               
                    },
                    {
                      user_id: userid,
                      jeweltype_id: 1,
                      count: 50,
                      total_count: 50  
                    },
                    {
                      user_id: userid,
                      jeweltype_id: 2,
                      count: 0,
                      total_count: 0
                    },
                    {
                      user_id: userid,
                      jeweltype_id: 3,
                      count: 5,
                      total_count: 5 
                    },
                    {
                      user_id: userid,
                      jeweltype_id: 4,
                      count: 0,
                      total_count: 0  
                    },
                    {
                      user_id: userid,
                      jeweltype_id: 5,
                      count: 0,
                      total_count: 0  
                    },
                    {
                      user_id: userid,
                      jeweltype_id: 6,
                      count: 4,
                      total_count: 4 
                    },
                    {
                      user_id: userid,
                      jeweltype_id: 7,
                      count: 0,
                      total_count: 0 
                    },
                    {
                      user_id: userid,
                      jeweltype_id: 8,
                      count: 0,
                      total_count: 0
                    },
                    {
                      user_id: userid,
                      jeweltype_id: 9,
                      count: 3,
                      total_count: 3 
                    },
                    {
                      user_id: userid,
                      jeweltype_id: 10,
                      count: 0,
                      total_count: 0
                    },
                    {
                      user_id: userid,
                      jeweltype_id: 11,
                      count: 0,
                      total_count: 0 
                    },
                    {
                      user_id: userid,
                      jeweltype_id: 12,
                      count: 0,
                      total_count: 0 
                    },
                    {
                      user_id: userid,
                      jeweltype_id: 13,
                      count: 0,
                      total_count: 0 
                    },
                    {
                      user_id: userid,
                      jeweltype_id: 14,
                      count: 0,
                      total_count: 0 
                    },
                    {
                      user_id: userid,
                      jeweltype_id: 15,
                      count: 0,
                      total_count: 0 
                    },
                    {
                      user_id: userid,
                      jeweltype_id: 16,
                      count: 0,
                      total_count: 0 
                    },
                    {
                      user_id: userid,
                      jeweltype_id: 17,
                      count: 0,
                      total_count: 0 
                    }]
                  ).transacting(trx);
        })               
        .then(()=>{
            return knex('achievementusers').insert( [{
                                                      user_id: userid,
                                                      achievement_id: 1                          
                                                    },
                                                    {
                                                      user_id: userid,
                                                      achievement_id: 2                          
                                                    },
                                                    {
                                                      user_id: userid,
                                                      achievement_id: 3                         
                                                    },
                                                    {
                                                      user_id: userid,
                                                      achievement_id: 4                          
                                                    },
                                                    {
                                                      user_id: userid,
                                                      achievement_id: 5                          
                                                    },
                                                    {
                                                      user_id: userid,
                                                      achievement_id: 6                          
                                                    },
                                                    {
                                                      user_id: userid,
                                                      achievement_id: 7                          
                                                    },
                                                    {
                                                      user_id: userid,
                                                      achievement_id: 8                          
                                                    },
                                                    {
                                                      user_id: userid,
                                                      achievement_id: 9                          
                                                    },
                                                    {
                                                      user_id: userid,
                                                      achievement_id: 10                          
                                                    },
                                                    {
                                                      user_id: userid,
                                                      achievement_id: 11                          
                                                    },
                                                    {
                                                      user_id: userid,
                                                      achievement_id: 12                          
                                                    },
                                                    {
                                                      user_id: userid,
                                                      achievement_id: 13                          
                                                    },
                                                    {
                                                      user_id: userid,
                                                      achievement_id: 14                          
                                                    },
                                                    {
                                                      user_id: userid,
                                                      achievement_id: 15                          
                                                    },
                                                    {
                                                      user_id: userid,
                                                      achievement_id: 16                          
                                                    },
                                                    {
                                                      user_id: userid,
                                                      achievement_id: 17                          
                                                    },
                                                    {
                                                      user_id: userid,
                                                      achievement_id: 18                          
                                                    },
                                                    {
                                                      user_id: userid,
                                                      achievement_id: 19                          
                                                    },
                                                    {
                                                      user_id: userid,
                                                      achievement_id: 20                         
                                                    },
                                                    {
                                                      user_id: userid,
                                                      achievement_id: 21                          
                                                    },
                                                    {
                                                      user_id: userid,
                                                      achievement_id: 22                          
                                                    },
                                                    {
                                                      user_id: userid,
                                                      achievement_id: 23                          
                                                    },
                                                    {
                                                      user_id: userid,
                                                      achievement_id: 24                          
                                                    },
                                                    {
                                                      user_id: userid,
                                                      achievement_id: 25                          
                                                    },
                                                    {
                                                      user_id: userid,
                                                      achievement_id: 26                         
                                                    },
                                                    {
                                                      user_id: userid,
                                                      achievement_id: 27                          
                                                    },
                                                    {
                                                      user_id: userid,
                                                      achievement_id: 28                          
                                                    },
                                                    {
                                                      user_id: userid,
                                                      achievement_id: 29                          
                                                    },
                                                    {
                                                      user_id: userid,
                                                      achievement_id: 30                          
                                                    },
                                                    {
                                                      user_id: userid,
                                                      achievement_id: 31                          
                                                    },
                                                    {
                                                      user_id: userid,
                                                      achievement_id: 32                           
                                                    }]

                                                  ).transacting(trx);
        })                     
        .then(()=>{
             return knex('taskusers').insert([{
                                                user_id: userid,
                                                task_id: 1                          
                                              },
                                              {
                                                user_id: userid,
                                                task_id: 2                          
                                              },
                                              {
                                                user_id: userid,
                                                task_id: 3                          
                                              },
                                              {
                                                user_id: userid,
                                                task_id: 4                          
                                              },
                                              {
                                                user_id: userid,
                                                task_id: 5                          
                                              },
                                              {
                                                user_id: userid,
                                                task_id: 6                          
                                              },
                                              {
                                                user_id: userid,
                                                task_id: 7                          
                                              },
                                              {
                                                user_id: userid,
                                                task_id: 8                          
                                              }]

                                            ).transacting(trx);
        })           
        .then( () =>{
          return knex('jcusers').where({ id: userid }).update({ initialized: true }).transacting(trx);
        })
        .then(trx.commit)
        .catch(trx.rollback);

  })
  .then( values => {
    console.log('GAME INITIALIZATION SUCCESSFUL')
  })
  .catch( err => {

    console.log(err);
    
  });
    
};
