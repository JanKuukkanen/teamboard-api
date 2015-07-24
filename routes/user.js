var _        = require('lodash');
var express  = require('express');
var mongoose = require('mongoose');

var utils      = require('../utils');
var config     = require('../config');
var middleware = require('../middleware');

var User   = mongoose.model('user');

var Router   = express.Router();
var ObjectId = mongoose.Types.ObjectId;

Router.route('/user/edit')

    /**

     * Change user name
     *
     * {
     *   'name'        : 'new name',
     *   'avatar'      : 'avatar url'
     * }
     */
    .put(middleware.authenticate('user'))
    .put(function(req, res, next) {
        var payload = req.body;

        User.findOne({ '_id': req.user.id }, function(err, user) {
            if(err) {
                return next(utils.error(500, err));
            }

            if(!user) {
                return next(utils.error(500, 'User not found'));
            }
            if(payload.name) {
                user.name = payload.name;
            }
            user.avatar = payload.avatar;

            user.save(function(err, user) {
                if(err) {
                    if(err.name == 'ValidationError') {
                        return next(utils.error(400, err));
                    }
                    return next(utils.error(500, err));
                }
                return res.json(200, user);
            });
        });
    });

Router.route('/user/changepw')
    /**
     * Change user basic provider password
     *
     * {
     *   'new_password': 'new password',
     *   'old_password': 'old password'
     * }
     */
    .put(middleware.authenticate('user'))
    .put(function(req, res, next) {

        var payload = req.body;

        User.findOne({ '_id': req.user.id }, function(err, user) {
            if(err) {
                return next(utils.error(500, err));
            }

            if(!user) {
                return next(utils.error(500, 'User not found'));
            }
            if(payload.new_password && payload.old_password) {
                user.comparePassword(payload.old_password, function(err, response) {
                    if(err) {
                        return next(utils.error(500, err))
                    }
                    if(response === false) {
                        return next(utils.error(401, 'Invalid old password!'))
                    }

                    else {
                        user.providers.basic.password = payload.new_password;
                        user.save(function(err, user) {
                            if(err) {
                                if(err.name == 'ValidationError') {
                                    console.log(err);
                                    return next(utils.error(400, err));
                                }
                                return next(utils.error(500, err));
                            }
                            return res.json(200, user);
                        });
                    }
                });
            } else {
                return next(utils.error(500, 'No new or old password defined in request'));
            }
        });
    });

module.exports = Router;
