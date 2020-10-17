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
		
		done(null, user);

	},

	deserializeUser: function(id, done){
		
		done(null, id);	

	},


	isAuthenticated: function(req, res, next){

		if (req.isAuthenticated()){ 
		    
		   return next();

		}else{      
		        
		  return res.status(403).json({ error: true, data: 'Auth Error'});
		        
		}

	}


};
