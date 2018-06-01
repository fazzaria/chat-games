var http = require('http');
const gameType = require('../config').gameTypes.SWF;
const gameOptions = require('../config').gameOptions[gameType];

const roomExists = require('../common').roomExists;
const getPlayerSockets = require('../common').getPlayerSockets;
const getRoomSockets = require('../common').getRoomSockets;
const isSockpuppet = require('../common').isSockpuppet;

module.exports.startGame = function(socket, io) {

}