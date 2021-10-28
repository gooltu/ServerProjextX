'use strict'

let factory = module.exports;
let knex = require('../db/knex');
let Promise = require('bluebird');



factory.getFactories = function(req, res, next) {

    Promise.all([
      knex('factory').select('id as factory_id', 'jeweltype_id', 'count', 'level', 'diamond', 'duration'),
      knex('factorymaterial').select()
    ])  
    .then((values)=>{
      return res.json({ error: false, factory: values[0], materials: values[1] });
    })
    .catch( err => {
      next(err);
    });	

};



factory.getUserFactory= function(req, res, next) {
  
    knex('factoryuser').where({ user_id: req.user.id})
    .orderBy('factory_id', 'asc')
    .select()
    .then(factoryuser => {      
        res.json({ error: false, factoryuser });  
    })
    .catch(err => {
      next(err);
    });

};


factory.flushFactory = function(req, res, next) {

  let user_id = req.user.id;
  let factory_id = req.body.factory_id;  

    knex('factoryuser')  
    .join('factory', 'factory.id', '=', 'factoryuser.factory_id' )   
    .where( { 'factoryuser.user_id' : user_id, 'factoryuser.factory_id': factory_id, 'factoryuser.is_on': true } )    
    .whereRaw('TIMESTAMPDIFF(SECOND, ??, NOW()) > ??', ['factoryuser.start_time', 'factory.duration'])    
    .select()
    .then(results => {

          if(results.length == 0)
                throw new Error('Invalid Operation');

          return knex('factoryuser').where({ factory_id, user_id }).update({ is_on : false , start_time: null });

    })
    .then( () => {
        return res.json({ error: false });
    })
    .catch(err => {
      next(err);
    })

}


factory.transferJewelsFromFactory = function(req, res, next) {

    let user_id = req.user.id;
    let factory_id = req.body.factory_id;  

    knex('factoryuser')  
    .join('factory', 'factory.id', '=', 'factoryuser.factory_id' )    
    .where( { 'factoryuser.user_id' : user_id, 'factoryuser.factory_id': factory_id, 'factoryuser.is_on': true } )    
    .whereRaw('TIMESTAMPDIFF(SECOND, ??, NOW()) > ??', ['factoryuser.start_time', 'factory.duration'])
    //.join( knex('jewels').where({ user_id }).whereNotIn('jeweltype_id', [ 0, 1, 2 ]).sum('count as sum').as('jsum') )
    //.where('jsum.sum', '<=', 25 )
    .select('factory.jeweltype_id as fac_jeweltype_id', 'factory.diamond as diamond', 'factory.count as count')
    .then(results => {

          if(results.length == 0)
                throw new Error('Invalid Operation');

          knex.transaction( trx => {


                        knex('jewels')
                        .where({ user_id })
                        .whereNotIn('jeweltype_id', [ 0, 1, 2 ])
                        .sum('count as sum')
                        .transacting(trx)
                        .forUpdate()          
                        .then(total => {

                              if( total[0].sum > ( 25 - parseInt(results[0].count) ))
                                throw new Error('Not Enough Space in Jewel Store');
                              else{

                                let p = []; let t;                 
                                  


                                t = knex('jewels').where({user_id, jeweltype_id: results[0].fac_jeweltype_id })
                                                         .increment('count', results[0].count)
                                                         .increment('total_count', results[0].count)
                                                         .transacting(trx);            
                                                   
                                p.push(t);  

                              

                                t =   knex('factoryuser').where({ factory_id, user_id }).update({ is_on : false , start_time: null })
                                                         .transacting(trx);
                                p.push(t);           

                          
                                return Promise.all(p);

                              }  

                        })  
                        .then( values => {

                          for( let i=0; i<values.length; i++ ){
                            console.log('>>>>>>>'+values[i]);
                            if(values[i] == 0 )
                              throw new Error('Transaction failed');
                          }              

                        })
                        .then(trx.commit)
                        .then( () => {
                            return res.json({ error: false });
                        })
                        .catch(trx.rollback);

          })    
          .catch( err => {
            next(err);
          });


    })
    .catch(err => {
      next(err);
    })

};


