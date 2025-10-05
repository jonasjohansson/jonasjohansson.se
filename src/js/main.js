// Main JS Entry Point - Minimal Setup

// Import functionality (router and strips initialize themselves)
import "./strips.js";
import "./router-simple.js";
import "./xylophone.js";
import { initCurtain } from "./curtain.js";

// Initialize curtain when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCurtain);
} else {
  initCurtain();
}
