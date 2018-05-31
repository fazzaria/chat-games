var express = require('express');
var bodyParser = require('body-parser');
var socketServer = require('socket.io');
var path = require('path');
var http = require('http');
var Request = require('request');

const app = express();
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(express.static(path.join(__dirname, 'build')));

const serve = http.createServer(app);
const io = socketServer(serve);
module.exports.io = io;

var connectedIPs = {};
var connectedCookies = {};

const gameTypes = require('../config.js').gameTypes;

io.on('connection', function (socket) {

  connectedIPs[socket.id] = socket.handshake.address;

  var isSockpuppet = require('./app/common').isSockpuppet;

  socket.on('disconnect', function() {
    delete connectedIPs[socket.id];
    if (socket._variables.gameType) {
      var handleLeave = require('./games/' + gameType).handleLeave;
      if (handleLeave) handleLeave();
    };
  });

  socket.on('createRoom', (gameType, options, success) => {
    var createRoom = require('./app/common.js').createRoom;
    if (createRoom) createRoom(gameType, options);
    success();
  });

  socket.on('joinRoom', function(roomCode, success) {
    var joinRoom = require('./app/common.js').joinRoom;
    if (joinRoom) joinRoom(roomCode, success);
    if (!gameOptions[gameType].allowSockpuppets) {
      var room = io.sockets.adapter.rooms[roomCode];
      var sockets = io.sockets.sockets;
      for (var i = 0; i < room._players.length; i++) {
        if (isSockpuppet(socket, sockets[room._players[i]])) {
          socket._variables = preexistingSocket._variables;
        }
      }  
    }
  });

  socket.on('exitRoom', function(roomCode, success) {
    var exitRoom = require('./app/common.js').exitRoom;
    if (exitRoom) exitRoom(roomCode, success);
  });

  socket.on('postChatMessage', (msg, success) => {
    var roomCode = getRoomcode();
    if (!roomCode) return;
    if (!roomExists(roomCode)) return;

    var handleChat = require('./games/' + gameType).handleChat;
    if (handleChat) handleChat(msg, roomCode);
    success();
  });

  for (var type in gameTypes) {
    var onFunctions = require('./games/' + type).onFunctions;
    if (onFunctions) onFunctions(roomCode, success);
  }
});

serve.listen(process.env.PORT || 8080, () => console.log("Server running on port 8080."));

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});