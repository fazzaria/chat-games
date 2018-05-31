var http = require('http');
const settings = require('./app/config/js').configSettings;
const gameType = require('../config.js').gameTypes.SWF;
const gameOptions = require('../config.js').gameOptions[gameType];

const gameOptions = require('../config.js').gameOptions[gameType];
const gameOptions = require('../config.js').gameOptions[gameType];
const gameOptions = require('../config.js').gameOptions[gameType];

if (gameOptions.getLunarPhase) getLunarPhase();

function getLunarPhase() {
  var dt = new Date();
  var dtString = dt.toLocaleDateString('en-US');
  var url = `http://api.usno.navy.mil/moon/phase?date=${dtString}&nump=1&ID=fazzaria_ouija_app`;
  http.get(url, function(res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      if (chunk) {
        var chunkJSON = JSON.parse(chunk);
        if (chunk.day === dt.getDay() && chunk.month === dt.getMonth() && chunk.year === dt.getFullYear()) {
          var phase = chunkJSON.phasedata[0].phase;
          var returnPhase = '';
          if (phase === 'Last Quarter' || phase === 'First Quarter') {
            returnPhase = 'half';
          } else if (phase === 'New Moon') {
            returnPhase = 'new'
          } else if (phase === 'Full Moon') {
            returnPhase = 'full';
          }
          socket.emit('lunarPhase', returnPhase);
        }
      }
    });
  }).end();
}

function refreshData(roomCode) {
  if (!roomExists(roomCode)) return;

  var room = io.sockets.adapter.rooms[roomCode];
  var sockets = io.sockets.sockets;
  var playerIPs = [];
  var playerSockets = [];
  var allSockets = [];

  for (var id in sockets) {
    if (sockets[id].rooms[roomCode] && sockets[id]._joinedRoom) {
      if (playerIPs.indexOf(connectedIPs[id]) === -1 || allowSockPuppets) {
        playerSockets.push(sockets[id]);
        playerIPs.push(connectedIPs[id]);
      }
      allSockets.push(sockets[id]);
    }
  }

  var state = { 
    roomCode: roomCode,
    question: room._question,
    answer: room._answer,
    roomState: room._roomState,
    votes: room._votes,
    preposition: room._preposition,
    tiebreakCandidates: room._tiebreakCandidates
  };

  for (var i = 0; i < allSockets.length; i++) {
    var players = [];
    currentSocket = allSockets[i];

    for (var j = 0; j < playerSockets.length; j++) {
      var currentPlayerSocket = playerSockets[j];
      var isSelf = currentSocket.id === currentPlayerSocket.id;
      if (!allowSockPuppets) isSelf = isSockpuppet(currentSocket, currentPlayerSocket);
      players.push({
        ready: currentPlayerSocket._ready,
        voted: !!currentPlayerSocket._vote,
        self: isSelf,
        myVote: isSelf ? currentPlayerSocket._vote : null,
        isAsker: currentPlayerSocket._isAsker
      });
    }

    state.players = players;
    currentSocket.emit('roomData', state);
  }
}

function handleJoin(roomCode) {
  refreshData(roomCode);
}

function handleLeave(roomCode) {
  initializeSocketData();
  socket.leave(roomCode);

  var room = io.sockets.adapter.rooms[roomCode];
  var numInRoom = 0;
  var sockets = io.sockets.sockets;
  var IPsCounted = [];
  var askerPresent = false;

  for (var id in sockets) {
    if (sockets[id].rooms[roomCode] && sockets[id]._joinedRoom) {
      var currentSocketIP = connectedIPs[id];
      if (IPsCounted.indexOf(currentSocketIP) === -1 || allowSockPuppets) {
        numInRoom++;
        IPsCounted.push(currentSocketIP);
      }
      if (sockets[id]._isAsker) askerPresent = true;
    }
  }

  if (numInRoom === 0) return;
  if (numInRoom < minPlayers) {
    io.in(roomCode).emit('warning', 'At least ' + minPlayers + ' participants must be present to proceed.');
    resetRoom(roomCode);
  } else {
    if (!askerPresent && room._roomState === 1) selectAsker(roomCode);
  }
  refreshData(roomCode);
}

