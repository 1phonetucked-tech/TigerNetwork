// ============================================================
// TIGERNETWORK — Canvas Boxes + Draw + Erase + Lock + Hover Reveal
// ============================================================

// --------------------------------
// UI refs
// --------------------------------
const colorPicker = document.getElementById("colorPicker");
const cat = document.getElementById("catCursor");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", { alpha: true });
const tools = document.querySelectorAll(".tool[data-tool]");

// --------------------------------
// Data model 
// --------------------------------
const boxes = [];
let hoveredBoxId = null;

let tool = "box";

let drawingBox = false;
let boxStart = null;
let tempBox = null;

let drawingStroke = false;
let currentStroke = null;
let currentBoxId = null;

let erasing = false;
const ERASER_R = 10;

// --------------------------------
// DEMO multi-user simulation (max 4 users, no backend)
// --------------------------------
const GLOBAL_COUNTER_KEY = "tigernetwork_demo_user_counter";
const SESSION_USER_KEY = "tigernetwork_demo_session_user";

function getDemoUserNumber() {
  // Keep the same user for this tab
  let sessionUser = sessionStorage.getItem(SESSION_USER_KEY);
  if (sessionUser) return sessionUser;

  // Increment global counter
  let global = parseInt(localStorage.getItem(GLOBAL_COUNTER_KEY) || "0", 10);
  global += 1;
  localStorage.setItem(GLOBAL_COUNTER_KEY, global);

  // Limit to 4 demo users
  const userNumber = ((global - 1) % 4) + 1;

  sessionStorage.setItem(SESSION_USER_KEY, userNumber);
  return userNumber;
}

const USER_TAG = `@${getDemoUserNumber()}`;
console.log("Demo user:", USER_TAG);


// --------------------------------
// Tool switching
// --------------------------------
tools.forEach((btn) => {
  btn.onclick = () => {
    const next = btn.dataset.tool;
    if (!next) return;
    tools.forEach((b) => b.classList.remove("active"));
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

  window.addEventListener("pointermove", (e) => {
    cat.style.left = e.clientX + "px";
    cat.style.top = e.clientY + "px";
  });
}

// --------------------------------
// Helpers
// --------------------------------
function pos(e) {
  // draw in CSS pixels (see setTransform in resizeCanvas),
  // so clientX/clientY map directly.
  return { x: e.clientX, y: e.clientY };
}

function insideBox(p, b) {
  return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
}

function findBoxAt(p) {
  // Top-most first (last drawn is on top)
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

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let ty = y;

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + " ";
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && line !== "") {
      ctx.fillText(line, x, ty);
      line = words[i] + " ";
      ty += lineHeight;
    } else {
      line = testLine;
    }
  }

  if (line) {
    ctx.fillText(line, x, ty);
    ty += lineHeight;
  }

  return ty;
}

// --------------------------------
// Animation loop (for hover reveal fade)
// --------------------------------
let animating = false;

function requestAnim() {
  if (animating) return;
  animating = true;
  requestAnimationFrame(tick);
}

