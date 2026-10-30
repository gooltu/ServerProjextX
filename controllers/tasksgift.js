'use strict'

let knex = require('../db/knex');
let Promise = require('bluebird');

let wn = require('weeknumber');

let { LEVEL_MAX: level_max } = require('../utils/levelConstants');

let tasksgift = module.exports;


function getCycleAndExpdate() {

  let obj = {};

  let now = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  now = new Date(now);
  obj.currentcycle = now.getFullYear().toString() + wn.weekNumberSun(now);

  now.setDate(now.getDate() - (now.getDay() - 1) + 5);
  now.setHours(23);
  now.setMinutes(59);
  now.setSeconds(59);
  obj.expiration_at = now;

  // obj.currentcycle = '202110';
  // obj.expiration_at = new Date(2021, 3, 23, 23, 59, 59, 0);

  return obj

}



tasksgift.getCurrentCycle = function (req, res, next) {


  return res.json({ error: false, currentcycle: getCycleAndExpdate().currentcycle });

}



tasksgift.getGiftTasks = function (req, res, next) {


  knex('gifttasks')
    .select()
    .where({ enabled: true })
    .orderBy('priority')
    .limit(10).offset(req.body.page * 10)
    .then(gifttasks => {
      return res.json({ error: false, gifttasks })
    })
    .catch(err => {
      next(err);
    });


}


tasksgift.getGiftTasksElements = function (req, res, next) {


  knex('gifttaskdetails').where({ gifttask_id: req.body.gifttask_id })
    .select()
    .then(gifttaskdetails => {
      return res.json({ error: false, gifttaskdetails });
    })
    .catch(err => {
      next(err);
    });


};


tasksgift.getGiftTaskLevel = function (req, res, next) {


  // let now = new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"});
  // now = new Date(now);
  // let currentcycle = now.getFullYear().toString() + wn.weekNumberSun(now);

  // now.setDate(now.getDate() - (now.getDay() - 1) + 5);
  // now.setHours(23); now.setMinutes(59); now.setSeconds(59);
  // let expiration_at = now;

  let obj = getCycleAndExpdate();

  let currentcycle = obj.currentcycle;
  let expiration_at = obj.expiration_at;

  //console.log(now);
  console.log(currentcycle);
  console.log(expiration_at);



  knex('gifttaskusers').where({ gifttask_id: req.body.gifttask_id, user_id: req.user.id, cycle: currentcycle })
    .select()
    .then(gifttaskusers => {

      if (gifttaskusers.length > 0) {

        return res.json({ error: false, gifttaskusers });

      } else {
        //insert

        let t; let p = [];

        t = knex('gifttasks').where({ id: req.body.gifttask_id }).select();
        p.push(t);

        t = knex('scores').where({ user_id: req.user.id }).select();
        p.push(t);


        Promise.all(p)
          .then(values => {

            let newlevel = values[1][0].level_lastweek + values[0][0].plus_level;

            return knex('gifttaskusers').insert({ gifttask_id: req.body.gifttask_id, user_id: req.user.id, cycle: currentcycle, level: newlevel, expiration_at });

          })
          .then(id => {

            return knex('gifttaskusers').where({ gifttask_id: req.body.gifttask_id, user_id: req.user.id, cycle: currentcycle }).select();

          })
          .then(gifttaskusers => {
            return res.json({ error: false, gifttaskusers });
          })
          .catch(err => {
            throw new Error(err);
          })


      }

    })
    .catch(err => {
      next(err);
    });


};


