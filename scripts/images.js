import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import Image from '@11ty/eleventy-img';
import sharp from 'sharp';

export const imageCache = '.cache/images';
const prefix = (process.env.PATH_PREFIX || '').replace(/^\/$/, '').replace(/\/$/, '');
const imageOptions = {
  formats: ['avif', 'webp'],
  outputDir: imageCache,
  urlPath: `${prefix}/img`,
  sharpWebpOptions: { quality: 90 },
  sharpAvifOptions: { quality: 75 },
};

const escape = value => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const srcset = entries => entries.map(image => `${image.url} ${image.width}w`).join(', ');

// JPEG stays compressed inside exported PDFs; preserve the original composition.
export async function printImage(src, focal = '50% 50%') {
  const metadata = await Image(src, {
    ...imageOptions, formats: ['jpeg'], widths: [1600],
    sharpJpegOptions: { quality: 85, mozjpeg: true },
  });
  const image = metadata.jpeg.at(-1);
  // Measure the part of the actual cover crop behind the copy. Dark images
  // need no overlay; brighter ones get only enough local shade for white type.
  const scale = Math.max(320 / image.width, 180 / image.height);
  const width = Math.ceil(image.width * scale), height = Math.ceil(image.height * scale);
  const [x, y] = focal.split(' ').map(value => parseFloat(value) / 100);
  const crop = await sharp(src).rotate().resize(width, height, { fit: 'fill' })
    .extract({ left: Math.round((width - 320) * x), top: Math.round((height - 180) * y), width: 320, height: 180 })
    .extract({ left: 15, top: 15, width: 100, height: 135 })
    .removeAlpha().toColourspace('srgb').raw().toBuffer();
  const brightness = [];
  for (let i = 0; i < crop.length; i += 3) brightness.push(0.2126 * crop[i] + 0.7152 * crop[i + 1] + 0.0722 * crop[i + 2]);
  brightness.sort((a, b) => a - b);
  const high = brightness[Math.floor(brightness.length * 0.98)];
  const shade = high <= 70 ? 0 : +Math.min(0.82, 1 - 60 / high).toFixed(2);
  const { dominant } = await sharp(src).rotate().resize(64, 64, { fit: 'inside' }).removeAlpha().stats();
  const channels = [dominant.r, dominant.g, dominant.b];
  const peak = Math.max(...channels, 1);
  // No lifted grey floor: retain a trace of hue in an almost-black ink.
  const tint = '#' + channels.map(value => Math.round(value / peak * 12).toString(16).padStart(2, '0')).join('');
  return { src: image.url, width: image.width, height: image.height, tint, shade };
}

export async function imageMetadata(src, widths = [640, 1280, 1920]) {
  try {
    return await Image(src, { ...imageOptions, widths });
  } catch (cause) {
    throw new Error(`Cannot process image ${src}: ${cause.message}`, { cause });
  }
}

export async function stripImage(src) {
  const metadata = await imageMetadata(src, [320, 640, 1280, 1920]);
  const wall = await Promise.all([1, 2].map(async density => {
    const crop = await sharp(src).rotate().resize(160 * density, 1000 * density, { fit: 'cover' }).png().toBuffer();
    const encoded = await Image(crop, { ...imageOptions, widths: [160 * density] });
    return { density, encoded };
  }));
  return {
    src: metadata.webp[0].url,
    avif: srcset(metadata.avif),
    webp: srcset(metadata.webp),
    width: metadata.webp[0].width,
    height: metadata.webp[0].height,
    wallAvif: wall.map(({ density, encoded }) => `${encoded.avif[0].url} ${density}x`).join(', '),
    wallWebp: wall.map(({ density, encoded }) => `${encoded.webp[0].url} ${density}x`).join(', '),
  };
}

export async function responsiveImage(src, alt = '', className = 'media-img', sizes = '(max-width: 768px) calc(100vw - 48px), calc(100vw - 112px)', mobileSrc = null) {
  const metadata = await imageMetadata(src);
  const lcp = className.split(' ').includes('lcp');
  const fallback = metadata.webp.at(-1);
  let sources = '';
  if (mobileSrc) {
    const mobile = await imageMetadata(mobileSrc);
    for (const format of ['avif', 'webp']) {
      const first = mobile[format][0];
      sources += `<source media="(max-width: 768px)" type="image/${format}" srcset="${escape(srcset(mobile[format]))}" sizes="${escape(sizes)}" width="${first.width}" height="${first.height}">`;
    }
  }
  for (const format of ['avif', 'webp']) {
    sources += `<source type="image/${format}" srcset="${escape(srcset(metadata[format]))}" sizes="${escape(sizes)}">`;
  }
  return `<picture>${sources}<img src="${fallback.url}" alt="${escape(alt)}" class="${escape(className)}" width="${fallback.width}" height="${fallback.height}" loading="${lcp ? 'eager' : 'lazy'}" decoding="async"${lcp ? ' fetchpriority="high"' : ''}></picture>`;
}

export function ogFingerprint(src) {
  return createHash('sha256').update(readFileSync(src)).update('og-1200x630-attention-q82-v1').digest('hex').slice(0, 12);
}

export async function ogImage(src, slug) {
  const filename = `og/${slug}-${ogFingerprint(src)}.jpg`;
  const output = path.join(imageCache, filename);
  if (!existsSync(output)) {
    mkdirSync(path.dirname(output), { recursive: true });
    await sharp(src).resize(1200, 630, { fit: 'cover', position: sharp.strategy.attention }).jpeg({ quality: 82, mozjpeg: true }).toFile(output);
  }
  return `${prefix}/img/${filename}`;
}

export function* walkFiles(directory) {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* walkFiles(filename);
    else yield filename;
  }
}

// Cache files stay outside the deployment. Only URLs used by the rendered site
// are copied, including srcsets and the higher-resolution hover candidates.
export function publishImages(outputDir = 'dist') {
  const referenced = new Set();
  for (const filename of walkFiles(outputDir)) {
    if (!/\.(html|css|js|xml)$/.test(filename)) continue;
    for (const match of readFileSync(filename, 'utf8').matchAll(/\/img\/([a-zA-Z0-9_./-]+\.(?:avif|webp|jpe?g|png))/g)) {
      const relative = match[1];
      if (relative.includes('..')) throw new Error(`Invalid image path in ${filename}: ${relative}`);
      // /assets/img is passed through separately, not generated by this pipeline.
      if (!existsSync(path.join(imageCache, relative))) {
        if (existsSync(path.join(outputDir, 'assets/img', relative))) continue;
        throw new Error(`Missing generated image ${relative}, referenced by ${filename}`);
      }
      referenced.add(relative);
    }
  }
  for (const relative of referenced) {
    const output = path.join(outputDir, 'img', relative);
    mkdirSync(path.dirname(output), { recursive: true });
    copyFileSync(path.join(imageCache, relative), output);
  }
  writeFileSync(path.join(outputDir, 'image-manifest.json'), JSON.stringify([...referenced].sort().map(filename => `${prefix}/img/${filename}`), null, 2) + '\n');
}
