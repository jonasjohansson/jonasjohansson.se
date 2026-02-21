// Text scramble effect - cycles through random characters before resolving to target text
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const FRAME_DURATION = 40;
const RESOLVE_STEPS = 8;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let activeAnimation = null;

export function scrambleText(element, newText, { duration = RESOLVE_STEPS } = {}) {
  if (!element) return;

  const target = newText.toUpperCase();
  const oldText = (element.textContent || "").trim();

  // Skip if text is already the same
  if (oldText === target) return;

  // Cancel any running animation
  if (activeAnimation) {
    cancelAnimationFrame(activeAnimation.raf);
    activeAnimation = null;
  }

  // Instant update for reduced motion
  if (prefersReducedMotion.matches) {
    element.textContent = target;
    return;
  }

  const length = Math.max(oldText.length, target.length);
  let step = 0;
  const totalSteps = duration;

  function update() {
    let result = "";
    for (let i = 0; i < length; i++) {
      const progress = step / totalSteps;
      const charProgress = Math.max(0, (progress - i / length / 2) * 2);

      if (charProgress >= 1 && i < target.length) {
        result += target[i];
      } else if (i < target.length) {
        // Keep characters that are already correct
        if (oldText[i] === target[i]) {
          result += target[i];
        } else {
          result += CHARS[Math.floor(Math.random() * CHARS.length)];
        }
      }
    }

    element.textContent = result;
    step++;

    if (step <= totalSteps) {
      activeAnimation = {
        raf: requestAnimationFrame(() => setTimeout(update, FRAME_DURATION)),
      };
    } else {
      element.textContent = target;
      activeAnimation = null;
    }
  }

  update();
}
