// Shared route utilities to avoid code duplication

const pathPrefix = window.__PATH_PREFIX__ || "";

// Known non-project routes
const nonProjectPaths = ["/", "/index.html", ""];

/**
 * Get the current route from the URL
 * @returns {string} - "home" or "project"
 */
export function getCurrentRoute() {
  const currentPath = window.location.pathname;
  const relativePath = pathPrefix ? currentPath.replace(pathPrefix, "") : currentPath;
  const normalized = relativePath.replace(/\/$/, "") || "/";

  if (normalized === "/labs") {
    return "labs";
  }
  if (nonProjectPaths.includes(relativePath) || normalized === "/") {
    return "home";
  }
  return "project";
}

/**
 * Get the path prefix from window global
 * @returns {string}
 */
export function getPathPrefix() {
  return pathPrefix;
}

/**
 * Extract the current project slug from the URL
 * @returns {string|null}
 */
export function getCurrentProjectSlug() {
  const path = window.location.pathname.replace(pathPrefix, "");
  const match = path.match(/^\/([^\/]+)\/?$/);
  return match ? match[1] : null;
}
