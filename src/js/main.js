import "./strips.js";
import "./router.js";
import { applyProjectColor, initializeStrips } from "./strips.js";
import { loadingManager } from "./utils/loadingManager.js";
import { createScrambler } from "./utils/scrambleText.js";
import "./melody.js";

async function initializeApp() {
  // Non-blocking initializations
  document.fonts?.load("14px OffBit").catch(() => {});
  loadingManager.preloadStripImages().catch(() => {});
  if (document.getElementById("strips")) {
    import("./xylophone.js").catch(() => {});
  }

  // Initialize strips
  initializeStrips();

  // Show UI elements
  const elements = {
    header: document.getElementById("header"),
    filterContainer: document.getElementById("filter-dropdown-container"),
  };

  if (elements.header) elements.header.style.display = "";
  if (elements.filterContainer) elements.filterContainer.style.display = "";

  // Apply project color if on project page
  if (window.__INITIAL_PROJECT__) {
    setTimeout(() => applyProjectColor(window.__INITIAL_PROJECT__), 100);
  }

  initHeaderButtons();
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}

function initHeaderButtons() {
  const headerToggle = document.getElementById("header-toggle");
  if (!headerToggle) return;

  const headerSubtitle = document.getElementById("header-subtitle");
  const headerLinks = document.getElementById("header-links");
  const headerCenter = headerToggle.closest(".header-center");

  if (!headerSubtitle || !headerLinks || !headerCenter) return;

  // Create scrambler for EMAIL link
  const emailLink = headerLinks.querySelector('a[href^="mailto"]');
  
  // Store original text
  const emailText = emailLink ? emailLink.textContent.trim() : "";
  
  // Initialize link with scrambled text (it's hidden initially)
  if (emailLink && emailText) {
    emailLink.textContent = "#####";
  }
  
  const emailScrambler = emailLink ? createScrambler(emailLink, {
    duration: 400,
    frameDelay: 30,
  }) : null;

  // Check if device supports hover (desktop)
  const supportsHover = window.matchMedia("(hover: hover)").matches;

  function showLinks() {
    headerSubtitle.style.display = "none";
    headerLinks.style.display = "flex";
    
    // Scramble EMAIL link to its actual text
    if (emailScrambler && emailLink && emailText) {
      emailScrambler.scramble(emailText);
    }
  }

  function showSubtitle() {
    headerSubtitle.style.display = "";
    headerLinks.style.display = "none";
    
    // Reset link to scrambled text for next appearance
    if (emailLink && emailText) {
      emailLink.textContent = "#####";
    }
  }

  // Get about overlay
  const aboutOverlay = document.getElementById("about-overlay");
  
  function showAboutOverlay() {
    if (!aboutOverlay) return;
    aboutOverlay.classList.add("visible");
    // Prevent body scroll when overlay is open
    document.body.style.overflow = "hidden";
  }
  
  function hideAboutOverlay() {
    if (!aboutOverlay) return;
    aboutOverlay.classList.remove("visible");
    // Restore body scroll
    document.body.style.overflow = "";
  }
  
  function toggleAboutOverlay() {
    if (!aboutOverlay) return;
    const isVisible = aboutOverlay.classList.contains("visible");
    if (isVisible) {
      hideAboutOverlay();
    } else {
      showAboutOverlay();
    }
  }
  
  // Close overlay when clicking outside content or pressing Escape
  if (aboutOverlay) {
    aboutOverlay.addEventListener("click", (e) => {
      if (e.target === aboutOverlay) {
        hideAboutOverlay();
      }
    });
    
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && aboutOverlay.classList.contains("visible")) {
        hideAboutOverlay();
      }
    });
  }

  if (supportsHover) {
    // Desktop: show links on hover, toggle overlay on click
    headerCenter.addEventListener("mouseenter", showLinks);
    headerCenter.addEventListener("mouseleave", showSubtitle);
    headerCenter.addEventListener("click", (e) => {
      e.preventDefault();
      toggleAboutOverlay();
    });
  } else {
    // Touch devices: toggle overlay on click
    headerToggle.addEventListener("click", () => {
      toggleAboutOverlay();
      
      // Remove focus to prevent hover state from persisting on mobile
      headerToggle.blur();
      headerCenter.blur();
    });
  }
}

