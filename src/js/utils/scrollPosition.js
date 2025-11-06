// Helper function to get scroll position for content-wrapper (used for both home and project pages)
function getContentWrapperPosition() {
  const contentWrapper = document.getElementById("content-wrapper");
  if (contentWrapper) {
    const rect = contentWrapper.getBoundingClientRect();
    return rect.top + window.scrollY;
  }
  return 0;
}

// Export both names for backward compatibility
export const getStripsScrollPosition = getContentWrapperPosition;
export const getProjectScrollPosition = getContentWrapperPosition;
