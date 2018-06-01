const gameTypes = require('./config').gameTypes;
const gameOptions = require('./config').gameOptions;
const io = require('../server').io;

module.exports = {
  roomExists,
  isSockpuppet,
  generateRoomName,
  generateDisplayName,
  getRoomSockets,
  getPlayerSockets,
  createRoom,
  joinRoom,
  exitRoom,
  postChatMessage
};

function roomExists(roomCode) {
  return !!io.sockets.adapter.rooms[roomCode];
}

function processRoomCode(gameType, roomCode) {
  const store = require('./store')[gameType];
  if (gameType === gameTypes.SWF) {
    roomCode.toLowerCase();
    roomCode = roomCode.replace(/ /g, '-');
    return roomCode;
  }
  if (gameType === gameTypes.OWS) {
    roomCode.toUpperCase();
    roomCode = roomCode.replace(/ /g, '');
    return roomCode;
  }
}

function isSockpuppet(gameType, socket1, socket2) {
  if (gameOptions[gameType].allowSockPuppets) return false;
  return socket1.handshake.address === socket2.handshake.address;
}

function inheritSocketData(socket, roomCode) {
  var room = io.sockets.adapter.rooms[roomCode];
  var socketIds = room._variables.socketIds;
  var sockets = io.sockets.sockets;
  for (var i = 0; i < socketIds; i++) {
    var id = socketIds[i];
    if (isSockpuppet(socket, sockets[id])) {
      socket._variables = sockets[id]._variables;
    }
  }
}

function initializeSocketData(gameType, socket) {
  var variables = {
    gameType: gameType,
    displayName: ''
  };
  if (gameType === gameTypes.SWF) {
    variables.isAsker = false;
    variables.ready = false;
    variables.vote = '';
  }
  if (gameType === gameTypes.OWS) {
    variables.done = false;
    variables.ready = false;
  }
  socket._variables = variables;
}

function initializeRoomData(gameType, options, room) {
  var variables = {
    gameType: gameType,
    socketIds: [],
    roomState: 0,
    isPublic: options.isPublic
  };
  if (gameType === gameTypes.SWF) {
    variables.question = '';
    variables.answer = '';
    variables.votes = [];
    variables.tiebreakCandidates = [];
    variables.preposition = options.name.preposition;
  }
  if (gameType === gameTypes.OWS) {
  }
  room._variables = variables;
}

function generateRoomName(gameType, options) {
  const store = require('./store')[gameType];
  if (gameType === gameTypes.SWF) {
    var name = '';
    var noun = store.nouns[Math.floor(Math.random() * store.nouns.length)];
    var preposition = noun.prepositions[Math.floor(Math.random() * noun.prepositions.length)];
    var adjective = store.adjectives[Math.floor(Math.random() * store.adjectives.length)];
    if (adjective.position == 'before') {
      name = adjective.name.replace(/ /g, '-') + '-' + noun.name.replace(/ /g, '-');
    } else {
      name = noun.name.replace(/ /g, '-') + '-' + adjective.name.replace(/ /g, '-');
    }
    return { name, preposition };
  }
  if (gameType === gameTypes.OWS) {
    var name = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 4).toUpperCase();
    return { name };
  }
}

function generateDisplayName(gameType, options) {
  const store = require('./store')[gameType];
  if (gameType === gameTypes.SWF) {
    var name = store.lastNames[Math.floor(Math.random() * store.lastNames.length)];
    if (Math.floor(Math.random() * 5) === 3) {
      name = store.formalTitles[Math.floor(Math.random() * store.formalTitles.length)] + ' ' + name;
    } else {
      name = store.informalTitles[Math.floor(Math.random() * store.informalTitles.length)] + ' ' + name;
    }
    return { name };  
  }
}

