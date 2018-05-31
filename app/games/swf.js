var http = require('http');

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

module.exports = {
  getLunarPhase
};