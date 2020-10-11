

let contacts = module.exports;


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