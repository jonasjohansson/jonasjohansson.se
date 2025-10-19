// Intro section with start button
export function initIntro() {
  const introSection = document.getElementById("intro-section");
  const startButton = document.getElementById("start-button");

  if (!introSection || !startButton) return;

  const isProjectPage = window.location.pathname.includes("/work/");

  if (isProjectPage) {
    introSection.remove();
    const stripsContainer = document.getElementById("strips");
    if (stripsContainer) stripsContainer.style.pointerEvents = "auto";
    return;
  }

  startButton.addEventListener("click", () => {
    const stripsContainer = document.getElementById("strips");
    if (stripsContainer) stripsContainer.style.pointerEvents = "auto";
    introSection.remove();
  });
}
