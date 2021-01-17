var express = require('express');
var router = express.Router();

var passport = require('passport');

var passportUtils = require('../utils/passport');

var controller = require('../controllers');





/* GET home page. */
router.get('/',  function(req, res, next) {
  	return res.json({ message : 'hello:'+process.env.NODE_ENV });
});

router.get('/getGameServerTime',  function(req, res, next) {
	let d = new Date();
  	return res.json({ time : d.toUTCString() });
});


router.post('/registerPhoneNumber', controller.registration.registerPhoneNumber);
router.post('/verifyCode', controller.registration.verifyCode);
router.post('/getAccessToken', controller.registration.getAccessToken);
router.post('/initialDetails', passport.authenticate('jwt'), controller.registration.initialDetails);
router.post('/resendVcode', controller.registration.resendVcode);
router.get('/awsToken', passport.authenticate('jwt'), controller.registration.awsToken);
router.post('/updatePushNotificationToken', passport.authenticate('jwt'), controller.registration.updatePushNotificationToken);


router.post('/downloadContact', passport.authenticate('jwt'), controller.contacts.downloadContact);
router.post('/downloadContact_Phone', passport.authenticate('jwt'), controller.contacts.downloadContact_Phone);
router.get('/getProfile', passport.authenticate('jwt'), controller.contacts.getProfile);
router.post('/getUserProfile', passport.authenticate('jwt'), controller.contacts.getUserProfile);
router.post('/updateProfileStatus', passport.authenticate('jwt'), controller.contacts.updateProfileStatus);
router.post('/updateProfileName', passport.authenticate('jwt'), controller.contacts.updateProfileName);
router.post('/updateProfileAddress', passport.authenticate('jwt'), controller.contacts.updateProfileAddress);
router.post('/updateProfileDOB', passport.authenticate('jwt'), controller.contacts.updateProfileDOB);
router.post('/updateProfileGender', passport.authenticate('jwt'), controller.contacts.updateProfileGender);
router.post('/updateProfileUPI', passport.authenticate('jwt'), controller.contacts.updateProfileUPI);
router.post('/inviteUser', passport.authenticate('jwt'), controller.contacts.inviteUser);
router.get('/getChildren', passport.authenticate('jwt'), controller.contacts.getChildren);
router.get('/getLeaderboard', passport.authenticate('jwt'), controller.contacts.getLeaderboard);




router.get('/getWallet', passport.authenticate('jwt'), controller.wallet.getWallet );
router.get('/getWalletJewelPrices', passport.authenticate('jwt'), controller.wallet.getWalletJewelPrices );
router.post('/redeemMoney', passport.authenticate('jwt'), controller.wallet.redeemMoney);
router.post('/buyJewelsFromWallet', passport.authenticate('jwt'), controller.wallet.buyJewelsFromWallet);
router.get('/getAllGiftsWon', passport.authenticate('jwt'), controller.wallet.getAllGiftsWon);
//router.post('/addMoney', passportUtils.isAuthenticated, jccookie.cookie , controller.wallet.addMoney);


router.post('/getAchievements', passport.authenticate('jwt'),  controller.achievements.getAchievements);
router.post('/getUsersAchievement', passport.authenticate('jwt'),  controller.achievements.getUsersAchievement);
router.post('/redeemAchievement', passport.authenticate('jwt'),  controller.achievements.redeemAchievement);

router.get('/getCurrentCycle', passport.authenticate('jwt'), controller.tasksgift.getCurrentCycle);
router.post('/getGiftTasks', passport.authenticate('jwt'),  controller.tasksgift.getGiftTasks);
router.post('/getGiftTasksElements', passport.authenticate('jwt'),  controller.tasksgift.getGiftTasksElements);
router.post('/getGiftTaskLevel', passport.authenticate('jwt'),  controller.tasksgift.getGiftTaskLevel);
router.post('/redeemGiftTask', passport.authenticate('jwt'),  controller.tasksgift.redeemGiftTask);
router.post('/checkGiftTaskCompletion', passport.authenticate('jwt'),  controller.tasksgift.checkGiftTaskCompletion);


router.post('/getTasks', passport.authenticate('jwt'),  controller.tasksgame.getTasks);
router.post('/getTaskElements', passport.authenticate('jwt'),  controller.tasksgame.getTaskElements)
router.post('/redeemTask', passport.authenticate('jwt'),  controller.tasksgame.redeemTask);
router.post('/checkTaskCompletion', passport.authenticate('jwt'),  controller.tasksgame.checkTaskCompletion);
router.get('/getNewTaskOnTaskCompletion', passport.authenticate('jwt'),  controller.tasksgame.getNewTaskOnTaskCompletion);


router.post('/pickJewel', passport.authenticate('jwt'),  controller.game.pickJewel);
router.get('/getGameState', passport.authenticate('jwt'),  controller.game.getGameState);

router.get('/getFactories', passport.authenticate('jwt'),  controller.factory.getFactories);
router.post('/getUserFactory', passport.authenticate('jwt'),  controller.factory.getUserFactory);
router.post('/startFactory', passport.authenticate('jwt'),  controller.factory.startFactory);
router.post('/stopFactory', passport.authenticate('jwt'),  controller.factory.stopFactory);
router.post('/flushFactory', passport.authenticate('jwt'),  controller.factory.flushFactory);
router.post('/transferJewelsFromFactory', passport.authenticate('jwt'),  controller.factory.transferJewelsFromFactory);




const environment = process.env.NODE_ENV || 'development';

if(environment === 'development'){

	require('./test_enabler_routes')(router, controller );

}
	


module.exports = router;
