'use strict';

const environment = process.env.NODE_ENV || 'development';

let config;

if(environment === 'production')
	config = require('../knexfile_production.js')[environment];
else
	config = require('../knexfile_development.js')[environment];

console.log('CONFIG');
console.log(config);

module.exports = require('knex')(config);