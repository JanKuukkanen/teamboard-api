'use strict';

var jwt      = require('jsonwebtoken');
var passport = require('passport');

var utils      = require('../utils');
var config     = require('../config');
var middleware = require('../middleware');

var User    = require('mongoose').model('user');
var Session = require('mongoose').model('session');
var Router  = require('express').Router();

var Bearer = require('passport-http-bearer');

var RedirectURL = process.env.REDIRECT_URL || 'http://localhost:8000/login';

Router.route('/auth')

	/**
	 * Get the user details based on the 'type' of the usnpmer. In a sense, returns
	 * the user deserialized from the token.
	 *
	 * {
	 *   'id':       user.id,
	 *   'type':     user | guest
	 *   'access':   board.id
	 *   'username': user.email | guest.username
	 * }
	 */
	.get(middleware.authenticate('user', 'guest'))
	.get(function(req, res) {
		return res.json(200, req.user);
	});

function authorize(req, res, next) {
        // note that we use the 'authorize' method, which attaches the resulting
        // object into the 'req.account' instead of the 'req.user' as usual
    return passport.authorize(req.params.provider, 
    	{ failureRedirect: RedirectURL })(req, res, next);
}

Router.route('/auth/:provider/login')

	/**
	 * Exchange an 'access-token' for valid credentials. If the user already
	 * has a token (and it is still valid), it is reused. Otherwise a new token
	 * is generated for the user.
	 *
	 * {
	 *   'email':    user.email,
	 *   'password': user.password
	 * }
	 */
	.get(function(req, res, next) {
		return middleware.authenticate(req.params.provider)(req, res, next);	
	})
	
	.get(function(req, res, next) {
		// The secret used to sign the 'jwt' tokens.
		var secret = config.token.secret;

		// Find the user specified in the 'req.user' payload. Note that
		// 'req.user' is not the 'user' model.
		User.findOne({ _id: req.user.id }, function(err, user) {
			if(err) {
				return next(utils.error(500, err));
			}
			// Make sure the token verified is not undefined. An empty string
			// is not a valid token so this 'should' be ok.
			var token = req.headers.authorization.replace('Bearer ', '') || '';

			jwt.verify(token, secret, function(err, payload) {
				// If there was something wrong with the existing token, we
				// generate a new one since correct credentials were provided.
				if(err) {
					var payload = {
						id:       user.id,
						type:     user.account_type,
						username: user.name,
						avatar:   user.avatar
					}
					return user.save(function(err, user) {
						if(err) {
							return next(utils.error(500, err));
						}
						var newtoken = jwt.sign(payload, secret);
						new Session({
							user:       user.id,
							user_agent: req.headers['user-agent'],
							token:      newtoken,
							created_at: new Date()
						}).save(function(err, newsession) {
								if(err) {
									if(err.name == 'ValidationError') {
										return next(utils.error(400, err));
									}
									if(err.name == 'MongoError' && err.code == 11000) {
										return next(utils.error(409, 'Creating new session failed'));
									}
									return next(utils.error(500, err));
								}
							});
						return res.set('x-access-token', newtoken).json(200, payload);
					});
				}
				// If the token was valid we reuse it.
				return res.set('x-access-token', session.token).json(200, payload);
			});
		});
	});

Router.route('/auth/:provider/callback')

.get(authorize)

.get(function(req, res, next) {
		// The secret used to sign the 'jwt' tokens.
		var secret = config.token.secret;

		// Find the user specified in the 'req.user' payload. Note that
		// 'req.user' is not the 'user' model.
		User.findOne({ _id: req.account.id }, function(err, user) {
			if(err) {
				return next(utils.error(500, err));
			}
			// Make sure the token verified is not undefined. An empty string
			// is not a valid token so this 'should' be ok.
			var token = '';

			jwt.verify(token, secret, function(err, payload) {
				// If there was something wrong with the existing token, we
				// generate a new one since correct credentials were provided.
				if(err) {
					var payload = {
						id: user.id, type: user.account_type, username: user.name
					}

					return user.save(function(err, user) {
						if(err) {
							return next(utils.error(500, err));
						}

						var newtoken = jwt.sign(payload, secret);

						new Session({
							user:       user.id,
							user_agent: req.headers['user-agent'],
							token:      newtoken,
							created_at: new Date()
						}).save(function(err, newsession) {
								if(err) {
									if(err.name == 'ValidationError') {
										return next(utils.error(400, err));
									}
									if(err.name == 'MongoError' && err.code == 11000) {
										return next(utils.error(409, 'Creating new session failed'));
									}
									return next(utils.error(500, err));
								}
							});
						return res.redirect(RedirectURL + '/callback' + '?access_token=' + newtoken);
					});
				}
				// If the token was valid we reuse it.
				return res.redirect(RedirectURL + '/callback' + '?access_token=' + newtoken);
			});
		});
	});

Router.route('/auth/logout')

	/**
	 * Removes the 'access-token' stored in database in order to invalidate it.
	 */
	.post(middleware.authenticate('user'))
	.post(function(req, res, next) {

		var tokenToInvalidate = req.headers.authorization.replace('Bearer ', '');

		Session.findOneAndRemove({token: tokenToInvalidate}, function(err) {

			if (err) {
				return next(utils.error(500, err));
			}
			else {
				return res.send(200);
			}
		});
	});

Router.route('/auth/register')

	/**
	 * Creates a new 'user' account via the  basic provider method.
	 *
	 * {
	 *   'username': 'Narsu'
	 *   'email':    'narsu@man.fi',
	 *   'password': 'sikapossu'
	 * }
	 */
	.post(function(req, res, next) {
		var username = '';
		// If username is not set, we use the email instead.
		req.body.username ? username = req.body.username : username = req.body.email;
		User.find({ 'providers.basic.email': req.body.email }, function(err, user) {
			if(err) {
				return next(utils.error(500, err));
			}
			if(user.length) {
				return next(utils.error(409, "Email already exists"))
			}
			new User({ name:      username,
			       account_type: 'standard',
			       providers: {
						basic: {
							email:   req.body.email,
							password:req.body.password
						    }
				   },
					created_at: new Date(),
					boards:[]})
			.save(function(err, user) {
				if(err) {
					if(err.name == 'ValidationError') {
						return next(utils.error(400, err));
					}
					if(err.name == 'MongoError' && err.code == 11000) {
						return next(utils.error(409, 'User already exists'));
					}
					return next(utils.error(500, err));
				}
				return res.json(201, user);
			});
		});
	
	});

module.exports = Router;
