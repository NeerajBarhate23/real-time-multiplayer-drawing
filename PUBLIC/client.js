// DOM elements
const lobbyScreen = document.getElementById('lobbyScreen');
const gameContainer = document.getElementById('gameContainer');
const playerList = document.getElementById('playerList');
const wordDisplay = document.getElementById('wordDisplay');
const timerDisplay = document.getElementById('timerDisplay');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const board = document.getElementById('board');
const ctx = board.getContext('2d');

// Game state
let currentRoom = null;
let isDrawing = false;
let isCurrentPlayer = false;
let username = '';
let lastX = 0;
let lastY = 0;
let drawingHistory = [];
let historyIndex = -1;

// Initialize canvas
function initCanvas() {
  board.width = 800;
  board.height = 600;
  
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, board.width, board.height);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

// Drawing functions
function startDrawing(e) {
  if (!isCurrentPlayer) return;
  
  isDrawing = true;
  [lastX, lastY] = getMousePos(e);
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  
  // Save drawing state
  saveDrawingState();
}

function draw(e) {
  if (!isDrawing || !isCurrentPlayer) return;
  
  const [x, y] = getMousePos(e);
  
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
  
  // Send drawing data to server
  socket.emit('drawing', {
    room: currentRoom,
    x,
    y,
    color: document.getElementById('brushColor').value,
    size: document.getElementById('brushSize').value,
    isDrawing: true
  });
  
  lastX = x;
  lastY = y;
}

function stopDrawing() {
  if (!isDrawing) return;
  
  isDrawing = false;
  ctx.beginPath();
  
  // Send end of drawing
  socket.emit('drawing', {
    room: currentRoom,
    isDrawing: false
  });
}

function getMousePos(e) {
  const rect = board.getBoundingClientRect();
  return [
    e.clientX - rect.left,
    e.clientY - rect.top
  ];
}

// Drawing tools
document.getElementById('clearBtn').addEventListener('click', () => {
  if (!isCurrentPlayer) return;
  
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, board.width, board.height);
  saveDrawingState();
  
  socket.emit('drawing', {
    room: currentRoom,
    clear: true
  });
});

document.getElementById('undoBtn').addEventListener('click', undoLastAction);

function saveDrawingState() {
  // Remove any future states if we're in the middle of undo/redo
  if (historyIndex < drawingHistory.length - 1) {
    drawingHistory = drawingHistory.slice(0, historyIndex + 1);
  }
  
  // Save current canvas state
  drawingHistory.push(board.toDataURL());
  historyIndex++;
}

function undoLastAction() {
  if (!isCurrentPlayer || historyIndex <= 0) return;
  
  historyIndex--;
  restoreCanvas();
  
  socket.emit('drawing', {
    room: currentRoom,
    undo: true
  });
}

function restoreCanvas() {
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, board.width, board.height);
    ctx.drawImage(img, 0, 0);
  };
  img.src = drawingHistory[historyIndex];
}

// Socket.io connection
const socket = io();

// Socket event handlers
socket.on('drawing', data => {
  if (data.clear) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, board.width, board.height);
    return;
  }
  
  if (data.undo) {
    // In a real implementation, you'd need to sync undo states
    return;
  }
  
  if (data.isDrawing === false) {
    ctx.beginPath();
    return;
  }
  
  ctx.strokeStyle = data.color;
  ctx.lineWidth = data.size;
  ctx.lineTo(data.x, data.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(data.x, data.y);
});

socket.on('playerList', players => {
  playerList.innerHTML = players.map(player => 
    `<div class="player ${player.isDrawing ? 'drawing' : ''}">
      ${player.name} ${player.score ? `(${player.score})` : ''}
    </div>`
  ).join('');
});

socket.on('wordToDraw', word => {
  isCurrentPlayer = true;
  wordDisplay.textContent = `Draw: ${word}`;
  wordDisplay.style.color = '#4CAF50';
});

socket.on('timerUpdate', time => {
  timerDisplay.textContent = time;
});

socket.on('message', message => {
  const messageElement = document.createElement('div');
  messageElement.textContent = message;
  chatMessages.appendChild(messageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

// UI Event listeners
document.getElementById('joinBtn').addEventListener('click', joinRoom);
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('sendBtn').addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

function joinRoom() {
  username = document.getElementById('usernameInput').value.trim();
  const room = document.getElementById('roomInput').value.trim() || 'default';
  
  if (username && username.length <= 12) {
    socket.emit('joinRoom', { username, room });
    currentRoom = room;
    
    lobbyScreen.style.display = 'none';
    gameContainer.style.display = 'grid';
    initCanvas();
  } else {
    alert('Please enter a username (max 12 characters)');
  }
}

function startGame() {
  if (currentRoom) {
    socket.emit('startGame', currentRoom);
  }
}

function sendMessage() {
  const message = chatInput.value.trim();
  if (message && currentRoom) {
    socket.emit('chatMessage', {
      room: currentRoom,
      message
    });
    chatInput.value = '';
  }
}

// Canvas event listeners
board.addEventListener('mousedown', startDrawing);
board.addEventListener('mousemove', draw);
board.addEventListener('mouseup', stopDrawing);
board.addEventListener('mouseout', stopDrawing);

// Touch support
board.addEventListener('touchstart', e => {
  e.preventDefault();
  const touch = e.touches[0];
  const mouseEvent = new MouseEvent('mousedown', {
    clientX: touch.clientX,
    clientY: touch.clientY
  });
  board.dispatchEvent(mouseEvent);
});

board.addEventListener('touchmove', e => {
  e.preventDefault();
  const touch = e.touches[0];
  const mouseEvent = new MouseEvent('mousemove', {
    clientX: touch.clientX,
    clientY: touch.clientY
  });
  board.dispatchEvent(mouseEvent);
});

board.addEventListener('touchend', e => {
  e.preventDefault();
  const mouseEvent = new MouseEvent('mouseup', {});
  board.dispatchEvent(mouseEvent);
});

// Initialize
initCanvas();