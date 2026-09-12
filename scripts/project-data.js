import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

export const SIZE_MAP = {
  full: { colStart: 1, colSpan: 12 },
  large: { colStart: 2, colSpan: 10 },
  left: { colStart: 1, colSpan: 7 },
  right: { colStart: 6, colSpan: 7 },
  'half-left': { colStart: 1, colSpan: 6 },
  'half-right': { colStart: 7, colSpan: 6 },
  'small-left': { colStart: 1, colSpan: 5 },
  'small-right': { colStart: 8, colSpan: 5 },
};

export function validateProject(data, slug, directory) {
  const fail = message => { throw new Error(`projects/${slug}/data.md: ${message}`); };
  const asset = (value, field) => {
    if (typeof value !== 'string' || !value.trim()) fail(`${field} must name a local file`);
    const resolved = path.resolve(directory, value);
    if (!resolved.startsWith(path.resolve(directory) + path.sep) || !existsSync(resolved)) fail(`${field}: missing or invalid file ${value}`);
  };
  if (typeof data.title !== 'string' || !data.title.trim()) fail('title must be non-empty text');
  const type = data.type || 'work';
  if (!['work', 'lab', 'placeholder'].includes(type)) fail(`unknown type ${type}`);
  if (data.date && Number.isNaN(new Date(data.date).getTime())) fail('date must be a valid date');
  if (type !== 'work') return;
  if (!data.date || Number.isNaN(new Date(data.date).getTime())) fail('date must be a valid date');
  if (data.tags && (!Array.isArray(data.tags) || data.tags.some(tag => typeof tag !== 'string'))) fail('tags must be a list of text labels');
  if (data.color && !/^#[\da-f]{6}$/i.test(data.color)) fail('color must be a six-digit hex colour');
  if (!Array.isArray(data.blocks) || !data.blocks.length) fail('blocks must contain project content');
  const hero = data.blocks[0];
  if (!['image', 'video'].includes(hero?.type)) fail('the first block must be a hero image or video');
  if (typeof hero.alt !== 'string' || !hero.alt.trim()) fail('the hero needs an authored alt description');
  if (hero.type === 'video' && !hero.poster) fail('the hero video needs a poster image for its initial frame and sharing preview');
  data.blocks.forEach((block, index) => {
    const label = `blocks[${index}]`;
    if (!block || typeof block !== 'object') fail(`${label} must be a content block`);
    if (!['image', 'video', 'audio', 'text', 'credits'].includes(block.type)) fail(`${label}: unknown type ${block.type}`);
    if (block.size && !SIZE_MAP[block.size]) fail(`${label}.size: unknown size ${block.size}`);
    for (const field of ['colStart', 'colSpan']) {
      if (block[field] !== undefined && (!Number.isInteger(block[field]) || block[field] < 1 || block[field] > 12)) fail(`${label}.${field} must be an integer from 1 to 12`);
    }
    if (block.colStart && block.colSpan && block.colStart + block.colSpan > 13) fail(`${label}: column placement exceeds the grid`);
    if (block.ar !== undefined && (typeof block.ar !== 'number' || !Number.isFinite(block.ar) || block.ar <= 0)) fail(`${label}.ar must be a positive aspect ratio`);
    if (block.type === 'image' || block.type === 'video') {
      asset(block.src, `${label}.src`);
      if (block.zoom !== undefined && (block.type !== 'image' || typeof block.zoom !== 'number' || !Number.isFinite(block.zoom) || block.zoom < 1 || block.zoom > 3)) fail(`${label}.zoom must be an image scale between 1 and 3`);
      if (block.alt !== undefined && typeof block.alt !== 'string') fail(`${label}.alt must be text`);
      if (block.type === 'video' && !block.alt?.trim()) fail(`${label}: video needs a text description`);
      if (block.type === 'video' && !block.ar) fail(`${label}: video needs an aspect ratio to reserve its space`);
      if (block.mobileSrc) asset(block.mobileSrc, `${label}.mobileSrc`);
      if (block.poster) asset(block.poster, `${label}.poster`);
      for (const field of ['focal', 'mobileFocal']) {
        if (block[field] && !/^(?:100|\d{1,2})(?:\.\d+)?% (?:100|\d{1,2})(?:\.\d+)?%$/.test(block[field])) fail(`${label}.${field} must contain two percentages`);
      }
      if (block.heroFit && !['cover', 'contain'].includes(block.heroFit)) fail(`${label}.heroFit must be cover or contain`);
    }
    if (block.type === 'text' && typeof block.content !== 'string') fail(`${label}.content must be text`);
    if (block.type === 'audio') {
      asset(block.src, `${label}.src`);
      if (typeof block.label !== 'string' || !block.label.trim()) fail(`${label}.label must describe the audio sample`);
    }
    if (block.fontSize !== undefined && typeof block.fontSize !== 'string') fail(`${label}.fontSize must be text`);
    if (block.type === 'credits' && (!Array.isArray(block.credits) || block.credits.some(value => typeof value !== 'string'))) fail(`${label}.credits must be a list of text`);
  });
}

export function readProjects(root = 'projects') {
  return readdirSync(root, { withFileTypes: true }).filter(entry => entry.isDirectory() && entry.name !== 'about').flatMap(entry => {
    const directory = path.join(root, entry.name);
    const filename = path.join(directory, 'data.md');
    if (!existsSync(filename)) return [];
    let data;
    try { data = matter(readFileSync(filename, 'utf8')).data; }
    catch (cause) { throw new Error(`${filename}: ${cause.message}`, { cause }); }
    validateProject(data, entry.name, directory);
    return [{ ...data, slug: entry.name, directory, type: data.type || 'work', tags: data.tags || [], date: data.date ? new Date(data.date).toISOString() : null }];
  }).sort((a, b) => (new Date(b.date) - new Date(a.date)) || a.slug.localeCompare(b.slug, 'en'));
}

export function groupMedia(content) {
  const row = items => ({ type: 'row', items, arSum: items.reduce((sum, item) => sum + item.ar, 0), gutters: items.length - 1 });
  const foldable = (block, index) => index > 0 && block?.type === 'image' && !block.size && !block.colStart && block.ar <= 1;
  const grouped = [];
  for (let i = 0; i < content.length; i++) {
    const a = content[i], b = content[i + 1];
    if (i > 0 && a.type === 'image' && b?.type === 'image' && a.size === 'half-left' && b.size === 'half-right') {
      grouped.push(row([a, b])); i++; continue;
    }
    if (foldable(a, i)) {
      let end = i;
      while (foldable(content[end + 1], end + 1)) end++;
      if (end > i) {
        const items = content.slice(i, end + 1);
        const count = Math.ceil(items.length / 4);
        const small = Math.floor(items.length / count);
        let offset = 0;
        for (let j = 0; j < count; j++) {
          const length = small + (j < items.length % count ? 1 : 0);
          grouped.push(row(items.slice(offset, offset + length))); offset += length;
        }
        i = end; continue;
      }
    }
    grouped.push(a);
  }
  return grouped;
}

// Pair only adjacent standalone media. Text and authored rows end each run,
// and an odd final item keeps the full width on large screens.
export function pairDesktopMedia(content) {
  const result = content.map(block => ({ ...block }));
  const media = block => block?.type === 'image' || block?.type === 'video';
  for (let i = 1; i < result.length - 1; i++) {
    if (media(result[i]) && media(result[i + 1])) {
      result[i].desktopPair = result[i + 1].desktopPair = true;
      i++;
    }
  }
  return result;
}
