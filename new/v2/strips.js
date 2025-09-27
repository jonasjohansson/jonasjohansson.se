import { projects } from "./projects.js";
import { ensureAudio, playStripNote } from "./music.js";

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

// Store original projects and filtered projects
let allProjects = [...list];
let filteredProjects = [...list];

const strips = [];
let stripData = []; // Store project data for each strip

function createStrip(project, index) {
  const div = document.createElement("div");
  div.className = "strip";
  div.setAttribute("role", "listitem");
  div.setAttribute("aria-label", project.title);

  // Add data attributes for year and tags
  div.setAttribute("data-year", project.year);
  div.setAttribute("data-tags", project.tags.join(","));

  // Create image element
  const img = document.createElement("div");
  img.className = "strip-image";
  img.style.backgroundImage = `url('${project.image}')`;

  // Create text element
  const text = document.createElement("div");
  text.className = "strip-text";
  text.textContent = project.title;

  div.appendChild(img);
  div.appendChild(text);
  container.appendChild(div);

  // Add hover events to update header text
  div.addEventListener("mouseenter", () => {
    const marqueeContent = document.querySelector(".marquee-content");
    if (marqueeContent) {
      marqueeContent.innerHTML = `
        <span>JONAS JOHANSSON ${project.title}</span>
        <span>SVARTLJUS</span>
        <span>NAVA</span>
        <span>VISUALIA</span>
        <a href="mailto:hello@jonasjohansson.se" class="header-link">EMAIL</a>
        <a href="https://instagram.com/jonasjohansson" class="header-link">INSTAGRAM</a>
        <a href="https://docs.google.com/document/d/YOUR_DOC_ID/edit?usp=sharing" class="header-link">CV</a>
        <span>JONAS JOHANSSON ${project.title}</span>
        <span>SVARTLJUS</span>
        <span>NAVA</span>
        <span>VISUALIA</span>
        <a href="mailto:hello@jonasjohansson.se" class="header-link">EMAIL</a>
        <a href="https://instagram.com/jonasjohansson" class="header-link">INSTAGRAM</a>
        <a href="https://docs.google.com/document/d/YOUR_DOC_ID/edit?usp=sharing" class="header-link">CV</a>
      `;
    }
  });

  div.addEventListener("mouseleave", () => {
    const marqueeContent = document.querySelector(".marquee-content");
    if (marqueeContent) {
      marqueeContent.innerHTML = `
        <span>JONAS JOHANSSON PROGRESS NOT PERFECTION</span>
        <span>SVARTLJUS</span>
        <span>NAVA</span>
        <span>VISUALIA</span>
        <a href="mailto:hello@jonasjohansson.se" class="header-link">EMAIL</a>
        <a href="https://instagram.com/jonasjohansson" class="header-link">INSTAGRAM</a>
        <a href="https://docs.google.com/document/d/YOUR_DOC_ID/edit?usp=sharing" class="header-link">CV</a>
        <span>JONAS JOHANSSON PROGRESS NOT PERFECTION</span>
        <span>SVARTLJUS</span>
        <span>NAVA</span>
        <span>VISUALIA</span>
        <a href="mailto:hello@jonasjohansson.se" class="header-link">EMAIL</a>
        <a href="https://instagram.com/jonasjohansson" class="header-link">INSTAGRAM</a>
        <a href="https://docs.google.com/document/d/YOUR_DOC_ID/edit?usp=sharing" class="header-link">CV</a>
      `;
    }
  });

  return { element: div, project: project };
}

// Initialize strips
const numStripsToShow = filteredProjects.length;

// Set initial CSS custom property for dynamic strip width
document.documentElement.style.setProperty("--strip-count", numStripsToShow);

for (let i = 0; i < numStripsToShow; i++) {
  const project = filteredProjects[i];
  const strip = createStrip(project, i);
  strips.push(strip.element);
  stripData.push(strip.project);
}

// ---------- State ----------
let orientation = "vertical"; // "vertical" or "horizontal"
let curX = 0.5,
  curY = 0.5; // eased cursor (0..1)
