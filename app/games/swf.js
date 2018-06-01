var http = require('http');
const io = require('../../server').io;
const gameType = require('../config.js').gameTypes.SWF;
const gameOptions = require('../config.js').gameOptions[gameType];

const getPlayerSockets = require('../common.js').getPlayerSockets;
const getRoomSockets = require('../common.js').getRoomSockets;
const isSockpuppet = require('../common.js').isSockpuppet;

module.exports.main = function(io) {
  io.sockets.on('connection', function(socket) {
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
      var roomSockets = getRoomSockets();
      var playerSockets = gameOptions.allowSockPuppets ? roomSockets : getPlayerSockets();

      var state = {
        roomCode: roomCode,
        question: room._variables.question,
        answer: room._variables.answer,
        roomState: room._variables.roomState,
        votes: room._variables.votes,
        preposition: room._variables.preposition,
        tiebreakCandidates: room._variables.tiebreakCandidates
      };

      for (var i = 0; i < roomSockets.length; i++) {
        var players = [];
        currentRoomSocket = roomSockets[i];

        for (var j = 0; j < playerSockets.length; j++) {
          var currentPlayerSocket = playerSockets[j];
          var isSelf = currentRoomSocket.id === currentPlayerSocket.id;
          if (!gameOptions.allowSockPuppets) isSelf = isSockpuppet(currentRoomSocket, currentPlayerSocket);
          players.push({
            ready: currentPlayerSocket._variables.ready,
            voted: !!currentPlayerSocket._variables.vote,
            self: isSelf,
            myVote: isSelf ? currentPlayerSocket._variables.vote : null,
            isAsker: currentPlayerSocket._variables.isAsker
          });
        }

        state.players = players;
        currentRoomSocket.emit('roomData', state);
      }
    }

    function selectAsker(roomCode) {
      var sockets = io.sockets.sockets;
      var playerSockets = gameOptions.allowSockPuppets ? getRoomSockets() : getPlayerSockets();
      var askerSelected = false;

      playerSockets[Math.floor(Math.random() * playerSockets.length)]._variables.isAsker = true;
      refreshData(roomCode);
      io.in(roomCode).emit('askerSelected');
    }

    function resetRoom(roomCode) {
      var roomSockets = getRoomSockets();
      for (var i = 0; i < roomSockets.length; i++) {
        roomSockets[i]._variables.vote = '';
        roomSockets[i]._variables.isAsker = false;
        roomSockets[i]._variables.ready = false;
      }
      room._variables.roomState = 0;
      room._variables.question = '';
      room._variables.answer = '';
      room._variables.votes = [];
      room._variables.tiebreakCandidates = [];
    }

    function validateOnFunction() {
      var roomCode = getRoomcode();
      if (!roomCode) return false;
      if (!roomExists(roomCode)) return false;
      var room = io.sockets.adapter.rooms[roomCode];
      if (room._variables.players.indexOf(socket.id) === -1) return false;
      return true;
    }

    function onFunctions() {
      socket.on(gameType + '_toggleReady', () => {
        if (!validateOnFunction()) return;
        var room = io.sockets.adapter.rooms[roomCode];
        if (room._variables.roomState !== 0) return;

        var readies = 0;
        var sockets = io.sockets.sockets;
        var roomSockets = getRoomSockets();
        var playerSockets = gameOptions.allowSockPuppets ? getRoomSockets() : getPlayerSockets();

        var newReadyState = !socket._variables.ready;
        socket._variables.ready = newReadyState;

        for (var i = 0; i < roomSockets.length; i++) {
          if (!gameOptions.allowSockPuppets && isSockpuppet(roomSockets[i], socket)) {
            roomSockets[i]._variables.ready = newReadyState;
          }
        }

        for (var j = 0; j < playerSockets.length; j++) {
          if (playerSockets[j]._variables.ready) readies++;
        }

        if (playerSockets.length >= gameOptions.minPlayers && playerSockets.length === readies) {
          selectAsker(roomCode);
          room._variables.votes = [];
          room._variables.answer = '';
          room._variables.question = '';
          room._variables.roomState = 1;
          for (var k = 0; k < roomSockets.length; k++) {
            roomSockets[k]._ready = false;
          }
        }
        refreshData(roomCode);
      });

      socket.on(gameType + '_submitVote', (vote) => {
        if (!validateOnFunction()) return;
        var room = io.sockets.adapter.rooms[roomCode];
        if (room._variables.roomState < 2) return;

        var warnMessage = '';

        if (!vote) warnMessage = 'Please enter a character.';
        if (!!socket._variables.vote) warnMessage ='You have already voted.';
        if (vote.length > 1 && vote !== gameOptions.acceptWord) vote = vote[0];
        vote = vote.toUpperCase();
        if (room._variables.roomState === 3 && room._variables.tiebreakCandidates.indexOf(vote) === -1) warnMessage = 'Vote must be for one of the candidates:' + tiebreakCandidates.join(', ') + '.';

        if (warnMessage) {
          socket.emit('warning', warnMessage);
          return;
        }

        var roomSockets = getRoomSockets();
        var playerSockets = gameOptions.allowSockPuppets ? getRoomSockets() : getPlayerSockets();
        var voterSockets = [];

        socket._variables.vote = vote;

        voterSockets.push(socket);

        if (!gameOptions.allowSockPuppets) {
          for (var i = 0; i < roomSockets.length; i++) {
            if (isSockpuppet(roomSockets[i], socket)) {
              roomSockets[i]._variables.vote = vote;
              voterSockets.push(roomSockets[i]);
            }
          }
        }

        var votes = [];
        for (var j = 0; j < playerSockets.length; j++) {
          votes.push(playerSockets[j]._variables.vote);
        }

        var result = [];

        socket._variables.vote = vote;

        var allIn = gameOptions.allowSockPuppets ? votes.length === roomSockets.length : votes.length === playerSockets.length;

        if (allIn) {
          for (var j = 0; j < roomSockets.length; j++) {
            roomSockets[j]._variables.vote = '';
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

          room._variables.votes = votes;
          if (result.length > 1) {
            room._variables.tiebreakCandidates = result;
            room._variables.roomState = 3;
          } else if (result.length === 1 && result[0] !== gameOptions.acceptWord) {
            room._variables.answer += result[0];
            room._variables.roomState = 2;
          } else if (result.length === 1 && result[0] === gameOptions.acceptWord) {
            room._variables.roomState = 0;
          }
        }

        refreshData(roomCode);
        for (var k = 0; k < voterSockets.length; k++) {
          voterSockets[k].emit('voteAccepted', vote);
        }

        if (room._variables.roomState === 0) io.in(roomCode).emit('answerDecided');
        if (room._variables.roomState === 2 && result[0]) io.in(roomCode).emit('letterDecided', result[0]);
        if (room._variables.roomState === 3 && result[0]) io.in(roomCode).emit('drawReached');
      });

      socket.on(gameType + '_submitQuestion', (question) => {
        if (!validateOnFunction()) return;

        var room = io.sockets.adapter.rooms[roomCode];
        var warnMessage = '';
        if (!question) warnMessage = 'Please enter a question.';
        if (!socket._variables.isAsker) warnMessage = 'You haven\'t been selected to ask the question.';
        if (room._variables.roomState !== 1) warnMessage = 'It isn\'t the time to ask the question.';

        if (warnMessage) {
          socket.emit('warning', warnMessage);
        }

        var roomSockets = getRoomSockets();

        for (var i = 0; i < roomSockets.length; i++) {
          roomSockets[i]._variables.isAsker = false;
        }

        room._variables.question = question;
        room._variables.roomState = 2;
        refreshData(roomCode);
        io.in(roomCode).emit('questionAccepted', question);
      });
    }
  });
}