function handleChat(msg, roomCode) {
  if (!msg) return false;
  var room = io.sockets.adapter.rooms[roomCode];
  if (room._roomState > 0) return false;

  if (msg.length > gameOptions.maxChatMsgLength) msg = msg.slice(0, maxChatMsgLength);
  msg = socket._displayName + ' said: ' + msg;
  io.in(roomCode).emit('newChatMessage', msg);
}

function selectAsker(roomCode) {
  var sockets = io.sockets.sockets;
  var roomSockets = [];
  var roomIPs = [];
  var askerSelected = false;

  for (var id in sockets) {
    if (sockets[id].rooms[roomCode] && sockets[id]._joinedRoom) {
      if (roomIPs.indexOf(connectedIPs[id]) === -1) {
        roomIPs.push(connectedIPs[id]);
      }
      roomSockets.push(sockets[id]);
    }
  }

  if (gameOptions.allowSockPuppets) {
    roomSockets[Math.floor(Math.random() * roomSockets.length)]._isAsker = true;
    askerSelected = true;
  } else {
    var askerIP = roomIPs[Math.floor(Math.random() * roomIPs.length)];
    for (var i = 0; i < roomSockets.length; i++) {
      if (connectedIPs[roomSockets[i].id] === askerIP) {
        roomSockets[i]._isAsker = true;
        askerSelected = true;
      }
    }
  }
  if (askerSelected) {
    refreshData(roomCode);
    io.in(roomCode).emit('askerSelected');
  } else if (!askerSelected && roomExists(roomCode)) {
    selectAsker(roomCode);
  }
}

function resetRoom(roomCode) {
  var room = io.sockets.adapter.rooms[roomCode];
  var sockets = io.sockets.sockets;
  for (var id in sockets) {
    if (sockets[id].rooms[roomCode] && sockets[id]._joinedRoom) {
      sockets[id]._vote = '';
      sockets[id]._isAsker = false;
      sockets[id]._ready = false;
    }
  }
  room._roomState = 0;
  room._question = '';
  room._answer = '';
  room._votes = [];
  room._tiebreakCandidates = [];
}

