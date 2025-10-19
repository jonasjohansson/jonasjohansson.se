// Intro section with start button and text flow
export function initIntro() {
  const introSection = document.getElementById("intro-section");
  const startButton = document.getElementById("start-button");
  const stripsContainer = document.getElementById("strips");

  if (!introSection) return;

  // Make strips interactive from start on all pages
  if (stripsContainer) stripsContainer.style.pointerEvents = "auto";

  // Remove start button functionality since header now controls the toggle
  if (startButton) {
    startButton.style.display = "none";
  }

  // Initialize text flow for about section
  initTextFlow();
}

// Handle automatic text flow across columns
function initTextFlow() {
  const aboutText = document.querySelector(".about-text");

  if (!aboutText) return;

  // Text will automatically flow across the 4 columns defined in CSS
  // No JavaScript manipulation needed for fixed column layout
}