factory.stopFactory = function(req, res, next) {

    let user_id = req.user.id;
    let factory_id = req.body.factory_id;  

    let q = knex('factoryuser')  
    .join('factory', 'factory.id', '=', 'factoryuser.factory_id' )    
    .join('jewels', 'factoryuser.user_id', '=', 'jewels.user_id' )
    .where( { 'factoryuser.user_id' : user_id, 'factoryuser.factory_id': factory_id, 'factoryuser.is_on': true } )   
    .where({ 'jewels.jeweltype_id' : 0 })
    .whereRaw('?? >= ??', ['jewels.count', 'factory.diamond'])
    .whereRaw('TIMESTAMPDIFF(SECOND, ??, NOW()) <= ??', ['factoryuser.start_time', 'factory.duration'])
    //.join( knex('jewels').where({ user_id }).whereNotIn('jeweltype_id', [ 0, 1, 2 ]).sum('count as sum').as('jsum') )
    //.where('jsum.sum', '<=', 25 )
    .select('factory.jeweltype_id as fac_jeweltype_id', 'factory.diamond as diamond', 'factory.count as count');

    console.log(q.toString());

    q.then(results => {

          if(results.length == 0)
                throw new Error('Invalid Operation');

          knex.transaction( trx => {


                        knex('jewels')
                        .where({ user_id })
                        .whereNotIn('jeweltype_id', [ 0, 1, 2 ])
                        .sum('count as sum')
                        .transacting(trx)
                        .forUpdate()          
                        .then(total => {

                              if( total[0].sum >= ( 25 - parseInt(results[0].count) ))
                                throw new Error('Not Enough Space in Jewel Store');
                              else{

                                let p = []; let t;

                              
                                t = knex('jewels').where({user_id, jeweltype_id: 0 })
                                                  .decrement('count', results[0].diamond)
                                                  .transacting(trx);
                                p.push(t);  


                                let c = results[0].diamond * (-1);   

                                t = knex('diamondlog')
                                .insert({ user_id: req.user.id, count : c, logtext: 'Factory Stop '+factory_id}).transacting(trx);

                                p.push(t)


                                t = knex('jewels').where({user_id, jeweltype_id: results[0].fac_jeweltype_id })
                                                         .increment('count', results[0].count)
                                                         .increment('total_count', results[0].count)
                                                         .transacting(trx);            
                                                   
                                p.push(t);  

                              

                                t =   knex('factoryuser').where({ factory_id, user_id }).update({ is_on : false , start_time: null })
                                                         .transacting(trx);
                                p.push(t);           

                          
                                return Promise.all(p);

                              }  

                        })  
                        .then( values => {

                          for( let i=0; i<values.length; i++ ){
                            console.log('>>>>>>>'+values[i]);
                            if(values[i] == 0 )
                              throw new Error('Transaction failed');
                          }              

                        })
                        .then(trx.commit)
                        .then( () => {
                            return res.json({ error: false });
                        })
                        .catch(trx.rollback);

          })    
          .catch( err => {
            next(err);
          });


    })
    .catch(err => {
      next(err);
    })

}



factory.startFactory = function(req, res, next) {

    let user_id = req.user.id;
    let factory_id = req.body.factory_id;  
    let ct;

    knex('factoryuser')
    .join('factorymaterial', 'factorymaterial.factory_id', '=', 'factoryuser.factory_id')  
    .join('jewels', 'factoryuser.user_id', '=', 'jewels.user_id' )
    .where( { 'factoryuser.user_id' : user_id, 'factoryuser.factory_id': factory_id, 'factoryuser.is_on': false } )
    .whereRaw('?? = ??', ['jewels.jeweltype_id', 'factorymaterial.jeweltype_id'])  
    .select('jewels.jeweltype_id as myjewels_id', 'jewels.count as myjewels_count', 
      'factorymaterial.jeweltype_id as fac_jewels_id',   'factorymaterial.count as fac_jewels_count')
    .then(results => {

          if(results.length == 0)
            throw new Error('Invalid Operations');


          let checktaskcompleted = true; 
          for(let i = 0; i< results.length; i++){
            console.log('MyJewels:'+results[i].myjewels_count+','+results[i].myjewels_id+'  FJewels:'+results[i].fac_jewels_count+','+results[i].fac_jewels_id)
            if( results[i].myjewels_count < results[i].fac_jewels_count ){

              checktaskcompleted = false; break;

            } 

          }

          if(!checktaskcompleted)
            throw new Error('Not Enough Jewels');
    

          knex.transaction( trx => {

              let p = []; let t;

              for(let i=0; i<results.length; i++){
                t = knex('jewels').where({user_id, jeweltype_id: results[i].fac_jewels_id})
                                  .where('count', '>=', results[i].fac_jewels_count )
                                  .decrement('count', results[i].fac_jewels_count)
                                  .decrement('total_count', results[i].fac_jewels_count)
                                  .transacting(trx);
                p.push(t);              
                                   
              } 

              let now = new Date().toLocaleString("en-US", {timeZone: "UTC"});              
              ct = new Date(now);

              t =   knex('factoryuser').where({ factory_id, user_id }).update({ is_on : true , start_time: ct })
                                       .transacting(trx);
              p.push(t);           

              
              Promise.all(p)
              .then( values => {

                for( let i=0; i<values.length; i++ ){
                  console.log('>>>>>>>'+values[i]);
                  if(values[i] == 0 )
                    throw new Error('Transaction failed');
                }              

              })
              .then(trx.commit)
              .then( values => {
                  return res.json({ error: false, start_time: ct });
              })
              .catch(trx.rollback);

          })          
          .catch( err => {
            next(err);
          });

    })
    .catch(err => {
      next(err);
    })

};