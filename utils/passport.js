'use strict';

let knex = require('../db/knex');
let speakeasy = require('speakeasy');
var jwt = require('jsonwebtoken');

module.exports = {

	verifyPayload: function( jwt_payload, done){

		
		console.log('Payload');
		console.log(jwt_payload);

		return done(null, jwt_payload);

		
	},

	serializeUser: function(user, done){

		console.log('Serialize:::'+user);
		//done(null, session);
		done(null, user);

	},

	deserializeUser: function(id, done){

		console.log('Deserialize:::::'+id);
		done(null, id);
		/*

		knex('jcusers').where({id})
		.select()
		.then( user => {
			done(null, user[0] )
		})
		.catch( err => {
			done( err , null);
		})
		
		*/
		

	},


	isAuthenticated: function(req, res, next){

		if (req.isAuthenticated()){ 
		    //console.log('OMGOMGOMG:::ISAuthenticated');
		   return next();

		}else{      
		        
		  return res.status(403).json({ success: false, data: 'Auth Error'});
		        
		}

	}


};
