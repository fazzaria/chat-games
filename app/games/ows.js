const gameType = require('../config').gameTypes.OWS;
const gameOptions = require('../config').gameOptions[gameType];
const io = require('../../server').io;

const roomExists = require('../common').roomExists;
const getPlayerSockets = require('../common').getPlayerSockets;
const getRoomSockets = require('../common').getRoomSockets;
const isSockpuppet = require('../common').isSockpuppet;

function refreshData(roomCode) {
  if (!roomExists(roomCode)) return;

  var room = io.sockets.adapter.rooms[roomCode];
  var roomSockets = getRoomSockets(roomCode);
  var playerSockets = gameOptions.allowSockPuppets ? roomSockets : getPlayerSockets(roomCode);

  var state = {
    roomCode: roomCode,
    words: room._variables.words,
    roomState: room._variables.roomState
  };

  for (var i = 0; i < roomSockets.length; i++) {
    currentSocket = roomSockets[i];
    var players = [];
    for (var j = 0; j < playerSockets.length; j++) {
      var currentPlayerSocket = playerSockets[j];
      var isSelf = currentSocket.id === currentPlayerSocket.id;
      if (!allowSockPuppets) isSelf = isSockpuppet(currentSocket, currentPlayerSocket);
      players.push({
        ready: currentPlayerSocket._variables.ready,
        done: currentPlayerSocket._variables.done,
        name: currentPlayerSocket._variables.displayName,
        self: isSelf
      });
    }
    state.players = players;
    currentSocket.emit('roomData', state);
  }
}

function resetRoom(roomCode) {
  var room = io.sockets.adapter.rooms[roomCode];
  var roomSockets = getRoomSockets(roomCode);
  for (var i = 0; i < roomSockets.length; i++) {
    var currentSocket = roomSockets[i];
    currentSocket._variables.ready = false;
    currentSocket._variables.done = false;
  }
  room._variables.roomState = 0;
}

function validateName(name) {
  if (!name) return 'Please enter a name.';
  return null;
}

function validateWord(word) {
  if (!word) return 'Please enter a word.';
  if (word.search(/ /g) !== -1) return 'Words must not contain spaces.';
  return null;
}

