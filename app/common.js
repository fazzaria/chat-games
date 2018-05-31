const gameTypes = require('./config.js').gameTypes;
const gameOptions = require('./config.js').gameOptions;

module.exports.isSockpuppet(gameType, socket1, socket2) {
  if (gameOptions[gameType].allowSockPuppets) return false;
  return connectedIPs[socket1.id] === connectedIPs[socket2.id];
}

module.exports.initializeSocketData = function(gameType, socket, preexistingSocket) {
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
};

module.exports.initializeRoomData = function(gameType, room, options) {
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
};

module.exports.generatePublicRoomName = function(gameType, options) {
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
};

module.exports.generateDisplayName = function(gameType) {
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
};