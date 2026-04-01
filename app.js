const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const toolButtons = document.querySelectorAll(".tool[data-tool]");
const colorInput = document.getElementById("color");
const sizeInput = document.getElementById("size");
const clearBtn = document.getElementById("clear");

let tool = "box";
let drawing = false;

let start = null;            // for box drag
let last = null;             // for pen/eraser
let strokeColor = colorInput.value;
let strokeSize = parseInt(sizeInput.value, 10);

// keep a lightweight “preview” for box while dragging
let snapshot = null;

function resizeCanvas(){
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels
}
resizeCanvas();
window.addEventListener("resize", () => {
  // NOTE: resizing clears canvas; for now that’s fine in v1 tools-first
  resizeCanvas();
});

function setActive(btn){
  toolButtons.forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
}

toolButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    tool = btn.dataset.tool;
    setActive(btn);
    canvas.style.cursor = (tool === "box") ? "crosshair"
                      : (tool === "pen") ? "crosshair"
                      : "cell";
  });
});

colorInput.addEventListener("input", () => {
  strokeColor = colorInput.value;
});

sizeInput.addEventListener("input", () => {
  strokeSize = parseInt(sizeInput.value, 10);
});

clearBtn.addEventListener("click", () => {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
});

function pos(e){
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function takeSnapshot(){
  snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
}
function restoreSnapshot(){
  if (!snapshot) return;
  ctx.putImageData(snapshot, 0, 0);
}

function drawLine(a, b, color, size){
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.restore();
}

function eraseAt(p, size){
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(p.x, p.y, Math.max(6, size * 2.2), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function normRect(a, b){
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const w = Math.abs(a.x - b.x);
  const h = Math.abs(a.y - b.y);
  return { x, y, w, h };
}

function fillRect(r, fill){
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, 10);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// pointer events (works for mouse + touch)
canvas.addEventListener("pointerdown", (e) => {
  drawing = true;
  canvas.setPointerCapture(e.pointerId);

  const p = pos(e);
  start = p;
  last = p;

  if (tool === "box"){
    takeSnapshot(); // so we can preview while dragging
  } else if (tool === "pen"){
    // start a dot
    drawLine(p, {x:p.x+0.01, y:p.y+0.01}, strokeColor, strokeSize);
  } else if (tool === "erase"){
    eraseAt(p, strokeSize);
  }
});

canvas.addEventListener("pointermove", (e) => {
  if (!drawing) return;
  const p = pos(e);

  if (tool === "pen"){
    drawLine(last, p, strokeColor, strokeSize);
  }

  if (tool === "erase"){
    eraseAt(p, strokeSize);
  }

  if (tool === "box"){
    restoreSnapshot();
    const r = normRect(start, p);
    // preview: fill at current color
    fillRect(r, strokeColor);
  }

  last = p;
});

canvas.addEventListener("pointerup", (e) => {
  drawing = false;
  start = null;
  last = null;
  snapshot = null;
});
