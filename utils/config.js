'use strict'



let config = module.exports;

config.env = process.env.NODE_ENV || 'development';

config.subc_name = process.env.NODE_ENV || '';

config.secret = process.env.JWT_SECRET || 'ilovescotchscotchyscotchscotch';

config.appCheckEnabled = process.env.APP_CHECK_ENABLED === 'true';

// Admin tokens use their own secret so a player token can never pass the admin strategy (and
// vice versa). No hardcoded fallback in production: unset means admin routes are disabled
// (503), not signed with a guessable key.
config.adminSecret = process.env.ADMIN_JWT_SECRET || (config.env === 'production' ? null : 'dev-only-admin-secret');

if (config.adminSecret && config.adminSecret === config.secret) {
	console.error('ADMIN_JWT_SECRET must differ from JWT_SECRET - admin routes disabled');
	config.adminSecret = null;
}

// The admin web app's origin, the only one allowed through CORS on /admin.
config.adminOrigin = process.env.ADMIN_ORIGIN || (config.env === 'production' ? null : 'http://localhost:8081');

