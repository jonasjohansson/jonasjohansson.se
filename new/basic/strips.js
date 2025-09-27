import { projects } from "./projects.js";
import { STRIP_COUNT, ensureAudio, playStripNote } from "./music.js";
import { CONFIG, edgeAmplitude, transformForVertical, transformForHorizontal, bgXForStrip, bgYForStrip } from "./transforms.js";

// ---------- Build DOM ----------
const container = document.getElementById("strips");
container.classList.add("vertical"); // default orientation

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
const list = shuffle([...projects]);

const strips = [];
for (let i = 0; i < STRIP_COUNT; i++) {
  const p = list[i % list.length];
  const div = document.createElement("div");
  div.className = "strip";
  div.style.backgroundImage = `url('${p.image}')`;
  div.setAttribute("role", "listitem");
  div.setAttribute("aria-label", p.title);
  div.dataset.title = p.title; // label via ::after in CSS
  container.appendChild(div);
  strips.push(div);
}

// ---------- State ----------
let orientation = "vertical"; // "vertical" or "horizontal"
let curX = 0.5,
  curY = 0.5; // eased cursor (0..1)
let targetX = 0.5,
  targetY = 0.5; // instantaneous cursor (0..1)

let lastIndex = -1;
let prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Centers for each lane (normalized)
const centers = new Array(STRIP_COUNT).fill(0).map((_, i) => (i + 0.5) / STRIP_COUNT);

// ---------- Helpers ----------
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

function currentIndexFromCursor() {
  const n = orientation === "vertical" ? targetX : targetY;
  return clamp(Math.floor(n * STRIP_COUNT), 0, STRIP_COUNT - 1);
}

function setOrientation(next) {
  if (next === orientation) return;
  orientation = next;
  container.classList.toggle("vertical", orientation === "vertical");
  container.classList.toggle("horizontal", orientation === "horizontal");
  // Reset motion targets to avoid sudden jumps
  curX = targetX = 0.5;
  curY = targetY = 0.5;
}

// Optional: toggle on key "o"
window.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "o") {
    setOrientation(orientation === "vertical" ? "horizontal" : "vertical");
  }
});

// ---------- Input ----------
function handlePoint(clientX, clientY) {
  const rect = container.getBoundingClientRect();
  const nx = clamp((clientX - rect.left) / Math.max(1, rect.width), 0, 1);
  const ny = clamp((clientY - rect.top) / Math.max(1, rect.height), 0, 1);
  targetX = nx;
  targetY = ny;
}

window.addEventListener("pointermove", (e) => {
  handlePoint(e.clientX, e.clientY);
});

window.addEventListener(
  "pointerdown",
  () => {
    ensureAudio();
  },
  { once: true }
);

// Touch support
window.addEventListener(
  "touchmove",
  (e) => {
    if (e.touches && e.touches.length > 0) {
      const t = e.touches[0];
      handlePoint(t.clientX, t.clientY);
    }
  },
  { passive: true }
);

window.addEventListener("mouseleave", () => {
  targetX = 0.5;
  targetY = 0.5;
});

// ---------- Animation ----------
function tick() {
  curX += (targetX - curX) * CONFIG.EASE;
  curY += (targetY - curY) * CONFIG.EASE;

  if (!prefersReduced) {
    if (orientation === "vertical") {
      const amp = edgeAmplitude(curX);
      for (let i = 0; i < STRIP_COUNT; i++) {
        const strip = strips[i];
        const dx = curX - centers[i]; // distance from strip center
        strip.style.transform = transformForVertical(dx, amp);
        strip.style.backgroundPosition = bgXForStrip(curX, dx);
      }
    } else {
      const amp = edgeAmplitude(curY);
      for (let i = 0; i < STRIP_COUNT; i++) {
        const strip = strips[i];
        const dy = curY - centers[i]; // distance from strip center
        strip.style.transform = transformForHorizontal(dy, amp);
        strip.style.backgroundPosition = bgYForStrip(curY, dy);
      }
    }
  } else {
    // Reduced motion: no rotation; background follows eased cursor uniformly
    if (orientation === "vertical") {
      for (let i = 0; i < STRIP_COUNT; i++) {
        const strip = strips[i];
        strip.style.transform = "none";
        strip.style.backgroundPosition = `${(curX * 100).toFixed(1)}% 50%`;
      }
    } else {
      for (let i = 0; i < STRIP_COUNT; i++) {
        const strip = strips[i];
        strip.style.transform = "none";
        strip.style.backgroundPosition = `50% ${(curY * 100).toFixed(1)}%`;
      }
    }
  }

  // Fire a note when entering a new lane
  const idx = currentIndexFromCursor();
  if (idx !== lastIndex) {
    const vAxis = orientation === "vertical" ? Math.abs(targetX - curX) : Math.abs(targetY - curY);
    const vel = clamp(0.35 + vAxis * 2.5, 0.35, 1.0);
    playStripNote(idx, vel);
    lastIndex = idx;
  }

  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
