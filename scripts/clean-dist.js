#!/usr/bin/env node
import { cpSync, rmSync, mkdirSync, existsSync } from 'node:fs';

// Migrate the previous cache once, then keep clean output separate from it.
if (!existsSync('.cache/images') && existsSync('dist/img')) {
  mkdirSync('.cache', { recursive: true });
  cpSync('dist/img', '.cache/images', { recursive: true });
}
rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });
console.log('Cleaned build output; retained .cache/images');
