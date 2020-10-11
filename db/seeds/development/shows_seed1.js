let Promise = require('bluebird');
exports.seed = function(knex) {
  // Deletes ALL existing entries

  return Promise.join(
    // Deletes ALL existing entries
    
    knex('achievements').del()
    
       
  ) 
  .then(() => {    

        return knex.table('achievements')                   
                   .insert({
                      id:1, diamond: 1, text: 'Invite <x> users.'
                   });
                   

  })
  .then(() => {    

        return knex.table('achievements')                   
                   .insert({
                      id: 2, diamond: 1, text: 'Refer <x> users successfully.'
                   });
                   

  })
  .then(() => {    

        return knex.table('achievements')                   
                   .insert({
                      id: 3, diamond: 1, text: "Collect <x> <img src='t3' />"
                   });
                   

  })
  .then(() => {    

        return knex.table('achievements')                   
                   .insert({
                      id: 4, diamond: 1, text: "Collect <x> <img src='t4' />"
                   });
                   

  })
  .then(() => {    

        return knex.table('achievements')                   
                   .insert({
                      id: 5, diamond: 1, text: "Collect <x> <img src='t5' />"
                   });
                   

  })
  .then(() => {    

        return knex.table('achievements')                   
                   .insert({
                      id: 6, diamond: 1, text: "Collect <x> <img src='t6' />"
                   });
                   

  })
  .then(() => {    

        return knex.table('achievements')                   
                   .insert({
                      id: 7, diamond: 1, text: "Collect <x> <img src='t7' />"
                   });
                   

  })
  .then(() => {    

        return knex.table('achievements')                   
                   .insert({
                      id: 8, diamond: 1, text: "Collect <x> <img src='t8' />"
                   });
                   

  })
  .then(() => {    

        return knex.table('achievements')                   
                   .insert({
                      id: 9, diamond: 1, text: "Collect <x> <img src='t9' />"
                   });
                   

  })
  .then(() => {    

        return knex.table('achievements')                   
                   .insert({
                      id: 10, diamond: 2, text: "Collect <x> <img src='t10' />"
                   });
                   

  })
  .then(() => {    

        return knex.table('achievements')                   
                   .insert({
                      id: 11, diamond: 2, text: "Collect <x> <img src='t11' />"
                   });
                   

  })
  .then(() => {    

        return knex.table('achievements')                   
                   .insert({
                      id: 12, diamond: 1, text: "Collect <x> <img src='t12' />"
                   });
                   

  })
  .then(() => {    

        return knex.table('achievements')                   
                   .insert({
                      id: 13, diamond: 2, text: "Collect <x> <img src='t13' />"
                   });
                   

  })
  .then(() => {    

        return knex.table('achievements')                   
                   .insert({
                      id: 14, diamond: 2, text: "Collect <x> <img src='t14' />"
                   });
                   

  })
  .then(() => {    

        return knex.table('achievements')                   
                   .insert({
                      id: 15, diamond: 2, text: "Collect <x> <img src='t15' />"
                   });
                   

  })
  .then(() => {    

        return knex.table('achievements')                   
                   .insert({
                      id: 16, diamond: 3, text: "Collect <x> <img src='t16' />"
                   });
                   

  })
  .then(() => {    

        return knex.table('achievements')                   
                   .insert({
                      id: 17, diamond: 1, text: "Collect <x> <img src='t17' />"
                   });
                   

  })
  .then(() => {    

        return knex.table('achievements')                   
                   .insert({
                      id: 18, diamond: 3, text: '<x> referred users reached level 5.'
                   });
                   

  })
  .then(() => {    

        return knex.table('achievements')                   
                   .insert({
                      id: 19, diamond: 3, text: '<x> referred users reached level 10.'
                   });
                   

  })
  .then(() => {    

        return knex.table('achievements')                   
                   .insert({
                      id: 20, diamond: 3, text: '<x> referred users reached level 15.'
                   });
                   

  })
  .then(() => {    

        return knex.table('achievements')                   
                   .insert({
                      id: 21, diamond: 3, text: '<x> referred users reached level 20.'
                   });
                   

  })
  .then(() => {    

        return knex.table('achievements')                   
                   .insert({
                      id: 22, diamond: 3, text: '<x> referred users reached level 25.'
                   });
                   

  })
  .then(() => {    

        return knex.table('achievements')                   
                   .insert({
                      id: 23, diamond: 3, text: '<x> referred users reached level 30.'
                   });
                   

  })
  .then(() => {    

        return knex.table('achievements')                   
                   .insert({
                      id: 24, diamond: 3, text: '<x> referred users reached level 40.'
                   });
                   

  })
  .then(() => {    

        return knex.table('achievements')                   
                   .insert({
                      id: 25, diamond: 3, text: '<x> referred users reached level 50.'
                   });
                   

  })
  .then(() => {    

        return knex.table('achievements')                   
                   .insert({
                      id: 26, diamond: 3, text: '<x> referred users reached level 60.'
                   });
                   

  })
  .then(() => {    

        return knex.table('achievements')                   
                   .insert({
                      id: 27, diamond: 3, text: '<x> referred users reached level 70.'
                   });
                   

  })
  .then(() => {    

        return knex.table('achievements')                   
                   .insert({
                      id: 28, diamond: 3, text: '<x> referred users reached level 80.'
                   });
                   

  })
  .then(() => {    

        return knex.table('achievements')                   
                   .insert({
                      id: 29, diamond: 3, text: '<x> referred users reached level 90.'
                   });
                   

  })
  .then(() => {    

        return knex.table('achievements')                   
                   .insert({
                      id: 30, diamond: 3, text: '<x> referred users reached level 100.'
                   });
                   

  })
  .then(() => {    

        return knex.table('achievements')                   
                   .insert({
                      id: 31, diamond: 3, text: '<x> referred users reached level 110.'
                   });
                   

  })
  .then(() => {    

        return knex.table('achievements')                   
                   .insert({
                      id: 32, diamond: 3, text: '<x> referred users reached level 120.'
                   });
                   

  });

};
