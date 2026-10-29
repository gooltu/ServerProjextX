'use strict';

let knex = require('../db/knex');
let speakeasy = require('speakeasy');
var jwt = require('jsonwebtoken');

module.exports = {

	verifyPayload: function( jwt_payload, done){

		
		console.log('Payload');
		console.log(jwt_payload);

		// Admin tokens are signed with a different secret, so this only matters if the two
		// secrets were ever misconfigured to match: never let an admin id act as a player id.
		if (jwt_payload.aud === 'admin')
			return done(null, false);

		return done(null, jwt_payload);

		
	},

	// Unlike verifyPayload, admin access is re-checked against the DB on every request so
	// deactivating an admin revokes their outstanding tokens immediately.
	verifyAdminPayload: function( jwt_payload, done){

		knex('admins').where({ id: jwt_payload.id, active: true })
			.first('id', 'email', 'name')
			.then(admin => done(null, admin || false))
			.catch(err => done(err));

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
