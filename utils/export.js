'use strict';

var json2csv = require('nice-json2csv');
var utils    = require('../utils');
var config   = require('../config');

/**
 * Checks if value is undefined and returns defValue. Othervise value is returned
 * @param {*} value - Value to check.
 * @param {*} defValue - Default value to be returned in value is undefined.
 * @returns {*} defValue if value it undefined, otherwise return value
 */
function undefCheck(value, defValue) {
	if(typeof value === 'undefined' || value == '') {return defValue}
	return value;
}
/**
 * Return hex color to readable format
 * @param {string} hex - Hex value to be turned.
 * @returns {string} color hex converted
 */
function hexToColor(hex) {
	if(hex === '#724a7f') {return 'purple';}
	if(hex === '#eb584a') {return 'red';}
	if(hex === '#dcc75b') {return 'yellow';}
	if(hex === '#4f819a') {return 'blue';}
	return "";
}

/**
 * Edits content text to be on same line
 * @param {string} content - content to be edited.
 * @returns {string} content edited
 */
function contentEdit(content) {
	content = content.replace(/\n/g, '\n          ');
	// Replace markdown symbols with something a bit more sensible
	content = content.replace(/[\)#_*~`\]\[]/g, '').replace(/\(/g, ':');
	return content;
}

function addCommentsToTicket(tickets, comments) {
	return tickets.map(function(ticket) {
		ticket.comments = comments.filter(function(comment){
			return ticket._id.equals(comment.data.ticket_id);
		}).map(function(comment) {
			return { user: comment.user.name, message: comment.data.message };
		});
		delete ticket._id;
		return ticket;
	});
}

/**
 * Generates plain text from board and tickets
 * @param {object} board - Board object to be generated.
 * @param {object} tickets - Tickets to be generated.
 * @returns {string} plain text
 */
function generatePlainText(board, tickets) {
		return 'Board information\n' +
		'=========================================\n\n' +
		'Board name: ' + undefCheck(board.name, '') + '\n\n' +
		'Board members: \n' +
		board.members.map(function(member){
			return '    ' + member.user.name + ' - ' + member.role + '\n'
		}).join('') + '\n' +
		'=========================================\n\n\n\n' +
		'Tickets information\n' +
		'=========================================\n' +
		tickets.map(function(t) {
			return '\n' +
				'------------------------------------------\n' +
				'Heading:  ' + contentEdit(undefCheck(t.heading, 'Empty')) + '\n\n' +
				'Content:  ' + contentEdit(undefCheck(t.content, 'Empty')) + '\n\n' +
				'Color:    ' + hexToColor(t.color) + '\n\n' +
				'Comments: ' + undefCheck(t.comments.map(function(c) {return '\n      ' + c.user + ': ' + c.message}).join(''), 'None') + '\n' +
				'------------------------------------------\n';
		}).join('') + '\n' +
		'=========================================';
}

/**
 * Generates CSV from board and tickets
 * @param {object} board - Board object to be generated.
 * @param {object} tickets - Tickets to be generated.
 * @returns {string} csv text
 */
function generateCSV(board, tickets) {
	var membersCSVData = board.members.map(function(member){
		return {
			'MEMBER': member.user.name,
			'ROLE': member.role
		};
	});

	var boardCSVData = {
		'NAME':        board.name,
		'DESCRIPTION': board.description,
		'SIZE_WIDTH':  '' + board.size.width  + '',
		'SIZE_HEIGHT': '' + board.size.height + '',
	}

	var ticketCSVData = tickets.map(function(t) {
		return {
			'HEADING':    t.heading,
			'CONTENT':    t.content,
			'COLOR':      t.color,
			'COMMENTS':   t.comments.map(function(c) {
				return c.user + ': ' + c.message;
			}) + '',
			'POSITION_X': '' + t.position.x + '',
			'POSITION_Y': '' + t.position.y + '',
			'POSITION_Z': '' + t.position.z + '',
		}
	});
	var csvMembers  = json2csv.convert(membersCSVData);
	var csvBoard    = json2csv.convert(boardCSVData);
	var csvTickets  = json2csv.convert(ticketCSVData);
	return csvBoard + '\n\n' + csvMembers + '\n\n' + csvTickets;
}

/**
 * Defines data and options posted to image service
 * @param {object} board - Board object to be generated.
 * @param {object} tickets - Tickets to be generated.
 * @returns {string} callback to post method
 */

function postImage(req, board, tickets, callback) {
	if(tickets == null)
		var tickets = [];

	var postData = {
		'name': board.name,
		'background': board.background,
		'customBackground': board.customBackground,
		'size': {
			'height': board.size.height,
			'width': board.size.width
		},
		'tickets': tickets
	};

	var options = {
		url: config.img + '/board',
		method: 'POST',
		form: postData,
		headers: {
			'Content-Type': 'application/json'
		}
	};

	return callback(options);
};

module.exports = {
	generatePlainText: 	 generatePlainText,
	generateCSV: 		 generateCSV,
	postImage: 			 postImage,
	addCommentsToTicket: addCommentsToTicket
}
