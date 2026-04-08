// --------------------------------
// Fake cursor
// --------------------------------
const catCursor = document.getElementById("catCursor");
if (catCursor) {
  document.documentElement.classList.add("has-fake-cursor");
  window.addEventListener("pointermove", e => {
    catCursor.style.left = e.clientX + "px";
    catCursor.style.top  = e.clientY + "px";
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
let currentBox = null;

let strokeColor = colorInput.value;
let strokeSize  = +sizeInput.value;

// --------------------------------
// Helpers
// --------------------------------
const svgEl = (t,a={}) => {
  const el = document.createElementNS(NS,t);
  for (const k in a) el.setAttribute(k,a[k]);
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
    tools.forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
  };
});

colorInput.oninput = () => strokeColor = colorInput.value;
sizeInput.oninput  = () => strokeSize = +sizeInput.value;
clearBtn.onclick   = () => svg.innerHTML = "";

// --------------------------------
// POINTER DOWN
// --------------------------------


  // TEXT TOOL — EXIT EARLY
  if (tool === "text") {
    const hit = document.elementFromPoint(e.clientX, e.clientY);
    const box = hit?.closest(".svg-box");
    if (!box || box.classList.contains("locked")) return;

    const textEl = box.querySelector("text");
    const current = textEl.textContent || "";
    const next = prompt("Text:", current);
    if (next !== null) textEl.textContent = next;

    return; // ⛔ stop ALL drawing logic
  }

svg.addEventListener("pointerdown", e => {
  const p = pos(e);

  // ERASE
  if (tool === "erase") {
    e.target.closest(".svg-box, .svg-ink")?.remove();
    return;
  }

  // BOX
  if (tool === "box") {
    drawing = true;
    start = p;

    const g = svgEl("g",{class:"svg-box"});
    const outline = svgEl("rect",{fill:"none"});
    const text = svgEl("text");
    const cover = svgEl("rect",{fill:strokeColor,class:"box-cover"});

    g.append(outline,text,cover);
    svg.appendChild(g);
    currentBox = g;
    return;
  }

  // PEN
  if (tool === "pen") {
    const path = svgEl("path",{
      class:"svg-ink",
      stroke:strokeColor,
      "stroke-width":strokeSize,
      d:`M ${p.x} ${p.y}`
    });
    svg.appendChild(path);

    const move = ev => {
      const n = pos(ev);
      path.setAttribute("d",path.getAttribute("d")+` L ${n.x} ${n.y}`);
    };

    window.addEventListener("pointermove",move,{once:false});
    window.addEventListener("pointerup",()=> {
      window.removeEventListener("pointermove",move);
    },{once:true});
  }
  
  });

// --------------------------------
// POINTER MOVE (box resize)
// --------------------------------

svg.addEventListener("pointermove", e => {
  if (!drawing || !currentBox) return;

  const r = norm(start, pos(e));
  const outline = currentBox.querySelector("rect:not(.box-cover)");
  const cover   = currentBox.querySelector(".box-cover");
  const text    = currentBox.querySelector("text");

  [outline, cover].forEach(el => {
    el.setAttribute("x", r.x);
    el.setAttribute("y", r.y);
    el.setAttribute("width", r.w);
    el.setAttribute("height", r.h);
  });

  text.setAttribute("x", r.x + 6);
  text.setAttribute("y", r.y + 18);
});

// --------------------------------
// POINTER UP
// --------------------------------
svg.addEventListener("pointerup",()=>{
  drawing=false;
  start=null;
  currentBox=null;
});

// --------------------------------
// DOUBLE‑CLICK = FILL / LOCK
// --------------------------------
svg.addEventListener("dblclick", e => {
  const box = e.target.closest(".svg-box");
  if (box) box.classList.toggle("locked");
});

  const box = e.target.closest(".svg-box");
  if (!box || box.classList.contains("locked")) return;

  e.stopPropagation(); // ✅ prevent drawing logic

  const textEl = box.querySelector("text");
  const current = textEl.textContent || "";
  const next = prompt("Text:", current);

  if (next !== null) textEl.textContent = next;
});
