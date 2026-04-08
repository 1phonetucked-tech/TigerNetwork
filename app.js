// --------------------------------
// Fake cursor
// --------------------------------
const catCursor = document.getElementById("catCursor");

if (catCursor) {
  document.documentElement.classList.add("has-fake-cursor");

  let x = 0, y = 0, raf = 0;

  window.addEventListener("pointermove", e => {
    x = e.clientX;
    y = e.clientY;
    if (!raf) {
      raf = requestAnimationFrame(() => {
        raf = 0;
        catCursor.style.left = x + "px";
        catCursor.style.top  = y + "px";
      });
    }
  });
}

// --------------------------------
// SVG setup
// --------------------------------
const svg = document.getElementById("svg");
const NS  = "http://www.w3.org/2000/svg";

const tools = document.querySelectorAll(".tool[data-tool]");
const colorInput = document.getElementById("color");
const sizeInput  = document.getElementById("size");
const clearBtn   = document.getElementById("clear");

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
const svgEl = (tag, attrs={}) => {
  const el = document.createElementNS(NS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
};

const pos = e => {
  const r = svg.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
};

const norm = (a,b) => ({
  x: Math.min(a.x,b.x),
  y: Math.min(a.y,b.y),
  w: Math.abs(a.x-b.x),
  h: Math.abs(a.y-b.y)
});

// --------------------------------
// Tool UI
// --------------------------------
tools.forEach(btn => {
  btn.onclick = () => {
    tool = btn.dataset.tool;
    tools.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  };
});

colorInput.oninput = () => strokeColor = colorInput.value;
sizeInput.oninput  = () => strokeSize  = +sizeInput.value;
clearBtn.onclick   = () => svg.innerHTML = "";

// --------------------------------
// Draw logic
// --------------------------------
svg.addEventListener("pointerdown", e => {
  drawing = true;
  svg.setPointerCapture(e.pointerId);

  const p = pos(e);

  if (tool === "erase") {
    e.target.closest(".svg-box, .svg-ink")?.remove();
    drawing = false;
    return;
  }

  if (tool === "box") {
    start = p;

    const g = svgEl("g", { class: "svg-box" });

    const rect = svgEl("rect", { fill: "none" });
    const text = svgEl("text");
    const cover = svgEl("rect", {
      fill: strokeColor,
      class: "box-cover"
    });

    g.append(rect, text, cover);
    svg.appendChild(g);

    current = g;
    return;
  }

  if (tool === "pen") {
    const path = svgEl("path", {
      class: "svg-ink",
      stroke: strokeColor,
      "stroke-width": strokeSize,
      d: `M ${p.x} ${p.y}`
    });
    svg.appendChild(path);
    current = { path, d:[`M ${p.x} ${p.y}`] };
  }
});

svg.addEventListener("pointermove", e => {
  if (!drawing) return;
  const p = pos(e);

  if (tool === "box" && current && start) {
    const r = norm(start,p);
    const rect  = current.querySelector("rect");
    const cover = current.querySelector(".box-cover");
    const text  = current.querySelector("text");

    [rect, cover].forEach(el => {
      el.setAttribute("x", r.x);
      el.setAttribute("y", r.y);
      el.setAttribute("width", r.w);
      el.setAttribute("height", r.h);
    });

    text.setAttribute("x", r.x + 6);
    text.setAttribute("y", r.y + 18);
  }

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
// TEXT EDIT
// --------------------------------
svg.addEventListener("click", e => {
  if (tool === "erase") return;

  const box = e.target.closest(".svg-box");
  if (!box || box.classList.contains("locked")) return;

  const t = box.querySelector("text");
  const txt = prompt("text inside box:", t.textContent);
  if (txt !== null) t.textContent = txt;
});

// --------------------------------
// DOUBLE‑CLICK = LOCK / UNLOCK
// --------------------------------
svg.addEventListener("dblclick", e => {
  const box = e.target.closest(".svg-box");
  if (box) box.classList.toggle("locked");
});
