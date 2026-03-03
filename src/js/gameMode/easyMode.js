// Layout toggle: cycles through normal → horizontal → list → normal
// Controlled by a visible icon button in the header

const LAYOUTS = ["normal", "horizontal", "list"];
const STORAGE_KEY = "jj-layout";

let currentLayout = "normal";
let toggleBtn = null;

function readStoredLayout() {
  return "normal";
}

function writeStoredLayout(layout) {
  // No persistence - always start in normal (vertical) mode
}

function applyLayout(layout) {
  document.body.classList.remove("layout-horizontal", "layout-list");
  if (layout === "horizontal") {
    document.body.classList.add("layout-horizontal");
  } else if (layout === "list") {
    document.body.classList.add("layout-list");
  }
  updateIcon();
}

function updateIcon() {
  if (!toggleBtn) return;
  // Vertical bars = normal, horizontal bars = horizontal, list = list
  if (currentLayout === "normal") {
    toggleBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1" y="1" width="4" height="16" fill="currentColor"/><rect x="7" y="1" width="4" height="16" fill="currentColor"/><rect x="13" y="1" width="4" height="16" fill="currentColor"/></svg>`;
    toggleBtn.title = "Switch to horizontal layout";
  } else if (currentLayout === "horizontal") {
    toggleBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1" y="1" width="16" height="4" fill="currentColor"/><rect x="1" y="7" width="16" height="4" fill="currentColor"/><rect x="1" y="13" width="16" height="4" fill="currentColor"/></svg>`;
    toggleBtn.title = "Switch to list layout";
  } else {
    toggleBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1" y="1" width="16" height="2.5" fill="currentColor"/><rect x="1" y="5.5" width="16" height="2.5" fill="currentColor"/><rect x="1" y="10" width="16" height="2.5" fill="currentColor"/><rect x="1" y="14.5" width="16" height="2.5" fill="currentColor"/></svg>`;
    toggleBtn.title = "Switch to default layout";
  }
}

function createToggleButton() {
  toggleBtn = document.createElement("button");
  toggleBtn.className = "layout-toggle";
  toggleBtn.setAttribute("aria-label", "Toggle layout");
  toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const idx = LAYOUTS.indexOf(currentLayout);
    const next = LAYOUTS[(idx + 1) % LAYOUTS.length];
    currentLayout = next;
    writeStoredLayout(next);
    applyLayout(next);
  });
  updateIcon();
  return toggleBtn;
}

export const layoutToggle = {
  init() {
    currentLayout = readStoredLayout();
    if (!document.querySelector(".layout-toggle")) {
      const btn = createToggleButton();
      document.body.appendChild(btn);
    }
    applyLayout(currentLayout);
  },

  get current() {
    return currentLayout;
  },
};
