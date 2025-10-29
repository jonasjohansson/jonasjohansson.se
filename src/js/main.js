import "./strips.js";
import "./router-simple.js";
import "./xylophone.js";
// Remove resume import since we're using static content
import { applyProjectColor } from "./strips.js";
import { melodyPlayer } from "./xylophone.js";
import { initAsteroids } from "./asteroids.js";
import { loadingManager } from "./utils/loadingManager.js";

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
  const contentWrapper = document.getElementById("content-wrapper");

  if (!headerToggle || !aboutSection || !contentWrapper) return;

  headerToggle.addEventListener("click", () => {
    const isVisible = aboutSection.classList.contains("visible");

    if (isVisible) {
      // Close about section
      aboutSection.classList.remove("visible");
      contentWrapper.classList.remove("shifted");
    } else {
      // Open about section
      aboutSection.classList.add("visible");
      contentWrapper.classList.add("shifted");
    }
  });
}
