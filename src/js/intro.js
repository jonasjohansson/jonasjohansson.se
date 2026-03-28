export function initIntro() {
  const intro = document.getElementById("intro");
  if (!intro) return;
  document.body.setAttribute("data-intro", "open");

  // Intercept internal links for SPA navigation
  intro.addEventListener("click", (e) => {
    const link = e.target.closest("a[href^='/']");
    if (!link) return;
    e.preventDefault();
    window.dispatchEvent(new CustomEvent("spa-navigate", { detail: { path: link.getAttribute("href") } }));
  });
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
