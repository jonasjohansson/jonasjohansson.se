import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';

// Always develop from the original camera JPEGs, never from a previous grade.
// Usage: node scripts/grade-klattermusen.mjs <shoot/photos> <output-directory>
const [sourceDirectory, outputDirectory] = process.argv.slice(2);
if (!sourceDirectory || !outputDirectory) {
  throw new Error('Provide the original shoot/photos directory and an output directory.');
}
if (resolve(sourceDirectory) === resolve(outputDirectory)) {
  throw new Error('Keep the camera originals in a separate directory.');
}

// Display-referred curves lift midtones and shadows while retaining white detail.
// Per-channel application also gently softens dense colour saturation.
const photographs = [
  ['Aplus_DSCF8998.JPG', 'finished-rug.jpg', 0.70, 0.018],
  ['Aplus_DSCF8997.JPG', 'verkstad-detail.jpg', 0.76, 0.015],
  ['Aplus_DSCF8992.JPG', 'mouse-detail.jpg', 0.74, 0.015],
  ['A_DSCF8995.JPG', 'flower-detail.jpg', 0.74, 0.015],
  ['Aplus_DSCF9005.JPG', 'store-interior.jpg', 0.68, 0.020],
  ['A_DSCF9001.JPG', 'shopfront.jpg', 0.82, 0.010],
];

await mkdir(outputDirectory, { recursive: true });
for (const [source, output, exponent, blackLift] of photographs) {
  const { data, info } = await sharp(join(sourceDirectory, source))
    .rotate()
    .resize({ width: 3200, height: 3200, fit: 'inside', withoutEnlargement: true })
    .toColourspace('srgb')
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const curve = Uint8Array.from({ length: 256 }, (_, value) =>
    Math.round(255 * (blackLift + (1 - blackLift) * (value / 255) ** exponent))
  );
  for (let index = 0; index < data.length; index++) data[index] = curve[data[index]];
  await sharp(data, { raw: info })
    .jpeg({ quality: 95, mozjpeg: true })
    .toFile(join(outputDirectory, output));
  console.log(`${output}: ${info.width} × ${info.height}, curve ${exponent}, black lift ${blackLift}`);
}
