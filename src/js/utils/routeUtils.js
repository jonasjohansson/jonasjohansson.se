// Shared route utilities to avoid code duplication

const pathPrefix = window.__PATH_PREFIX__ || "";

/**
 * Get the current route from the URL
 * @returns {string} - "home", "about", or "project"
 */
export function getCurrentRoute() {
  const currentPath = window.location.pathname;
  const relativePath = pathPrefix ? currentPath.replace(pathPrefix, "") : currentPath;
  
  if (relativePath === "/about" || relativePath === "/about/") {
    return "about";
  } else if (relativePath === "/labs" || relativePath === "/labs/") {
    return "labs";
  } else if (relativePath.startsWith("/work/")) {
    return "project";
  } else {
    return "home";
  }
}

/**
 * Get the path prefix from window global
 * @returns {string}
 */
export function getPathPrefix() {
  return pathPrefix;
}

