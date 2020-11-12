'use strict';

module.exports = {  
  production: {
    client: 'mysql',
    connection: {
      host:  process.env.durl,
      user: process.env.dusername,
      password:  process.env.dpassword,
      database: 'projectx',
      charset: 'utf8'
    }
  }
};

