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
  if (rgbValue) {
    rgbValue.textContent = hexToRgb(colorPicker.value);
  }
});

const cat = document.getElementById("catCursor");
if (cat) {
  document.documentElement.classList.add("has-fake-cursor");
  cat.style.left = "50vw";
  cat.style.top  = "50vh";

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

tools.forEach(b=>{
  b.onclick = ()=>{
    tools.forEach(x=>x.classList.remove("active"));
    b.classList.add("active");
    tool = b.dataset.tool;
  };
});

const svgEl = (t,a={})=>{
  const el = document.createElementNS(NS,t);
  for(const k in a) el.setAttribute(k,a[k]);
  return el;
};

const pos = e=>{
  const r = svg.getBoundingClientRect();
  return {x:e.clientX-r.left,y:e.clientY-r.top};
};

// --------------------------------
// Pointer down
// --------------------------------
svg.addEventListener("pointerdown", e=>{
  const p = pos(e);

  // TEXT
  if (tool === "text") {
    const box = e.target.closest(".svg-box");
    if (!box || box.classList.contains("locked")) return;

    const t = box.querySelector("text");
    const next = prompt("Text:", t.textContent || "");
    if (next !== null) t.textContent = next;
    return;
  }

  // FILL
  if (tool === "fill") {
    const box = e.target.closest(".svg-box");
    if (box) box.classList.toggle("locked");
    return;
  }

  // BOX
  if (tool === "box") {
    drawing = true;
    start = p;

    const g = svgEl("g",{class:"svg-box"});
    const outline = svgEl("rect");
    const text = svgEl("text",{x:p.x+6,y:p.y+18});
    const cover = svgEl("rect",{class:"box-cover",fill:"black"});

    g.append(outline,text,cover);
    svg.appendChild(g);
    currentBox = g;
  }
});

// --------------------------------
// Pointer move
// --------------------------------
svg.addEventListener("pointermove", e=>{
  if (!drawing || !currentBox) return;
  const p = pos(e);

  const x = Math.min(start.x,p.x);
  const y = Math.min(start.y,p.y);
  const w = Math.abs(start.x-p.x);
  const h = Math.abs(start.y-p.y);

  const o = currentBox.children[0];
  const c = currentBox.children[2];
  const t = currentBox.children[1];

  [o,c].forEach(r=>{
    r.setAttribute("x",x);
    r.setAttribute("y",y);
    r.setAttribute("width",w);
    r.setAttribute("height",h);
  });

  t.setAttribute("x",x+6);
  t.setAttribute("y",y+18);
});

// --------------------------------
// Pointer up
// --------------------------------
svg.addEventListener("pointerup", () => {
  if (!drawing || !currentBox) return;

  drawing = false;

  const rect = currentBox.querySelector("rect:not(.box-cover)");
  const textEl = currentBox.querySelector("text");

  const w = +rect.getAttribute("width");
  const h = +rect.getAttribute("height");

  // remove tiny accidental boxes
  if (w < 12 || h < 12) {
    currentBox.remove();
    currentBox = null;
    start = null;
    return;
  }

  // prompt for text
  const userText = prompt("Add text to this box:");
  if (userText) {
    const timestamp = new Date().toLocaleString();

    textEl.textContent = "";

    [userText, timestamp].forEach((line, i) => {
      const tspan = document.createElementNS(NS, "tspan");
      tspan.setAttribute("x", textEl.getAttribute("x"));
      tspan.setAttribute("dy", i === 0 ? "0em" : "1.2em");
      tspan.textContent = line;
      textEl.appendChild(tspan);
    });
  }

  currentBox = null;
  start = null;
});
svg.addEventListener("dblclick", (e) => {
  const box = e.target.closest(".svg-box");
  if (!box) return;

  const cover = box.querySelector(".box-cover");
  if (!cover) return;

  // set fill color from picker
  cover.setAttribute("fill", colorPicker.value);

  // toggle filled state
  box.classList.toggle("locked");
});
