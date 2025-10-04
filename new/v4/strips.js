import { projects, IMAGE_VERSION } from "./projects.js";
import { ensureAudio, playStripNote } from "./music.js";
import { router } from "./router.js";

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

// Update strip widths based on current count
function updateStripWidths() {
  const count = strips.length;
  if (count === 0) return;

  // If fewer than 24 strips, expand to fill width
  // Otherwise use 24 as the divisor for minimum width
  const divisor = count < 24 ? count : 24;
  const widthPercent = 100 / divisor;

  console.log(`[strips] ${count} strips, width: ${widthPercent}vw each`);

  strips.forEach((strip) => {
    strip.style.flex = `0 0 ${widthPercent}vw`;
    strip.style.minWidth = `${widthPercent}vw`;
    strip.style.maxWidth = `${widthPercent}vw`;

    // Add 'wide' class if strip is wider than 15vw for horizontal text
    if (widthPercent > 15) {
      strip.classList.add("wide");
    } else {
      strip.classList.remove("wide");
    }
  });
}
const list = shuffle([...projects]);

// Store original projects and filtered projects
let allProjects = [...list];
let filteredProjects = [...list];

const strips = [];
const stripImages = []; // Cache strip image elements for performance
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
  // Store image URL in data attribute for lazy loading (use first image from array)
  let imageUrl = Array.isArray(project.images) ? project.images[0] : project.image;
  // Add cache busting parameter if IMAGE_VERSION is defined
  if (typeof IMAGE_VERSION !== "undefined") {
    imageUrl = `${imageUrl}?v=${IMAGE_VERSION}`;
  }
  img.setAttribute("data-bg-image", imageUrl);

  // Create gradient overlay
  const gradient = document.createElement("div");
  gradient.className = "strip-gradient";

  // Create text element
  const text = document.createElement("div");
  text.className = "strip-text";
  text.textContent = project.title;

  div.appendChild(img);
  div.appendChild(gradient);
  div.appendChild(text);
  container.appendChild(div);

  // Add click handler to animate and navigate to project page
  div.addEventListener("click", () => {
    // Animate the strip expansion
    expandStrip(div, project);
  });

  return { element: div, project: project };
}

// Function to expand a strip to full width on top of others
function expandStrip(clickedStrip, project) {
  // Navigate immediately to project page (no animation)
  const projectId = project.title.toLowerCase().replace(/\s+/g, "-");
  router.navigate(`/project/${projectId}`, { project });
}

// Initialize strips - show all projects with dynamic width
for (let i = 0; i < filteredProjects.length; i++) {
  const project = filteredProjects[i];
  const strip = createStrip(project, i);
  strips.push(strip.element);
  stripData.push(strip.project);
  // Cache the image element for faster access
  stripImages.push(strip.element.querySelector(".strip-image"));
}

// Set strip widths based on count
updateStripWidths();

// Lazy load images using Intersection Observer
const imageObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const bgImage = img.getAttribute("data-bg-image");
        if (bgImage && !img.style.backgroundImage) {
          img.style.backgroundImage = `url('${bgImage}')`;
          img.classList.add("loaded");

          // Gradient extraction disabled
          // const strip = img.parentElement;
          // const gradient = strip.querySelector(".strip-gradient");
          // if (gradient) {
          //   extractColorFromImage(bgImage, (topColor, bottomColor) => {
          //     gradient.style.background = `linear-gradient(to bottom,
          //       rgba(${topColor.r}, ${topColor.g}, ${topColor.b}, 1) 0%,
          //       rgba(${topColor.r}, ${topColor.g}, ${topColor.b}, 0) 10%,
          //       rgba(${bottomColor.r}, ${bottomColor.g}, ${bottomColor.b}, 0) 90%,
          //       rgba(${bottomColor.r}, ${bottomColor.g}, ${bottomColor.b}, 1) 100%)`;
          //   });
          // }
        }
      }
    });
  },
  {
    root: container,
    rootMargin: "200px", // Load images 200px before they're visible
    threshold: 0,
  }
);

// Observe all strip images for lazy loading
strips.forEach((strip) => {
  const img = strip.querySelector(".strip-image");
  if (img) {
    imageObserver.observe(img);
  }
});

// Initialize router after strips are created
router.init();

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

// Throttle mouse movement for better performance
let rafId = null;
function throttledHandlePoint(e) {
  if (rafId) return;
  rafId = requestAnimationFrame(() => {
    handlePoint(e.clientX, e.clientY);
    // Resume animation when mouse moves
    isAnimating = true;
    idleFrames = 0;
    rafId = null;
  });
}

// Only listen for mouse events over the strips container
container.addEventListener("pointermove", throttledHandlePoint);

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
// Track visible strips for optimization
const visibleObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      const strip = entry.target;
      if (entry.isIntersecting) {
        strip.classList.add("visible");
      } else {
        strip.classList.remove("visible");
      }
    });
  },
  {
    root: container,
    rootMargin: "100px",
    threshold: 0,
  }
);

