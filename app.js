// --------------------------------
// UI refs
// --------------------------------
const colorPicker = document.getElementById("colorPicker");
const cat = document.getElementById("catCursor");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const tools = document.querySelectorAll(".tool[data-tool]");

let tool = "box";
tools.forEach(btn => {
  btn.onclick = () => {
    const next = btn.dataset.tool;
    if (!next) return;
    tools.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    tool = next;
  };
});

// --------------------------------
// Fake cursor
// --------------------------------
if (cat) {
  cat.style.position = "fixed";
  cat.style.pointerEvents = "none";
  cat.style.zIndex = "9999";
  window.addEventListener("pointermove", e => {
    cat.style.left = e.clientX + "px";
    cat.style.top  = e.clientY + "px";
  });
}

// --------------------------------
// Canvas sizing (retina-safe)
// --------------------------------
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.floor(window.innerWidth * dpr);
  const h = Math.floor(window.innerHeight * dpr);
  canvas.width = w;
  canvas.height = h;
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels
  redraw();
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// --------------------------------
// Data model
// --------------------------------
const boxes = [];
let hoveredBoxId = null;

let drawingBox = false;
let boxStart = null;
let tempBox = null;

let drawingStroke = false;
let currentStroke = null;
let currentBoxId = null;

let erasing = false;
const ERASER_R = 10;

// --------------------------------
// Helpers
// --------------------------------
function pos(e) {
  // because ctx is in CSS pixels (we setTransform to dpr),
  // we can just use clientX/clientY directly.
  return { x: e.clientX, y: e.clientY };
}

function insideBox(p, b) {
  return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
}

function findBoxAt(p) {
  // topmost first (last drawn is visually "on top")
  for (let i = boxes.length - 1; i >= 0; i--) {
    if (insideBox(p, boxes[i])) return boxes[i];
  }
  return null;
}

function nowStamp() {
  return new Date().toLocaleString();
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

let animating = false;
function requestAnim() {
  if (animating) return;
  animating = true;
  requestAnimationFrame(tick);
}

function tick() {
  let needsMore = false;

  // animate cover alpha toward target
  for (const b of boxes) {
    if (Math.abs(b.coverAlpha - b.coverTarget) > 0.01) {
      b.coverAlpha = lerp(b.coverAlpha, b.coverTarget, 0.22);
      needsMore = true;
    } else {
      b.coverAlpha = b.coverTarget;
    }
  }

  redraw();

  if (needsMore) {
    requestAnimationFrame(tick);
  } else {
    animating = false;
  }
}

// --------------------------------
// Rendering
// --------------------------------
function redraw() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  for (const b of boxes) {
    // outline
    ctx.save();
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.restore();

    // contents (strokes + text) live "inside"
    // we clip to the box like your SVG clipPath
    ctx.save();
    ctx.beginPath();
    ctx.rect(b.x, b.y, b.w, b.h);
    ctx.clip();

    // draw strokes
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const s of b.strokes) {
      if (s.points.length < 2) continue;
      ctx.save();
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i].x, s.points[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // text
    if (b.text) {
      ctx.save();
      ctx.fillStyle = "#000";
      ctx.font = "14px sans-serif";
      const lines = b.text.split("\n");
      let ty = b.y + 18;
      for (const line of lines) {
        ctx.fillText(line, b.x + 6, ty);
        ty += 16;
      }
      ctx.restore();
    }

    ctx.restore(); // end clip

    // cover (this sits ABOVE contents, like your .box-cover rect)
    if (b.locked && b.coverAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = b.coverAlpha;
      ctx.fillStyle = b.fillColor || "#000";
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.restore();
    }
  }

  // temp box preview
  if (tempBox) {
    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = "#000";
    ctx.strokeRect(tempBox.x, tempBox.y, tempBox.w, tempBox.h);
    ctx.restore();
  }
}

