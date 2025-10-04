import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputDir = path.join(__dirname, 'images-backup');
const outputDir = path.join(__dirname, 'images');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function convertToWebP() {
  const files = fs.readdirSync(inputDir);
  let converted = 0;
  let skipped = 0;

  console.log(`Found ${files.length} files in ${inputDir}`);

  for (const file of files) {
    const inputPath = path.join(inputDir, file);
    const stat = fs.statSync(inputPath);

    // Skip directories
    if (stat.isDirectory()) {
      skipped++;
      continue;
    }

    // Process image files
    const ext = path.extname(file).toLowerCase();
    if (['.jpg', '.jpeg', '.png'].includes(ext)) {
      const baseName = path.basename(file, ext);
      const outputPath = path.join(outputDir, `${baseName}.webp`);

      try {
        await sharp(inputPath)
          .webp({
            quality: 85,
            effort: 6, // Higher effort = better compression (0-6)
          })
          .toFile(outputPath);

        const inputSize = stat.size;
        const outputSize = fs.statSync(outputPath).size;
        const savings = ((1 - outputSize / inputSize) * 100).toFixed(1);

        console.log(`✓ ${file} → ${baseName}.webp (${(inputSize / 1024).toFixed(0)}KB → ${(outputSize / 1024).toFixed(0)}KB, saved ${savings}%)`);
        converted++;
      } catch (error) {
        console.error(`✗ Error converting ${file}:`, error.message);
      }
    } else {
      skipped++;
    }
  }

  console.log(`\n✓ Conversion complete!`);
  console.log(`  Converted: ${converted} images`);
  console.log(`  Skipped: ${skipped} files`);
}

convertToWebP().catch(console.error);


