#!/usr/bin/env node

import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const imagesDir = path.join(__dirname, "images");
const backupDir = path.join(__dirname, "images-backup");

// Create backup directory
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
  console.log("✓ Created backup directory");
}

// Get all image files
const files = fs.readdirSync(imagesDir).filter((file) => {
  const ext = path.extname(file).toLowerCase();
  return [".jpg", ".jpeg", ".png"].includes(ext) && file !== ".DS_Store";
});

console.log(`\n📸 Found ${files.length} images to optimize\n`);

let totalOriginalSize = 0;
let totalOptimizedSize = 0;
let processed = 0;

async function optimizeImage(filename) {
  const inputPath = path.join(imagesDir, filename);
  const backupPath = path.join(backupDir, filename);
  const ext = path.extname(filename).toLowerCase();

  try {
    // Get original file size
    const originalStats = fs.statSync(inputPath);
    const originalSize = originalStats.size;
    totalOriginalSize += originalSize;

    // Backup original
    fs.copyFileSync(inputPath, backupPath);

    // Read image to get dimensions
    const metadata = await sharp(inputPath).metadata();

    // Optimize based on file type
    if (ext === ".png") {
      // Convert PNG to JPG if it doesn't need transparency
      if (!metadata.hasAlpha) {
        const newFilename = filename.replace(/\.png$/i, ".jpg");
        const outputPath = path.join(imagesDir, newFilename);

        await sharp(inputPath)
          .jpeg({
            quality: 85,
            progressive: true,
            mozjpeg: true,
          })
          .resize(2400, 2400, {
            fit: "inside",
            withoutEnlargement: true,
          })
          .toFile(outputPath);

        // Remove old PNG
        fs.unlinkSync(inputPath);

        const newStats = fs.statSync(outputPath);
        totalOptimizedSize += newStats.size;

        console.log(`✓ ${filename} → ${newFilename}`);
        console.log(
          `  ${(originalSize / 1024 / 1024).toFixed(2)}MB → ${(newStats.size / 1024 / 1024).toFixed(2)}MB (${(
            (1 - newStats.size / originalSize) *
            100
          ).toFixed(1)}% smaller)\n`
        );

        return { oldName: filename, newName: newFilename };
      } else {
        // Keep as PNG but optimize
        await sharp(inputPath)
          .png({
            quality: 85,
            compressionLevel: 9,
            progressive: true,
          })
          .resize(2400, 2400, {
            fit: "inside",
            withoutEnlargement: true,
          })
          .toFile(inputPath + ".tmp");

        fs.renameSync(inputPath + ".tmp", inputPath);
      }
    } else {
      // Optimize JPG
      await sharp(inputPath)
        .jpeg({
          quality: 85,
          progressive: true,
          mozjpeg: true,
        })
        .resize(2400, 2400, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .toFile(inputPath + ".tmp");

      fs.renameSync(inputPath + ".tmp", inputPath);
    }

    const newStats = fs.statSync(inputPath);
    totalOptimizedSize += newStats.size;

    const savedPercent = ((1 - newStats.size / originalSize) * 100).toFixed(1);
    console.log(`✓ ${filename}`);
    console.log(
      `  ${(originalSize / 1024 / 1024).toFixed(2)}MB → ${(newStats.size / 1024 / 1024).toFixed(2)}MB (${savedPercent}% smaller)\n`
    );

    return null;
  } catch (error) {
    console.error(`✗ Error processing ${filename}:`, error.message);
    return null;
  }
}

// Process all images
console.log("🚀 Starting optimization...\n");

const renames = [];

for (const file of files) {
  const rename = await optimizeImage(file);
  if (rename) renames.push(rename);
  processed++;
}

console.log("\n" + "=".repeat(50));
console.log("✨ OPTIMIZATION COMPLETE!\n");
console.log(`Processed: ${processed} images`);
console.log(`Original size: ${(totalOriginalSize / 1024 / 1024).toFixed(2)}MB`);
console.log(`Optimized size: ${(totalOptimizedSize / 1024 / 1024).toFixed(2)}MB`);
console.log(
  `Total saved: ${((totalOriginalSize - totalOptimizedSize) / 1024 / 1024).toFixed(2)}MB (${(
    (1 - totalOptimizedSize / totalOriginalSize) *
    100
  ).toFixed(1)}%)`
);
console.log(`\n💾 Original images backed up to: ${backupDir}`);

if (renames.length > 0) {
  console.log("\n⚠️  PNG files converted to JPG - Update projects.js:");
  renames.forEach((r) => {
    console.log(`  ${r.oldName} → ${r.newName}`);
  });
}

console.log("\n");

