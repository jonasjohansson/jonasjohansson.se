// Unified path builder - handles all projects (including about) uniformly
// This eliminates special cases throughout the codebase

import { getPathPrefix } from "./routeUtils.js";

export function getProjectPath(slug) {
  const base = getPathPrefix();
  const path = `/${slug}/`;
  return base + path;
}

