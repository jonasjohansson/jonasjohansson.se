export function initIntro() {
  const intro = document.getElementById("intro");
  if (!intro) return;
  document.body.setAttribute("data-intro", "open");
}

export function hideIntro() {
  const intro = document.getElementById("intro");
  if (intro) {
    intro.classList.add("intro-hidden");
    document.body.setAttribute("data-intro", "closed");
  }
}

export function showIntro() {
  const intro = document.getElementById("intro");
  if (!intro) return;
  intro.classList.remove("intro-hidden");
  document.body.setAttribute("data-intro", "open");
}
