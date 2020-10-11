'use strict'



let config = module.exports;

config.env = process.env.NODE_ENV || 'development';

config.topicname = process.env.topicname || ''; 
config.subc_name = process.env.NODE_ENV || '';



config.host = process.env.host || 'localhost';
config.user = process.env.user || 'root';
config.password = process.env.password || '';



config.memcached = process.env.memcached || 'localhost';

config.gcmkey = process.env.gcmkey || '';

config.secret = 'ilovescotchscotchyscotchscotch';


