#!/usr/bin/env node

import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const imagesDir = path.join(__dirname, "images");

// Get all image files
const files = fs.readdirSync(imagesDir).filter((file) => {
  const ext = path.extname(file).toLowerCase();
  return [".jpg", ".jpeg", ".png"].includes(ext) && file !== ".DS_Store";
});

console.log("\n📸 Aggressive optimization for large files...\n");

let totalSaved = 0;
let optimizedCount = 0;

async function optimizeIfLarge(filename) {
  const inputPath = path.join(imagesDir, filename);
  const ext = path.extname(filename).toLowerCase();

  try {
    const originalStats = fs.statSync(inputPath);
    const originalSize = originalStats.size;
    const originalMB = originalSize / 1024 / 1024;

    // Only optimize files larger than 400KB
    if (originalSize < 400 * 1024) {
      return;
    }

    const metadata = await sharp(inputPath).metadata();

    if (ext === ".png") {
      // Convert ALL PNGs to JPG
      const newFilename = filename.replace(/\.png$/i, ".jpg");
      const outputPath = path.join(imagesDir, newFilename);

      await sharp(inputPath)
        .flatten({ background: { r: 255, g: 255, b: 255 } }) // White background for transparency
        .jpeg({
          quality: 75,
          progressive: true,
          mozjpeg: true,
        })
        .resize(1920, 1920, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .toFile(outputPath);

      // Remove old PNG
      fs.unlinkSync(inputPath);

      const newStats = fs.statSync(outputPath);
      const newSize = newStats.size;
      const newMB = newSize / 1024 / 1024;
      const savedMB = (originalSize - newSize) / 1024 / 1024;
      const savedPercent = ((1 - newSize / originalSize) * 100).toFixed(1);

      totalSaved += savedMB;
      optimizedCount++;

      console.log(`✓ ${filename} → ${newFilename}`);
      console.log(`  ${originalMB.toFixed(2)}MB → ${newMB.toFixed(2)}MB (saved ${savedMB.toFixed(2)}MB / ${savedPercent}%)\n`);
      return;
    } else {
      // More aggressive JPEG optimization
      await sharp(inputPath)
        .jpeg({
          quality: 75, // Lower quality for web
          progressive: true,
          mozjpeg: true,
        })
        .resize(1920, 1920, {
          // Reduce from 2400 to 1920
          fit: "inside",
          withoutEnlargement: true,
        })
        .toFile(inputPath + ".tmp");
    }

    fs.renameSync(inputPath + ".tmp", inputPath);

    const newStats = fs.statSync(inputPath);
    const newSize = newStats.size;
    const newMB = newSize / 1024 / 1024;
    const savedMB = (originalSize - newSize) / 1024 / 1024;
    const savedPercent = ((1 - newSize / originalSize) * 100).toFixed(1);

    totalSaved += savedMB;
    optimizedCount++;

    console.log(`✓ ${filename}`);
    console.log(`  ${originalMB.toFixed(2)}MB → ${newMB.toFixed(2)}MB (saved ${savedMB.toFixed(2)}MB / ${savedPercent}%)\n`);
  } catch (error) {
    console.error(`✗ Error processing ${filename}:`, error.message);
  }
}

// Process all images
for (const file of files) {
  await optimizeIfLarge(file);
}

console.log("\n" + "=".repeat(50));
console.log("✨ AGGRESSIVE OPTIMIZATION COMPLETE!\n");
console.log(`Files optimized: ${optimizedCount}`);
console.log(`Total saved: ${totalSaved.toFixed(2)}MB`);
console.log("\n");