// --------------------------------
// Hover -> reveal logic
// --------------------------------
function updateHover(p) {
  const hit = findBoxAt(p);
  const nextId = hit ? hit.id : null;
  if (nextId === hoveredBoxId) return;

  hoveredBoxId = nextId;

  // set cover targets based on hover state
  for (const b of boxes) {
    if (!b.locked) continue;
    b.coverTarget = (b.id === hoveredBoxId) ? 0 : 1;
  }

  requestAnim();
}

// --------------------------------
// Pointer events
// --------------------------------
canvas.addEventListener("pointerdown", e => {
  canvas.setPointerCapture(e.pointerId);
  const p = pos(e);

  // always update hover on interaction
  updateHover(p);

  if (tool === "box") {
    drawingBox = true;
    boxStart = p;
    tempBox = { x: p.x, y: p.y, w: 0, h: 0 };
    redraw();
    return;
  }

  if (tool === "draw") {
    const b = findBoxAt(p);
    if (!b || b.locked) return;
    drawingStroke = true;
    currentBoxId = b.id;
    currentStroke = { color: "#000", width: 2, points: [p] };
    b.strokes.push(currentStroke);
    redraw();
    return;
  }

  if (tool === "erase") {
    erasing = true;
    eraseAt(p);
    return;
  }
});

canvas.addEventListener("pointermove", e => {
  const p = pos(e);

  updateHover(p);

  if (drawingBox && boxStart && tempBox) {
    const x = Math.min(boxStart.x, p.x);
    const y = Math.min(boxStart.y, p.y);
    const w = Math.abs(boxStart.x - p.x);
    const h = Math.abs(boxStart.y - p.y);
    tempBox = { x, y, w, h };
    redraw();
    return;
  }

  if (drawingStroke && currentStroke) {
    currentStroke.points.push(p);
    redraw();
    return;
  }

  if (erasing) {
    eraseAt(p);
    return;
  }
});

canvas.addEventListener("pointerup", e => {
  const p = pos(e);
  updateHover(p);

  if (drawingStroke) {
    drawingStroke = false;
    currentStroke = null;
    currentBoxId = null;
    return;
  }

  if (erasing) {
    erasing = false;
    return;
  }

  if (!drawingBox) return;
  drawingBox = false;

  if (!tempBox || tempBox.w < 12 || tempBox.h < 12) {
    tempBox = null;
    redraw();
    return;
  }

  const t = prompt("Add text:");
  const txt = t ? `${t}\n${nowStamp()}` : "";

  const newBox = {
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
    x: tempBox.x,
    y: tempBox.y,
    w: tempBox.w,
    h: tempBox.h,
    strokes: [],
    text: txt,
    locked: false,
    fillColor: colorPicker?.value || "#000000",
    coverAlpha: 0,
    coverTarget: 0
  };

  boxes.push(newBox);
  tempBox = null;
  redraw();
});

// --------------------------------
// Double click: lock / fill
// --------------------------------
canvas.addEventListener("dblclick", e => {
  const p = pos(e);
  const b = findBoxAt(p);
  if (!b) return;

  b.locked = !b.locked;

  // when locking, capture current picker color
  if (b.locked) {
    b.fillColor = colorPicker?.value || b.fillColor || "#000";
    // not hovered => cover on, hovered => cover off
    b.coverTarget = (b.id === hoveredBoxId) ? 0 : 1;
  } else {
    b.coverTarget = 0;
  }

  requestAnim();
});

// --------------------------------
// Eraser: removes points within radius (only in unlocked boxes)
// --------------------------------
function eraseAt(p) {
  let changed = false;

  for (const b of boxes) {
    if (b.locked) continue;
    if (!insideBox(p, b)) continue;

    for (let si = b.strokes.length - 1; si >= 0; si--) {
      const s = b.strokes[si];
      // filter out points near eraser
      const before = s.points.length;
      s.points = s.points.filter(pt => {
        const dx = pt.x - p.x;
        const dy = pt.y - p.y;
        return (dx*dx + dy*dy) > (ERASER_R*ERASER_R);
      });

      if (s.points.length !== before) changed = true;
      if (s.points.length < 2) {
        b.strokes.splice(si, 1);
        changed = true;
      }
    }
  }

  if (changed) redraw();
}
