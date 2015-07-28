'use strict';

var mongoose = require('mongoose');

/**
 * Schema defining the 'event' model. Events are tied to a 'board', and have
 * enumerated 'type', defining the contents of 'data'.
 */
var EventSchema = module.exports = new mongoose.Schema({

	/**
	 * Describes which 'board' this event is regarding. Can be 'populated' into
	 * a 'board' model.
	 */
	board: {
		ref:      'board',
		type:     mongoose.Schema.Types.ObjectId,
		required: true
	},

	/**
	 * Describes the 'user' or 'guest' responsible for this 'event'.
	 */
	user: {
		ref:  'user',
		type: mongoose.Schema.Types.ObjectId
	},

	/**
	 * Describes the event 'types'. Some of the more 'special' events are
	 * explained below:
	 *
	 * 'BOARD_PUBLISH', 'BOARD_UNPUBLISH' occur when the owner grants or revokes
	 * guest access to the board. 'BOARD_GUEST_JOIN' occurs when a 'guest'
	 * receives an 'access-token' for the 'board' in question.
	 *
	 * 'TICKET_MOVE' occurs when a ticket's 'position' is changed, updating a
	 * single 'ticket' may trigger both 'TICKET_MOVE' and 'TICKET_EDIT' events
	 * if both 'position' and other fields are updated in the same request.
	 *
	 * 'TICKET_COMMENT' is triggered manually when new comments are posted
	 * regarding the 'ticket' in question.
	 */
	type: {
		type: String,
		enum: [
			'BOARD_CREATE', 'BOARD_EDIT', 'BOARD_REMOVE',
			'BOARD_PUBLISH', 'BOARD_UNPUBLISH', 'BOARD_GUEST_JOIN',
			'TICKET_CREATE', 'TICKET_EDIT', 'TICKET_REMOVE',
			'TICKET_MOVE', 'TICKET_COMMENT',
		]
	},

	/**
	 * Time of origination for this event. Defaults to the creation time of this
	 * document.
	 */
	createdAt: {
		type:    Date,
		default: Date.now
	},

	/**
	 * Object containing all sorts of 'data' for the event. For example given a
	 * 'type' of 'TICKET_COMMENT', this would contain the actual 'message'.
	 */
	data: mongoose.Schema.Types.Mixed
});

if(!EventSchema.options.toJSON) EventSchema.options.toJSON     = { }
if(!EventSchema.options.toObject) EventSchema.options.toObject = { }

EventSchema.options.toJSON.transform = function(doc, ret) {
	ret.id = doc.id;

	delete ret._id;
	delete ret.__v;
}

/**
 * BUG See 'config/schemas/board.js' for details.
 */
EventSchema.options.toObject.transform = EventSchema.options.toJSON.transform;


EventSchema.set('autoIndex', process.env.NODE_ENV !== 'production');
EventSchema.index({board: 1, type: 1});


