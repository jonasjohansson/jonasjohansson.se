// Unified path builder - handles all projects (including about) uniformly
// This eliminates special cases throughout the codebase

import { getPathPrefix } from "./routeUtils.js";

export function getProjectPath(slug) {
  const base = getPathPrefix();
  // About is at /about/, all other projects at /work/{slug}/
  const path = slug === "about" ? "/about/" : `/work/${slug}/`;
  return base + path;
}

