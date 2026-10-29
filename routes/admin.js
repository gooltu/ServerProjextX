var express = require('express');
var router = express.Router();

var passport = require('passport');
var rateLimit = require('express-rate-limit').rateLimit;

var config = require('../utils/config');
var controller = require('../controllers');



// CORS for the admin web app only - every other route stays same-origin/mobile-only.
router.use(function (req, res, next) {
	if (config.adminOrigin && req.headers.origin === config.adminOrigin) {
		res.set({
			'Access-Control-Allow-Origin': config.adminOrigin,
			'Access-Control-Allow-Headers': 'Authorization, Content-Type',
			'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
			'Access-Control-Max-Age': '600',
			'Vary': 'Origin'
		});
	}
	if (req.method === 'OPTIONS')
		return res.sendStatus(204);
	next();
});

router.use(function (req, res, next) {
	if (!config.adminSecret)
		return res.status(503).json({ error: true, message: 'Admin auth not configured' });
	next();
});

var loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

var adminAuth = passport.authenticate('admin-jwt', { session: false });



router.post('/login', loginLimiter, controller.admin.login);
router.get('/me', adminAuth, controller.admin.me);

router.get('/users/suspicious', adminAuth, controller.admin.getSuspiciousUsers);
router.get('/users/search', adminAuth, controller.admin.searchUsers);
router.get('/users/:id', adminAuth, controller.admin.getUser);

router.post('/users/:id/futuretasks', adminAuth, controller.admin.appendFutureTasks);
router.put('/users/:id/futuretasks', adminAuth, controller.admin.replaceFutureTasks);

router.get('/tasks', adminAuth, controller.admin.getTaskCatalog);



module.exports = router;