function tick() {
  let needsMore = false;

  for (const b of boxes) {
    if (Math.abs(b.coverAlpha - b.coverTarget) > 0.01) {
      b.coverAlpha = lerp(b.coverAlpha, b.coverTarget, 0.35);
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
    // Outline (always hollow)
    ctx.save();
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.restore();

    // Clip contents to inside box
    ctx.save();
    ctx.beginPath();
    ctx.rect(b.x, b.y, b.w, b.h);
    ctx.clip();

    // Draw strokes
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const s of b.strokes) {
      if (!s.points || s.points.length < 2) continue;

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

// text (wrapped inside box)
if (b.text) {
  ctx.save();

  const padding = 8;
  const maxWidth = b.w - padding * 2;
  let ty = b.y + 20;

  const lines = b.text.split("\n");

  for (const line of lines) {
    if (line.startsWith("@")) {
      ctx.font = "12px sans-serif";
      ctx.fillStyle = "#777";
      ty = wrapText(ctx, line, b.x + padding, ty, maxWidth, 14);
    } else {
      ctx.font = "14px sans-serif";
      ctx.fillStyle = "#000";
      ty = wrapText(ctx, line, b.x + padding, ty, maxWidth, 18);
    }
  }

  ctx.restore();
}
  

    ctx.restore(); // end clip

    // Cover (only visible when locked & alpha > 0)
    if (b.locked && b.coverAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = b.coverAlpha;
      ctx.fillStyle = b.fillColor || "#000";
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.restore();
    }
  }

  // Temp box preview (during box drawing)
  if (tempBox) {
    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = "#000";
    ctx.strokeRect(tempBox.x, tempBox.y, tempBox.w, tempBox.h);
    ctx.restore();
  }
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

  // Draw using CSS pixels
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  redraw();
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// --------------------------------
// Hover -> reveal logic
// --------------------------------
function updateHover(p) {
  const hit = findBoxAt(p);
  const nextId = hit ? hit.id : null;
  if (nextId === hoveredBoxId) return;

  hoveredBoxId = nextId;

  // When locked:
  // - if hovered => coverTarget 0 (reveal)
  // - else => coverTarget 1 (hide)
  for (const b of boxes) {
    if (!b.locked) continue;
    b.coverTarget = b.id === hoveredBoxId ? 0 : 1;
  }

  requestAnim();
}

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
      if (!s.points || s.points.length === 0) continue;

      const before = s.points.length;
      s.points = s.points.filter((pt) => {
        const dx = pt.x - p.x;
        const dy = pt.y - p.y;
        return dx * dx + dy * dy > ERASER_R * ERASER_R;
      });

      if (s.points.length !== before) changed = true;

      // remove stroke if too short
      if (s.points.length < 2) {
        b.strokes.splice(si, 1);
        changed = true;
      }
    }
  }

  if (changed) redraw();
}

// --------------------------------
// Pointer events
// --------------------------------
canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId);
  const p = pos(e);

  updateHover(p);

  // BOX tool
  if (tool === "box") {
    drawingBox = true;
    boxStart = p;
    tempBox = { x: p.x, y: p.y, w: 0, h: 0 };
    redraw();
    return;
  }

  // DRAW tool (only inside unlocked boxes)
  if (tool === "draw") {
    const b = findBoxAt(p);
    if (!b || b.locked) return;

    drawingStroke = true;
    currentBoxId = b.id;

    currentStroke = {
      color: "#000",
      width: 2,
      points: [p],
    };

    b.strokes.push(currentStroke);
    redraw();
    return;
  }

  // ERASE tool (only inside unlocked boxes)
  if (tool === "erase") {
    erasing = true;
    eraseAt(p);
    return;
  }
});

canvas.addEventListener("pointermove", (e) => {
  const p = pos(e);

  updateHover(p);

  // Drawing a box
  if (drawingBox && boxStart && tempBox) {
    const x = Math.min(boxStart.x, p.x);
    const y = Math.min(boxStart.y, p.y);
    const w = Math.abs(boxStart.x - p.x);
    const h = Math.abs(boxStart.y - p.y);

    tempBox = { x, y, w, h };
    redraw();
    return;
  }

  // Drawing inside a box
  if (drawingStroke && currentStroke) {
    currentStroke.points.push(p);
    redraw();
    return;
  }

  // Erasing
  if (erasing) {
    eraseAt(p);
    return;
  }
});

canvas.addEventListener("pointerup", (e) => {
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

  // too small => cancel
  if (!tempBox || tempBox.w < 12 || tempBox.h < 12) {
    tempBox = null;
    redraw();
    return;
  }

  
  const t = prompt("Add text:");
  if (!t) return;

  const txt = `${t}\n${USER_TAG} ${nowStamp()}`;

  const id =
    crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);

  const newBox = {
    id,
    x: tempBox.x,
    y: tempBox.y,
    w: tempBox.w,
    h: tempBox.h,
    strokes: [],
    text: txt,
    locked: false,
    fillColor: colorPicker?.value || "#000000",
    coverAlpha: 0,
    coverTarget: 0,
  };

  boxes.push(newBox);
  tempBox = null;
  redraw();
});

// --------------------------------
// double click: lock/unlock + fill cover color
// --------------------------------
canvas.addEventListener("dblclick", (e) => {
  const p = pos(e);
  const b = findBoxAt(p);
  if (!b) return;

  b.locked = !b.locked;

if (b.locked) {
  b.fillColor = colorPicker?.value || b.fillColor || "#000";

  // FORCE it to be filled immediately when locked
  b.coverAlpha = 1;
  b.coverTarget = 1;

  // if you're currently hovering it, let hover logic fade it out
  updateHover(p);
}

  requestAnim();
});
