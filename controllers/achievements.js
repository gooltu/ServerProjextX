'use strict'

let knex = require('../db/knex');
let Promise = require('bluebird');

let wn = require('weeknumber');

let level_max = [55,289,346,313,241,220,290,410,491,481,411,367,412,526,627,643,583,523,541,642,756,799,755,685,677,759,879,947,924,853,820,879,997,1088,1090,1024,972,1004,1113,1221,1250,1196,1131,1136,1229,1347,1402,1367,1296,1276,1347,1467,1547,1535,1465,1423,1470,1584,1684,1698,1637,1578,1598,1700,1813,1855,1809,1740,1733,1817,1936,2003,1979,1907,1876,1937,2055,2144,2145,2078,2027,2061,2171,2278,2305,2250,2186,2193,2287,2404,2458,2421,2350,2332,2405,2525,2603,2590,2519,2478,2527,2642,2740,2753,2691,2633,2655,2758,2870,2910,2863,2795,2789,2874,2994,3059,3033,2962,2932,2994,3112,3201,3200,3132,3082,3118,3229,3334,3360,3304,3240,3249,3345,3461,3514,3476,3405,3388,3462,3582,3659,3644,3574,3534,3584,3700,3797,3808,3745,3688,3711,3816,3927,3965,3917,3849,3846,3932,4051,4115,4088,4016,3988,4051,4170,4257,4254,4186,4138,4175,4287,4391,4415,4359,4295,4306,4402,4518,4569,4530,4459,4444,4520,4640,4715,4699,4628,4590,4641,4757,4853,4863,4800,4743,4768,4873,4984,5021,4972,4904,4902];

let achievements = module.exports;


achievements.getAchievements= function(req, res, next) {  
  
  knex('achievements')
  .select('achievements.id as achievement_id', 'diamond', 'text', 'note' )
  .then(achievements => {
    res.json({ error: false, achievements });
  })
  .catch(err => {
      next(err);
  });


};



achievements.getUsersAchievement = function(req, res, next) {

  knex('achievementusers').where({ user_id: req.user.id })
  .orderBy('achievement_id', 'asc')
  .select()
  .then(userachievements => {
    res.json({ error: false, userachievements });
  })
  .catch(err => {
      next(err);
  });


};


function complete_achievement(diamonds, level, achievement, a_id, user_id, req, res, next){

  knex.transaction( trx => {    

    let p = []; let q;

    q =  knex('jewels').where({ user_id, jeweltype_id: 0 }).increment( 'count', diamonds ).increment( 'total_count', diamonds ).transacting(trx)
    p.push(q);
    
    q = knex('achievementusers').where({ id: a_id }).increment( 'level', 5 ).transacting(trx);
    p.push(q);

    q = knex('diamondlog').insert({ user_id , count : diamonds, logtext: 'Achievement '+achievement+' , Achievement User ID '+a_id+' for level '+level}).transacting(trx);

    p.push(q)


    Promise.all(p)
    .then( trx.commit)
    .catch(trx.rollback)

  })  
  .catch(err => {
    console.log(err);
  });

  return res.json({ error:false, percent: 100 });

}



