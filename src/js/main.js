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
    startAgeUpdater();
    if (window.__INITIAL_PROJECT__) applyProjectColor(window.__INITIAL_PROJECT__);
    initMelodyControls();
    initAsteroids();
  });
} else {
  initIntro();
  startAgeUpdater();
  if (window.__INITIAL_PROJECT__) applyProjectColor(window.__INITIAL_PROJECT__);
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
