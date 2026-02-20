// Shared application state - replaces window globals for cross-module communication

let currentProjectTitle = "";
let programmaticScroll = false;

export function getCurrentProjectTitle() {
  return currentProjectTitle;
}

export function setCurrentProjectTitle(title) {
  currentProjectTitle = title;
}

export function setProgrammaticScroll(value) {
  programmaticScroll = value;
}
