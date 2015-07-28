'use strict';

var mongoose = require('mongoose');
var config   = require('../.');
var SessionSchema = module.exports = new mongoose.Schema({

    /**
     * Reference to the user who owns this session
     */
    user: {
        ref:      'user',
        type:     mongoose.Schema.Types.ObjectId,
        required: true
    },

    /**
     * User agent of the session
     */
    user_agent: {
        type:     String
    },

    /**
     * The token of the user, used for authenticating p. much everything
     */
    token: {
        type:     String,
        required: true,
        unique:   true
    },

    /**
     * Expiration date for the token
     */
    created_at :{
        type:     Date,
        default:  Date.now(),
        expires:  config.mongo.guest_exp_time
    }
});

if(!SessionSchema.options.toJSON) SessionSchema.options.toJSON     = { }
if(!SessionSchema.options.toObject) SessionSchema.options.toObject = { }

SessionSchema.options.toJSON.transform = function(doc, ret) {
    ret.id = doc.id;

    delete ret._id;
    delete ret.__v;
}

/**
 * BUG See 'config/schemas/board.js' for details.
 */
SessionSchema.options.toObject.transform = SessionSchema.options.toJSON.transform;

//SessionSchema.set('autoIndex', process.env.NODE_ENV !== 'production');
SessionSchema.index({token: 1});
SessionSchema.index({user: 1});
