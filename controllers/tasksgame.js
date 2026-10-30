'use strict'

let knex = require('../db/knex');
let Promise = require('bluebird');

let wn = require('weeknumber');

let { BOMB_TASK_MIN, BOMB_TASK_MAX, DEFAULT_BOMB_MINUTES } = require('../utils/taskConstants');

let { LEVEL_MAX: level_max } = require('../utils/levelConstants');
//let level_max = [55, 289, 346, 313, 241, 220, 290, 410, 491, 481, 611, 567, 612, 726, 827, 843, 783, 723, 741, 842, 956, 999, 955, 885, 877, 959, 1079, 1147, 1124, 1053, 1053, 1124, 1147, 1079, 959, 877, 885, 955, 999, 956, 842, 741, 723, 783, 843, 827, 726, 612, 567, 611];

let tasksgame = module.exports;




tasksgame.getTasks = function (req, res, next) {

  knex('taskusers').where({ user_id: req.user.id, done: false })
    .join('tasks', 'taskusers.task_id', '=', 'tasks.id')
    .orderBy('taskusers.id', 'desc')
    .limit(5)
    .select('taskusers.id as id', 'tasks.id as task_id', 'taskusers.is_bomb as is_bomb', 'tasks.coins as coins', 'tasks.points as points', 'taskusers.done as done', 'taskusers.created_at as created_at', 'taskusers.completed_at as completed_at')
    .then(tasks => {
      return res.json({ error: false, tasks });
    })
    .catch(err => {
      next(err);
    });

};

tasksgame.getTaskElements = function (req, res, next) {

  knex('taskdetails').where({ task_id: req.body.task_id })
    .select()
    .then(taskdetails => {
      res.json({ error: false, taskdetails });
    })
    .catch(err => {
      next(err);
    });

};


function bombExplosion(taskuser_id, user_id, mypoints, taskpoints, total_points, taskcoins, mylevel) {

  return knex.transaction(trx => {

    let p = []; let q;

    let now = new Date();

    q = knex('taskusers')
      .where({ id: taskuser_id })
      .update({ bomb_status: 1, done: true, completed_at: now }).transacting(trx);

    p.push(q);

    q = knex('jewels')
      .where({ user_id, jeweltype_id: 1 })
      .decrement('count', taskcoins)
      .decrement('total_count', taskcoins)
      .transacting(trx);

    p.push(q);

    let flag = true;
    let totalpoints;
    let newlevel;
    let newmaxlevelpoints;
    let newscore;
    console.log('mypoints ', mypoints,)
    if (mypoints > Math.abs(taskpoints)) {
      newscore = mypoints - Math.abs(taskpoints);
      totalpoints = total_points - Math.abs(taskpoints);
      newlevel = mylevel;
      newmaxlevelpoints = level_max[newlevel - 1];
      flag = false;
    }

    newlevel = mylevel;
    let sum = mypoints;
    let i = 1;

    while (flag) {

      if ((newlevel - 1 - i) < 0) {
        console.log('first ')
        newscore = 0;
        totalpoints = 0;
        newlevel = 1;
        newmaxlevelpoints = level_max[newlevel - 1];
        flag = false;
      } else {

        console.log('second ')

        sum = sum + level_max[newlevel - 1 - i];

        if (sum > Math.abs(taskpoints)) {
          newscore = sum - Math.abs(taskpoints);
          totalpoints = total_points - Math.abs(taskpoints);
          newlevel = newlevel - i;
          newmaxlevelpoints = level_max[newlevel - 1];
          flag = false;
        }

        i++;

      }

    }//while loop end         


    q = knex('scores')
      .where({ user_id })
      .update({ level: newlevel, points: newscore, max_level_points: newmaxlevelpoints, total_points: totalpoints })
      .transacting(trx);

    p.push(q);


    Promise.all(p)
      .then(values => {

        for (let i = 0; i < values.length; i++) {
          //console.log('>>>>>>>'+values[i]);
          if (values[i] == 0) {
            throw new Error('Transaction failed');
          }
        }


      })
      .then(trx.commit)
      .catch(trx.rollback)

  });


}



tasksgame.explodeBomb = function (req, res, next) {

  //req.body.id
  //req.body.task_id
  //req.user.id
  let curr_time = new Date();

  knex('taskusers')
    .where({ 'taskusers.user_id': req.user.id, 'taskusers.task_id': req.body.task_id, 'taskusers.id': req.body.id, 'taskusers.done': false, 'taskusers.bomb_status': 0 })
    .where('taskusers.is_bomb', '>', 0)
    .where('taskusers.completed_at', '<=', curr_time)
    .join('tasks', 'taskusers.task_id', '=', 'tasks.id')
    .join('scores', 'taskusers.user_id', '=', 'scores.user_id')
    .select('scores.points as mypoints', 'scores.level as mylevel', 'scores.max_level_points as max_level_points',
      'scores.total_points as total_points', 'tasks.coins as taskcoins', 'tasks.points as taskpoints', 'taskusers.is_bomb as is_bomb', 'taskusers.completed_at as completed_at')
    .then(results => {

      if (results.length == 0)
        throw new Error('Invalid Task');


      bombExplosion(req.body.id, req.user.id, results[0].mypoints, results[0].taskpoints, results[0].total_points, results[0].taskcoins, results[0].mylevel)
        .then(msg => {

          return res.json({ error: false })

        }).catch(err => {
          next(err);
        })

    }).catch(err => {
      next(err);
    })

}




