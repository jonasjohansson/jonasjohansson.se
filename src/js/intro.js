export function initIntro() {
  const introSection = document.getElementById("intro-section");
  const stripsContainer = document.getElementById("strips");
  if (!introSection) return;

  // Remove intro on project pages
  if (window.location.pathname.includes("/work/")) {
    introSection.remove();
    stripsContainer && (stripsContainer.style.pointerEvents = "auto");
    return;
  }

  // Enable strips interaction
  if (stripsContainer) stripsContainer.style.pointerEvents = "auto";

  // Hide intro when user scrolls down
  let initialScrollY = window.scrollY;
  window.addEventListener("scroll", () => {
    if (window.scrollY > initialScrollY + 100) {
      introSection.style.display = "none";
    }
    initialScrollY = window.scrollY;
  });
}
