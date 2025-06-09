const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight - 80;

let painting = false;
let erasing = false;
let brushSize = 5;
let brushColor = "#0f0"; // default retro green
let history = [];

// === Draw Grid on Canvas ===
function drawGrid() {
  const spacing = 20;
  ctx.strokeStyle = "#0f0"; // retro green lines
  ctx.lineWidth = 0.3;

  for (let x = 0; x < canvas.width; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  for (let y = 0; y < canvas.height; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

// === Call Grid at Start ===
drawGrid();

function startPosition(e) {
  painting = true;
  ctx.beginPath();
  history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  draw(e);
}

function endPosition() {
  painting = false;
  ctx.beginPath();
}

function draw(e) {
  if (!painting) return;

  ctx.lineWidth = brushSize;
  ctx.lineCap = "square";
  ctx.strokeStyle = erasing ? "#000000" : brushColor;


  const x = e.clientX;
  const y = e.clientY - 80;

  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
}

// === Event Listeners ===
canvas.addEventListener("mousedown", startPosition);
canvas.addEventListener("mouseup", endPosition);
canvas.addEventListener("mousemove", draw);

// === Brush Size ===
document.getElementById("brushSize").addEventListener("input", (e) => {
  brushSize = e.target.value;
});

// === Color Picker ===
document.getElementById("brushColor").addEventListener("input", (e) => {
  brushColor = e.target.value;
});

// === Eraser Toggle ===
const eraserBtn = document.getElementById("eraserBtn");
eraserBtn.addEventListener("click", () => {
  erasing = !erasing;
  eraserBtn.innerText = erasing ? "DRAW" : "ERASER";
});

// === Undo Feature ===
document.getElementById("undoBtn").addEventListener("click", () => {
  if (history.length > 0) {
    const prevState = history.pop();
    ctx.putImageData(prevState, 0, 0);
    drawGrid(); // redraw grid
  }
});

// === Clear Canvas ===
document.getElementById("clearBtn").addEventListener("click", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
});

// === Download as PNG ===
document.getElementById("downloadBtn").addEventListener("click", () => {
  const dataURL = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = dataURL;
  link.download = "scribble-retro.png";
  link.click();
});


function drawGrid() {
  const spacing = 20;
  ctx.save(); // Save current styles
  ctx.strokeStyle = "#0f0";
  ctx.lineWidth = 0.3;

  for (let x = 0; x < canvas.width; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  for (let y = 0; y < canvas.height; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  ctx.restore(); // Restore previous styles
}
drawGrid();