function refreshPublicRooms(gameType) {
  var inRoomIds = [];
  var publicRooms = {};
  //add sockpuppet check
  for (var r in io.sockets.adapter.rooms) {
    if (r._variables && r._variables.isPublic && r._variables.gameType === gameType) {
      publicRooms[r] = r._variables.socketIds.length;
      inRoomIds.concat(r._variables.socketIds);
    }
  }

  var sockets = io.sockets.sockets;
  for (var id in sockets) {
    if (sockets[id]._gameType === gameType && inRoomIds.indexOf(id) === -1) {
      sockets[id].emit('roomData', {publicRooms});
    }
  }
}

function getRoomSockets(roomCode) {
  var room = io.sockets.adapter.rooms[roomCode];
  var socketIds = room._variables.socketIds;
  var sockets = io.sockets.sockets;
  var roomSockets = [];
  for (var i = 0; i < socketIds.length; i++) {
    var id = socketIds[i];
    roomSockets.push(sockets[id]);
  }
  return roomSockets;
}

function getPlayerSockets(roomCode) {
  var room = io.sockets.adapter.rooms[roomCode];
  var socketIds = room._variables.socketIds;
  var roomIPs = [];
  var sockets = io.sockets.sockets;
  var playerSockets = [];
  for (var i = 0; i < socketIds.length; i++) {
    var id = socketIds[i];
    if (roomIPs.indexOf(sockets[id].handshake.address) === -1) {
      playerSockets.push(sockets[id]);
      roomIPs.push(sockets[id].handshake.address);
    }
  }
  return playerSockets;
}

function createRoom(gameType, options, socket) {
  var roomsNumber = 0;
  for (var r in io.sockets.adapter.rooms) {
    if (r._variables && r._variables.gameType === gameType) roomsNumber++;
  }
  if (roomsNumber >= gameOptions[gameType].maxRooms) {
    socket.emit('warning', 'No new rooms can be created at this time.');
    return false;
  }
  var exists = true;
  var name = {};
  while (exists) {
    name = generateRoomName(gameType);
    exists = roomExists(name.name);
  }
  options.name = name;
  var roomCode = name.name;
  socket.join(roomCode);
  var room = io.sockets.adapter.rooms[roomCode];
  initializeRoomData(gameType, options, room);
  socket.emit('createdRoom', roomCode);
  joinRoom(gameType, roomCode, socket);
}

function joinRoom(gameType, roomCode, socket) {
  var warningMessage = '';
  if (!roomCode) warningMessage = 'Please enter a room code.';

  roomCode = processRoomCode(gameType, roomCode);
  if (!roomExists(roomCode)) warningMessage = 'No room found with that code.';

  if (warningMessage) {
    socket.emit('warning', warningMessage);
    return;
  }

  var room = io.sockets.adapter.rooms[roomCode];
  room._variables.socketIds.push(socket.id);

  initializeSocketData(gameType, socket);
  if (!gameOptions[gameType].allowSockPuppets) inheritSocketData(socket, roomCode);
  socket._variables.roomCode = roomCode;
  socket._variables.displayName = generateDisplayName(gameType).name;

  socket.join(roomCode, () => {
    require('./games/' + gameType).startGame(socket, io);
    require('./games/' + gameType).handleJoin(roomCode);
    if (room._variables.isPublic) refreshPublicRooms(gameType);
    socket.emit('joinedRoom', roomCode);
  });
}

function exitRoom(socket) {
  var gameType = socket._variables.gameType;
  var roomCode = socket._variables.roomCode;
  socket._removeListeners();
  initializeSocketData(gameType, socket);

  if (!roomCode || !roomExists(roomCode)) return;
  var room = io.sockets.adapter.rooms[roomCode];

  var index = room._variables.socketIds.indexOf(socket.id);
  room._variables.socketIds.splice(index, 1);
  socket.leave(roomCode);
  require('./games/' + gameType).handleExit(socket);
  if (room._variables.isPublic) refreshPublicRooms(gameType);
  socket.emit('exitedRoom');
}

function postChatMessage(msg, socket) {
  var gameType = socket._variables.gameType;
  require('./games/' + gameType).handleChat(msg, socket);
  socket.emit('chatMessagePosted');
}