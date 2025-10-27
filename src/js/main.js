import "./strips.js";
import "./router-simple.js";
import "./xylophone.js";
// Remove resume import since we're using static content
import { applyProjectColor } from "./strips.js";
import { melodyPlayer } from "./xylophone.js";
import { startAgeUpdater } from "./utils/ageCalculator.js";
import { initIntro } from "./intro.js";
import { initAsteroids } from "./asteroids.js";

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initIntro();
    initHeaderToggle();
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
  initIntro();
  initHeaderToggle();
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

function initHeaderToggle() {
  const header = document.getElementById("header");
  const introSection = document.getElementById("intro-section");
  const stripsWrapper = document.getElementById("strips-wrapper");

  let isAboutVisible = false;

  if (header && introSection && stripsWrapper) {
    header.addEventListener("click", (e) => {
      e.preventDefault();

      if (isAboutVisible) {
        // Hide about, show strips
        introSection.classList.remove("visible");
        stripsWrapper.classList.remove("shifted");
        isAboutVisible = false;
      } else {
        // Show about, hide strips
        introSection.style.display = ""; // Clear any display: none
        introSection.classList.add("visible");
        stripsWrapper.classList.add("shifted");
        isAboutVisible = true;
      }
    });
  }
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
