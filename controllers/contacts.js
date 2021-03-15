'use strict'

let knex = require('../db/knex');

let Promise = require('bluebird');

let contacts = module.exports;



contacts.downloadContact= function(req, res, next) {
  
	  
	  knex('jcusers')
	  .where( 'id', req.body.id )
	  .select( 'id', 'name', 'phone', 'status' )
	  .then(jcusers => {
	  	return res.json({ error:false, contact: jcusers[0] });
	  })
	  .catch(err => {
	  	next(err);
	  });
	

};

contacts.downloadContact_Phone= function(req, res, next) {
  
	  
	  knex('jcusers')
	  .where( 'phone', req.body.phone )
	  .select( 'id','name', 'phone', 'status' )
	  .then(jcusers => {
	  	if(jcusers.length>0)
	  		return res.json({ error:false, contact: jcusers[0] });
	  	else{
	  		let c = {};
	  		return res.json({ error:false});
	  	}
	  })
	  .catch(err => {
	  	next(err);
	  });
	

};

contacts.getProfile= function(req, res, next) {

		
		knex('jcusers').where( 'jcusers.id', req.user.id )
		.select('id', 'phone' ,'name', 'status', 'address', 'gender', 'dob', 'upi')
		.then(profile => {
				res.json({ error:false, profile: profile[0] });
		})
		.catch(err => {
				next(err)
		});

};


contacts.getUserProfile= function(req, res, next) {
  
		console.log('ID: '+ req.body.user_id);

		if(!req.body.user_id){
			let err = new Error('Invalid Data');		
			next(err);
		}

		let p = [];

		let p1 = knex('jcusers').where( 'jcusers.id' , req.body.user_id )
				.join('scores', 'jcusers.id', '=', 'scores.user_id')
				.select('jcusers.phone' ,'jcusers.name', 'scores.level', 'jcusers.status');

		let p2 = knex('jewels').where( 'jewels.user_id' , req.body.user_id ).whereIn('jeweltype_id', [ 0, 1, 2 ]).select('jeweltype_id', 'count');

		p.push(p1);
		p.push(p2);


		Promise.all(p)	
		.then((values)=>{
			return res.json({ error: false, user: values[0], jewels: values[1] });
		})
		.catch( err => {
			next(err);
		});	


};



// contacts.updateProfilePic = function(req, res, next) {  
  	
//   knex('jcusers').where({id: req.user.id}).update({ pic:req.body.picbase64, large_pic: req.body.pic_url })
// 	.then((values)=>{
// 		res.json({ error: false });
// 	})
// 	.catch( err => {
// 		next(err);
// 	});

// };

contacts.updateProfileStatus = function(req, res, next) {
  
	knex('jcusers').where({ id: req.user.id }).update({ status: req.body.status })
	.then(()=>{
		res.json({ error: false });
	})
	.catch( err => {
		next(err);
	});

};


contacts.updateProfileName = function(req, res, next) {
  
	knex('jcusers').where({ id: req.user.id }).update({ name: req.body.name })
	.then(()=>{
		res.json({ error: false });
	})
	.catch( err => {
		next(err);
	});

};

contacts.updateProfileAddress = function(req, res, next) {
  
	knex('jcusers').where({ id: req.user.id }).update({ address: req.body.address })
	.then(()=>{
		res.json({ error: false });
	})
	.catch( err => {
		next(err);
	});

};


contacts.updateProfileDOB = function(req, res, next) {
  
	knex('jcusers').where({ id: req.user.id }).update({ name: req.body.dob })
	.then(()=>{
		res.json({ error: false });
	})
	.catch( err => {
		next(err);
	});

};


contacts.updateProfileGender = function(req, res, next) {
  
	knex('jcusers').where({ id: req.user.id }).update({ name: req.body.gender })
	.then(()=>{
		res.json({ error: false });
	})
	.catch( err => {
		next(err);
	});

};


contacts.updateProfileUPI = function(req, res, next) {
  
	knex('jcusers').where({ id: req.user.id }).update({ name: req.body.upi })
	.then(()=>{
		res.json({ error: false });
	})
	.catch( err => {
		next(err);
	});

};



contacts.inviteUser= function(req, res, next) { 

	if(!req.body.phone){
		let err = new Error('Invalid Data');		
		next(err);		
	}

	knex('jcusers').where({phone: req.body.phone, active:true }).select()
	.then(user=>{

			if(user.length>0)
					return res.json({ error:false, phone: req.body.phone, invite: 0, is_regis: true, contact: user[0] });
			else{

					knex('invite')	  
				  .insert({ user_id: req.user.id, invitee: req.body.phone  })
				  .then( val => {

				  		// send Invite 	SMS 
				  		return res.json({error: false, phone: req.body.phone,  invite: 1, is_regis:false });
				  })
				  .catch(err=>{
				  		return res.json({error: false, phone: req.body.phone,  invite: 0, is_regis:false });
				  });

			}

	})
	.catch(err=>{
  	next(err);
  });
	

};


contacts.getChildren= function(req, res, next) {

	knex('jcusers')
	.where( 'id', req.user.id)
	.select('phone')
	.then(user => {

		let p = [];

		let t1 = knex('jcusers')
		.where( 'jcusers.reference', user[0].phone )
		.join('scores', 'jcusers.id', '=', 'scores.user_id')
		.select('jcusers.id as id', 'jcusers.phone as phone','jcusers.name as name', 'scores.level as level')
		.orderBy('jcusers.id', 'desc')
		.limit(100).offset(req.body.page * 100 );

		p.push(t1);

		let t2 = knex('invite')
		.where('user_id', req.user.id)
		.count('invitee as k');

		p.push(t2);

		Promise.all(p)
	    .then( values => {
	      		console.log('invitee:' + values[1]);      	
	          	return res.json({ error:false, children: values[0], invitees: values[1][0].k });           
	         	
		})      
		  .catch(err=>{
		  	next(err);
		});



	})
	.catch(err=>{
		next(err);
	});
		

};



contacts.getLeaderboard = function(req, res, next) {

	knex('scores').where({user_id: req.user.id}).select()
	.then(scores => {

			if(scores.length<=0)
				throw new Error('Illegal Operation');	

			let p = [];
							

			let t2 = knex('scores').where('total_points','>',scores[0].total_points)
								.join('jcusers','scores.user_id', '=', 'jcusers.id')
								.orderBy('scores.total_points')
								.select('jcusers.id as id', 'jcusers.phone as phone', 'jcusers.name as name', 'scores.level as level', 'scores.total_points as total_points')
								.limit(5);
			p.push(t2);									

			let t3 = knex('scores').where('total_points','<',scores[0].total_points)
								.join('jcusers','scores.user_id', '=', 'jcusers.id')
								.orderBy('scores.total_points', 'desc')
								.select('jcusers.id as id', 'jcusers.phone as phone', 'jcusers.name as name', 'scores.level as level', 'scores.total_points as total_points')
								.limit(10);
			p.push(t3);							

			
			Promise.all(p)
		    .then( values => {

		    	return res.json({ error:false, top: values[0], down: values[1] });

		      	 	
			})      
			  .catch(err=>{
			  	next(err);
			});



	})
	.catch(err=>{
		next(err);
	})

};