import "./strips.js";
import "./router-simple.js";
import "./xylophone.js";
// Remove resume import since we're using static content
import { applyProjectColor } from "./strips.js";
import { melodyPlayer } from "./xylophone.js";
import { startAgeUpdater } from "./utils/ageCalculator.js";
import { initAsteroids } from "./asteroids.js";

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    startAgeUpdater();
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
        }
      }, 1000);
    }
    initMelodyControls();
    initAsteroids();
  });
} else {
  startAgeUpdater();
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
