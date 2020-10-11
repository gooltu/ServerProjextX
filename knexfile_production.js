'use strict';

module.exports = {  
  production: {
    client: 'mysql',
    connection: {
      host:  process.env.durl,
      user: process.env.dusername,
      password:  process.env.dpassword,
      database: 'k6b2nhewtdn8wioe',
      charset: 'utf8'
    }
  }
};

