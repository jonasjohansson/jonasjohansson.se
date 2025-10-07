// Main JS Entry Point - Minimal Setup

// Import functionality (router and strips initialize themselves)
import "./strips.js";
import "./router-simple.js";
import "./xylophone.js";
import { initCurtain } from "./curtain.js";
import { applyProjectColor } from "./strips.js";
import { melodyPlayer } from "./xylophone.js";

// Initialize curtain when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initCurtain();

    // Apply project color if we're on a project page
    if (window.__INITIAL_PROJECT__) {
      applyProjectColor(window.__INITIAL_PROJECT__);
    }

    // Initialize melody controls
    initMelodyControls();
  });
} else {
  initCurtain();

  // Apply project color if we're on a project page
  if (window.__INITIAL_PROJECT__) {
    applyProjectColor(window.__INITIAL_PROJECT__);
  }

  // Initialize melody controls
  initMelodyControls();
}

// Melody control functions
function initMelodyControls() {
  // Start with Mario melody enabled by default
  melodyPlayer.enableMelodyMode("mario");
  console.log('Mario melody enabled by default - strips now play "Super Mario Bros." melody');

  // Add keyboard controls for melody mode
  document.addEventListener("keydown", (e) => {
    // Press 'M' to toggle melody mode
    if (e.key.toLowerCase() === "m") {
      if (melodyPlayer.isMelodyMode) {
        melodyPlayer.disableMelodyMode();
        console.log("Melody mode disabled - strips now play individual notes");
      } else {
        melodyPlayer.enableMelodyMode("mario");
        console.log('Melody mode enabled - strips now play "Super Mario Bros." melody');
      }
    }
  });

  // Make melody player available globally for debugging
  window.melodyPlayer = melodyPlayer;
}
