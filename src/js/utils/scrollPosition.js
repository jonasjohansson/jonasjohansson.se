// Helper function to calculate scroll position to show 30vh of strips
export function getStripsScrollPosition() {
  const aboutHeight = window.innerHeight * 0.8; // 80vh
  const stripsVisibleHeight = window.innerHeight * 0.3; // 30vh
  return aboutHeight - (window.innerHeight - stripsVisibleHeight);
}

// Helper function to get scroll position for project pages
export function getProjectScrollPosition() {
  const aboutHeight = window.innerHeight * 0.8;
  return aboutHeight; // Show project content right below about
}
