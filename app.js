// --------------------------------
// Fake cursor
// --------------------------------
const catCursor = document.getElementById("catCursor");

if (catCursor) {
  document.documentElement.classList.add("has-fake-cursor");

  let mx = 0, my = 0, raf = 0;
  window.addEventListener("pointermove", (e) => {
    mx = e.clientX;
    my = e.clientY;
    if (!raf) {
      raf = requestAnimationFrame(() => {
        raf = 0;
        catCursor.style.left = mx + "px";
        catCursor.style.top  = my + "px";
      });
    }
  });
}

// --------------------------------
// SVG + UI
// --------------------------------
const svg = document.getElementById("svg");
const tools = document.querySelectorAll(".tool[data-tool]");
const colorInput = document.getElementById("color");
const sizeInput  = document.getElementById("size");
const clearBtn   = document.getElementById("clear");

const NS = "http://www.w3.org/2000/svg";

// --------------------------------
// State
// --------------------------------
let tool = "box";
let drawing = false;
let start = null;
let current = null;

let strokeColor = colorInput.value;
let strokeSize  = +sizeInput.value;

// --------------------------------
// Helpers
// --------------------------------
function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(NS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

function pos(e) {
  const r = svg.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function normRect(a, b) {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x),
    h: Math.abs(a.y - b.y)
  };
}

// --------------------------------
// Tool UI
// --------------------------------
tools.forEach(btn => {
  btn.addEventListener("click", () => {
    tool = btn.dataset.tool;
    tools.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

colorInput.addEventListener("input", () => {
  strokeColor = colorInput.value;
});

sizeInput.addEventListener("input", () => {
  strokeSize = +sizeInput.value;
});

clearBtn.addEventListener("click", () => {
  svg.innerHTML = "";
});

// --------------------------------
// Drawing logic
// --------------------------------
svg.addEventListener("pointerdown", (e) => {
  drawing = true;
  svg.setPointerCapture(e.pointerId);

  const p = pos(e);

  // ERASER
  if (tool === "erase") {
    e.target.closest(".svg-box, .svg-ink")?.remove();
    drawing = false;
    return;
  }

  // BOX
  if (tool === "box") {
    start = p;

    const g = svgEl("g", { class: "svg-box" });

    const outline = svgEl("rect", {
      fill: "none"
    });

    const text = svgEl("text", {
      x: p.x + 6,
      y: p.y + 18
    });

    const cover = svgEl("rect", {
      fill: strokeColor,
      class: "box-cover"
    });

    g.append(outline, text, cover);
    svg.appendChild(g);
    current = g;
    return;
  }

  // PEN
  if (tool === "pen") {
    const path = svgEl("path", {
      class: "svg-ink",
      stroke: strokeColor,
      "stroke-width": strokeSize,
      d: `M ${p.x} ${p.y}`
    });
    svg.appendChild(path);
    current = { path, d: [`M ${p.x} ${p.y}`] };
  }
});

svg.addEventListener("pointermove", (e) => {
  if (!drawing) return;
  const p = pos(e);

  // Resize box
  if (tool === "box" && current && start) {
    const r = normRect(start, p);
    const outline = current.querySelector("rect:not(.box-cover)");
    const cover   = current.querySelector(".box-cover");
    const text    = current.querySelector("text");

    [outline, cover].forEach(el => {
      el.setAttribute("x", r.x);
      el.setAttribute("y", r.y);
      el.setAttribute("width", r.w);
      el.setAttribute("height", r.h);
    });

    text.setAttribute("x", r.x + 6);
    text.setAttribute("y", r.y + 18);
  }

  // Draw pen
  if (tool === "pen" && current?.path) {
    current.d.push(`L ${p.x} ${p.y}`);
    current.path.setAttribute("d", current.d.join(" "));
  }
});

svg.addEventListener("pointerup", () => {
  drawing = false;
  start = null;
  current = null;
});

// --------------------------------
// Click interactions
// --------------------------------
svg.addEventListener("click", (e) => {
  if (tool === "erase") return;

  const box = e.target.closest(".svg-box");
  if (!box) return;

  // ✅ SHIFT + CLICK = FILL / LOCK
  if (e.shiftKey) {
    box.classList.toggle("locked");
    return;
  }

  // Do not edit locked boxes
  if (box.classList.contains("locked")) return;

  // Edit text
  const textEl = box.querySelector("text");
  const currentText = textEl.textContent || "";

  const next = prompt("text inside box:", currentText);
  if (next !== null) textEl.textContent = next;
});
``
