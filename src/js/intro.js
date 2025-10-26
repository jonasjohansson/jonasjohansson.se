// Intro section with scroll handling
export function initIntro() {
  const introSection = document.getElementById("intro-section");
  const stripsContainer = document.getElementById("strips");

  if (!introSection) return;

  // Check if we're on a project page
  const isProjectPage = window.location.pathname.includes("/work/");

  if (isProjectPage) {
    // Hide intro section on project pages
    introSection.remove();
    if (stripsContainer) stripsContainer.style.pointerEvents = "auto";
    return;
  }

  // Make strips interactive from start on home page
  if (stripsContainer) stripsContainer.style.pointerEvents = "auto";

  // Hide intro when scrolling past it
  let hasScrolled = false;

  window.addEventListener("scroll", () => {
    if (!hasScrolled && window.scrollY > 100) {
      hasScrolled = true;
      introSection.style.display = "none";

      // Stop asteroids game if running
      if (window.asteroidsGame) {
        window.asteroidsGame.stop();
      }
    }
  });

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
