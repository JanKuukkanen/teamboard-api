'use strict';

var utils = require('../../utils');

var User           =    require('mongoose').model('user');
var GoogleStrategy =	require('passport-google-oauth2').Strategy;

// Defines the 'req.body' fields used to look for credentials.
var opts = {
	clientID: '161571982407-o698t9ofu4nl56efcu3dkl2f2nftb5du.apps.googleusercontent.com',
	clientSecret: 'Dd0Me0lL3HT4k8vCdMfvBXBa',
    callbackURL: 'http://localhost:9002/api/auth/login/callback',
    scope: [ 'https://www.googleapis.com/auth/plus.login', 'https://www.googleapis.com/auth/plus.profile.emails.read' ],
    passReqToCallback: true
}

/**
 * Authenticate the requestee as a 'user' based on the passed in credentials.
 */
module.exports = new GoogleStrategy(opts, function(token, refreshToken, profile, done) {
        // User.findOne won't fire until we have all our data back from Google
        process.nextTick(function() {
            // try to find the user based on their google id
            User.findOne({ 'providers.google.id' : profile.id }, function(err, user) {
                if (err){
                    return done(err);
                }
                if (user) {
                    // if a user is found, log them in
                    return done(null, user);
                } else {
	                new User({ 
						name: profile.displayName,
						account_type: 'standard',
						providers: {
							google: {
									id: profile.id,
									token: token,
									name: profile.displayName,
									email: profile.emails[0].value,
							       }
					   },
						created_at: new Date()})
							.save(function(err, user) {
								if(err) {
									if(err.name == 'ValidationError') {
										return next(utils.error(400, err));
									}
									return next(utils.error(500, err));
								}
								return done(null, user);
							});
	                	}
	            	});
	        	});
			});
