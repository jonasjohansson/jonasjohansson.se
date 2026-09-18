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
  // Remove some neutral grey before darkening, so the sampled hue remains
  // visible without lifting the shadows. Never add a grey floor.
  const neutral = Math.min(...channels) * 0.65;
  const peak = Math.max(...channels.map(value => value - neutral), 1);
  const tint = '#' + channels.map(value => Math.round((value - neutral) / peak * 24).toString(16).padStart(2, '0')).join('');
  const overlays = shade ? await printShade(tint, shade) : {};
  return { src: image.url, width: image.width, height: image.height, tint, shade, ...overlays };
}

// Bake both fades into PNG alpha rather than exporting nested SVG/CSS masks.
// One continuous image avoids seams where PDF renderers join alpha tiles.
async function printShade(tint, opacity) {
  const key = createHash('sha256').update(`${tint}-${opacity}-rgba-shade-v3`).digest('hex').slice(0, 12);
  const rgb = [1, 3, 5].map(start => parseInt(tint.slice(start, start + 2), 16));
  const urls = {};
  for (const [name, height] of [['shadeBody', 800]]) {
    const filename = `print-shade/${key}-${name}.png`;
    const output = path.join(imageCache, filename);
    if (!existsSync(output)) {
      const width = 800;
      const pixels = Buffer.alloc(width * height * 4);
      // Both fades ease the whole way out. A ramp that holds full strength and
      // then turns leaves a visible shoulder where the falloff begins.
      const ease = value => { const t = Math.min(1, Math.max(0, value)); return t * t * (3 - 2 * t); };
      for (let y = 0; y < height; y++) {
        const vertical = ease((1 - y / (height - 1)) / 0.55);
        for (let x = 0; x < width; x++) {
          const horizontal = ease((1 - x / (width - 1)) / 0.62);
          const offset = (y * width + x) * 4;
          pixels[offset] = rgb[0]; pixels[offset + 1] = rgb[1]; pixels[offset + 2] = rgb[2];
          pixels[offset + 3] = Math.round(255 * opacity * horizontal * vertical);
        }
      }
      mkdirSync(path.dirname(output), { recursive: true });
      await sharp(pixels, { raw: { width, height, channels: 4 } }).png().toFile(output);
    }
    urls[name] = `${prefix}/img/${filename}`;
  }
  return urls;
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
  return {
    src: metadata.webp[0].url,
    avif: srcset(metadata.avif),
    webp: srcset(metadata.webp),
    width: metadata.webp[0].width,
    height: metadata.webp[0].height,
  };
}

export async function responsiveImage(src, alt = '', className = 'media-img', sizes = 'calc(100vw - 48px)', mobileSrc = null) {
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

export function ogFingerprint(src, focal = null) {
  return createHash('sha256').update(readFileSync(src)).update('og-1200x630-oriented-srgb-q90-v2').update(focal || 'attention').digest('hex').slice(0, 12);
}

export async function ogImage(src, slug, focal = null) {
  const filename = `og/${slug}-${ogFingerprint(src, focal)}.jpg`;
  const output = path.join(imageCache, filename);
  if (!existsSync(output)) {
    mkdirSync(path.dirname(output), { recursive: true });
    let preview = sharp(src).rotate().toColourspace('srgb');
    if (focal) {
      const metadata = await sharp(src).metadata();
      const rotated = metadata.orientation >= 5;
      const sourceWidth = rotated ? metadata.height : metadata.width;
      const sourceHeight = rotated ? metadata.width : metadata.height;
      const scale = Math.max(1200 / sourceWidth, 630 / sourceHeight);
      const width = Math.ceil(sourceWidth * scale), height = Math.ceil(sourceHeight * scale);
      const [x, y] = focal.split(' ').map(value => parseFloat(value) / 100);
      preview = preview.resize(width, height, { fit: 'fill' }).extract({
        left: Math.round((width - 1200) * x), top: Math.round((height - 630) * y), width: 1200, height: 630,
      });
    } else {
      preview = preview.resize(1200, 630, { fit: 'cover', position: sharp.strategy.attention });
    }
    await preview.jpeg({ quality: 90, mozjpeg: true }).toFile(output);
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

// The dominant colour of an image as hue, saturation and lightness (0–360, 0–1, 0–1).
export async function imageColour(file) {
  const { dominant: { r, g, b } } = await sharp(file).stats();
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B), d = max - min, l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) h = ((max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4) * 60 + 360) % 360;
  return { hue: h, saturation: s, lightness: l };
}
