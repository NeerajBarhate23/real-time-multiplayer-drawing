const express = require('express');
const socketio = require('socket.io');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Route all requests to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Game state
const rooms = {};
const MAX_PLAYERS = 10;

// Word list
const words = [
  'apple', 'banana', 'car', 'dog', 'elephant',
  'flower', 'guitar', 'house', 'ice cream', 'jungle',
  'kite', 'lion', 'mountain', 'notebook', 'ocean',
  'pizza', 'queen', 'rainbow', 'sun', 'tree'
];

io.on('connection', socket => {
  console.log('New connection:', socket.id);

  socket.on('joinRoom', ({ username, room }) => {
    // Create room if it doesn't exist
    if (!rooms[room]) {
      rooms[room] = {
        players: [],
        game: null
      };
    }

    // Add player to room
    rooms[room].players.push({
      id: socket.id,
      name: username,
      score: 0
    });

    socket.join(room);
    socket.emit('message', `Joined room ${room}`);
    io.to(room).emit('playerList', rooms[room].players);

    // Notify room
    socket.to(room).emit('message', `${username} has joined the room`);
  });

  socket.on('startGame', room => {
    if (rooms[room] && rooms[room].players.length > 1) {
      startGame(room);
    }
  });

  socket.on('drawing', data => {
    socket.to(data.room).emit('drawing', data);
  });

  socket.on('chatMessage', ({ room, message }) => {
    const player = rooms[room]?.players.find(p => p.id === socket.id);
    if (player) {
      io.to(room).emit('message', `${player.name}: ${message}`);
    }
  });

  socket.on('disconnect', () => {
    // Find and remove player from all rooms
    Object.keys(rooms).forEach(room => {
      rooms[room].players = rooms[room].players.filter(p => p.id !== socket.id);
      if (rooms[room].players.length === 0) {
        delete rooms[room];
      } else {
        io.to(room).emit('playerList', rooms[room].players);
      }
    });
  });
});

function startGame(room) {
  if (!rooms[room]) return;
  
  const players = rooms[room].players;
  const drawerIndex = Math.floor(Math.random() * players.length);
  const word = words[Math.floor(Math.random() * words.length)];
  
  rooms[room].game = {
    word,
    drawer: players[drawerIndex].id,
    timer: 60,
    interval: setInterval(() => {
      rooms[room].game.timer--;
      io.to(room).emit('timerUpdate', rooms[room].game.timer);
      
      if (rooms[room].game.timer <= 0) {
        clearInterval(rooms[room].game.interval);
        endRound(room);
      }
    }, 1000)
  };
  
  // Update player list with drawer info
  const updatedPlayers = players.map(p => ({
    ...p,
    isDrawing: p.id === players[drawerIndex].id
  }));
  
  io.to(room).emit('playerList', updatedPlayers);
  io.to(players[drawerIndex].id).emit('wordToDraw', word);
  io.to(room).emit('message', 'A new round has started!');
}

function endRound(room) {
  if (!rooms[room]?.game) return;
  
  clearInterval(rooms[room].game.interval);
  io.to(room).emit('message', `Round over! The word was: ${rooms[room].game.word}`);
  rooms[room].game = null;
  
  // Start new round after delay
  setTimeout(() => {
    if (rooms[room]?.players.length > 1) {
      startGame(room);
    }
  }, 5000);
}

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));