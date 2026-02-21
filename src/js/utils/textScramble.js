// Text scramble effect - cycles through random characters before resolving to target text
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const FRAME_DURATION = 30;
const RESOLVE_STEPS = 6;

let activeAnimation = null;

export function scrambleText(element, newText, { duration = RESOLVE_STEPS } = {}) {
  if (!element) return;

  // Cancel any running animation
  if (activeAnimation) {
    cancelAnimationFrame(activeAnimation.raf);
    activeAnimation = null;
  }

  const oldText = element.textContent || "";
  const target = newText.toUpperCase();
  const length = Math.max(oldText.length, target.length);
  let step = 0;
  const totalSteps = duration;

  function update() {
    let result = "";
    for (let i = 0; i < length; i++) {
      const progress = step / totalSteps;
      // Characters resolve left-to-right with a slight stagger
      const charProgress = Math.max(0, (progress - i / length / 2) * 2);

      if (charProgress >= 1 && i < target.length) {
        result += target[i];
      } else if (i < target.length) {
        result += CHARS[Math.floor(Math.random() * CHARS.length)];
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
