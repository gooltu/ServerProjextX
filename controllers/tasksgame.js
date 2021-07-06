'use strict'

let knex = require('../db/knex');
let Promise = require('bluebird');

let wn = require('weeknumber');

let level_max = [55,289,346,313,241,220,290,410,491,481,411,367,412,526,627,643,583,523,541,642,756,799,755,685,677,759,879,947,924,853,820,879,997,1088,1090,1024,972,1004,1113,1221,1250,1196,1131,1136,1229,1347,1402,1367,1296,1276,1347,1467,1547,1535,1465,1423,1470,1584,1684,1698,1637,1578,1598,1700,1813,1855,1809,1740,1733,1817,1936,2003,1979,1907,1876,1937,2055,2144,2145,2078,2027,2061,2171,2278,2305,2250,2186,2193,2287,2404,2458,2421,2350,2332,2405,2525,2603,2590,2519,2478,2527,2642,2740,2753,2691,2633,2655,2758,2870,2910,2863,2795,2789,2874,2994,3059,3033,2962,2932,2994,3112,3201,3200,3132,3082,3118,3229,3334,3360,3304,3240,3249,3345,3461,3514,3476,3405,3388,3462,3582,3659,3644,3574,3534,3584,3700,3797,3808,3745,3688,3711,3816,3927,3965,3917,3849,3846,3932,4051,4115,4088,4016,3988,4051,4170,4257,4254,4186,4138,4175,4287,4391,4415,4359,4295,4306,4402,4518,4569,4530,4459,4444,4520,4640,4715,4699,4628,4590,4641,4757,4853,4863,4800,4743,4768,4873,4984,5021,4972,4904,4902];

let tasksgame = module.exports;




tasksgame.getTasks = function(req, res, next) {             
  
  knex('taskusers').where({ user_id: req.user.id, done : false })
  .join('tasks', 'taskusers.task_id', '=', 'tasks.id')    
  .orderBy('taskusers.id', 'desc')
  .select( 'taskusers.id as id', 'tasks.id as task_id', 'tasks.coins as coins', 'tasks.points as points', 'taskusers.done as done', 'taskusers.created_at as created_at' )          
  .then(tasks => {      
      return res.json({error: false, tasks });        
  })
  .catch(err => {
    next(err);
  });

};

tasksgame.getTaskElements= function(req, res, next) {
  
  knex('taskdetails').where({ task_id: req.body.task_id })
  .select()
  .then(taskdetails => {      
      res.json({error: false, taskdetails});  
  })
  .catch(err => {
      next(err);
  });

};



tasksgame.redeemTask= function(req, res, next) {


  //req.body.id
  //req.body.task_id
  //req.user.id  

  let curr_time = new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"});
  curr_time = new Date(curr_time);

  knex('taskusers')
  .where( { 'taskusers.user_id' : req.user.id, 'taskusers.task_id': req.body.task_id, 'taskusers.id': req.body.id,
    'taskusers.done': false } )
  .where('taskusers.created_at', '<', curr_time )    
  .whereRaw('?? = ??', ['jewels.jeweltype_id', 'taskdetails.jeweltype_id'])  
  .join('taskdetails', 'taskdetails.task_id', '=', 'taskusers.task_id')
  .join('tasks', 'taskusers.task_id', '=', 'tasks.id' )   
  .join('jewels', 'taskusers.user_id', '=', 'jewels.user_id' )  
  .join('scores', 'taskusers.user_id', '=', 'scores.user_id' )
  .select( 'jewels.jeweltype_id as myjewels_id', 'jewels.count as myjewels_count', 'taskdetails.jeweltype_id as task_jewels_id', 
  'taskdetails.count as task_jewels_count', 'scores.points as mypoints', 'scores.level as mylevel', 'scores.max_level_points as max_level_points',
  'scores.total_points as total_points', 'tasks.coins as taskcoins', 'tasks.points as taskpoints' )
  .then( results => {

    

    if(results.length == 0)
       throw new Error('Invalid Task');


    let checktaskcompleted = true; 
    for(let i = 0; i< results.length; i++){
      console.log('MyJewels:'+results[i].myjewels_count+','+results[i].myjewels_id+'  TaskJewels:'+results[i].task_jewels_count+','+results[i].task_jewels_id)
      if( results[i].myjewels_count < results[i].task_jewels_count ){

        checktaskcompleted = false; break;

      } 

    }

    if(!checktaskcompleted)
      throw new Error('Task Not Completed');



    // Start complete task process transaction


            knex.transaction( trx => {


              let p = []; let q;

              for( let i=0; i< results.length; i++){

                q = knex('jewels').where({ user_id: req.user.id, jeweltype_id: results[i].myjewels_id })
                                  .andWhere( 'count', '>=', results[i].task_jewels_count )
                                  .decrement('count', results[i].task_jewels_count).transacting(trx);  

                p.push(q);                  

              }

              let now = new Date();
              

              q = knex('taskusers')
                  .where({ id: req.body.id })
                  .update({ done: true, completed_at: now }).transacting(trx);

              p.push(q);     


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
              
              if(newscore > results[0].max_level_points){
                newscore = newscore - results[0].max_level_points;
                newlevel ++;
                newmaxlevelpoints = level_max[ newlevel - 1 ];

              }          

              q = knex('scores')
                  .where({ user_id: req.user.id})
                  .update({ level: newlevel, points: newscore, max_level_points: newmaxlevelpoints, total_points })                  
                  .transacting(trx);  

              p.push(q);

              Promise.all(p)             
              .then( values => {

                  for( let i=0; i<values.length; i++ ){
                    console.log('>>>>>>>'+values[i]);
                    if(values[i] == 0 ){                  
                      throw new Error('Transaction failed');
                    }
                  }
                             

              })
              .then(trx.commit)
              .catch(trx.rollback)         
              

              return res.json({ error: false })

            })
            .catch( err => {
              next(err);
            })
    
     


  })
  .catch( err => {
    next(err);
  });



};