tasksgift.redeemGiftTask = function (req, res, next) {


  //req.body.id
  //req.body.gifttask_id
  //req.session.user.id


  let now = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  now = new Date(now);
  // let currentcycle = now.getFullYear().toString() + wn.weekNumberSun(now);

  let currentcycle = getCycleAndExpdate().currentcycle;

  console.log('Cycle: ' + currentcycle);

  knex('gifttaskusers')
    .where({
      'gifttaskusers.user_id': req.user.id, 'gifttaskusers.gifttask_id': req.body.gifttask_id, 'gifttaskusers.id': req.body.id,
      'gifttaskusers.done': false, 'gifttaskusers.cycle': currentcycle
    })
    //.andWhere('scores.level', '>=', 'gifttaskusers.level')
    //.andWhere('jewels.jeweltype_id', '=', 'gifttaskdetails.jeweltype_id')
    .whereRaw('?? >= ??', ['scores.level', 'gifttaskusers.level'])
    .whereRaw('?? = ??', ['jewels.jeweltype_id', 'gifttaskdetails.jeweltype_id'])
    .andWhere('gifttasks.current_qty', '>', 0)
    .join('gifttaskdetails', 'gifttaskdetails.gifttask_id', '=', 'gifttaskusers.gifttask_id')
    .join('gifttasks', 'gifttaskusers.gifttask_id', '=', 'gifttasks.id')
    .join('jewels', 'gifttaskusers.user_id', '=', 'jewels.user_id')
    .join('scores', 'gifttaskusers.user_id', '=', 'scores.user_id')
    .select('jewels.jeweltype_id as myjewels_id', 'jewels.count as myjewels_count', 'gifttaskdetails.jeweltype_id as task_jewels_id',
      'gifttaskdetails.count as task_jewels_count', 'scores.points as mypoints', 'scores.level as mylevel',
      'gifttasks.cash as cash', 'gifttasks.money as money', 'gifttasks.productname as productname', 'gifttasks.product_pic as product_pic')
    .then(results => {



      if (results.length == 0)
        throw new Error('Invalid Task');


      let checktaskcompleted = true;
      for (let i = 0; i < results.length; i++) {
        console.log('MyJewels:' + results[i].myjewels_count + ',' + results[i].myjewels_id + '  TaskJewels:' + results[i].task_jewels_count + ',' + results[i].task_jewels_id)
        if (results[i].myjewels_count < results[i].task_jewels_count) {

          checktaskcompleted = false; break;

        }

      }

      if (!checktaskcompleted)
        throw new Error('Task Not Completed');



      // Start complete task process transaction


      knex.transaction(trx => {


        let p = []; let q;

        for (let i = 0; i < results.length; i++) {

          q = knex('jewels').where({ user_id: req.user.id, jeweltype_id: results[i].myjewels_id })
            .andWhere('count', '>=', results[i].task_jewels_count)
            .decrement('count', results[i].task_jewels_count).transacting(trx);

          p.push(q);


          if (results[i].myjewels_id == 0) {

            let c = results[i].task_jewels_count * (-1);

            q = knex('diamondlog')
              .insert({ user_id: req.user.id, count: c, logtext: 'Gift redeem ' + req.body.id }).transacting(trx);

            p.push(q)

          }

        }


        q = knex('gifttaskusers')
          .where({ id: req.body.id })
          .update({ done: true, giftwon_at: now }).transacting(trx);

        p.push(q);


        q = knex('gifttasks')
          .where({ id: req.body.gifttask_id })
          .andWhere('current_qty', '>', 0)
          .decrement('current_qty', 1).transacting(trx);

        p.push(q);


        if (results[0].cash === 1) {

          q = knex('wallet')
            .where({ user_id: req.user.id })
            .increment('money', results[0].money).transacting(trx);

          p.push(q);


          q = knex('walletlog').insert({ user_id: req.user.id, money: results[0].money, tag: 'Gift won' + req.body.id }).transacting(trx);

          p.push(q);

        } else {

          q = knex('allgifts')
            .insert({ user_id: req.user.id, productname: results[0].productname, product_pic: results[0].product_pic, gifttaskuser_id: req.body.id, status: 'Will be ordered in 12hrs' })
            .transacting(trx);

          p.push(q);

        }



        knex('gifttasks')
          .where({ id: req.body.gifttask_id })
          .andWhere('current_qty', '>', 0)
          .transacting(trx)
          .forUpdate()
          .select('current_qty')
          .then(qty => {

            if (qty.length === 0)
              throw new Error('Gift not available.');
            else
              return Promise.all(p);

          })
          .then(values => {

            for (let i = 0; i < values.length; i++) {
              console.log('>>>>>>>' + values[i]);
              if (values[i] == 0) {
                throw new Error('Transaction failed');
              }
            }


          })
          .then(trx.commit)
          .catch(trx.rollback)


        return res.json({ error: false })

      })
        .catch(err => {
          next(err);
        })




    })
    .catch(err => {
      next(err);
    });


};


tasksgift.checkGiftTaskCompletion = function (req, res, next) {


  knex('gifttaskusers').where({ id: req.body.id, gifttask_id: req.body.gifttask_id, user_id: req.user.id })
    .select()
    .then(results => {
      if (results.length > 0)
        return res.json({ error: false, gifttaskusers: results[0] })
      else
        return res.json({ error: false, gifttaskusers: null })
    })
    .catch(err => {
      next(err);
    })

};






