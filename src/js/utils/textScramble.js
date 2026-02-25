export function scrambleText(element, newText) {
  if (!element) return;
  element.textContent = newText.toUpperCase();
}