tasksgame.checkTaskCompletion= function(req, res, next) {


  knex('taskusers').where({ id: req.body.id , task_id: req.body.task_id, user_id: req.user.id })
  .select()
  .then(results => {
    if(results.length > 0)
      return res.json({ error: false, taskusers: results[0] })
    else
      return res.json({ error: false, taskusers: null })
  })
  .catch(err => {
    next(err);
  })


};


tasksgame.getNewTaskOnTaskCompletion = function(req, res, next) {


  knex('taskusers').where({ user_id: req.user.id, done: false })
  .count('id as c')
  .max('created_at as max_created_at')
  .then( taskuser => {

      console.log( taskuser[0].c, taskuser[0].max_created_at);

      if( taskuser[0].c < 8 ){

            knex('scores').where({ user_id: req.user.id })
            .select()
            .then( score => {

                let onehr_ago = new Date();                
                onehr_ago.setHours(onehr_ago.getHours() - 6);

                knex('taskusers')
                .where({ 'taskusers.user_id' : req.user.id, 'taskusers.done' : true })
                .where('completed_at', '>=', onehr_ago)
                .join('tasks', 'taskusers.task_id', '=', 'tasks.id' )
                .orderBy('taskusers.completed_at', 'desc')
                .select('tasks.points as xp','taskusers.completed_at as comp_at')
                .then( recentlycompleted => {

                    console.log('Recently Completed', recentlycompleted.length);

                    let t_id;
                    let score_level = score[0].level;

                    if(score_level<=12)
                      t_id = Math.floor(Math.random() * (50 - 9 + 1)) + 9;
                    else 
                      t_id = Math.floor(Math.random() * (100 - 9 + 1)) + 9;
                    
                    

                    let max_created_at;
                    if(taskuser[0].max_created_at){
                        max_created_at = new Date(taskuser[0].max_created_at + ' UTC');
                      }
                    else
                        max_created_at = new Date();  
                    //max_created_at.setHours(max_created_at.getHours() - 5.5);
                    //max_created_at = new Date(max_created_at); 



                    let now = new Date();
                    //now.setHours(now.getHours());
                    //now = new Date(now);

                    console.log(max_created_at.toString(), now.toString());

                    const f = (acc, cval) => {     
                      console.log( 'completed_at', cval.comp_at)                     
                      return { xp: (acc.xp + cval.xp) };
                    }

                    let sum_points = recentlycompleted.reduce( f, {xp:0}).xp;
                    let delay;

                    if(sum_points<=80)
                      delay = 0;
                    else if(sum_points > 80 && sum_points <=100)
                      delay = 4;
                    else if(sum_points > 100 && sum_points<=120)
                      delay = 3;
                    else if(sum_points > 120 && sum_points<=140)
                      delay = 2;
                    else 
                      delay = 1;

                    if(max_created_at >= now ){
                      console.log('max_created_at greater', delay, sum_points);
                      max_created_at.setHours(max_created_at.getHours() + delay);
                      
                      return knex('taskusers').insert({ user_id: req.user.id, task_id: t_id, created_at: max_created_at });
                    }else{
                      console.log('now is greater', delay, sum_points);
                      now.setHours(now.getHours() + delay);
                      
                      return knex('taskusers').insert({ user_id: req.user.id, task_id: t_id, created_at: now });
                    }


                })
                .then( id => {

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

        return res.json({ error: false });  

      }else{

        return res.json({ error: false }); 
      }      


  })
  .catch(err => {
    next(err);
  }) 

  

};