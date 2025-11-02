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

  // Hide intro when user scrolls down (but not on initial page load)
  let hasScrolled = false;
  let initialScrollY = window.scrollY;

  window.addEventListener("scroll", () => {
    const currentScrollY = window.scrollY;

    // Only hide if user has scrolled down from initial position
    if (!hasScrolled && currentScrollY > initialScrollY + 100) {
      hasScrolled = true;
      introSection.style.display = "none";
    }

    // Update initial scroll position to prevent false triggers
    initialScrollY = currentScrollY;
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
