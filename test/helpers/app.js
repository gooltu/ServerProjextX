'use strict';

const supertest = require('supertest');

module.exports = function request() {
  return supertest(require('../../app'));
};
