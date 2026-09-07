#!/usr/bin/env node
import { rmSync } from 'node:fs';
rmSync('.cache/images', { recursive: true, force: true });
rmSync('dist/img', { recursive: true, force: true });
console.log('Cleared generated images and their cache');