// Observe strips for visibility
strips.forEach((strip) => visibleObserver.observe(strip));

// Track last position to avoid unnecessary updates
let lastPosX = -1;
let lastPosY = -1;
let isAnimating = true;
let idleFrames = 0;
const IDLE_THRESHOLD = 60; // Stop after 1 second of no movement

function tick() {
  const prevX = curX;
  const prevY = curY;

  curX += (targetX - curX) * 0.18; // Simple ease factor
  curY += (targetY - curY) * 0.18;

  // Check if movement is significant enough to update
  const deltaX = Math.abs(curX - prevX);
  const deltaY = Math.abs(curY - prevY);
  const hasMovement = deltaX > 0.0001 || deltaY > 0.0001;

  if (!hasMovement) {
    idleFrames++;
    // Stop animating after idle threshold to save CPU
    if (idleFrames > IDLE_THRESHOLD && isAnimating) {
      isAnimating = false;
      console.log("[perf] Animation paused (idle)");
    }
  } else {
    idleFrames = 0;
    if (!isAnimating) {
      isAnimating = true;
      console.log("[perf] Animation resumed");
    }
  }

  // Only update DOM if there's actual movement and animation is active
  if (hasMovement && isAnimating) {
    const posX = (curX * 100).toFixed(1);
    const posY = (curY * 100).toFixed(1);

    // Only update if position actually changed
    if (posX !== lastPosX || posY !== lastPosY) {
      if (orientation === "vertical" && posX !== lastPosX) {
        // Use cached image elements instead of querying
        for (let i = 0; i < strips.length; i++) {
          if (!strips[i].classList.contains("visible")) continue;
          const img = stripImages[i];
          if (img && img.style.backgroundImage) {
            img.style.backgroundPosition = `${posX}% 50%`;
          }
        }
        lastPosX = posX;
      } else if (orientation === "horizontal" && posY !== lastPosY) {
        for (let i = 0; i < strips.length; i++) {
          if (!strips[i].classList.contains("visible")) continue;
          const img = stripImages[i];
          if (img && img.style.backgroundImage) {
            img.style.backgroundPosition = `50% ${posY}%`;
          }
        }
        lastPosY = posY;
      }
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
  const selectedTags = [];

  document.querySelectorAll('#filter-dropdown input[type="checkbox"]:checked').forEach((checkbox) => {
    const value = checkbox.value;
    if (["Light", "Installation", "Education", "AV", "Mixed Reality", "Stage"].includes(value)) {
      selectedTags.push(value);
    }
  });

  return { tags: selectedTags };
}

function filterProjects() {
  const { tags } = getSelectedFilters();

  // If no category filters are selected, show all projects
  if (tags.length === 0) {
    filteredProjects = [...allProjects];
  } else {
    filteredProjects = allProjects.filter((project) => {
      // Tag filtering: project.tags is an array, check if any selected tag is in project.tags
      return tags.some((tag) => project.tags.includes(tag));
    });
  }

  // Update strips with filtered projects
  container.innerHTML = "";
  strips.length = 0;
  stripData.length = 0;
  stripImages.length = 0;

  // Create strips for all filtered projects with fixed width
  for (let i = 0; i < filteredProjects.length; i++) {
    const project = filteredProjects[i];
    const strip = createStrip(project, i);
    strips.push(strip.element);
    stripData.push(strip.project);
    stripImages.push(strip.element.querySelector(".strip-image"));
  }

  // Re-observe new strips for lazy loading and visibility
  strips.forEach((strip, idx) => {
    const img = stripImages[idx];
    if (img) {
      imageObserver.observe(img);
    }
    visibleObserver.observe(strip);
  });

  // Update strip widths based on new count
  updateStripWidths();

  // Reset animation state
  lastPosX = -1;
  lastPosY = -1;
  isAnimating = true;
}

// Add filter event listeners
document.addEventListener("DOMContentLoaded", () => {
  // Add event listeners to all filter checkboxes
  const filterInputs = document.querySelectorAll('#filter-dropdown input[type="checkbox"]');

  filterInputs.forEach((input) => {
    input.addEventListener("change", () => {
      filterProjects();
    });
  });

  // Handle dropdown toggles
  const dropdownButtons = document.querySelectorAll(".filter-dropdown-button");

  dropdownButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      const dropdown = button.closest(".filter-dropdown");
      const isOpen = dropdown.classList.contains("open");

      // Close all dropdowns
      document.querySelectorAll(".filter-dropdown").forEach((d) => {
        d.classList.remove("open");
      });

      // Toggle current dropdown
      if (!isOpen) {
        dropdown.classList.add("open");
      }
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".filter-dropdown")) {
      document.querySelectorAll(".filter-dropdown").forEach((d) => {
        d.classList.remove("open");
      });
    }
  });
});
