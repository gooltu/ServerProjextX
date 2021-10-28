'use strict'

let knex = require('../db/knex');
let Promise = require('bluebird');

let wn = require('weeknumber');

//let level_max = [55,289,346,313,241,220,290,410,491,481,411,367,412,526,627,643,583,523,541,642,756,799,755,685,677,759,879,947,924,853,820,879,997,1088,1090,1024,972,1004,1113,1221,1250,1196,1131,1136,1229,1347,1402,1367,1296,1276,1347,1467,1547,1535,1465,1423,1470,1584,1684,1698,1637,1578,1598,1700,1813,1855,1809,1740,1733,1817,1936,2003,1979,1907,1876,1937,2055,2144,2145,2078,2027,2061,2171,2278,2305,2250,2186,2193,2287,2404,2458,2421,2350,2332,2405,2525,2603,2590,2519,2478,2527,2642,2740,2753,2691,2633,2655,2758,2870,2910,2863,2795,2789,2874,2994,3059,3033,2962,2932,2994,3112,3201,3200,3132,3082,3118,3229,3334,3360,3304,3240,3249,3345,3461,3514,3476,3405,3388,3462,3582,3659,3644,3574,3534,3584,3700,3797,3808,3745,3688,3711,3816,3927,3965,3917,3849,3846,3932,4051,4115,4088,4016,3988,4051,4170,4257,4254,4186,4138,4175,4287,4391,4415,4359,4295,4306,4402,4518,4569,4530,4459,4444,4520,4640,4715,4699,4628,4590,4641,4757,4853,4863,4800,4743,4768,4873,4984,5021,4972,4904,4902];

let tasksgift = module.exports;


