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
  if (data.unlisted !== undefined && typeof data.unlisted !== 'boolean') fail('unlisted must be true or false');
  if (type !== 'work') return;
  if (!data.date || Number.isNaN(new Date(data.date).getTime())) fail('date must be a valid date');
  if (data.tags && (!Array.isArray(data.tags) || data.tags.some(tag => typeof tag !== 'string'))) fail('tags must be a list of text labels');
  if (data.years && (!Array.isArray(data.years) || data.years.some(year => !/^\d{4}$/.test(String(year))))) fail('years must be a list of four-digit years');
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
      if (block.pair !== undefined && block.pair !== false) fail(`${label}.pair can only be false`);
      if (block.type === 'video' && !block.alt?.trim()) fail(`${label}: video needs a text description`);
      if (block.type === 'video' && !block.ar) fail(`${label}: video needs an aspect ratio to reserve its space`);
      if (block.mobileSrc) asset(block.mobileSrc, `${label}.mobileSrc`);
      if (block.poster) asset(block.poster, `${label}.poster`);
      for (const field of ['focal', 'mobileFocal']) {
        if (block[field] && !/^(?:100|\d{1,2})(?:\.\d+)?% (?:100|\d{1,2})(?:\.\d+)?%$/.test(block[field])) fail(`${label}.${field} must contain two percentages`);
      }
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
    return [{ ...data, slug: entry.name, directory, type: data.type || 'work', tags: data.tags || [], years: (data.years || []).map(String), date: data.date ? new Date(data.date).toISOString() : null }];
  }).sort((a, b) => (new Date(b.date) - new Date(a.date)) || a.slug.localeCompare(b.slug, 'en'));
}

export function groupMedia(content) {
  // Printed, a row of tall images belongs on one sheet. Cropping a portrait
  // photograph to a 16:9 sheet throws most of it away, which is not true of a
  // landscape one, so only all-portrait rows group. A video prints as its
  // poster frame, so it counts as a panel; one without a poster prints
  // nothing, and a row with nothing printable never groups.
  const printable = item => item.type !== 'video' || !!item.poster;
  const printTogether = items => {
    const panels = items.filter(printable);
    return panels.length > 1 && panels.every(item => item.ar < 1);
  };
  const row = items => ({ type: 'row', items, arSum: items.reduce((sum, item) => sum + item.ar, 0), gutters: items.length - 1,
    printTogether: printTogether(items) });
  const media = block => block?.type === 'image' || block?.type === 'video';
  const start = block => block.colStart ?? SIZE_MAP[block.size]?.colStart;
  const span = block => block.colSpan ?? SIZE_MAP[block.size]?.colSpan;
  const foldable = (block, index) => index > 0 && media(block) && !block.size && !block.colStart && !block.colSpan && block.ar <= 1;
  const grouped = [];
  for (let i = 0; i < content.length; i++) {
    const a = content[i];
    // Keep complete authored rows together, including
    // mixed image/video triptychs. Resetting to column 1 starts a new row.
    if (i > 0 && media(a) && start(a) === 1) {
      let end = i, column = 1;
      while (media(content[end]) && start(content[end]) === column && span(content[end])) {
        column += span(content[end]);
        end++;
        if (column >= 13) break;
      }
      if (column === 13 && end - i > 1) {
        grouped.push(row(content.slice(i, end))); i = end - 1; continue;
      }
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

export function composeUltraWide(grouped) {
  // On an ultra-wide screen a full-width photograph runs far below the fold.
  // A standalone gallery image and the writing straight after it share the
  // width instead, sides alternating down the page; the other standalone
  // images pair up two by two, unless authored with `pair: false`. Elsewhere
  // these wrappers are transparent to layout. A banner (PLX's run 9:1 to
  // 23:1; no photograph passes 2.3:1) is already short at full width, and
  // beside writing it left the text taller than the picture, so it stays alone.
  const media = block => (block?.type === 'image' || block?.type === 'video') && block.ar <= 2.5;
  const result = [...grouped];
  let flip = false;
  for (let i = 1; i < result.length; i++) {
    if (!media(result[i]) || result[i + 1]?.type !== 'text') continue;
    let end = i + 1;
    while (result[end + 1]?.type === 'text') end++;
    result[i] = { ...result[i], spreadStart: true, spreadFlip: flip };
    result[end] = { ...result[end], spreadEnd: true };
    flip = !flip;
    i = end;
  }
  const pairable = block => media(block) && !block.spreadStart && block.pair !== false;
  for (let i = 1; i < result.length - 1; i++) {
    if (!pairable(result[i]) || !pairable(result[i + 1])) continue;
    result[i] = { ...result[i], pairStart: true };
    result[i + 1] = { ...result[i + 1], pairEnd: true };
    i++;
  }
  return result;
}
