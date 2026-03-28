#!/usr/bin/env node
import { rmSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";

const distDir = "dist";

if (existsSync(distDir)) {
  // Remove everything in dist except img/ (cached processed images)
  for (const entry of readdirSync(distDir)) {
    if (entry === "img") continue;
    rmSync(path.join(distDir, entry), { recursive: true, force: true });
  }
  console.log("Cleaned dist directory (preserved img cache)");
}

// Create base dist directory structure
mkdirSync(distDir, { recursive: true });
mkdirSync(path.join(distDir, "img"), { recursive: true });
mkdirSync(path.join(distDir, "about"), { recursive: true });
mkdirSync(path.join(distDir, "work"), { recursive: true });
console.log("Created dist directory structure");
