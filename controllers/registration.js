'use strict'

let knex = require('../db/knex');
let speakeasy = require('speakeasy');
let jwt = require('jsonwebtoken');

let passport = require('passport');

let nodefetch = require('node-fetch');

let initializeGame = require('../utils/initializeGame');

let config = require('../utils/config');

let AWS = require('aws-sdk');

AWS.config.update({accessKeyId: process.env.AWS_KEY, secretAccessKey: process.env.AWS_SECRET});

AWS.config.update({region: 'ap-south-1'});

AWS.config.apiVersions = {
	cognitoidentity: '2014-06-30'
};




let registration = module.exports;


registration.registerPhoneNumber = function(req, res, next) {

	let phone = req.body.phone;
	console.log('>>>>'+phone);

	if(!phone){
		let err = new Error('Improper Data');		
		next(err);	
	}


	knex('jcusers').where({phone}).select()
	.then( user =>{

		if( user.length>0 ){

					let se = speakeasy.totp({secret: 'secret',  encoding: 'base32'});		
					//let se = '888888';			

					knex('jcusers').where({phone}).update({vcode:se})
					.then(()=>{	
								

								nodefetch( 'http://2factor.in/API/V1/19a8cb68-fd88-11e9-9fa5-0200cd936042/SMS/'+phone+'/'+se , {        					        
						        headers: { 'cache-control': 'no-cache' },
						    })
						    .then(res => res.json())
						    .then(json => console.log(json));

								if( user[0].active ){		
										
										return res.json({ error: false, userId: user[0].id, active: true, name: user[0].name, status_msg: user[0].status });

								}else{
										
										return res.json({ error: false, userId: user[0].id, active: false, name: user[0].name, status_msg: user[0].status });
								}


					})
					.catch( err =>{
						next(err);
					});		

			
			
		}else{

					
					let se = speakeasy.totp({secret: 'secret',  encoding: 'base32'});
					//let se = '888888';

					knex.table('jcusers').insert({ phone, vcode:se, name: 'defaultJCUname', status: 'Keep collecting...', teamjc_id: teamjc_list[0].id, teamjc_phone: teamjc_list[0].phone })
					.then(id => {		

										nodefetch( 'http://2factor.in/API/V1/19a8cb68-fd88-11e9-9fa5-0200cd936042/SMS/'+phone+'/'+se , {        					        
								        headers: { 'cache-control': 'no-cache' },
								    })
								    .then(res => res.json())
								    .then(json => console.log(json));						
										
										return res.json({ error: false, userId: id[0], active: false, name: 'defaultJCUname', status_msg: 'Keep collecting...' });
						
					})
					.catch( err => {
						next(err);
					});			


		}

	})
	.catch( err =>{
		next(err);
	});
  
	

};

registration.verifyCode= function(req, res, next) {

		knex('jcusers').where({id: req.body.userId})
		.select( 'id', 'vcode' )
		.then( user => {
			if(user[0].vcode === req.body.verificationCode){
				
				//memcached.del(user[0].sessionId, err=>{});
				let se = speakeasy.totp({secret: 'secret',  encoding: 'base32'});

				knex('jcusers').where({ id:user[0].id }).update({ active: true, scode: se })
				.then( () => {		
					
						jwt.sign({ id: req.body.userId, scode: se, db: 'first' }, config.secret, (err, token) => {

							if(err)
								next(err);

						  console.log('Refresh Token:'+token);
						  res.json({error: false, refreshToken: token });

						});							
					
				})
				.catch( err => {				
					next(err)
				})
				
			}
			else{
				let err = new Error('Verification code does not match');
				err.status = 403;
				throw err;
			}
		})
		.catch( err => {
			next(err);
		})	  
	

};



