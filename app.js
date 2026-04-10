// --------------------------------
// Fake cursor
// --------------------------------
const colorPicker = document.getElementById("colorPicker");
const cat = document.getElementById("catCursor");

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
// SVG setup
// --------------------------------
const svg = document.getElementById("svg");
const NS = "http://www.w3.org/2000/svg";

// tools (IMPORTANT: only tools with data-tool)
const tools = document.querySelectorAll(".tool[data-tool]");

let tool = "box";
let drawingBox = false;
let drawingStroke = false;

let start = null;
let currentBox = null;
let currentPath = null;

// --------------------------------
// Tool switching (SAFE)
// --------------------------------
tools.forEach(btn => {
  btn.onclick = () => {
    tools.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    tool = btn.dataset.tool;
  };
});

// --------------------------------
// Helpers
// --------------------------------
const svgEl = (type, attrs = {}) => {
  const el = document.createElementNS(NS, type);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
};

const pos = e => {
  const r = svg.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
};

// --------------------------------
// Freehand drawing helpers
// --------------------------------
function startPath(x, y) {
  const p = svgEl("path", {
    stroke: "black",
    "stroke-width": 2,
    fill: "none",
    "vector-effect": "non-scaling-stroke",
    d: `M ${x} ${y}`
  });
  return p;
}

function extendPath(path, x, y) {
  path.setAttribute("d", path.getAttribute("d") + ` L ${x} ${y}`);
}

// --------------------------------
// POINTER DOWN
// --------------------------------
svg.addEventListener("pointerdown", e => {
  const p = pos(e);

  // ---- DRAW TOOL (inside box only)
  if (tool === "draw") {
    const box = e.target.closest(".svg-box");
    if (!box || box.classList.contains("locked")) return;

    const layer = box.querySelector(".box-draw");
    if (!layer) return;

    drawingStroke = true;
    currentPath = startPath(p.x, p.y);
    layer.appendChild(currentPath);
    return;
  }

  // ---- BOX TOOL
  if (tool === "box") {
    drawingBox = true;
    start = p;

    const g = svgEl("g", { class: "svg-box" });

    const outline = svgEl("rect");

    // --- clip path for drawings
    const clipId = "clip-" + crypto.randomUUID();
    const defs = svgEl("defs");
    const clipPath = svgEl("clipPath", { id: clipId });
    const clipRect = svgEl("rect");

    clipPath.appendChild(clipRect);
    defs.appendChild(clipPath);

    const drawLayer = svgEl("g", {
      class: "box-draw",
      "clip-path": `url(#${clipId})`
    });

    const text = svgEl("text", { x: p.x + 6, y: p.y + 18 });

    const cover = svgEl("rect", {
      class: "box-cover",
      fill: "black"
    });

    g.append(defs, outline, drawLayer, text, cover);
    svg.appendChild(g);

    currentBox = g;
  }
});

// --------------------------------
// POINTER MOVE
// --------------------------------
svg.addEventListener("pointermove", e => {
  const p = pos(e);

  // freehand drawing
  if (drawingStroke && currentPath) {
    extendPath(currentPath, p.x, p.y);
    return;
  }

  // box resizing
  if (!drawingBox || !currentBox) return;

  const x = Math.min(start.x, p.x);
  const y = Math.min(start.y, p.y);
  const w = Math.abs(start.x - p.x);
  const h = Math.abs(start.y - p.y);

  const outline = currentBox.querySelector("rect:not(.box-cover)");
  const cover = currentBox.querySelector(".box-cover");
  const clipRect = currentBox.querySelector("clipPath rect");
  const text = currentBox.querySelector("text");

  [outline, cover, clipRect].forEach(r => {
    r.setAttribute("x", x);
    r.setAttribute("y", y);
    r.setAttribute("width", w);
    r.setAttribute("height", h);
  });

  text.setAttribute("x", x + 6);
  text.setAttribute("y", y + 18);
});

// --------------------------------
// POINTER UP
// --------------------------------
svg.addEventListener("pointerup", () => {

  // finish drawing stroke
  if (drawingStroke) {
    drawingStroke = false;
    currentPath = null;
    return;
  }

  // finish box
  if (!drawingBox || !currentBox) return;

  drawingBox = false;

  const rect = currentBox.querySelector("rect:not(.box-cover)");
  const text = currentBox.querySelector("text");

  const w = +rect.getAttribute("width");
  const h = +rect.getAttribute("height");

  if (w < 12 || h < 12) {
    currentBox.remove();
    currentBox = null;
    return;
  }

  const content = prompt("Add text to this box:");
  if (content) {
    text.textContent = `${content}\n${new Date().toLocaleString()}`;
  }

  currentBox = null;
  start = null;
});

// --------------------------------
// DOUBLE CLICK = LOCK / FILL
// --------------------------------
svg.addEventListener("dblclick", e => {
  const box = e.target.closest(".svg-box");
  if (!box) return;

  const cover = box.querySelector(".box-cover");
  if (!cover) return;

  cover.setAttribute("fill", colorPicker.value);
  box.classList.toggle("locked");
});
