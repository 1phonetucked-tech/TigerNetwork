// ---- DOM ----
const svg = document.getElementById("svg");
const toolButtons = document.querySelectorAll(".tool[data-tool]");
const colorInput = document.getElementById("color");
const sizeInput  = document.getElementById("size");
const clearBtn   = document.getElementById("clear");

const NS = "http://www.w3.org/2000/svg";

// ---- State ----
let tool = "box";
let drawing = false;

let strokeColor = colorInput.value;
let strokeSize  = parseInt(sizeInput.value, 10);

let start = null;        // for box drag
let current = null;      // current element (g for box, path for pen)

// ---- helpers ----
function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(NS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

function pos(e){
  const r = svg.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function normRect(a, b){
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const w = Math.abs(a.x - b.x);
  const h = Math.abs(a.y - b.y);
  return { x, y, w, h };
}

function setActive(btn){
  toolButtons.forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
}

// ---- Tool UI (kept!) ----
toolButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    tool = btn.dataset.tool;
    setActive(btn);

    svg.style.cursor =
      tool === "erase" ? "cell" : "crosshair";
  });
});

colorInput.addEventListener("input", () => {
  strokeColor = colorInput.value;
});

sizeInput.addEventListener("input", () => {
  strokeSize = parseInt(sizeInput.value, 10);
});

clearBtn.addEventListener("click", () => {
  svg.innerHTML = "";
});

// ---- Drawing logic ----
svg.addEventListener("pointerdown", (e) => {
  // Only interact when clicking on the SVG surface
  drawing = true;
  svg.setPointerCapture(e.pointerId);

  const p = pos(e);

  // ERASER: delete whatever you click
  if (tool === "erase") {
    const target = e.target.closest(".svg-box, .svg-ink");
    if (target) target.remove();
    drawing = false;
    return;
  }

  // BOX: create a group with rect + text
  if (tool === "box") {
    start = p;

    const g = svgEl("g", { class: "svg-box" });
    const rect = svgEl("rect", {
      x: p.x, y: p.y, width: 1, height: 1,
      fill: strokeColor   // color picker fills box
    });

    const text = svgEl("text", {
      x: p.x + 6,
      y: p.y + 18
    });
    text.textContent = "";

    g.append(rect, text);
    svg.appendChild(g);

    current = g;
    return;
  }

  // PEN: create a path
  if (tool === "pen") {
    const path = svgEl("path", {
      class: "svg-ink",
      d: `M ${p.x} ${p.y}`,
      stroke: strokeColor,
      "stroke-width": strokeSize
    });

    svg.appendChild(path);
    current = { path, d: [`M ${p.x} ${p.y}`] };
    return;
  }
});

svg.addEventListener("pointermove", (e) => {
  if (!drawing) return;

  const p = pos(e);

  // BOX resize
  if (tool === "box" && current && start) {
    const rect = current.querySelector("rect");
    const text = current.querySelector("text");

    const r = normRect(start, p);

    rect.setAttribute("x", r.x);
    rect.setAttribute("y", r.y);
    rect.setAttribute("width", r.w);
    rect.setAttribute("height", r.h);

    // keep text near top-left inside box
    text.setAttribute("x", r.x + 6);
    text.setAttribute("y", r.y + 18);
  }

  // PEN draw
  if (tool === "pen" && current && current.path) {
    current.d.push(`L ${p.x} ${p.y}`);
    current.path.setAttribute("d", current.d.join(" "));
  }

  // ERASER drag (optional: erases as you drag)
  if (tool === "erase") {
    const target = e.target.closest(".svg-box, .svg-ink");
    if (target) target.remove();
  }
});

svg.addEventListener("pointerup", () => {
  drawing = false;

  // if you made a tiny box, remove it
  if (tool === "box" && current) {
    const rect = current.querySelector("rect");
    const w = parseFloat(rect.getAttribute("width"));
    const h = parseFloat(rect.getAttribute("height"));
    if (w < 10 || h < 10) current.remove();
  }

  start = null;
  current = null;
});

// ---- Text editing ----
// Click a box to set text (works no matter what tool you’re on, except erase)
svg.addEventListener("click", (e) => {
  if (tool === "erase") return;

  const box = e.target.closest(".svg-box");
  if (!box) return;

  const textEl = box.querySelector("text");
  const currentText = textEl.textContent || "";

  const next = prompt("text inside box:", currentText);
  if (next !== null) textEl.textContent = next;
});
