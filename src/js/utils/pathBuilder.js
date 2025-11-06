// Unified path builder - handles all projects (including about) uniformly
// This eliminates special cases throughout the codebase

const pathPrefix = window.__PATH_PREFIX__ || "";

export function getProjectPath(slug) {
  const base = pathPrefix || "";
  // About is at /about/, all other projects at /work/{slug}/
  const path = slug === "about" ? "/about/" : `/work/${slug}/`;
  return base + path;
}

