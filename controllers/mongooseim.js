'use strict'

let knex = require('../db/knex');
let config = require('../utils/config');
let jwt = require('jsonwebtoken');

let mongooseim = module.exports;

mongooseim.user_exists= function(req, res, next) {


  res.contentType = "text/plain";

		knex('jcusers').where({ phone:req.query.user }).select('id')
		.then( (user) => {		

				if(user.length > 0)						
						return res.send(true);

				else
						return res.send(false);														
			
		})
		.catch( err => {				
			next(err)
		})



		// res.contentType = "text/plain";
		// console.log('USER_EXIST');
  // 	console.log(req.url);
  // 	console.log('user:'+req.query.user);
  // 	console.log('server:'+req.query.server);
  // 	console.log('pass:'+req.query.pass);
	  
	 //  return res.send(true);

};

mongooseim.check_password= function(req, res, next) {

		res.contentType = "text/plain";

		knex('jcusers').where({ phone:req.query.user }).select('id', 'scode')
		.then( (user) => {		

				if(user.length > 0){

						console.log(user[0].scode)

						jwt.sign({ id:user[0].id , scode: user[0].scode }, config.secret, { noTimestamp: true }, (err, token) => {

							if(err)
								next(err);

						  
						  if(token === req.query.pass)
						  	return res.send(true);
						  else
						  	return res.send(false);

						});

				}else{

							return res.send(false);

				}											
			
		})
		.catch( err => {				
			next(err)
		})

		// res.contentType = "text/plain";
		// console.log('CHECK_PASSWORD');	
  // 	console.log(req.url);
  // 	console.log('user:'+req.query.user);
  // 	console.log('server:'+req.query.server);
  // 	console.log('pass:'+req.query.pass);	  
	 //  return res.send(true);
	 
};

mongooseim.get_password= function(req, res, next) {

		res.contentType = "text/plain";

		knex('jcusers').where({ phone:req.query.user }).select('id', 'scode')
		.then( (user) => {		

				if(user.length > 0){

						console.log(user[0].scode)

						jwt.sign({ id:user[0].id , scode: user[0].scode }, config.secret, { noTimestamp: true }, (err, token) => {

							if(err)
								next(err);

						  
						  return res.send(token);

						});

				}else{

							return res.send('');

				}											
			
		})
		.catch( err => {				
			next(err)
		})

		
  	// console.log(req.url);
  	// console.log('user:'+req.query.user);
  	// console.log('server:'+req.query.server);
  	// console.log('pass:'+req.query.pass);

  	// return res.send('pass')

};


mongooseim.pushnotificationv3= function(req, res, next) {

	///pushnotificationv3/notification/pn_deviceid_2@jewelchatnet

	console.log('DeviceId:'+req.params.deviceid);

	console.log('BODY');

	console.log(req.body);
  
	res.json({ error: false });  

};