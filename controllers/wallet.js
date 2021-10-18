'use strict'

let knex = require('../db/knex');
let Promise = require('bluebird');

let wallet = module.exports;



wallet.getAllGiftsWon = function(req, res, next) {
	

  	
	knex('allgifts').where({ user_id: req.user.id }).orderBy('id', 'desc').limit(20)
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


					knex('wallet').where({ user_id: req.user.id })
					.andWhere('money', '>', 0.0)
		            .transacting(trx)
		            .forUpdate()
				  	.select()
					.then( entry =>{

						let p = []; let q;

						let m = (-1.00) * entry[0].money;

						q = knex('walletlog').insert({ user_id: req.user.id, money: m, tag:'redeem' }).transacting(trx);

						p.push(q);

						q = knex('wallet').where({ user_id: req.user.id }).decrement( 'money', entry[0].money ).transacting(trx);

						p.push(q);

						q = knex('allgifts').insert({ user_id: req.user.id, money: entry[0].money, money_channel: req.body.channel, status: 'Will be transferred in 3-4 hrs.' }).transacting(trx);

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
	.where({ 'wallet.user_id': req.user.id, 'walletjewelprice.id': pricemenu_id,  })
	.whereRaw('?? >= ??', ['wallet.money', 'walletjewelprice.money'])
	.select('walletjewelprice.count as jcount', 'walletjewelprice.money as cost', 'walletjewelprice.jeweltype_id as jeweltype_id')
	.then(entry =>{			

			if(entry.length == 0)
				throw new Error('Illegal Operations');

			knex.transaction( trx => {

							knex('walletlog').insert({ user_id: req.user.id, money: entry[0].cost , tag:'Jewel buy from wallet' }).transacting(trx)
							.then( () => {

								return knex('wallet').where({ user_id: req.user.id }).decrement( 'money', entry[0].cost ).transacting(trx);

							})	
							.then( () => {

								return knex('jewels').where({ user_id: req.user.id, jeweltype_id: entry[0].jeweltype_id })
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



wallet.emptyJewelStore = function(req, res, next) {

	knex.transaction( trx => {


							let p = []; let q;

							

							q = knex('walletlog').insert({ user_id: req.user.id, money: -1.00, tag:'redeem' }).transacting(trx);

							p.push(q);

							q = knex('wallet').where({ user_id: req.user.id }).decrement( 'money', 1 ).transacting(trx);

							p.push(q);

							q = knex('jewels').where({ user_id: req.user.id}).whereNotIn('jeweltype_id', [0, 1, 2]).update('count', 0 ).transacting(trx);

							p.push(q);

							Promise.all(p)
							.then(trx.commit)
    					.catch(trx.rollback);		


							

	})   
	.then( values => {
			return res.json({ error: false });
  })
  .catch( err => {
    next(err);
  });

}


wallet.listAllGifts = function(req, res, next) {


	if(req.user.id !== 1){
		let err = new Error('Improper Data');	
		return next(err);
	}

	let page = req.body.page;

	if(!page)
		page = 0;

	knex('allgifts')
	.join('jcusers', 'allgifts.user_id', '=', 'jcusers.id')
	.select('jcusers.phone as phone', 'allgifts.id as id', 'allgifts.user_id as user_id', 'allgifts.money as money', 
		'allgifts.money_channel as money_channel', 'allgifts.status as status', 'allgifts.notes as notes')
	.orderBy('allgifts.id', 'desc')
	.limit(10).offset(page * 10 )
	.then(allgifts => {
		return res.json({error: false, allgifts })
	})
	.catch(err => {
	    next(err);
	});

}




wallet.listAllGiftsUser = function(req, res, next) {


	if(req.user.id !== 1){
		let err = new Error('Improper Data');	
		return next(err);
	}

	let page = req.body.page;

	if(!page)
		page = 0;


	let userphone = req.body.phone;

	knex('allgifts')
	.join('jcusers', 'allgifts.user_id', '=', 'jcusers.id')
	.where('jcusers.phone', userphone)
	.select('jcusers.phone as phone', 'allgifts.id as id', 'allgifts.user_id as user_id', 'allgifts.money as money', 
		'allgifts.money_channel as money_channel', 'allgifts.status as status', 'allgifts.notes as notes')
	.orderBy('allgifts.id', 'desc')
	.limit(10).offset(page * 10 )
	.then(allgifts => {
		return res.json({error: false, allgifts })
	})
	.catch(err => {
	    next(err);
	});

}

wallet.updateGiftStatus = function(req, res, next) {


	if(req.user.id !== 1){
		let err = new Error('Improper Data');	
		return next(err);
	}

	let id = req.body.allgifts_id;
	let status = req.body.status;
	let notes = req.body.notes;

	knex('allgifts')
	.where('id', id)
	update({
		status,
		notes
	})	
	.then(val => {
		return res.json({error: false })
	})
	.catch(err => {
	    next(err);
	});

}





