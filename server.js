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

io.on('connection', function (socket) {

  connectedIPs[socket.id] = socket.handshake.address;

  const configSettings = require('./app/config/js').configSettings;
  if (configSettings.getLunarPhase) getLunarPhase();

  const minPlayers = configSettings.minPlayers;
  const maxRooms = configSettings.maxRooms;
  const acceptWord = configSettings.acceptWord;
  const maxChatMsgLength = configSettings.maxChatMsgLength;
  const allowSockPuppets = configSettings.allowSockPuppets;

  refreshPublicRooms();
  initializeSocketData();

  socket.on('disconnect', function() {
    delete connectedIPs[socket.id];
    if (socket._joinedRoom) {
      handleLeave(socket._joinedRoom);
    };
  });

  function roomExists(roomCode) {
    return !!io.sockets.adapter.rooms[roomCode];
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

  function refreshPublicRooms() {
    var publicRooms = [];
    var roomlessSockets = [];
    var sockets = io.sockets.sockets;
    var publicRooms = {};
    var roomIPs = {};

    for (var id in sockets) {
      var joinedRoom = sockets[id]._joinedRoom;
      if (joinedRoom) {
        var room = io.sockets.adapter.rooms[joinedRoom];
        if (room) {
          if (room._isPublic) {
            if (!roomIPs[joinedRoom]) roomIPs[joinedRoom] = [];
            if (roomIPs[joinedRoom].indexOf(connectedIPs[id]) === -1 || allowSockPuppets) {
              publicRooms[joinedRoom] = publicRooms[joinedRoom] ? publicRooms[joinedRoom] + 1 : 1;
              roomIPs[joinedRoom].push(connectedIPs[id]);
            }  
          }  
        }
      } else {
        roomlessSockets.push(sockets[id]);
      }
    }

    for (var i = 0; i < roomlessSockets.length; i++) {
      roomlessSockets[i].emit('roomData', {publicRooms: publicRooms});
    }
  }

  function joinRoom(roomCode, success) {
    if (!roomCode) {
      socket.emit('warning', 'Please enter a name.');
      return;
    }
    roomCode = roomCode.toLowerCase();
    roomCode = roomCode.replace(/ /g, '-');
    if (roomExists(roomCode)) {
      var room = io.sockets.adapter.rooms[roomCode];
      room._players.push(socket.id);
      initializeSocketData();
      inheritSocketData(roomCode);
      socket.join(roomCode, ()=> {
        refreshData(roomCode);
        refreshPublicRooms();
        success(roomCode);  
      });
    } else {
      socket.emit('warning', 'No place found with that name.');
    }
  }

  function getRoomcode() {
    for (var code in socket.rooms) {
      if (code != socket.id) return code;
    }
  }

  socket.on('createRoom', (type, isPublic, success) => {
    var generatePublicRoomName = require('./app/config.js').generatePublicRoomName;
    var exists = true;
    var name = {};
    var tried = 0;
    while (exists) {
      name = generatePublicRoomName();
      exists = roomExists(name.name);
      tried++;
      if (tried >= maxRooms) {
        socket.emit('warning', 'No new rooms can be created at this time.');
        return;
      }
    }
    var roomCode = name.name;
    initializeSocketData();
    socket.join(roomCode);
    var room = io.sockets.adapter.rooms[roomCode];
    require('./app/common.js').initializeRoomData('SWF', room);
    joinRoom(roomCode, success);
  });

  socket.on('joinRoom', (roomCode, success) => joinRoom(roomCode, success));

  socket.on('exitRoom', (success) => {
    var roomCode = getRoomcode();
    if (!roomCode) return;
    handleLeave(roomCode);
    success();
  });

  socket.on('toggleReady', () => {
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

  socket.on('submitVote', (vote) => {
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

  socket.on('submitQuestion', (question) => {
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

  socket.on('postChatMessage', (msg, success) => {
    var roomCode = getRoomcode();
    if (!roomCode) return;
    if (!roomExists(roomCode)) return;
    var room = io.sockets.adapter.rooms[roomCode];
    if (room._roomState > 0) return;
    if (!msg) return;

    if (msg.length > maxChatMsgLength) msg = msg.slice(0, maxChatMsgLength);
    msg = socket._displayName + ' said: ' + msg;
    io.in(roomCode).emit('newChatMessage', msg);
    success();
  });

  function initializeSocketData() {
      socket._vote = '';
      socket._isAsker = false;
      socket._ready = false;
      socket._joinedRoom = '';
      var generateDisplayName = require('./app/config/js').generateDisplayName;
      socket._displayName = generateDisplayName();
  }

  function inheritSocketData(roomCode) {
    var preexistingSocket = null;
    var sockets = io.sockets.sockets;
    for (var id in sockets) {
      if (sockets[id].rooms[roomCode] && sockets[id]._joinedRoom === roomCode && isSockpuppet(socket, sockets[id])) {
        preexistingSocket = sockets[id];
      }
    }
    if (preexistingSocket) {
      socket._vote = preexistingSocket._vote;
      socket._isAsker = preexistingSocket._isAsker;
      socket._ready = preexistingSocket._ready;
      socket._displayName = preexistingSocket._displayName;
    }
  }

  function handleLeave(roomCode) {
    initializeSocketData();
    socket.leave(roomCode, () => {
      refreshPublicRooms();
    });

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

    if (allowSockPuppets) {
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
});

serve.listen(process.env.PORT || 8080, () => console.log("Server running on port 8080."));

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});