#!/usr/bin/env node
import { rmSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

const distDir = "dist";

if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true, force: true });
  console.log("Cleaned dist directory");
}

// Create base dist directory - Eleventy will create subdirectories as needed
mkdirSync(distDir, { recursive: true });
mkdirSync(path.join(distDir, "img"), { recursive: true });
mkdirSync(path.join(distDir, "about"), { recursive: true });
mkdirSync(path.join(distDir, "work"), { recursive: true });
console.log("Created dist directory structure");
