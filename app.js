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
const tools = document.querySelectorAll(".tool[data-tool]");

let tool = "box";
let drawingBox = false;
let drawingStroke = false;

let start = null;
let currentBox = null;
let currentPath = null;

// --------------------------------
// Safe tool switching
// --------------------------------
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
// Draw helpers
// --------------------------------
function startPath(x, y) {
  return svgEl("path", {
    d: `M ${x} ${y}`,
    stroke: "black",
    "stroke-width": 2,
    fill: "none",
    "vector-effect": "non-scaling-stroke"
  });
}

function extendPath(path, x, y) {
  path.setAttribute("d", path.getAttribute("d") + ` L ${x} ${y}`);
}

// --------------------------------
// POINTER DOWN
// --------------------------------
svg.addEventListener("pointerdown", e => {
  const p = pos(e);

  // DRAW (only inside boxes)
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

  // ERASE (inactive for now → DO NOT BLOCK BOX)
  if (tool === "erase") {
    return;
  }

  // BOX (default behavior)
  drawingBox = true;
  start = p;

  const g = svgEl("g", { class: "svg-box" });
  const outline = svgEl("rect");

  // clipPath
  const clipId = "clip-" + crypto.randomUUID();
  const defs = svgEl("defs");
  const clipPath = svgEl("clipPath", { id: clipId });
  clipPath.appendChild(svgEl("rect"));
  defs.appendChild(clipPath);

  const drawLayer = svgEl("g", {
    class: "box-draw",
    "clip-path": `url(#${clipId})`
  });

  const text = svgEl("text", { x: p.x + 6, y: p.y + 18 });
  const cover = svgEl("rect", { class: "box-cover", fill: "black" });

  g.append(defs, outline, drawLayer, text, cover);
  svg.appendChild(g);

  currentBox = g;
});

// --------------------------------
// POINTER MOVE
// --------------------------------
svg.addEventListener("pointermove", e => {
  const p = pos(e);

  if (drawingStroke && currentPath) {
    extendPath(currentPath, p.x, p.y);
    return;
  }

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
  if (drawingStroke) {
    drawingStroke = false;
    currentPath = null;
    return;
  }

  if (!drawingBox || !currentBox) return;

  drawingBox = false;

  const rect = currentBox.querySelector("rect:not(.box-cover)");
  const text = currentBox.querySelector("text");

  if (+rect.getAttribute("width") < 12 ||
      +rect.getAttribute("height") < 12) {
    currentBox.remove();
  } else {
    const t = prompt("Add text:");
    if (t) text.textContent = `${t}\n${new Date().toLocaleString()}`;
  }

  currentBox = null;
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