let targetX = 0.5,
  targetY = 0.5; // instantaneous cursor (0..1)

let lastIndex = -1;

// ---------- Helpers ----------
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

function currentIndexFromCursor() {
  const n = orientation === "vertical" ? targetX : targetY;
  return clamp(Math.floor(n * strips.length), 0, strips.length - 1);
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

// Only listen for mouse events over the strips container
container.addEventListener("pointermove", (e) => {
  handlePoint(e.clientX, e.clientY);
});

container.addEventListener(
  "pointerdown",
  () => {
    ensureAudio();
  },
  { once: true }
);

// Touch support
container.addEventListener(
  "touchmove",
  (e) => {
    if (e.touches && e.touches.length > 0) {
      const t = e.touches[0];
      handlePoint(t.clientX, t.clientY);
    }
  },
  { passive: true }
);

container.addEventListener("mouseleave", () => {
  targetX = 0.5;
  targetY = 0.5;
});

// ---------- Animation ----------
function tick() {
  curX += (targetX - curX) * 0.18; // Simple ease factor
  curY += (targetY - curY) * 0.18;

  // Simple background position following cursor
  if (orientation === "vertical") {
    for (let i = 0; i < strips.length; i++) {
      const strip = strips[i];
      const img = strip.querySelector(".strip-image");
      img.style.backgroundPosition = `${(curX * 100).toFixed(1)}% 50%`;
    }
  } else {
    for (let i = 0; i < strips.length; i++) {
      const strip = strips[i];
      const img = strip.querySelector(".strip-image");
      img.style.backgroundPosition = `50% ${(curY * 100).toFixed(1)}%`;
    }
  }

  // Fire a note when entering a new lane
  const idx = currentIndexFromCursor();
  if (idx !== lastIndex) {
    const vAxis = orientation === "vertical" ? Math.abs(targetX - curX) : Math.abs(targetY - curY);
    const vel = clamp(0.35 + vAxis * 2.5, 0.35, 1.0);
    playStripNote(idx, vel, strips.length);
    lastIndex = idx;
  }

  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);

// ---------- Filtering Logic ----------
function getSelectedFilters() {
  const selectedYears = [];
  const selectedTags = [];

  document.querySelectorAll('#filter-section input[type="checkbox"]:checked').forEach((checkbox) => {
    const value = checkbox.value;
    if (["2020", "2021", "2022", "2023", "2024", "2025"].includes(value)) {
      selectedYears.push(parseInt(value));
    } else if (["Light", "Installation", "Education", "AV", "Mixed Reality", "Stage"].includes(value)) {
      selectedTags.push(value);
    }
  });

  return { years: selectedYears, tags: selectedTags };
}

function filterProjects() {
  const { years, tags } = getSelectedFilters();

  filteredProjects = allProjects.filter((project) => {
    // Year filtering: project.year is a single number, check if it's in selected years
    const yearMatch = years.length === 0 || years.includes(project.year);
    // Tag filtering: project.tags is an array, check if any selected tag is in project.tags
    const tagMatch = tags.length === 0 || tags.some((tag) => project.tags.includes(tag));
    return yearMatch && tagMatch;
  });

  // Update strips with filtered projects
  container.innerHTML = "";
  strips.length = 0;
  stripData.length = 0;

  const numStripsToShow = filteredProjects.length;

  // Update CSS custom property for dynamic strip width
  document.documentElement.style.setProperty("--strip-count", numStripsToShow);

  for (let i = 0; i < numStripsToShow; i++) {
    const project = filteredProjects[i];
    const strip = createStrip(project, i);
    strips.push(strip.element);
    stripData.push(strip.project);
  }
}

// Add filter event listeners
document.addEventListener("DOMContentLoaded", () => {
  // Add event listeners to all filter checkboxes
  const filterInputs = document.querySelectorAll('#filter-section input[type="checkbox"]');
  filterInputs.forEach((input) => {
    input.addEventListener("change", filterProjects);
  });
});