function getCycleAndExpdate(){

  let obj = {};

  let now = new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"});
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



tasksgift.getCurrentCycle = function(req, res, next) {


  return res.json({error:false, currentcycle: getCycleAndExpdate().currentcycle });

}



tasksgift.getGiftTasks = function(req, res, next) {


  knex('gifttasks')
  .select()
  .where({ enabled:true })
  .orderBy('priority')
  .limit(10).offset(req.body.page * 10 )
  .then( gifttasks => {
    return res.json({error: false, gifttasks })
  })
  .catch(err => {
    next(err);
  });


}


tasksgift.getGiftTasksElements = function(req, res, next) {


  knex('gifttaskdetails').where({gifttask_id: req.body.gifttask_id})
  .select()
  .then(gifttaskdetails => {      
      return res.json({error: false, gifttaskdetails});  
  })
  .catch(err => {
      next(err);
  });


};


tasksgift.getGiftTaskLevel = function(req, res, next) {


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
  .then( gifttaskusers => {      

      if(gifttaskusers.length > 0){
        
        return res.json({error: false, gifttaskusers});

      }else{
        //insert

          let t; let p = [];

          t = knex('gifttasks').where({ id: req.body.gifttask_id }).select();
          p.push(t);

          t = knex('scores').where({ user_id: req.user.id }).select();
          p.push(t);


          Promise.all(p)
          .then( values => {

              let newlevel = values[1][0].level_lastweek + values[0][0].plus_level;

              return knex('gifttaskusers').insert({ gifttask_id: req.body.gifttask_id, user_id: req.user.id, cycle: currentcycle, level:newlevel, expiration_at  });       

          })
          .then( id => {

              return knex('gifttaskusers').where({ gifttask_id: req.body.gifttask_id, user_id: req.user.id, cycle: currentcycle }).select();

          })
          .then( gifttaskusers => {
              return res.json({error: false, gifttaskusers});
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


tasksgift.redeemGiftTask = function(req, res, next){


  //req.body.id
  //req.body.gifttask_id
  //req.session.user.id


  let now = new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"});
  now = new Date(now);
  // let currentcycle = now.getFullYear().toString() + wn.weekNumberSun(now);

  let currentcycle = getCycleAndExpdate().currentcycle;

  console.log('Cycle: ' + currentcycle );

  knex('gifttaskusers')
  .where( { 'gifttaskusers.user_id' : req.user.id, 'gifttaskusers.gifttask_id': req.body.gifttask_id, 'gifttaskusers.id': req.body.id,
    'gifttaskusers.done': false , 'gifttaskusers.cycle': currentcycle } )
  //.andWhere('scores.level', '>=', 'gifttaskusers.level')
  //.andWhere('jewels.jeweltype_id', '=', 'gifttaskdetails.jeweltype_id')
  .whereRaw('?? >= ??', ['scores.level', 'gifttaskusers.level'])
  .whereRaw('?? = ??', ['jewels.jeweltype_id', 'gifttaskdetails.jeweltype_id'])
  .andWhere('gifttasks.current_qty', '>', 0 )
  .join('gifttaskdetails', 'gifttaskdetails.gifttask_id', '=', 'gifttaskusers.gifttask_id')
  .join('gifttasks', 'gifttaskusers.gifttask_id', '=', 'gifttasks.id' )   
  .join('jewels', 'gifttaskusers.user_id', '=', 'jewels.user_id' )
  .join('scores', 'gifttaskusers.user_id', '=', 'scores.user_id' )
  .select( 'jewels.jeweltype_id as myjewels_id', 'jewels.count as myjewels_count', 'gifttaskdetails.jeweltype_id as task_jewels_id', 
  'gifttaskdetails.count as task_jewels_count', 'scores.points as mypoints', 'scores.level as mylevel', 
  'gifttasks.cash as cash', 'gifttasks.money as money', 'gifttasks.productname as productname', 'gifttasks.product_pic as product_pic' )
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


                if(results[i].myjewels_id == 0){

                  let c = results[i].task_jewels_count * (-1);   

                  q = knex('diamondlog')
                  .insert({ user_id: req.user.id, count : c, logtext: 'Gift redeem '+req.body.id }).transacting(trx);

                  p.push(q)

                }               

              }


              q = knex('gifttaskusers')
                  .where({ id: req.body.id })
                  .update({ done: true, giftwon_at: now }).transacting(trx);

              p.push(q);


              q = knex('gifttasks')
                  .where({id: req.body.gifttask_id})
                  .andWhere('current_qty', '>', 0)
                  .decrement('current_qty', 1).transacting(trx);

              p.push(q);    


              if(results[0].cash === 1){

                  q = knex('wallet')
                    .where({ user_id: req.user.id})          
                    .increment('money', results[0].money).transacting(trx);

                  p.push(q); 


                  q = knex('walletlog').insert({ user_id: req.user.id, money: results[0].money, tag:'Gift won' + req.body.id }).transacting(trx);

                  p.push(q);

              }else{

                  q = knex('allgifts')
                      .insert({ user_id: req.user.id, productname: results[0].productname, product_pic: results[0].product_pic, gifttaskuser_id: req.body.id, status: 'Will be ordered in 12hrs' })
                      .transacting(trx);

                  p.push(q);    

              }   



              knex('gifttasks')
              .where({id: req.body.gifttask_id})
              .andWhere('current_qty', '>', 0)
              .transacting(trx)
              .forUpdate()
              .select('current_qty')
              .then(qty => {

                if(qty.length === 0)
                  throw new Error('Gift not available.');
                else 
                  return Promise.all(p);

              })
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


tasksgift.checkGiftTaskCompletion= function(req, res, next) {


  knex('gifttaskusers').where({ id: req.body.id , gifttask_id: req.body.gifttask_id, user_id: req.user.id })
  .select()
  .then(results => {    
    if(results.length > 0)
      return res.json({ error: false, gifttaskusers: results[0] })
    else
      return res.json({ error: false, gifttaskusers: null })
  })
  .catch(err => {
    next(err);
  })

};






