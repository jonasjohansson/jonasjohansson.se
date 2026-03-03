// Strip parallax animation - handles cursor tracking and CSS custom property updates
import { clamp } from "./utils/helpers.js";
import { SETTINGS } from "./config/settings.js";

const { animation: { easeFactor, idleThresholdFrames } } = SETTINGS;

let stripsContainer = null;

// Eased cursor position (0..1)
let curX = 0.5, curY = 0.5;
// Instantaneous cursor position (0..1)
let targetX = 0.5, targetY = 0.5;
// Track last position to avoid unnecessary updates
let lastPosX = -1, lastPosY = -1;
let isAnimating = true;
let idleFrames = 0;

export function handlePoint(clientX, clientY) {
  const rect = stripsContainer.getBoundingClientRect();
  const nx = clamp((clientX - rect.left) / Math.max(1, rect.width), 0, 1);
  const ny = clamp((clientY - rect.top) / Math.max(1, rect.height), 0, 1);
  targetX = nx;
  targetY = ny;
}

// Throttle mouse movement for better performance
let rafId = null;
export function throttledHandlePoint(e) {
  if (rafId) return;
  rafId = requestAnimationFrame(() => {
    handlePoint(e.clientX, e.clientY);
    isAnimating = true;
    idleFrames = 0;
    rafId = null;
  });
}

function tick() {
  const prevX = curX;
  const prevY = curY;

  curX += (targetX - curX) * easeFactor;
  curY += (targetY - curY) * easeFactor;

  const deltaX = Math.abs(curX - prevX);
  const deltaY = Math.abs(curY - prevY);
  const hasMovement = deltaX > 0.0001 || deltaY > 0.0001;

  if (!hasMovement) {
    idleFrames++;
    if (idleFrames > idleThresholdFrames && isAnimating) {
      isAnimating = false;
    }
  } else {
    idleFrames = 0;
    if (!isAnimating) {
      isAnimating = true;
    }
  }

  if (hasMovement && isAnimating && stripsContainer) {
    const posX = (curX * 100).toFixed(1);
    const posY = (curY * 100).toFixed(1);

    if (posX !== lastPosX || posY !== lastPosY) {
      if (posX !== lastPosX) {
        stripsContainer.style.setProperty("--cursor-x", `${posX}%`);
        lastPosX = posX;
      }
      if (posY !== lastPosY) {
        stripsContainer.style.setProperty("--cursor-y", `${posY}%`);
        lastPosY = posY;
      }

      // Update per-strip background position for "eyes follow cursor" effect
      const strips = stripsContainer.querySelectorAll(".strip-image");
      const count = strips.length || 1;
      for (let i = 0; i < strips.length; i++) {
        // Selected: ease background position toward center for seamless hero transition
        const parent = strips[i].parentElement;
        if (parent?.classList.contains("selected") || parent?.classList.contains("not-selected")) {
          const currentBgX = parseFloat(strips[i].style.getPropertyValue("--bg-x")) || 50;
          const currentBgY = parseFloat(strips[i].style.getPropertyValue("--bg-y")) || 50;
          const easedX = (currentBgX + (50 - currentBgX) * 0.15).toFixed(1);
          const easedY = (currentBgY + (50 - currentBgY) * 0.15).toFixed(1);
          strips[i].style.setProperty("--bg-x", `${easedX}%`);
          strips[i].style.setProperty("--bg-y", `${easedY}%`);
          continue;
        }
        const stripNorm = count > 1 ? i / (count - 1) : 0.5;
        const bgX = (50 + (curX - stripNorm) * 15).toFixed(1);
        const bgY = (40 + curY * 20).toFixed(1);
        strips[i].style.setProperty("--bg-x", `${bgX}%`);
        strips[i].style.setProperty("--bg-y", `${bgY}%`);
      }
    }
  }

  requestAnimationFrame(tick);
}

export function resetAnimationState() {
  lastPosX = lastPosY = -1;
  isAnimating = true;
}

let animationStarted = false;

export function initAnimation(container) {
  stripsContainer = container;
  if (!animationStarted) {
    animationStarted = true;
    requestAnimationFrame(tick);
  }
}