function startSockets(socket) {

  var setName = function(name) {
    var roomCode = socket._variables.roomCode;
    if (!roomExists(roomCode)) return;
    var validationMessage = validateName(name);
    if (validationMessage) {
      socket.emit('warning', validationMessage);
      return;
    }
    socket._variables.displayName = name;
    socket.emit('nameSet');
    refreshData(roomCode);
  };

  var toggleReady = function() {
    if (!validateFunction(socket)) return;
    var roomCode = socket._variables.roomCode;
    var room = io.sockets.adapter.rooms[roomCode];
    if (room._variables.roomState !== 0) return;

    var roomCode = socket._variables.roomCode;
    var roomSockets = getRoomSockets(roomCode);
    var playerSockets = gameOptions.allowSockPuppets ? roomSockets : getPlayerSockets(roomCode);
    var readies = 0;

    var newReadyState = !socket._variables.ready;
    socket._variables.ready = newReadyState;

    if (!gameOptions.allowSockPuppets) {
      for (var i = 0; i < roomSockets.length; i++) {
         if (isSockpuppet(roomSockets[i], socket)) {
          roomSockets[i]._variables.ready = newReadyState;
        }
      }
    }

    for (var j = 0; j < playerSockets.length; j++) {
      if (playerSockets[j]._variables.ready) readies++;
    }

    if (readies === playerSockets.length) {
      room._variables.story = [];
      room._variables.roomState = 1;
      for (var k = 0; k < roomSockets.length; k++) {
        roomSockets[k]._variables.ready = false;
      }
      //shuffle players
      var counter = room._variables.players.length;
      while (counter > 0) {
        var index = Math.floor(Math.random() * counter);
        counter--;
        var temp = room._players[counter];
        room._variables.players[counter] = room._variables.players[index];
        room._variables.players[index] = temp;
      }
    }
    refreshData(roomCode);
  };

  var submitWord = function(word) {
    var roomCode = getRoomcode();
    if (!roomCode) return;
    if (!roomExists(roomCode)) return;
    var room = io.sockets.adapter.rooms[roomCode];
    if (room._variables.roomState === 0) return;
    if (room._variables.players[0] !== socket.id) return;

    var validationMessage = validateWord(word);
    if (validationMessage) {
      socket.emit('warning', validationMessage);
      return;
    }
    //allow players to punctuate the previous word
    var endPunctuations = ['.', ',', ':', ';', '"', '\'', ')', '>', ']'];
    if (word.length === 0 && endPunctuations.indexOf(word) === 0) {
      var story = room._variables.story;
      story[story.length - 1].word += word;
    } else {
      room._variables.players.push(room._players.shift());
      var obj = {word: word, author: socket._variables.displayName};
      room._variables.story.push(obj);
    }
    io.in(roomCode).emit('wordAccepted', obj);
    refreshData(roomCode);
  };

  var toggleFinish = function() {
    var roomCode = getRoomcode();
    if (!roomCode) return;
    if (!roomExists(roomCode)) return;
    var room = io.sockets.adapter.rooms[roomCode];
    if (room._variables.roomState !== 1) return;

    var yays = 0;
    var roomCode = socket._variables.roomCode;
    var roomSockets = getRoomSockets(roomCode);
    var playerSockets = gameOptions.allowSockPuppets ? roomSockets : getPlayerSockets(roomCode);

    socket._variables.done = !socket._variables.done;

    if (!gameOptions.allowSockPuppets) {
      var newDoneState = socket._variables.done;
      for (var i = 0; i < roomSockets.length; i++) {
        if (isSockpuppet(roomSockets[i], socket)) roomSockets[i]._variables.done = newDoneState;
      }
    }

    for (var i = 0; i < playerSockets.length; i++) {
      if (playerSockets[i]._variables.done) yays++;
    }

    if (yays === playerSockets.length) {
      io.in(roomCode).emit('storyFinished');
      roomSockets[j]._variables.done = false;
    }
    refreshData(roomCode);
  };

  var eventFunctions = {
    setName, toggleReady, submitWord, toggleFinish
  };

  for (var event in eventFunctions) {
    socket.on(event, eventFunctions[event]);
  }

  socket._removeListeners = function() {
    for (var event in eventFunctions) {
      socket.removeListener(event, eventFunctions[event]);
    }
  };
}

function handleJoin(roomCode, socket) {
  room._variables.players.push(socket.id);
  refreshData(roomCode);
}

function handleExit(socket) {
  var roomCode = socket._variables.roomCode;
  if (!roomExists(roomCode)) return;

  var room = io.sockets.adapter.rooms[roomCode];
  var index = room._variables.players.indexOf(socket.id);
  room._variables.players.splice(index, 1);

  var playerSockets = gameOptions.allowSockPuppets ? getRoomSockets(roomCode) : getPlayerSockets(roomCode);

  if (playerSockets.length === 0) return;
  if (playerSockets.length < gameOptions.minPlayers) {
    io.in(roomCode).emit('warning', 'At least ' + gameOptions.minPlayers + ' players must be present to proceed.');
    resetRoom(roomCode);
  }
  refreshData(roomCode);
  socket.emit('leftRoom');
}

function handleChat(msg, socket) {
  if (!validateFunction(socket)) return;
  var roomCode = socket._variables.roomCode;

  if (msg.length > gameOptions.maxChatMsgLength) msg = msg.slice(0, gameOptions.maxChatMsgLength);
  msg = socket._variables.displayName + ': ' + msg;
  io.in(roomCode).emit('newChatMessage', msg);
  socket.emit('yourMessagePosted');
}

module.exports = {
  startSockets,
  handleJoin,
  handleChat,
  handleExit
};