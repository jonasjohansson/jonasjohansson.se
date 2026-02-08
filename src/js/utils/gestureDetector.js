// Shared swipe direction detection utility
// Used by strips touch handling and xylophone touch handling

/**
 * Detect swipe direction from touch coordinates
 * @param {number} startX - Touch start X position
 * @param {number} startY - Touch start Y position
 * @param {number} currentX - Current touch X position
 * @param {number} currentY - Current touch Y position
 * @param {number} threshold - Minimum delta to detect direction (default: 10)
 * @returns {'horizontal' | 'vertical' | null} - Detected direction or null if below threshold
 */
export function detectSwipeDirection(startX, startY, currentX, currentY, threshold = 10) {
  const deltaX = Math.abs(currentX - startX);
  const deltaY = Math.abs(currentY - startY);

  if (deltaX > deltaY && deltaX > threshold) {
    return "horizontal";
  }
  if (deltaY > deltaX && deltaY > threshold) {
    return "vertical";
  }
  return null;
}
