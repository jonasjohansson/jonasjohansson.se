import { projects } from "./projects.js";
import { STRIP_COUNT, ensureAudio, playStripNote } from "./music.js";
import { CONFIG, edgeAmplitude, transformForVertical, transformForHorizontal, bgXFrom, bgYFrom } from "./transforms.js";

// ---------- Build DOM ----------
const container = document.getElementById("strips");
container.classList.add("vertical"); // default

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

// Centers along main axis (0..1)
const centers = Array.from({ length: STRIP_COUNT }, (_, i) => (i + 0.5) / STRIP_COUNT);

// ---------- Pointer tracking ----------
let targetX = 0.5,
  targetY = 0.5;
let curX = 0.5,
  curY = 0.5;

function onPointerMove(e) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const pt = e.touches ? e.touches[0] : e;
  targetX = Math.min(1, Math.max(0, pt.clientX / vw));
  targetY = Math.min(1, Math.max(0, pt.clientY / vh));
}
window.addEventListener("mousemove", onPointerMove, { passive: true });
window.addEventListener("touchmove", onPointerMove, { passive: true });

// ---------- Orientation toggle (press "1") ----------
let orientation = "vertical";
window.addEventListener("keydown", (e) => {
  if (e.code === "Digit1" || e.key === "1") {
    orientation = orientation === "vertical" ? "horizontal" : "vertical";
    container.classList.toggle("vertical", orientation === "vertical");
    container.classList.toggle("horizontal", orientation === "horizontal");
  }
});

// ---------- Start audio context on first gesture ----------
function startAudio() {
  ensureAudio();
}
window.addEventListener("pointerdown", startAudio, { once: true, passive: true });
window.addEventListener("keydown", startAudio, { once: true });

// ---------- Note triggering ----------
let lastIndex = -1;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

function currentIndexFromCursor() {
  if (orientation === "vertical") {
    const x = curX * STRIP_COUNT;
    return Math.max(0, Math.min(STRIP_COUNT - 1, Math.floor(x)));
  } else {
    const y = curY * STRIP_COUNT;
    return Math.max(0, Math.min(STRIP_COUNT - 1, Math.floor(y)));
  }
}

// ---------- Animation loop ----------
const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function tick() {
  curX += (targetX - curX) * CONFIG.EASE;
  curY += (targetY - curY) * CONFIG.EASE;

  const bgX = bgXFrom(curX);
  const bgY = bgYFrom(curY);

  if (!prefersReduced) {
    if (orientation === "vertical") {
      const amp = edgeAmplitude(curX);
      for (let i = 0; i < STRIP_COUNT; i++) {
        const strip = strips[i];
        const dx = curX - centers[i];
        strip.style.transform = transformForVertical(dx, amp);
        strip.style.backgroundPosition = bgX;
      }
    } else {
      const amp = edgeAmplitude(curY);
      for (let i = 0; i < STRIP_COUNT; i++) {
        const strip = strips[i];
        const dy = curY - centers[i];
        strip.style.transform = transformForHorizontal(dy, amp);
        strip.style.backgroundPosition = bgY;
      }
    }
  } else {
    for (let i = 0; i < STRIP_COUNT; i++) {
      const strip = strips[i];
      strip.style.transform = "none";
      strip.style.backgroundPosition = orientation === "vertical" ? bgX : bgY;
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
