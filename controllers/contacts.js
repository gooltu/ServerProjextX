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
		.select('id', 'name', 'status', 'address', 'gender', 'dob', 'upi')
		.then(profile => {
				res.json({ error:false, profile });
		})
		.catch(err => {
				next(err)
		});

};


contacts.getUserProfile= function(req, res, next) {
  
		//console.log('ID: '+ req.body.user_id);

		knex('jcusers').where( 'jcusers.id' , req.body.user_id ).join('scores', 'jcusers.id', '=', 'scores.user_id')
		.select('jcusers.id', 'jcusers.name', 'scores.level', 'jcusers.status')	
		.then(profile => {
				res.json({ error:false, profile });
		})
		.catch(err => {
				next(err)
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
  
	knex('jcusers').where({ id: req.user.id }).update({ name: req.body.address })
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
					return res.json({ error:false, phone: req.body.phone, invite:1, is_regis: true, contact: user[0] });
			else{

					knex('invite')	  
				  .insert({ user_id: req.user, invitee: req.body.phone  })
				  .then( val => {

				  		// send Invite 	SMS 
				  		return res.json({error: false, phone: req.body.phone,  invite: 1, is_regis:false });
				  })
				  .catch(err=>{
				  	return res.json({error: false, phone: req.body.phone,  invite: 1, is_regis:false });
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
		.select('jcusers.id as id', 'jcusers.name as name', 'scores.level as level');

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

			let t1 = knex('scores').where({level:scores[0].level+1}).andWhere('points','>',0)
								.join('jcusers','scores.user_id', '=', 'jcusers.id')
								.orderBy('scores.points', 'desc')
								.select('jcusers.id as id', 'jcusers.pic as pic', 'jcusers.name as name', 'scores.level as level', 'scores.points as points')
								.limit(5);
			p.push(t1);					

			let t2 = knex('scores').where({level:scores[0].level}).andWhere('points','>',scores[0].points)
								.join('jcusers','scores.user_id', '=', 'jcusers.id')
								.orderBy('scores.points', 'desc')
								.select('jcusers.id as id', 'jcusers.pic as pic', 'jcusers.name as name', 'scores.level as level', 'scores.points as points')
								.limit(5);
			p.push(t2);									

			let t3 = knex('scores').where({level:scores[0].level}).andWhere('points','<',scores[0].points)
								.join('jcusers','scores.user_id', '=', 'jcusers.id')
								.orderBy('scores.points', 'desc')
								.select('jcusers.id as id', 'jcusers.pic as pic', 'jcusers.name as name', 'scores.level as level', 'scores.points as points')
								.limit(10);
			p.push(t3);							

			let t4 = knex('scores').where({level:scores[0].level-1})
								.join('jcusers','scores.user_id', '=', 'jcusers.id')
								.orderBy('scores.points', 'desc')
								.select('jcusers.id as id', 'jcusers.pic as pic', 'jcusers.name as name', 'scores.level as level', 'scores.points as points')
								.limit(10);					

			p.push(t4);
			Promise.all(p)
		    .then( values => {

		      	if(values.length>3){
		      		if(values[2].length == 0 && values[3].length == 0)
		      			return res.json({ error:false, top1:[], top2: [], top3: [], top4: [] }); 
		      		else
		      			return res.json({ error:false, top1: values[0], top2: values[1], top3: values[2], top4: values[3]});
		      	}
		      	else{
		      		if(values[2].length == 0 && values[3].length == 0)
		      			return res.json({ error:false, top1:[], top2: [], top3: [], top4: [] }); 
		      		else	      
		          		return res.json({ error:false, top1: values[0], top2: values[1], top3: values[2], top4: []});           
		        }  	
			})      
			  .catch(err=>{
			  	next(err);
			});



	})
	.catch(err=>{
		next(err);
	})

};