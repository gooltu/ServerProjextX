'use strict';

var express = require('express');
var passport = require('passport');
var jwt = require('jsonwebtoken');
var JwtStrategy = require('passport-jwt').Strategy
var ExtractJwt = require('passport-jwt').ExtractJwt

var bodyParser = require('body-parser');

var routes = require('./routes/index');


var app = express();
app.disable('x-powered-by');



app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));



app.use(passport.initialize());
app.use(passport.session());

app.use('/', routes);


var passportUtil = require('./utils/passport');

var opts = {}
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.secretOrKey = require('./utils/config').secret;

passport.use(new JwtStrategy(opts, passportUtil.verifyPayload));

passport.serializeUser(passportUtil.serializeUser);
passport.deserializeUser(passportUtil.deserializeUser);

// catch 404 and forward to error handler

app.use(function(req, res, next) {
  console.log(req.url);
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});


// error handler
app.use(function(err, req, res, next) {  
  res.status(err.status || 500);
  console.error(err.message);
  res.json({error: true, message: err.message });
});

module.exports = app;
