import "./strips.js";
import "./router-simple.js";
import "./xylophone.js";
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
    if (window.__INITIAL_PROJECT__) applyProjectColor(window.__INITIAL_PROJECT__);
    initMelodyControls();
    initAsteroids();
  });
} else {
  initIntro();
  initHeaderToggle();
  startAgeUpdater();
  if (window.__INITIAL_PROJECT__) applyProjectColor(window.__INITIAL_PROJECT__);
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
