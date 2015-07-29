'use strict';

var mongoose = require('mongoose');
var emitter  = require('./emitter');
var Promise  = require('promise');
var Event    = mongoose.model('event', require('../config/schemas/event'));


/**
 * Fuck this existence
 */
function createEvent(data, callback) {
	return new Event(data).save(function(err, event) {
		if(err) {
			return callback(err);
		}
		return event.populate('user', callback);
	});
}


module.exports = function(board, user) {
	return function(ticket) {
		return new Promise(function(resolve, reject) {

			var ticketWidth = 192;
			var ticketHeight = 108;

			var old = ticket.toObject();

			if(ticket.position.x > (board.size.width * ticketWidth) - ticketWidth / 2){
				ticket.position.x = (board.size.width * ticketWidth) - ticketWidth;
			}

			if(ticket.position.y > (board.size.height * ticketHeight) - ticketHeight / 2){
				ticket.position.y = (board.size.height * ticketHeight) - ticketHeight;
			}

			ticket.lastEditedBy = user.id

			ticket.save(function(err, ticket) {
				// we've saved the dog into the db here
				if (err) return reject(err);

				ticket.populate('createdBy lastEditedBy', function(err, ticket) {
					createEvent({
						'type': 'TICKET_EDIT',
						'board': ticket.board,
						'user': user.id,
						'data': {
							'id': ticket.id,
							'oldAttributes': {
								'color':        old.color,
								'heading':      old.heading,
								'content':      old.content,
								'position':     old.position,
								'createdBy':    old.createdBy,
								'lastEditedBy': old.lastEditedBy
							},
							'newAttributes': {
								'color':        ticket.color,
								'heading':      ticket.heading,
								'content':      ticket.content,
								'position':     ticket.position,
								'createdBy':    ticket.createdBy,
								'lastEditedBy': ticket.lastEditedBy
							},
						}
					}, function(err, ev) {
						if(err) {
							return console.error(err);
						}
						emitter.to(ev.board)
							.emit('board:event', ev.toObject());
						return resolve();
					});
				});
			});
		});
	}
}
