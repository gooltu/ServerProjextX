'use strict'

let market = module.exports;
let knex = require('../db/knex');
let Promise = require('bluebird');



market.getAllMarketItems = function(req, res, next) { 
  
  //req.body.page
  let page  = req.body.page

  knex('market')
    .whereNot('seller_user_id', req.user.id)
    .whereNull('buyer_user_id')
    //.join('jcusers', 'market.seller_user_id', '=', 'jcusers.id')
    .orderBy('market.id', 'desc')
    .offset(10*(page-1))
    .limit(10)
    .select('market.id as id','market.seller_user_id as picid', 'market.jeweltype_id as jeweltype_id', 'market.count as qty', 'market.money as price')
    .then(items => {
      return res.json({ error: false, items });
    })
    .catch(err => {
      next(err);
    });

};

market.getMyMarketItems = function(req, res, next) { 
  
  //req.body.page
  let page  = req.body.page

  knex('market')
    .where('seller_user_id', req.user.id)    
    .orderBy('market.id', 'desc')
    .offset(10*(page-1))
    .limit(10)
    .select('market.id as id', 'market.seller_user_id as picid', 'market.jeweltype_id as jeweltype_id', 'market.count as qty', 'market.money as price', 'market.buyer_user_id as buyerid' )
    .then(items => {
      return res.json({ error: false, items });
    })
    .catch(err => {
      next(err);
    });

};



market.listJewelInMarket = function(req, res, next) {
  
  //req.body.jeweltype_id
  //req.body.qty
  //req.body.price

  
      knex.transaction(trx => {

        knex('jewels')
          .where({ user_id: req.user.id })
          .whereIn('jeweltype_id', [1,req.body.jeweltype_id])          
          .select()
          .transacting(trx)
          .forUpdate()
          .then(jewels => {

            if(jewels.length == 0)
              throw new Error('Illegal operations')  
            
            for(let i=0; i<jewels.length; i++){

              if(jewels[i].jeweltype_id == 1){
                if(jewels[i].count<100)
                  throw new Error('Not enough coins')
                
              }else if(jewels[i].jeweltype_id == req.body.jeweltype_id){
                if(jewels[i].count<req.body.qty)
                  throw new Error('Jewel quantity not sufficient')
              }
            }// for loop end

            let p = []; let q;            

            let now = new Date();

            q = knex('market').insert({ seller_user_id: req.user.id, jeweltype_id: req.body.jeweltype_id, count: req.body.qty, money: req.body.price, listed_at: now })

            p.push(q);            

            q = knex('jewels').where({ user_id: req.user.id, jeweltype_id: 1 }).decrement('count', 100).transacting(trx);

            p.push(q);  
            
            q = knex('jewels').where({ user_id: req.user.id, jeweltype_id: req.body.jeweltype_id })
            .decrement('count', req.body.qty).transacting(trx);

            p.push(q);  

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

      })
      .then(values => {
        return res.json({ error: false });
      })
      .catch(err => {
        next(err);
      });
	  

};

market.buyListedJewel = function(req, res, next) {

  //req.body.market_id

  let totalprice, qty, jtype, seller_id;
  
  knex.transaction(trx => {

          knex('market')
            .where({ id: req.body.market_id })
            .where('buyer_user_id', null )
            .select()            
            .transacting(trx)
            .forUpdate()
            .then(item => {

              if ( item.length == 0)
                throw new Error('Invalid query');

              totalprice = item[0].money * item[0].count;
              qty = item[0].count;
              jtype = item[0].jeweltype_id;
              seller_id = item[0].seller_user_id;

              console.log(totalprice, qty);
              
                return knex('wallet').where({ user_id: req.user.id })
                      .andWhere('money', '>=', totalprice)
                      .transacting(trx)
                      .forUpdate()
                      .select()

            })
            .then(entry => {

              if ( entry.length == 0)
                throw new Error('Not enough money');

              return knex('jewels')
                    .where({ user_id : req.user.id })
                    .whereNotIn('jeweltype_id', [ 0, 1, 2 ])
                    .sum('count as sum')
                    .transacting(trx)
                    .forUpdate() 


            })
            .then( jewelcount => {
              //console.log(jewelcount[0].sum + qty);
              let storesum = jewelcount[0].sum * 1;
               
              if((25-storesum)<qty)
                throw new Error('Not enough space');

              let p = []; let q;

              //let total = item[0].money * item[0].count;

              let now  = new Date();

              q = knex('walletlog').insert({ user_id: req.user.id, money: (-1)*totalprice, tag:'Jewel bought from market' }).transacting(trx);

              p.push(q);

              q = knex('wallet').where({ user_id: req.user.id }).decrement( 'money', totalprice ).transacting(trx);

              p.push(q);

              q = knex('wallet').where({ user_id: seller_id }).increment( 'money', (0.8* totalprice)).transacting(trx);

              p.push(q);

              q = knex('market').update({ buyer_user_id: req.user.id, buying_time: now }).transacting(trx);

              p.push(q);

              q = knex('jewels').where({user_id: req.user.id, jeweltype_id: jtype  })
              .increment('count', qty)
              .increment('total_count', qty)
              .transacting(trx);

              p.push(q);

              return Promise.all(p);


            })
            .then(values =>{

                for (let i = 0; i < values.length; i++) {
                  console.log('>>>>>>>' + values[i]);
                  if (values[i] == 0) {
                    throw new Error('Transaction failed');
                  }
                }                     


            })
            .then(trx.commit)
            .catch(trx.rollback)

  })
  .then(values => {
    return res.json({ error: false });
  })
  .catch(err => {
    next(err);
  });
  

};


