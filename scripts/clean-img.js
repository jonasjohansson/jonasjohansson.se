#!/usr/bin/env node
import { rmSync, mkdirSync, existsSync } from "node:fs";

const imgDir = "dist/img";

if (existsSync(imgDir)) {
  rmSync(imgDir, { recursive: true, force: true });
  console.log("Cleaned dist/img directory");
}

mkdirSync(imgDir, { recursive: true });
console.log("Created dist/img directory");