function handleJoin(roomCode) {
  refreshData(roomCode);
}

function handleLeave(roomCode) {
  socket.leave(roomCode);
  if (!roomExists(roomCode)) return;

  var room = io.sockets.adapter.rooms[roomCode];
  var numInRoom = 0;
  var askerPresent = false;
  var playerSockets = gameOptions.allowSockPuppets ? getRoomSockets() : getPlayerSockets();

  for (var i = 0; i < playerSockets.length; i++) {
    if (playerSockets[i]._variables.isAsker) askerPresent = true;
  }

  if (playerSockets.length === 0) return;
  if (playerSockets.length < gameOptions.minPlayers) {
    io.in(roomCode).emit('warning', 'At least ' + gameOptions.minPlayers + ' participants must be present to proceed.');
    resetRoom(roomCode);
  } else {
    if (!askerPresent && room._variables.roomState === 1) selectAsker(roomCode);
  }
  refreshData(roomCode);
}

function handleChat(msg, roomCode) {
  if (!validateOnFunction()) return;
  var room = io.sockets.adapter.rooms[roomCode];
  if (room._variables.roomState > 0) return false;

  if (msg.length > gameOptions.maxChatMsgLength) msg = msg.slice(0, maxChatMsgLength);
  msg = socket._variables.displayName + ': ' + msg;
  io.in(roomCode).emit('newChatMessage', msg);
}

module.exports = {
  handleJoin,
  handleLeave,
  handleChat
};
