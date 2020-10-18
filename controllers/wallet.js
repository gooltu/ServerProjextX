'use strict'

let knex = require('../db/knex');
let Promise = require('bluebird');

let wallet = module.exports;



wallet.getAllGiftsWon = function(req, res, next) {
	

  	
	knex('allgifts').where({ user_id: req.user.id }).select()
	.then(gifts => {

		return res.json({error:false, gifts  });			

	})
	.catch(err=>{		
		next(err);
	})
	

};



wallet.getWallet = function(req, res, next) {
	
	
  	
	knex('wallet').where({user_id: req.user.id}).select()
	.then(entry => {

		return res.json({error:false, money: entry[0].money });			

	})
	.catch(err=>{		
		next(err);
	})
	

};


wallet.getWalletJewelPrices = function(req, res, next) {
	
	
  	
	knex('walletjewelprice').select()
	.then(prices => {

		return res.json({error:false, prices });			

	})
	.catch(err=>{		
		next(err);
	})
	

};


wallet.redeemMoney = function(req, res, next) {

	//req.body.channel

	knex.transaction( trx => {


					knex('wallet').where({ user_id: req.session.user.id })
					.andWhere('money', '>', 0.0)
		            .transacting(trx)
		            .forUpdate()
				  	.select()
					.then( entry =>{

						let p = []; let q;

						let m = (-1.00) * entry[0].money;

						q = knex('walletlog').insert({ user_id: req.session.user.id, money: m, tag:'redeem' }).transacting(trx);

						p.push(q);

						q = knex('wallet').where({ user_id: req.session.user.id }).decrement( 'money', entry[0].money ).transacting(trx);

						p.push(q);

						q = knex('allgifts').insert({ user_id: req.session.user.id, money: entry[0].money, money_channel: req.body.channel, status: 'Will be transferred in 3-4 hrs.' }).transacting(trx);

						p.push(q);

						return Promise.all(p);

					})											
					.then(trx.commit)
    				.catch(trx.rollback);							
						
					

	})   
	.then( values => {
			return res.json({ error: false, money: 0.00 });
	})
	.catch( err => {
	    next(err);
	});		
	
		

};



wallet.buyJewelsFromWallet = function(req, res, next) {

	let pricemenu_id = req.body.id;  

	

	knex('wallet')
	.join('walletjewelprice')
	.where({ 'wallet.user_id': req.session.user.id, 'walletjewelprice.id': pricemenu_id,  })
	.whereRaw('?? >= ??', ['wallet.money', 'walletjewelprice.money'])
	.select('walletjewelprice.count as jcount', 'walletjewelprice.money as cost', 'walletjewelprice.jeweltype_id as jeweltype_id')
	.then(entry =>{			

			if(entry.length == 0)
				throw new Error('Illegal Operations');

			knex.transaction( trx => {

							knex('walletlog').insert({ user_id: req.session.user.id, money: entry[0].cost , tag:'Jewel buy from wallet' }).transacting(trx)
							.then( () => {

								return knex('wallet').where({ user_id: req.session.user.id }).decrement( 'money', entry[0].cost ).transacting(trx);

							})	
							.then( () => {

								return knex('jewels').where({ user_id: req.session.user.id, jeweltype_id: entry[0].jeweltype_id })
								.increment('count', entry[0].jcount )
								.increment('total_count', entry[0].jcount )
								.transacting(trx);

							})													
							.then(trx.commit)
		      		.catch(trx.rollback);

			})   
			.then( values => {
					return res.json({ error: false });
		  })
		  .catch( err => {
		    next(err);
		  });	

	})
	.catch(err => {
		next(err);
	});


};




// wallet.buyCoins = function(req, res, next) {
  
//   let d_id = req.body.id; let d=0, m=0, money = 0;

// 	if(d_id == 1 ){
// 		d=100; m=20;
// 	}else if(d_id == 2 ){
// 		d=200; m=38;
// 	}else if(d_id ==3 ){
// 		d=300; m=55;
// 	}

// 	knex('wallet').where({ user_id: req.session.user.id }).select()
// 	.then(entry =>{

// 			money = entry[0].money;
			
// 			if( d==0 || m==0 )
// 				throw new Error('Illegal Input');

// 			if(entry[0].money < m)
// 				throw new Error('Not enough money in wallet');

// 			knex.transaction( trx => {

// 							knex('walletlog').insert({ user_id: req.session.user.id, money: -m, tag:'Coin buy '+ m }).transacting(trx)
// 							.then( () => {

// 								return knex('wallet').where({ user_id: req.session.user.id }).decrement( 'money', m ).transacting(trx);

// 							})	
// 							.then( () => {

// 								return knex('jewels').update({ user_id: req.session.user.id, jeweltype_id: 1 }).increment('count', d ).transacting(trx);

// 							})
// 							.then( () => {

// 								return knex('jewels').update({ user_id: req.session.user.id, jeweltype_id: 1 }).increment('total_count', d ).transacting(trx);

// 							})						
// 							.then(trx.commit)
// 		      		.catch(trx.rollback);

// 			})   
// 			.then( values => {
// 					return res.json({ error: false, money: (money-m) });
// 		  })
// 		  .catch( err => {
// 		    next(err);
// 		  });	

// 	})
// 	.catch(err => {
// 		next(err);
// 	});
	

// };