tasksgame.redeemTask = function (req, res, next) {

  //req.body.id
  //req.body.task_id
  //req.user.id

  let curr_time = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  curr_time = new Date(curr_time);


  knex('taskusers')
    .where({
      'taskusers.user_id': req.user.id, 'taskusers.task_id': req.body.task_id, 'taskusers.id': req.body.id,
      'taskusers.done': false
    })
    .where('taskusers.created_at', '<', curr_time)
    //.where('tasks.is_bomb', '=', 0)
    .whereRaw('?? = ??', ['jewels.jeweltype_id', 'taskdetails.jeweltype_id'])
    .join('taskdetails', 'taskdetails.task_id', '=', 'taskusers.task_id')
    .join('tasks', 'taskusers.task_id', '=', 'tasks.id')
    .join('jewels', 'taskusers.user_id', '=', 'jewels.user_id')
    .join('scores', 'taskusers.user_id', '=', 'scores.user_id')
    .select('jewels.jeweltype_id as myjewels_id', 'jewels.count as myjewels_count', 'taskdetails.jeweltype_id as task_jewels_id',
      'taskdetails.count as task_jewels_count', 'scores.points as mypoints', 'scores.level as mylevel', 'scores.max_level_points as max_level_points',
      'scores.total_points as total_points', 'tasks.coins as taskcoins', 'tasks.points as taskpoints', 'taskusers.is_bomb as is_bomb', 'taskusers.completed_at as completed_at')
    .then(results => {



      if (results.length == 0)
        throw new Error('Invalid Task');

      let activebomb = false;
      if (results[0].completed_at !== null && results[0].is_bomb > 0) {
        let bomb_explode_time = new Date(results[0].completed_at)
        if (bomb_explode_time <= curr_time) {

          bombExplosion(req.body.id, req.user.id, results[0].mypoints, results[0].taskpoints, results[0].total_points, results[0].taskcoins, results[0].mylevel)
            .then(msg => {
              console.log('Exploded Bomb Successfully ')
            }).catch(err => {
              console.log('Error in bomb explosion')
            })

          throw new Error('Bomb Exploded...cannot difuse bomb.');

        } else {
          activebomb = true;
        }
      }




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

        }

        let now = new Date();


        if (activebomb) {

          q = knex('taskusers')
            .where({ id: req.body.id })
            .update({ bomb_status: 2, done: true, completed_at: now }).transacting(trx);

          p.push(q);

        } else {

          q = knex('taskusers')
            .where({ id: req.body.id })
            .update({ done: true, completed_at: now }).transacting(trx);

          p.push(q);

        }




        if (!activebomb) {

          q = knex('jewels')
            .where({ user_id: req.user.id, jeweltype_id: 1 })
            .increment('count', results[0].taskcoins)
            .increment('total_count', results[0].taskcoins)
            .transacting(trx);

          p.push(q);


          let newscore = results[0].mypoints + results[0].taskpoints;
          let total_points = results[0].total_points + results[0].taskpoints;

          let newlevel = results[0].mylevel;
          let newmaxlevelpoints = results[0].max_level_points;

          if (newscore > results[0].max_level_points) {
            newscore = newscore - results[0].max_level_points;
            newlevel++;
            newmaxlevelpoints = level_max[newlevel - 1];

          }

          q = knex('scores')
            .where({ user_id: req.user.id })
            .update({ level: newlevel, points: newscore, max_level_points: newmaxlevelpoints, total_points })
            .transacting(trx);

          p.push(q);

        }


        Promise.all(p)
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


tasksgame.checkTaskCompletion = function (req, res, next) {


  knex('taskusers').where({ id: req.body.id, task_id: req.body.task_id, user_id: req.user.id })
    .select()
    .then(results => {
      if (results.length > 0)
        return res.json({ error: false, taskusers: results[0] })
      else
        return res.json({ error: false, taskusers: null })
    })
    .catch(err => {
      next(err);
    })


};




// Admin-queued tasks (futuretasks, see controllers/admin.js) take priority over the random
// generator. The row lock keeps two concurrent calls from popping the same entry. Resolves
// true if an entry was turned into a taskusers row, false if the queue was empty.
function popFutureTask(user_id) {

  return knex.transaction(trx => {

    return trx('futuretasks').where({ user_id }).forUpdate().first('id', 'tasks')
      .then(row => {

        if (!row || row.tasks.length === 0)
          return false;

        let [entry, ...rest] = row.tasks;
        let taskuser;

        if (entry.is_bomb) {
          let bombtime = new Date();
          bombtime.setTime(bombtime.getTime() + (entry.bomb_minutes || DEFAULT_BOMB_MINUTES) * 60 * 1000);
          taskuser = { user_id, task_id: entry.task_id, is_bomb: 1, bomb_status: 0, completed_at: bombtime };
        } else {
          taskuser = { user_id, task_id: entry.task_id, is_bomb: 0, bomb_status: -1 };
        }

        return trx('futuretasks').where({ id: row.id }).update({ tasks: JSON.stringify(rest) })
          .then(() => trx('taskusers').insert(taskuser))
          .then(() => true);

      });

  });

}


function insertGeneratedTask(req, next) {

  knex('scores').where({ user_id: req.user.id })
    .select()
    .then(score => {

      let prop_hr_ago = process.env.prop_hr_ago || 1;

      let hr_ago = new Date();
      hr_ago.setHours(hr_ago.getHours() - prop_hr_ago);

      knex('taskusers')
        .where({ 'taskusers.user_id': req.user.id, 'taskusers.done': true })
        .whereNot('bomb_status', 2)
        .where('completed_at', '>=', hr_ago)
        .join('tasks', 'taskusers.task_id', '=', 'tasks.id')
        .orderBy('taskusers.completed_at', 'desc')
        .select('tasks.points as xp', 'taskusers.completed_at as comp_at')
        .then(recentlycompleted => {

          console.log('Recently Completed', recentlycompleted.length);

          let score_level = score[0].level;

          let now = new Date();

          const f = (acc, cval) => {
            //console.log( 'completed_at', cval.comp_at)                     
            return { xp: (acc.xp + cval.xp) };
          }

          let sum_points = recentlycompleted.reduce(f, { xp: 0 }).xp;
          let probablity_bomb = Math.floor(Math.random() * (10 - 1 + 1)) + 1;
          console.log('Sum', sum_points);

          if (sum_points > 100) {
            console.log('FIRST');
            let bombtime = new Date();
            bombtime.setTime(bombtime.getTime() + 2 * 60 * 1000);

            let bombtaskid1 = 112;

            return knex('taskusers').insert({ user_id: req.user.id, task_id: bombtaskid1, is_bomb: 1, bomb_status: 0, completed_at: bombtime });

          } else if (probablity_bomb <= 3) {
            //bomb
            console.log('BOMB');
            let bombtime = new Date();
            let bombtaskid;
            if (score_level <= 5)
              bombtaskid = 149;
            else
              bombtaskid = Math.floor(Math.random() * (BOMB_TASK_MAX - BOMB_TASK_MIN + 1)) + BOMB_TASK_MIN;

            bombtime.setTime(bombtime.getTime() + DEFAULT_BOMB_MINUTES * 60 * 1000);
            return knex('taskusers').insert({ user_id: req.user.id, task_id: bombtaskid, is_bomb: 1, bomb_status: 0, completed_at: bombtime });

          } else {
            //normal task
            console.log('Normal Task Level', score_level);
            let taskid;
            if (score_level <= 5)
              taskid = Math.floor(Math.random() * (10 - 1 + 1)) + 1;
            else
              taskid = Math.floor(Math.random() * (100 - 1 + 1)) + 1;

            return knex('taskusers').insert({ user_id: req.user.id, task_id: taskid, is_bomb: 0, bomb_status: -1 });
          }

        })
        .then(id => {

          // return knex('taskusers').where('taskusers.id', '=', id[0])
          // .join('tasks', 'taskusers.task_id', '=', 'tasks.id')    
          // .select( 'taskusers.id as id', 'tasks.id as task_id', 'tasks.coins as coins', 'tasks.points as points', 'taskusers.done as done', 'taskusers.created_at as created_at' )          


        })
        .catch(err => {
          console.log(err);
          next(err);
        })


    })
    .catch(err => {
      //throw err;
    });

}


tasksgame.getNewTaskOnTaskCompletion = function (req, res, next) {


  knex('taskusers').where({ user_id: req.user.id, done: false })
    .count('id as c')
    .max('created_at as max_created_at')
    .then(taskuser => {

      console.log(taskuser[0].c, taskuser[0].max_created_at);

      if (taskuser[0].c < 5) {

        popFutureTask(req.user.id)
          .then(popped => {
            if (!popped)
              insertGeneratedTask(req, next);
          })
          .catch(err => {
            console.log(err);
            next(err);
          });

        return res.json({ error: false });

      } else {

        return res.json({ error: false });
      }


    })
    .catch(err => {
      next(err);
    })



};