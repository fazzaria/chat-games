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

const gameTypes = require('./app/config').gameTypes;

io.on('connection', function (socket) {

  function authorize() {
    
  }

  require('./app/games/SWF').startGame(socket, io);

  socket.on('disconnect', function() {
    if (!socket._variables) return;
    if (socket._variables.gameType) {
      var handleLeave = require('./app/games/' + socket._variables.gameType).handleLeave;
      if (handleLeave) handleLeave();
    };
  });

  socket.on('createRoom', function(gameType, options) {
    require('./app/common').createRoom(gameType, options, socket);
  });

  socket.on('joinRoom', function(gameType, roomCode) {
    if (!gameTypes || !roomCode) return;
    //maybe send a force reload
    require('./app/common').joinRoom(gameType, roomCode, socket);
  });

  socket.on('exitRoom', function() {
    if (!socket._variables || !socket._variables.gameType) return;
    //maybe send a force reload
    require('./app/common').exitRoom(socket);
  });

  socket.on('postChatMessage', (msg) => {
    if (!socket._variables || !socket._variables.gameType || !socket._variables.roomCode) return;
    //maybe send a force reload
    require('./app/common').postChatMessage(msg, socket);
  });
});

module.exports = { io };

serve.listen(process.env.PORT || 8080, () => console.log("Server running on port 8080."));

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});