function onFunctions() {
  socket.on(gameType + '_toggleReady', () => {
    var roomCode = getRoomcode();
    if (!roomCode) return;
    if (!roomExists(roomCode)) return;
    var room = io.sockets.adapter.rooms[roomCode];
    if (room._roomState !== 0) return;

    var readies = 0;
    var total = 0;
    var sockets = io.sockets.sockets;
    var roomSockets = [];
    var roomIPs = [];
    var newReadyState = !socket._ready;

    socket._ready = newReadyState;

    for (var id in sockets) {
      if (sockets[id].rooms[roomCode] && sockets[id]._joinedRoom) {
        var currentSocketIP = connectedIPs[id];
        if (isSockpuppet(sockets[id], socket) && !allowSockPuppets) {
          sockets[id]._ready = newReadyState;
        }
        if (roomIPs.indexOf(currentSocketIP) === -1 || allowSockPuppets) {
          if (sockets[id]._ready) {
            readies++;
          }
          total++;
          roomIPs.push(currentSocketIP);
        }
        roomSockets.push(sockets[id]);
      }
    }

    if (total >= minPlayers && total == readies) {
      selectAsker(roomCode);
      room._votes = [];
      room._answer = '';
      room._question = '';
      room._roomState = 1;
      for (var j = 0; j < roomSockets.length; j++) {
        roomSockets[j]._ready = false;
      }
    }
    refreshData(roomCode);
  });

  socket.on(gameType + '_submitVote', (vote) => {
    var roomCode = getRoomcode();
    if (!roomCode) return;
    if (!roomExists(roomCode)) return;
    var room = io.sockets.adapter.rooms[roomCode];
    if (room._roomState < 2) return;

    if (!vote) {
      socket.emit('warning', 'Please enter a character.');
      return;
    }

    if (!socket._vote) {
      if (vote.length > 1 && vote !== acceptWord) vote = vote[0];
      vote = vote.toUpperCase();
      if (room._roomState === 3) {
        var tiebreakCandidates = room._tiebreakCandidates;
        if (tiebreakCandidates.indexOf(vote) === -1) {
          socket.emit('warn', 'Vote must be for one of the candidates:' + tiebreakCandidates.join(', ') + '.');
          return;
        }
      }

      var votes = [];
      var result = [];
      var sockets = io.sockets.sockets;
      var roomIPs = [];
      var roomSockets = [];
      var voterSockets = [];

      socket._vote = vote;

      for (var id in sockets) {
        if (sockets[id].rooms[roomCode] && sockets[id]._joinedRoom) {
          if (allowSockPuppets) {
            if (voterSockets.length === 0) voterSockets.push(socket);
          } else {
            if (isSockpuppet(sockets[id], socket)) {
              sockets[id]._vote = vote;
              voterSockets.push(sockets[id]);
            }
          }
          roomSockets.push(sockets[id]);
        }
      }

      for (var i = 0; i < roomSockets.length; i++) {
        var currentSocketIP = connectedIPs[roomSockets[i].id];
        if (roomIPs.indexOf(currentSocketIP) === -1 || allowSockPuppets) { 
          roomIPs.push(currentSocketIP);
          if (roomSockets[i]._vote) votes.push(roomSockets[i]._vote);
        }
      }

      var allIn = false;
      if (allowSockPuppets) {
        allIn = votes.length === roomSockets.length;
      } else {
        allIn = votes.length === roomIPs.length;
      }

      if (allIn) {
        for (var j = 0; j < roomSockets.length; j++) {
          roomSockets[j]._vote = '';
        }
        //shuffle votes
        var counter = votes.length;
        while (counter > 0) {
          var index = Math.floor(Math.random() * counter);
          counter--;
          var temp = votes[counter];
          votes[counter] = votes[index];
          votes[index] = temp;
        }
        //select winner
        distribution = {};
        max = 0;
        votes.forEach(function (a) {
          distribution[a] = (distribution[a] || 0) + 1;
          if (distribution[a] > max) {
            max = distribution[a];
            result = [a];
            return;
          }
          if (distribution[a] === max) {
            result.push(a);
          }
        });
        room._votes = votes;
        if (result.length > 1) {
          room._tiebreakCandidates = result;
          room._roomState = 3;
        } else if (result.length === 1 && result[0] !== acceptWord) {
          room._answer += result[0];
          room._roomState = 2;
        } else if (result.length === 1 && result[0] === acceptWord) {
          room._roomState = 0;
        }
      }
      refreshData(roomCode);
      for (var k = 0; k < voterSockets.length; k++) {
        voterSockets[k].emit('voteAccepted', vote);
      }
      if (room._roomState === 0) io.in(roomCode).emit('answerDecided');
      if (room._roomState === 2 && result[0]) io.in(roomCode).emit('letterDecided', result[0]);
      if (room._roomState === 3 && result[0]) io.in(roomCode).emit('drawReached');
    } else refreshData(roomCode);
  });

  socket.on(gameType + '_submitQuestion', (question) => {
    var roomCode = getRoomcode();
    if (!roomCode) return;
    if (!roomExists(roomCode)) return;
    var room = io.sockets.adapter.rooms[roomCode];
    if (room._roomState !== 1) return;
    if (!socket._isAsker) return;

    if (!question) {
      socket.emit('warning', 'Please enter a question.');
      return;
    }

    var sockets = io.sockets.sockets;
    for (var id in sockets) {
      if (sockets[id].rooms[roomCode] && sockets[id]._joinedRoom) {
        sockets[id]._isAsker = false;
      }
    }
    room._question = question;
    room._roomState = 2;
    refreshData(roomCode);
    io.in(roomCode).emit('questionAccepted', question);
  });
}

module.exports = {
  handleJoin,
  handleLeave,
  handleChat
};