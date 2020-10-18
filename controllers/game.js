'use strict'

let game = module.exports;
let knex = require('../db/knex');
let Promise = require('bluebird');



game.pickJewel = function(req, res, next) {


      let jeweltype = req.body.jeweltype;

      if( !(jeweltype == 3 || jeweltype == 6 || jeweltype == 9 || jeweltype == 12 || jeweltype == 15 ))
        throw new Error('Illegal Operation');

      
      knex.transaction( trx => {     
          
          
          
          knex('jewels')
          .where({ user_id : req.user.id })
          .whereNotIn('jeweltype_id', [ 0, 1, 2 ])
          .sum('count as sum')
          .transacting(trx)
          .forUpdate()          
          .then(total => {

            if(total[0].sum >= 25)
              throw new Error('Jewel Store is full');
            else 
              return knex('jewels').where({user_id: req.user.id, jeweltype_id: jeweltype })
                                   .increment('count', 1)
                                   .increment('total_count', 1)
                                   .transacting(trx);

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

          
          

      })   
      .then( values => {
          return res.json({ error: false, message: 'Jewel added'});
      })
      .catch( err => {
        next(err);
      });        
				

};



game.getGameState = function(req, res, next) {
  	
	  Promise.all([
	  	knex('scores').where({ user_id: req.user.id }).select(),
	  	knex('jewels').where({ user_id: req.user.id }).select()
	  ])	
		.then((values)=>{
			return res.json({ error: false, scores: values[0], jewels: values[1] });
		})
		.catch( err => {
			next(err);
		});	

};


