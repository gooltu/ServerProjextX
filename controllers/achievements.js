'use strict'

let knex = require('../db/knex');
let Promise = require('bluebird');

let wn = require('weeknumber');

let { LEVEL_MAX: level_max } = require('../utils/levelConstants');

let achievements = module.exports;


achievements.getAchievements = function (req, res, next) {

  knex('achievements')
    .select('achievements.id as achievement_id', 'diamond', 'text', 'note')
    .then(achievements => {
      res.json({ error: false, achievements });
    })
    .catch(err => {
      next(err);
    });


};



achievements.getUsersAchievement = function (req, res, next) {

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


function complete_achievement(diamonds, level, achievement, a_id, user_id, req, res, next) {

  knex.transaction(trx => {

    let p = []; let q;

    q = knex('jewels').where({ user_id, jeweltype_id: 0 }).increment('count', diamonds).increment('total_count', diamonds).transacting(trx)
    p.push(q);

    q = knex('achievementusers').where({ id: a_id }).increment('level', 5).transacting(trx);
    p.push(q);

    q = knex('diamondlog').insert({ user_id, count: diamonds, logtext: 'Achievement ' + achievement + ' , Achievement User ID ' + a_id + ' for level ' + level }).transacting(trx);

    p.push(q)


    Promise.all(p)
      .then(trx.commit)
      .catch(trx.rollback)

  })
    .catch(err => {
      console.log(err);
    });

  return res.json({ error: false, percent: 100 });

}



achievements.redeemAchievement = function (req, res, next) {

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
    .join('scores', 'achievementusers.user_id', '=', 'scores.user_id')
    .join('achievements', 'achievementusers.achievement_id', '=', 'achievements.id')
    .where('achievementusers.id', '=', a_id)
    .where('achievementusers.user_id', '=', user_id)
    .whereRaw('?? >= ??', ['scores.level', 'achievementusers.level'])
    .select('achievementusers.achievement_id as achievement_id', 'achievementusers.level as level', 'jcusers.phone as phone', 'achievements.diamond as diamond')
    .then(record => {

      console.log(record);

      if (record.length == 0)
        throw new Error('Illegal action');

      id = record[0].achievement_id;
      phone = record[0].phone;
      level = record[0].level;
      diamond = record[0].diamond;


      switch (id) {

        case 1: return knex('invite').where({ user_id }).count('invitee as i');
        case 2: return knex('jewels').where({ user_id, jeweltype_id: 2 }).select('total_count');
        case 3: return knex('jewels').where({ user_id, jeweltype_id: 3 }).select('total_count');
        case 4: return knex('jewels').where({ user_id, jeweltype_id: 4 }).select('total_count');
        case 5: return knex('jewels').where({ user_id, jeweltype_id: 5 }).select('total_count');
        case 6: return knex('jewels').where({ user_id, jeweltype_id: 6 }).select('total_count');
        case 7: return knex('jewels').where({ user_id, jeweltype_id: 7 }).select('total_count');
        case 8: return knex('jewels').where({ user_id, jeweltype_id: 8 }).select('total_count');
        case 9: return knex('jewels').where({ user_id, jeweltype_id: 9 }).select('total_count');
        case 10: return knex('jewels').where({ user_id, jeweltype_id: 10 }).select('total_count');
        case 11: return knex('jewels').where({ user_id, jeweltype_id: 11 }).select('total_count');
        case 12: return knex('jewels').where({ user_id, jeweltype_id: 12 }).select('total_count');
        case 13: return knex('jewels').where({ user_id, jeweltype_id: 13 }).select('total_count');
        case 14: return knex('jewels').where({ user_id, jeweltype_id: 14 }).select('total_count');
        case 15: return knex('jewels').where({ user_id, jeweltype_id: 15 }).select('total_count');
        case 16: return knex('jewels').where({ user_id, jeweltype_id: 16 }).select('total_count');
        case 17: return knex('jewels').where({ user_id, jeweltype_id: 17 }).select('total_count');

        case 18: return knex('jcusers').where('jcusers.reference', phone)
          .join('scores', 'jcusers.id', '=', 'scores.user_id')
          .andWhere('scores.level', '>=', 5)
          .count('jcusers.id as ref');

        case 19: return knex('jcusers').where('jcusers.reference', phone)
          .join('scores', 'jcusers.id', '=', 'scores.user_id')
          .andWhere('scores.level', '>=', 10)
          .count('jcusers.id as ref');

        case 20: return knex('jcusers').where('jcusers.reference', phone)
          .join('scores', 'jcusers.id', '=', 'scores.user_id')
          .andWhere('scores.level', '>=', 15)
          .count('jcusers.id as ref');

        case 21: return knex('jcusers').where('jcusers.reference', phone)
          .join('scores', 'jcusers.id', '=', 'scores.user_id')
          .andWhere('scores.level', '>=', 20)
          .count('jcusers.id as ref');

        case 22: return knex('jcusers').where('jcusers.reference', phone)
          .join('scores', 'jcusers.id', '=', 'scores.user_id')
          .andWhere('scores.level', '>=', 25)
          .count('jcusers.id as ref');

        case 23: return knex('jcusers').where('jcusers.reference', phone)
          .join('scores', 'jcusers.id', '=', 'scores.user_id')
          .andWhere('scores.level', '>=', 30)
          .count('jcusers.id as ref');

        case 24: return knex('jcusers').where('jcusers.reference', phone)
          .join('scores', 'jcusers.id', '=', 'scores.user_id')
          .andWhere('scores.level', '>=', 35)
          .count('jcusers.id as ref');

        case 25: return knex('jcusers').where('jcusers.reference', phone)
          .join('scores', 'jcusers.id', '=', 'scores.user_id')
          .andWhere('scores.level', '>=', 40)
          .count('jcusers.id as ref');

        case 26: return knex('jcusers').where('jcusers.reference', phone)
          .join('scores', 'jcusers.id', '=', 'scores.user_id')
          .andWhere('scores.level', '>=', 45)
          .count('jcusers.id as ref');

        case 27: return knex('jcusers').where('jcusers.reference', phone)
          .join('scores', 'jcusers.id', '=', 'scores.user_id')
          .andWhere('scores.level', '>=', 50)
          .count('jcusers.id as ref');

        case 28: return knex('jcusers').where('jcusers.reference', phone)
          .join('scores', 'jcusers.id', '=', 'scores.user_id')
          .andWhere('scores.level', '>=', 55)
          .count('jcusers.id as ref');
        case 29: return knex('jcusers').where('jcusers.reference', phone)
          .join('scores', 'jcusers.id', '=', 'scores.user_id')
          .andWhere('scores.level', '>=', 60)
          .count('jcusers.id as ref');

        case 30: return knex('jcusers').where('jcusers.reference', phone)
          .join('scores', 'jcusers.id', '=', 'scores.user_id')
          .andWhere('scores.level', '>=', 65)
          .count('jcusers.id as ref');

        case 31: return knex('jcusers').where('jcusers.reference', phone)
          .join('scores', 'jcusers.id', '=', 'scores.user_id')
          .andWhere('scores.level', '>=', 70)
          .count('jcusers.id as ref');

        case 32: return knex('jcusers').where('jcusers.reference', phone)
          .join('scores', 'jcusers.id', '=', 'scores.user_id')
          .andWhere('scores.level', '>=', 75)
          .count('jcusers.id as ref');

        default: {
          throw new Error('Illegal action');
        }

      }


    })
    .then(val => {

      let percent;

      switch (id) {

        case 1: {
          console.log(val);
          if (val[0].i < (level)) {
            percent = (val[0].i * 100) / level;
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id, req, res, next);

          break;
        }
        case 2: {
          if (val[0].total_count < (level)) {
            percent = (val[0].total_count * 100) / (level);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id, req, res, next);

          break;
        }
        case 3: {
          if (val[0].total_count < (level * 10)) {
            percent = (val[0].total_count * 100) / (level * 10);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id, req, res, next);

          break;
        }
        case 4: {
          if (val[0].total_count < (level * 10)) {
            percent = (val[0].total_count * 100) / (level * 10);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id, req, res, next);

          break;
        }
        case 5: {
          if (val[0].total_count < (level * 10)) {
            percent = (val[0].total_count * 100) / (level * 10);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id, req, res, next);

          break;
        }
        case 6: {
          if (val[0].total_count < (level * 10)) {
            percent = (val[0].total_count * 100) / (level * 10);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id, req, res, next);

          break;
        }
        case 7: {
          if (val[0].total_count < (level * 10)) {
            percent = (val[0].total_count * 100) / (level * 10);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id, req, res, next);

          break;
        }
        case 8: {
          if (val[0].total_count < (level * 10)) {
            percent = (val[0].total_count * 100) / (level * 10);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id, req, res, next);

          break;
        }
        case 9: {
          if (val[0].total_count < (level * 10)) {
            percent = (val[0].total_count * 100) / (level * 10);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id, req, res, next);

          break;
        }
        case 10: {
          if (val[0].total_count < (level * 10)) {
            percent = (val[0].total_count * 100) / (level * 10);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id, req, res, next);

          break;
        }
        case 11: {
          if (val[0].total_count < (level * 10)) {
            percent = (val[0].total_count * 100) / (level * 10);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id, req, res, next);

          break;
        }
        case 12: {
          if (val[0].total_count < (level * 10)) {
            percent = (val[0].total_count * 100) / (level * 10);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id, req, res, next);

          break;
        }
        case 13: {
          if (val[0].total_count < (level * 10)) {
            percent = (val[0].total_count * 100) / (level * 10);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id, req, res, next);

          break;
        }
        case 14: {
          if (val[0].total_count < (level * 10)) {
            percent = (val[0].total_count * 100) / (level * 10);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id, req, res, next);

          break;
        }
        case 15: {
          if (val[0].total_count < (level * 10)) {
            percent = (val[0].total_count * 100) / (level * 10);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id, req, res, next);

          break;
        }
        case 16: {
          if (val[0].total_count < (level * 10)) {
            percent = (val[0].total_count * 100) / (level * 10);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id, req, res, next);

          break;
        }
        case 17: {
          if (val[0].total_count < (level * 10)) {
            percent = (val[0].total_count * 100) / (level * 10);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id, req, res, next);

          break;
        }
        case 18: {
          if (val[0].ref < (level)) {
            percent = (val[0].ref * 100) / (level);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id, req, res, next);

          break;
        }
        case 19: {
          if (val[0].ref < (level)) {
            percent = (val[0].ref * 100) / (level);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id, req, res, next);

          break;
        }
        case 20: {
          if (val[0].ref < (level)) {
            percent = (val[0].ref * 100) / (level);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id, req, res, next);

          break;
        }
        case 21: {
          if (val[0].ref < (level)) {
            percent = (val[0].ref * 100) / (level);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id, req, res, next);

          break;
        }
        case 22: {
          if (val[0].ref < (level)) {
            percent = (val[0].ref * 100) / (level);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id, req, res, next);

          break;
        }
        case 23: {
          if (val[0].ref < (level)) {
            percent = (val[0].ref * 100) / (level);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id, req, res, next);

          break;
        }
        case 24: {
          if (val[0].ref < (level)) {
            percent = (val[0].ref * 100) / (level);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id, req, res, next);

          break;
        }
        case 25: {
          if (val[0].ref < (level)) {
            percent = (val[0].ref * 100) / (level);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id, req, res, next);

          break;
        }
        case 26: {
          if (val[0].ref < (level)) {
            percent = (val[0].ref * 100) / (level);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id, req, res, next);

          break;
        }
        case 27: {
          if (val[0].ref < (level)) {
            percent = (val[0].ref * 100) / (level);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id, req, res, next);

          break;
        }
        case 28: {
          if (val[0].ref < (level)) {
            percent = (val[0].ref * 100) / (level);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id, req, res, next);

          break;
        }
        case 29: {
          if (val[0].ref < (level)) {
            percent = (val[0].ref * 100) / (level);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id, req, res, next);

          break;
        }
        case 30: {
          if (val[0].ref < (level)) {
            percent = (val[0].ref * 100) / (level);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id, req, res, next);

          break;
        }
        case 31: {
          if (val[0].ref < (level)) {
            percent = (val[0].ref * 100) / (level);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id, req, res, next);

          break;
        }
        case 32: {
          if (val[0].ref < (level)) {
            percent = (val[0].ref * 100) / (level);
            return res.json({ error: false, percent })
          }
          else complete_achievement(diamond, level, id, a_id, user_id, req, res, next);

          break;
        }
        default: {
          throw new Error('Illegal action');
        }

      }

    })
    .catch(err => {
      next(err);
    })




};// redeem achievement