registration.getAccessToken= function(req, res, next) {

	jwt.verify( req.body.refreshToken, config.secret, (err, data) => {

		if(err)
			next(err);

		console.log(data);

		knex('jcusers').where({ id: data.id, scode: data.scode }).select('id')
		.then( (user) => {

			if(user.length>0){

				//create access token
				jwt.sign({ id: user[0].id, db: data.db }, config.secret, { expiresIn: 1800 } ,(err, token) => {
					if(err)
						next(err);
				  	console.log('Access Token:'+token);
				  	res.json({error: false, accessToken: token });
				});	

			}else{
				let err = new Error('Invalid Refresh Token')
				next(err);
			}

		})	
		.catch(err =>{
			next(err);
		});	

	})
	

};




registration.initialDetails= function(req, res, next) {
	

		let upd = {}; let ref_id;
		upd.name = req.body.name;


		if(req.body.reference){			
					
					knex('jcusers').where({ phone: req.body.reference, initialized: true }).select('id')
					.then( user=>{
							if(user.length>0){

									upd.reference = req.body.reference;	
									ref_id = user[0].id;								

									knex.transaction( trx => {

											knex('jcusers').where({ id: req.user.id }).update(upd).transacting(trx)
											.then( () => {

												return knex('jewels').where({ user_id: ref_id, jeweltype_id: 2 }).increment('count', 1).increment('total_count', 1).transacting(trx);

											})													
											.then( () => {

												return knex('jewels').where({ user_id: req.user.id, jeweltype_id: 0 }).increment('count', 2).increment('total_count', 2).transacting(trx);

											})													
											.then( () => {

												return knex('diamondlog').insert({ user_id: req.user.id, count : 2, logtext: 'Reference Number entry'}).transacting(trx);

											})
											.then(trx.commit)
					        		.catch(trx.rollback);

									})   
									.then( values => {
					    				return res.json({ error: false, name: req.body.name });
								  })
								  .catch( err => {
								    next(err);
								  });							


							}else{

											knex('jcusers').where({ id: req.user.id }).update(upd)
											.then(()=>{
													return res.json({ error: false, name: req.body.name });
											})
											.catch( err =>{
												next(err);
											});	

							}
								
					})
					.catch( err =>{
						next(err);
					});	


		}else{

				knex('jcusers').where({ id: req.user.id }).update(upd)
				.then(()=>{
						return res.json({ error: false, name: req.body.name });
				})
				.catch( err =>{
					next(err);
				});	

		}		

};



registration.resendVcode= function(req, res, next) {


  	let id = req.body.userId;

		knex('jcusers').where({id}).select()
		.then((user)=>{	

				if(user.length > 0){				

					nodefetch( 
						'http://2factor.in/API/V1/19a8cb68-fd88-11e9-9fa5-0200cd936042/SMS/'+user[0].phone+'/'+user[0].vcode , 
						{        					        
			       headers: { 'cache-control': 'no-cache' },
			      }
			    )
			    .then(res => res.json())
			    .then(json => console.log(json));
						
						
					res.json({ error: false, request: 'resendVcode' });

				}
				else{
					let err = new Error('Invalid User Id');
					next(err);
				}

		})
		.catch( err =>{
			next(err);
		});
	

};






registration.updatePushNotificationToken= function(req, res, next) {
  
		let token = req.body.token;
		let push_service = req.body.push_service;
		  	

		knex('jcusers').where({ id: req.user.id }).update({ push_service, device_id:token })
		.then(()=>{
			res.json({ error: false });
		})
		.catch( err => {
			next(err);
		});


};






registration.awsToken= function(req, res, next) {

	console.log('id::'+req.user.id);

	let cognitoidentity = new AWS.CognitoIdentity();

	let params = {
		IdentityPoolId: 'ap-south-1:7dedf548-261e-4e7f-b9e6-83f09b16817b',
		Logins:{
			'nk.jc.reactapp': req.user.id+''
		}
	};

	cognitoidentity.getOpenIdTokenForDeveloperIdentity(params, (err, data) =>{

		if(err){
			next(err)
		}else{
			return res.json(data);
		}

	});


  	
};

 