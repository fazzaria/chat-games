const gameTypes = require('./config.js').gameTypes;
const gameOptions = require('./config.js').gameOptions;
const io = require('../server.js').io;

module.exports = {
  roomExists,
  getRoomcode,
  processRoomCode,
  isSockpuppet,
  initializeSocketData,
  initializeRoomData,
  generateRoomName,
  generateDisplayName,
  refreshPublicRooms,
  createRoom,
  joinRoom,
  exitRoom
};

function roomExists(roomCode) {
  return !!io.sockets.adapter.rooms[roomCode];
}

function getRoomcode() {
  for (var code in socket.rooms) {
    if (code != socket.id) return code;
  }
}

function processRoomCode(gameType, roomCode) {
  const store = require('./store.js')[gameType];
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
  return connectedIPs[socket1.id] === connectedIPs[socket2.id];
}

function initializeSocketData(gameType, socket, preexistingSocket) {
  socket._gameType = gameType;
  socket._displayName = '';
  if (gameType === gameTypes.SWF) {
    socket._isAsker = false;
    socket._ready = false;
    socket._vote = '';
    return socket;
  }
  if (gameType === gameTypes.OWS) {
    socket._done = false;
    socket._ready = false;
    return socket;
  }
}

function initializeRoomData(gameType, room, options) {
  room._gameType = gameType;
  room._isPublic = options.isPublic;
  room._players = [];
  room._roomState = 0;
  if (gameType === gameTypes.SWF) {
    room._question = '';
    room._answer = '';
    room._votes = [];
    room._tiebreakCandidates = [];
    room._preposition = name.preposition;
    return room;
  }
  if (gameType === gameTypes.OWS) {
  }
}

function generateRoomName(gameType, options) {
  const store = require('./store.js')[gameType];
  if (gameType === gameTypes.SWF) {
    var name = '';
    var noun = store.nouns[Math.floor(Math.random() * nouns.length)];
    var preposition = noun.prepositions[Math.floor(Math.random() * noun.prepositions.length)];
    var adjective = store.adjectives[Math.floor(Math.random() * store.adjectives.length)];
    if (adjective.position == 'before') {
      name = adjective.name.replace(/ /g, '-') + '-' + noun.name.replace(/ /g, '-');
    } else {
      name = noun.name.replace(/ /g, '-') + '-' + adjective.name.replace(/ /g, '-');
    }
    return {name: name, preposition: preposition};
  }
  if (gameType === gameTypes.OWS) {
    var name = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 4).toUpperCase();
    return {name: name};
  }
}

function generateDisplayName(gameType) {
  const store = require('./store.js')[gameType];
  if (gameType === gameTypes.SWF) {
    var name = store.lastNames[Math.floor(Math.random() * store.lastNames.length)];
    if (Math.floor(Math.random() * 5) === 3) {
      name = store.formalTitles[Math.floor(Math.random() * store.formalTitles.length)] + ' ' + name;
    } else {
      name = store.informalTitles[Math.floor(Math.random() * store.informalTitles.length)] + ' ' + name;
    }
    return {name: name};  
  }
}

function refreshPublicRooms(gameType) {
  var players = [];
  var publicRooms = [];
  for (var r in io.sockets.adapter.rooms) {
    if (r._isPublic && r._gameType === gameType) {
      publicRooms[r] = r._players.length;
      for (var i = 0; i < r._players.length; i++) {
        players.push(r._players[i]);
      }
    }
  }

  var sockets = io.sockets.sockets;
  for (var id in sockets) {
    if (sockets[id]._gameType === gameType && players.indexOf(id) === -1) {
      socket.emit('roomData', {publicRooms});
    }
  }
}

function createRoom(gameType, options) {
  var roomsNumber = 0;
  for (var r in io.sockets.adapter.rooms) if (r._gameType === gameType) roomsNumber++;
  if (roomsNumber >= gameOptions[gameType].maxRooms) {
    socket.emit('warning', 'No new rooms can be created at this time.');
    return false;
  }
  var exists = true;
  var name = {};
  while (exists) {
    name = generateRoomName();
    exists = roomExists(name.name);
  }
  var roomCode = name.name;
  initializeSocketData(gameType, socket);
  //two join methods?
  socket.join(roomCode);
  var room = io.sockets.adapter.rooms[roomCode];
  initializeRoomData(gameType, room);
  joinRoom(roomCode, success);
}

function joinRoom(gameType, roomCode, options) {
  if (!roomCode) {
    socket.emit('warning', 'Please enter a name.');
    return;
  }
  roomCode = processRoomCode(gameType, roomCode);
  if (!roomExists(roomCode)) {
    socket.emit('warning', 'No place found with that name.');
    return;
  }
  var room = io.sockets.adapter.rooms[roomCode];
  room._players.push(socket.id);
  initializeSocketData(socket);
  //inheritSocketData(roomCode);
  socket.join(roomCode, ()=> {
    var handleJoin = require('./games/' + gameType).handleJoin;
    handleJoin(roomCode);
    if (options.isPublic) refreshPublicRooms(gameType);
  });
}

function exitRoom(gameType, roomCode) {
  var roomCode = getRoomcode();
  if (!roomCode) return;
  if (!roomExists(roomCode)) return;

  var room = io.sockets.adapter.rooms[roomCode];
  var handleLeave = require('./games/' + gameType).handleLeave;
  handleLeave(roomCode);
  if (room._isPublic) refreshPublicRooms(gameType);
  success();
}