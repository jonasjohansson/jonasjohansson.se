import "./strips.js";
import "./router-simple.js";
import "./xylophone.js";
// Remove resume import since we're using static content
import { applyProjectColor } from "./strips.js";
import { melodyPlayer } from "./xylophone.js";
import { initAsteroids } from "./asteroids.js";
import { loadingManager } from "./utils/loadingManager.js";
import { getStripsScrollPosition } from "./utils/scrollPosition.js";

// Consolidated initialization function
async function initializeApp() {
  // Wait for fonts to be ready to avoid FOUT
  try {
    await document.fonts.load("14px OffBit");
    await document.fonts.ready;
  } catch {}

  // Reveal loading screen after font is ready
  const loadingScreen = document.getElementById("loading-screen");
  if (loadingScreen) loadingScreen.classList.add("show");

  // Start loading process
  await loadingManager.preloadStripImages();

  // Handle initial project if present
  if (window.__INITIAL_PROJECT__) {
    console.log("Initial project found:", window.__INITIAL_PROJECT__);
    // Add a small delay to ensure DOM is fully ready
    setTimeout(() => {
      applyProjectColor(window.__INITIAL_PROJECT__);
    }, 100);

    // Also try again after a longer delay as a fallback
    setTimeout(() => {
      const currentColor = getComputedStyle(document.documentElement).getPropertyValue("--project-accent-color");
      if (!currentColor || currentColor.trim() === "") {
        console.log("Retrying color extraction...");
        applyProjectColor(window.__INITIAL_PROJECT__);
        // Final fallback: sample first image on page
        try {
          const firstImg = document.querySelector("#projects img, .project-grid img, .media-item img");
          if (firstImg && firstImg.src) {
            import("./strips.js").then((m) => m.applyProjectColorFromImageUrl && m.applyProjectColorFromImageUrl(firstImg.src));
          }
        } catch {}
      }
    }, 1000);
  }

  initMelodyControls();
  initAsteroids();
  initHeaderButtons();

  // Auto-scroll to strips/projects after a short delay to ensure layout is ready
  setTimeout(() => {
    autoScrollToContent();
  }, 200);
}

// Auto-scroll to appropriate section based on page type
function autoScrollToContent() {
  // Check if we're on a project page
  const isProjectPage = window.location.pathname.includes("/work/") || window.__INITIAL_PROJECT__;

  // Always scroll directly to content-wrapper
  const contentWrapper = document.getElementById("content-wrapper");
  if (contentWrapper) {
    const aboutHeight = window.innerHeight * 0.8; // 80vh about section height
    // Scroll to position content-wrapper at the top of viewport (right after about section)
    window.scrollTo({
      top: aboutHeight,
      behavior: "auto", // Instant scroll
    });
  }
}

// Single initialization handler
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  // If DOM is already loaded, start loading immediately
  initializeApp();
}

function initMelodyControls() {
  const randomMelody = melodyPlayer.selectRandomMelody();
  melodyPlayer.enableMelodyMode(randomMelody);

  document.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "m") {
      if (melodyPlayer.isMelodyMode) {
        melodyPlayer.disableMelodyMode();
      } else {
        const newRandomMelody = melodyPlayer.selectRandomMelody();
        melodyPlayer.enableMelodyMode(newRandomMelody);
      }
    }
  });

  window.melodyPlayer = melodyPlayer;
}

function initHeaderButtons() {
  const headerToggle = document.getElementById("header-toggle");
  const aboutSection = document.getElementById("about-section");

  if (!headerToggle || !aboutSection) return;

  // Get content-wrapper scroll position
  const getContentWrapperPosition = () => {
    const aboutHeight = window.innerHeight * 0.8; // 80vh about section height
    return aboutHeight;
  };

  headerToggle.addEventListener("click", () => {
    const currentScrollY = window.scrollY;
    const contentWrapperPosition = getContentWrapperPosition();
    const threshold = 100; // Threshold to determine if we're "at top" or "at content"

    if (currentScrollY < threshold) {
      // Currently near top, scroll to content-wrapper
      window.scrollTo({
        top: contentWrapperPosition,
        behavior: "smooth",
      });
      aboutSection.classList.remove("visible");
    } else {
      // Currently scrolled down, scroll to top
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
      aboutSection.classList.add("visible");
    }
  });

  // Track scroll position to update about section visibility
  window.addEventListener("scroll", () => {
    const currentScrollY = window.scrollY;

    // Show about when near top, hide when scrolled down
    if (currentScrollY < 50) {
      aboutSection.classList.add("visible");
    } else {
      aboutSection.classList.remove("visible");
    }
  });
}

// Set default scroll position to show 30vh of strips at bottom
function setDefaultScrollPosition() {
  window.scrollTo({
    top: getStripsScrollPosition(),
    behavior: "auto", // Instant, no animation
  });
}
