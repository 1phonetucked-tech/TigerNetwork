// --------------------------------
// Fake cursor (stable)
// --------------------------------
const colorPicker = document.getElementById("colorPicker");
const rgbValue = document.getElementById("rgbValue");

function hexToRgb(hex) {
  const v = hex.replace("#", "");
  const r = parseInt(v.substring(0,2), 16);
  const g = parseInt(v.substring(2,4), 16);
  const b = parseInt(v.substring(4,6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

colorPicker.addEventListener("input", () => {
  if (rgbValue) rgbValue.textContent = hexToRgb(colorPicker.value);
});

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
const tools = document.querySelectorAll(".tool");
const NS = "http://www.w3.org/2000/svg";

let tool = "box";
let drawing = false;
let start = null;
let currentBox = null;

// drawing-in-box state
let drawingPath = null;
let activeBox = null;

tools.forEach(b => {
  b.onclick = () => {
    tools.forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    tool = b.dataset.tool;
  };
});

const svgEl = (t,a={}) => {
  const el = document.createElementNS(NS,t);
  for(const k in a) el.setAttribute(k,a[k]);
  return el;
};

const pos = e => {
  const r = svg.getBoundingClientRect();
  return { x:e.clientX-r.left, y:e.clientY-r.top };
};

// --------------------------------
// Draw helpers
// --------------------------------
function startPath(x, y) {
  const path = svgEl("path", {
    stroke: "black",
    "stroke-width": 2,
    fill: "none",
    "vector-effect": "non-scaling-stroke"
  });
  path.setAttribute("d", `M ${x} ${y}`);
  return path;
}

function extendPath(path, x, y) {
  path.setAttribute("d",
    path.getAttribute("d") + ` L ${x} ${y}`
  );
}

// --------------------------------
// Pointer down
// --------------------------------
svg.addEventListener("pointerdown", e => {
  const p = pos(e);

  // DRAW INSIDE BOX
  if (tool === "draw") {
    const box = e.target.closest(".svg-box");
    if (!box || box.classList.contains("locked")) return;

    activeBox = box;
    const drawLayer = box.querySelector(".box-draw");
    if (!drawLayer) return;

    drawing = true;
    drawingPath = startPath(p.x, p.y);
    drawLayer.appendChild(drawingPath);
    return;
  }

  // BOX
  if (tool === "box") {
    drawing = true;
    start = p;

    const g = svgEl("g",{ class:"svg-box" });

    const outline = svgEl("rect");

    // clip path for drawing
    const clipId = "clip-" + crypto.randomUUID();
    const clipPath = svgEl("clipPath",{ id:clipId });
    const clipRect = svgEl("rect");
    clipPath.appendChild(clipRect);

    const defs = svgEl("defs");
    defs.appendChild(clipPath);

    const drawLayer = svgEl("g",{
      class:"box-draw",
      "clip-path":`url(#${clipId})`
    });

    const text = svgEl("text",{ x:p.x+6, y:p.y+18 });
    const cover = svgEl("rect",{ class:"box-cover", fill:"black" });

    g.append(defs, outline, drawLayer, text, cover);
    svg.appendChild(g);
    currentBox = g;
  }
});

// --------------------------------
// Pointer move
// --------------------------------
svg.addEventListener("pointermove", e => {

  // DRAW MOVE
  if (tool === "draw" && drawing && drawingPath) {
    const p = pos(e);
    extendPath(drawingPath, p.x, p.y);
    return;
  }

  if (!drawing || !currentBox) return;
  const p = pos(e);

  const x = Math.min(start.x,p.x);
  const y = Math.min(start.y,p.y);
  const w = Math.abs(start.x-p.x);
  const h = Math.abs(start.y-p.y);

  const outline = currentBox.querySelector("rect:not(.box-cover)");
  const cover = currentBox.querySelector(".box-cover");
  const clipRect = currentBox.querySelector("clipPath rect");
  const text = currentBox.querySelector("text");

  [outline, cover, clipRect].forEach(r => {
    r.setAttribute("x",x);
    r.setAttribute("y",y);
    r.setAttribute("width",w);
    r.setAttribute("height",h);
  });

  text.setAttribute("x", x+6);
  text.setAttribute("y", y+18);
});

// --------------------------------
// Pointer up
// --------------------------------
svg.addEventListener("pointerup", () => {

  // END DRAW
  if (tool === "draw") {
    drawing = false;
    drawingPath = null;
    activeBox = null;
    return;
  }

  if (!drawing || !currentBox) return;

  drawing = false;

  const rect = currentBox.querySelector("rect:not(.box-cover)");
  const textEl = currentBox.querySelector("text");

  const w = +rect.getAttribute("width");
  const h = +rect.getAttribute("height");

  if (w < 12 || h < 12) {
    currentBox.remove();
    currentBox = null;
    start = null;
    return;
  }

  const userText = prompt("Add text to this box:");
  if (userText) {
    const timestamp = new Date().toLocaleString();
    textEl.textContent = `${userText}\n${timestamp}`;
  }

  currentBox = null;
  start = null;
});

// --------------------------------
// Lock / fill on double click
// --------------------------------
svg.addEventListener("dblclick", e => {
  const box = e.target.closest(".svg-box");
  if (!box) return;

  const cover = box.querySelector(".box-cover");
  if (!cover) return;

  cover.setAttribute("fill", colorPicker.value);
  box.classList.toggle("locked");
});
``
