// Main entry point - imports all application modules
import { CONFIG } from "./config/constants.js";

// Import core modules (they auto-execute on import)
import "./strips.js";
import "./curtain.js";

// Title change when user looks away
let awayTitleIndex = 0;

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    // User switched tabs - cycle through fun titles
    document.title = CONFIG.AWAY_TITLES[awayTitleIndex];
    awayTitleIndex = (awayTitleIndex + 1) % CONFIG.AWAY_TITLES.length;
  } else {
    // User came back - restore original title
    document.title = CONFIG.ORIGINAL_TITLE;
  }
});