achievements.redeemAchievement = function(req, res, next) {

  let a_id = req.body.id;
  let user_id = req.user.id;

  let level, id, phone, diamond;  

  // knex('achievementusers').where({ id: a_id }).select()
  // .then( achi => {

  //   id = achi[0].achievement_id;
  //   level = achi[0].level;

  //   return knex('jcusers').where({ id: req.user.id }).select(); 

  // })
  // .then( user => {

  //   phone = user[0].phone;    

  //   return knex('scores').where({ user_id }).select(); 

  // })

  knex('achievementusers')  
  .join('jcusers', 'achievementusers.user_id', '=', 'jcusers.id')  
  .join('scores', 'achievementusers.user_id', '=', 'scores.user_id' )
  .join('achievements', 'achievementusers.achievement_id', '=', 'achievements.id')
  .where('achievementusers.id', '=', a_id )
  .where('achievementusers.user_id', '=', user_id)
  .whereRaw('?? >= ??', ['scores.level', 'achievementusers.level']) 
  .select('achievementusers.achievement_id as achievement_id', 'achievementusers.level as level',  'jcusers.phone as phone', 'achievements.diamond as diamond')
  .then( record => {

    console.log(record);

    if(record.length == 0)
      throw new Error('Illegal action');

    id = record[0].achievement_id;
    phone = record[0].phone;
    level = record[0].level;
    diamond = record[0].diamond;

    
    switch(id){

      case 1: return knex('invite').where({user_id}).count( 'invitee as i' );
      case 2: return knex('jewels').where({user_id, jeweltype_id: 2}).select('total_count');
      case 3: return knex('jewels').where({user_id, jeweltype_id: 3}).select('total_count');
      case 4: return knex('jewels').where({user_id, jeweltype_id: 4}).select('total_count');
      case 5: return knex('jewels').where({user_id, jeweltype_id: 5}).select('total_count');
      case 6: return knex('jewels').where({user_id, jeweltype_id: 6}).select('total_count');
      case 7: return knex('jewels').where({user_id, jeweltype_id: 7}).select('total_count');
      case 8: return knex('jewels').where({user_id, jeweltype_id: 8}).select('total_count');
      case 9: return knex('jewels').where({user_id, jeweltype_id: 9}).select('total_count');
      case 10: return knex('jewels').where({user_id, jeweltype_id: 10}).select('total_count');
      case 11: return knex('jewels').where({user_id, jeweltype_id: 11}).select('total_count');
      case 12: return knex('jewels').where({user_id, jeweltype_id: 12}).select('total_count');
      case 13: return knex('jewels').where({user_id, jeweltype_id: 13}).select('total_count');
      case 14: return knex('jewels').where({user_id, jeweltype_id: 14}).select('total_count');
      case 15: return knex('jewels').where({user_id, jeweltype_id: 15}).select('total_count');
      case 16: return knex('jewels').where({user_id, jeweltype_id: 16}).select('total_count');
      case 17: return knex('jewels').where({user_id, jeweltype_id: 17}).select('total_count');

      case 18: return knex('jcusers').where( 'jcusers.reference' , phone )
                  .join('scores', 'jcusers.id', '=', 'scores.user_id')
                  .andWhere( 'scores.level', '>=', 5 )
                  .count('jcusers.id as ref');

      case 19: return knex('jcusers').where( 'jcusers.reference' , phone )
                  .join('scores', 'jcusers.id', '=', 'scores.user_id')
                  .andWhere( 'scores.level', '>=', 10 )
                  .count('jcusers.id as ref');

      case 20: return knex('jcusers').where( 'jcusers.reference' , phone )
                  .join('scores', 'jcusers.id', '=', 'scores.user_id')
                  .andWhere( 'scores.level', '>=', 15 )
                  .count('jcusers.id as ref');
                  
      case 21: return knex('jcusers').where( 'jcusers.reference' , phone )
                  .join('scores', 'jcusers.id', '=', 'scores.user_id')
                  .andWhere( 'scores.level', '>=', 20 )
                  .count('jcusers.id as ref');
                  
      case 22: return knex('jcusers').where( 'jcusers.reference' , phone )
                  .join('scores', 'jcusers.id', '=', 'scores.user_id')
                  .andWhere( 'scores.level', '>=', 25 )
                  .count('jcusers.id as ref');

      case 23: return knex('jcusers').where( 'jcusers.reference' , phone )
                  .join('scores', 'jcusers.id', '=', 'scores.user_id')
                  .andWhere( 'scores.level', '>=', 30 )
                  .count('jcusers.id as ref');

      case 24: return knex('jcusers').where( 'jcusers.reference' , phone )
                  .join('scores', 'jcusers.id', '=', 'scores.user_id')
                  .andWhere( 'scores.level', '>=', 35 )
                  .count('jcusers.id as ref');
                  
      case 25: return knex('jcusers').where( 'jcusers.reference' , phone )
                  .join('scores', 'jcusers.id', '=', 'scores.user_id')
                  .andWhere( 'scores.level', '>=', 40 )
                  .count('jcusers.id as ref');
                  
      case 26: return knex('jcusers').where( 'jcusers.reference' , phone )
                  .join('scores', 'jcusers.id', '=', 'scores.user_id')
                  .andWhere( 'scores.level', '>=', 45 )
                  .count('jcusers.id as ref');
                                                                                          
      case 27: return knex('jcusers').where( 'jcusers.reference' , phone )
                  .join('scores', 'jcusers.id', '=', 'scores.user_id')
                  .andWhere( 'scores.level', '>=', 50 )
                  .count('jcusers.id as ref');
                              
      case 28: return knex('jcusers').where( 'jcusers.reference' , phone )
                  .join('scores', 'jcusers.id', '=', 'scores.user_id')
                  .andWhere( 'scores.level', '>=', 55 )
                  .count('jcusers.id as ref');
      case 29: return knex('jcusers').where( 'jcusers.reference' , phone )
                  .join('scores', 'jcusers.id', '=', 'scores.user_id')
                  .andWhere( 'scores.level', '>=', 60 )
                  .count('jcusers.id as ref');
      
      case 30: return knex('jcusers').where( 'jcusers.reference' , phone )
                  .join('scores', 'jcusers.id', '=', 'scores.user_id')
                  .andWhere( 'scores.level', '>=', 65 )
                  .count('jcusers.id as ref');

      case 31: return knex('jcusers').where( 'jcusers.reference' , phone )
                  .join('scores', 'jcusers.id', '=', 'scores.user_id')
                  .andWhere( 'scores.level', '>=', 70 )
                  .count('jcusers.id as ref');
      
      case 32: return knex('jcusers').where( 'jcusers.reference' , phone )
                  .join('scores', 'jcusers.id', '=', 'scores.user_id')
                  .andWhere( 'scores.level', '>=', 75 )
                  .count('jcusers.id as ref');  

      default: {
        throw new Error('Illegal action');
      }                                                                                                                            

    }


  })
  .then( val => {

    let percent;

    switch(id){

      case 1: {
          console.log(val);
          if(val[0].i < (level)){
            percent = ( val[0].i * 100 )/ level;
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id,req, res, next);

          break;
      }
      case 2:{
          if(val[0].total_count < (level)){                    
            percent = ( val[0].total_count * 100 )/ (level);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id,req, res, next);

          break;
      }
      case 3:{
          if(val[0].total_count < (level * 10)){
            percent = ( val[0].total_count * 100 )/ (level * 10);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id,req, res, next);

          break;
      }
      case 4:{
          if(val[0].total_count < (level * 10)){
            percent = ( val[0].total_count * 100 )/ (level * 10);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id,req, res, next);

          break;
      }
      case 5:{
          if(val[0].total_count < (level * 10)){
            percent = ( val[0].total_count * 100 )/ (level * 10);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id,req, res, next);

          break;
      }
      case 6:{
          if(val[0].total_count < (level * 10)){
            percent = ( val[0].total_count * 100 )/ (level * 10);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id,req, res, next);

          break;
      }
      case 7:{
          if(val[0].total_count < (level * 10)){
            percent = ( val[0].total_count * 100 )/ (level * 10);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id,req, res, next);

          break;
      }
      case 8:{
          if(val[0].total_count < (level * 10)){
            percent = ( val[0].total_count * 100 )/ (level * 10);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id,req, res, next);

          break;
      }
      case 9:{
          if(val[0].total_count < (level * 10)){
            percent = ( val[0].total_count * 100 )/ (level * 10);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id,req, res, next);

          break;
      }      
      case 10:{
          if(val[0].total_count < (level * 10)){
            percent = ( val[0].total_count * 100 )/ (level * 10);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id,req, res, next);

          break;
      }
      case 11:{
          if(val[0].total_count < (level * 10)){
            percent = ( val[0].total_count * 100 )/ (level * 10);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id,req, res, next);

          break;
      }
      case 12:{
          if(val[0].total_count < (level * 10)){
            percent = ( val[0].total_count * 100 )/ (level * 10);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id,req, res, next);

          break;
      }
      case 13:{
          if(val[0].total_count < (level * 10)){
            percent = ( val[0].total_count * 100 )/ (level * 10);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id,req, res, next);

          break;
      }
      case 14:{
          if(val[0].total_count < (level * 10)){
            percent = ( val[0].total_count * 100 )/ (level * 10);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id,req, res, next);

          break;
      }
      case 15:{
          if(val[0].total_count < (level * 10)){
            percent = ( val[0].total_count * 100 )/ (level * 10);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id,req, res, next);

          break;
      }
      case 16:{
          if(val[0].total_count < (level * 10)){
            percent = ( val[0].total_count * 100 )/ (level * 10);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id,req, res, next);

          break;
      }
      case 17:{
          if(val[0].total_count < (level * 10)){
            percent = ( val[0].total_count * 100 )/ (level * 10);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id,req, res, next);

          break;
      }
      case 18:{
          if(val[0].ref < (level)){
            percent = ( val[0].ref * 100 )/ (level);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id,req, res, next);

          break;
      }
      case 19:{
          if(val[0].ref < (level)){
            percent = ( val[0].ref * 100 )/ (level);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id,req, res, next);

          break;
      }
      case 20:{
          if(val[0].ref < (level)){
            percent = ( val[0].ref * 100 )/ (level);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id,req, res, next);

          break;
      }
      case 21:{
          if(val[0].ref < (level)){
            percent = ( val[0].ref * 100 )/ (level);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id,req, res, next);

          break;
      }
      case 22:{
          if(val[0].ref < (level)){
            percent = ( val[0].ref * 100 )/ (level);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id,req, res, next);

          break;
      }
      case 23:{
          if(val[0].ref < (level)){
            percent = ( val[0].ref * 100 )/ (level);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id,req, res, next);

          break;
      }
      case 24:{
          if(val[0].ref < (level)){
            percent = ( val[0].ref * 100 )/ (level);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id,req, res, next);

          break;
      }
      case 25:{
          if(val[0].ref < (level)){
            percent = ( val[0].ref * 100 )/ (level);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id,req, res, next);

          break;
      }
      case 26:{
          if(val[0].ref < (level)){
            percent = ( val[0].ref * 100 )/ (level);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id,req, res, next);

          break;
      }
      case 27:{
          if(val[0].ref < (level)){
            percent = ( val[0].ref * 100 )/ (level);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id,req, res, next);

          break;
      }
      case 28:{
          if(val[0].ref < (level)){
            percent = ( val[0].ref * 100 )/ (level);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id,req, res, next);

          break;
      }
      case 29:{
          if(val[0].ref < (level)){
            percent = ( val[0].ref * 100 )/ (level);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id,req, res, next);

          break;
      }
      case 30:{
          if(val[0].ref < (level)){
            percent = ( val[0].ref * 100 )/ (level);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id,req, res, next);

          break;
      }
      case 31:{
          if(val[0].ref < (level)){
            percent = ( val[0].ref * 100 )/ (level);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id,req, res, next);

          break;
      }
      case 32:{
          if(val[0].ref < (level)){
            percent = ( val[0].ref * 100 )/ (level);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id,req, res, next);

          break;
      }    
      default:{
        throw new Error('Illegal action');
      } 

    }

  })  
  .catch( err => {
      next(err);
  })

  
	

};// redeem achievement


