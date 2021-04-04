var express = require('express');
var router = express.Router();
var controller = require('../controllers');





/* GET home page. */
router.get('/',  function(req, res, next) {
		//console.log('OMG:::'+req.session.id);		
	console.log();
  	return res.json({ message : 'hello:mongooseim' });
});


router.get('/check_password', controller.mongooseim.check_password);
router.get('/user_exists', controller.mongooseim.user_exists);
router.get('/get_password', controller.mongooseim.get_password);
router.post('/pushnotification/v3/notification/:deviceid', controller.mongooseim.pushnotificationv3);



module.exports = router;