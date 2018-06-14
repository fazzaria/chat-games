var express = require('express');
var bodyParser = require('body-parser');
var socketServer = require('socket.io');
var path = require('path');
var http = require('http');

const app = express();
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(express.static(path.join(__dirname, 'build')));

const serve = http.createServer(app);
const io = socketServer(serve);

io.on('connection', function (socket) {

  socket.on('disconnect', function() {
    if (socket._variables && socket._variables.inGame) {
      require('./app/games/' + socket._variables.inGame).handleLeave();
    };
  });

  socket.on('gameHome', function(gameType) {
    require('./app/common').gameHome(gameType, socket);
  });

  socket.on('createRoom', function(gameType, options) {
    require('./app/common').createRoom(gameType, options, socket);
  });

  socket.on('joinRoom', function(gameType, roomCode) {
    if (!gameType || !roomCode) return;
    //maybe send a force reload
    require('./app/common').joinRoom(gameType, roomCode, socket);
  });

  socket.on('exitRoom', function() {
    if (!socket._variables || !socket._variables.inGame) return;
    //maybe send a force reload
    require('./app/common').exitRoom(socket);
  });
});

module.exports = { io };

serve.listen(process.env.PORT || 8080, () => console.log("Server running on port 8080."));

app.get('/', function (req, res) {
  console.log(req.session.id);
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});