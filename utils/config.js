'use strict'



let config = module.exports;

config.env = process.env.NODE_ENV || 'development';

config.subc_name = process.env.NODE_ENV || '';

config.secret = process.env.JWT_SECRET || 'ilovescotchscotchyscotchscotch';

config.appCheckEnabled = process.env.APP_CHECK_ENABLED === 'true';

