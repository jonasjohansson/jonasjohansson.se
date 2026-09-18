import { readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import markdownIt from 'markdown-it';
import sharp from 'sharp';
import nunjucks from 'nunjucks';
import htmlMinifier from 'html-minifier-terser';
import { readProjects, SIZE_MAP, groupMedia, pairDesktopMedia } from './scripts/project-data.js';
import { responsiveImage, stripImage, ogImage, imageMetadata, publishImages, printImage, imageColour } from './scripts/images.js';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const md = markdownIt({ html: true, breaks: false, linkify: true });
const prefix = (process.env.PATH_PREFIX || '').replace(/^\/$/, '').replace(/\/$/, '');
const renderMarkdown = text => md.render(text || '').replace(/<a href="(https?:\/\/[^"]*)">/g, '<a href="$1" target="_blank" rel="noopener noreferrer">');
const stripHtml = text => String(text || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();

function creditsMarkup(credits) {
  const groups = new Map();
  for (const credit of credits) {
    const match = credit.match(/^([^:[\]()]+):\s+(.+)$/);
    const role = match ? match[1].trim() : '';
    const value = match ? match[2].trim() : credit.trim();
    const html = renderMarkdown(value).replace(/^<p>|<\/p>\n?$/g, '');
    if (!groups.has(role)) groups.set(role, []);
    groups.get(role).push(html);
  }
  return [...groups].map(([role, values]) => (role ? `${role}: ` : '') + values.join(', '));
}

async function buildProject(project) {
  const content = await Promise.all(project.blocks.map(async (block, index) => {
    const placement = block.size ? SIZE_MAP[block.size] : {};
    const colStart = block.colStart ?? placement.colStart ?? null;
    const colSpan = block.colSpan ?? placement.colSpan ?? null;
    if (block.type === 'image') {
      const src = `${project.directory}/${block.src}`;
      const metadata = await sharp(src).metadata();
      // Responsive image generation applies EXIF orientation, so layout must
      // use the displayed dimensions rather than the stored sensor dimensions.
      const aspectRatio = meta => meta.orientation >= 5 ? meta.height / meta.width : meta.width / meta.height;
      const ar = block.ar ?? aspectRatio(metadata);
      const mobileSrc = block.mobileSrc ? `${project.directory}/${block.mobileSrc}` : null;
      const mobile = mobileSrc ? await sharp(mobileSrc).metadata() : metadata;
      return { ...block, src, mobileSrc, alt: block.alt || '', ar, mobileAr: aspectRatio(mobile),
        focal: block.focal || '50% 50%', mobileFocal: block.mobileFocal || block.focal || '50% 50%',
        heroFit: block.heroFit || 'cover', colStart, colSpan,
        sizes: index === 0 ? 'calc(100vw - 48px)' : mediaSizes(colSpan, ar) };
    }
    if (block.type === 'video') {
      let poster = null;
      if (block.poster) {
        const images = await imageMetadata(`${project.directory}/${block.poster}`, index === 0 ? [640, 1280, 1920] : [640, 1280]);
        poster = images.webp.at(-1).url;
      }
      return { ...block, src: `/${project.directory}/${block.src}`, poster, colStart, colSpan,
        mobileAr: block.ar, focal: block.focal || '50% 50%',
        mobileFocal: block.mobileFocal || block.focal || '50% 50%', heroFit: block.heroFit || 'cover' };
    }
    if (block.type === 'audio') {
      return { ...block, src: `/${project.directory}/${block.src}`, colStart: colStart || 2, colSpan: colSpan || 10 };
    }
    if (block.type === 'text') {
      return { type: 'text', content: renderMarkdown(block.content), colStart: colStart || 2, colSpan: colSpan || 10,
        fontSizeClass: block.fontSize?.includes('small') || block.fontSize?.includes('1.2') ? 'text-small' : block.fontSize ? 'text-medium' : 'text-large' };
    }
    return { type: 'credits', credits: creditsMarkup(block.credits), colStart: colStart || 1, colSpan: colSpan || 12 };
  }));
  const grouped = pairDesktopMedia(groupMedia(content));
  for (const [index, block] of grouped.entries()) {
    if (index > 0 && block.type === 'image') block.sizes = mediaSizes(block.colSpan, block.ar, block.desktopPair);
    if (block.type !== 'row') continue;
    for (const item of block.items) {
      // Each image takes its aspect-ratio share of the full-width row.
      const fraction = item.ar / block.arSum;
      const vw = +(fraction * 100).toFixed(3);
      const inset = +((48 + 16 * block.gutters) * fraction).toFixed(3);
      item.sizes = `(max-width: 768px) calc(100vw - 48px), calc(${vw}vw - ${inset}px)`;
    }
  }
  const firstImage = content[0].type === 'video' ? `${project.directory}/${project.blocks[0].poster}` : content[0].src;
  const [thumbnail, og, colour] = await Promise.all([stripImage(firstImage), ogImage(firstImage, project.slug, project.blocks[0].focal), imageColour(firstImage)]);
  // One full-bleed page per project: opening statement, introduction and hero.
  const printMedia = await Promise.all(project.blocks
    .filter(block => block.type === 'image' || (block.type === 'video' && block.poster))
    .slice(0, 1).map(async block => ({
      ...await printImage(`${project.directory}/${block.type === 'video' ? block.poster : block.src}`, block.focal),
      alt: block.alt || '',
    })));
  // The portfolio gives each project one page, so its cover copy stays short.
  // A project printed on its own carries all of its writing on that cover.
  const textBlocks = content.filter(block => block.type === 'text');
  const printCopy = textBlocks.slice(0, 2);
  const printCopyFull = textBlocks;
  // Every cover is one sheet. Growing onto a second one only ever repeated the
  // same photograph, so writing that would overrun is set smaller instead.
  //
  // Solving a scale per project needs the copy's real height, and a character
  // count predicts that too loosely to trust near the edge of a sheet: the
  // fixed part of a cover (title, margins, link) ranges from 39mm to 72mm
  // between projects. So the rule is flat. A project that would overrun takes
  // one scale, small enough for the longest of them — dome-dreaming has the
  // most copy in the portfolio and measures 182mm of a 190.5mm sheet at 0.7 —
  // and every other project is left alone at full size. The estimate below
  // only chooses which projects scale, where being a couple of millimetres out
  // costs nothing; it never sets the scale. The print check measures all 34
  // covers, so copy that still runs long fails there rather than being clipped
  // out of a PDF unnoticed.
  const copyChars = stripHtml(printCopyFull.map(block => block.content).join(' ')).replace(/\s+/g, ' ').trim().length;
  const paragraphs = printCopyFull.reduce((count, block) => count + (block.content.match(/<p[\s>]/g) || []).length, 0);
  const LONG_COPY_MM = 184;
  const LONG_COPY_SCALE = 0.7; // 9pt copy prints at 6.3pt.
  const estimated = 48 + 0.07 * copyChars + 3.1 * paragraphs;
  const printCopyScale = estimated > LONG_COPY_MM ? LONG_COPY_SCALE : 1;
  const { slug, title, date, tags, color = null } = project;
  return { slug, title, date, tags, color, year: new Date(date).getFullYear(), years: project.years || [], type: 'work', unlisted: !!project.unlisted,
    content: grouped, thumbnail, colour, ogImage: og, printMedia, printCopy, printCopyFull, printCopyScale, presskit: project.presskit || null,
    description: stripHtml(content.find(block => block.type === 'text')?.content).slice(0, 160) };
}

function mediaSizes(span, ar, paired = false) {
  const track = span && span < 12 ? `calc(${+(span / 12 * 100).toFixed(3)}vw - ${+(48 * span / 12 + 32 * (1 - span / 12)).toFixed(3)}px)` : 'calc(100vw - 48px)';
  const desktop = ar < 1 ? `min(${track}, calc((100vh - 192px) * ${+ar.toFixed(4)}))` : track;
  const large = !paired ? 'calc(100vw - 48px)' : ar < 1 ? `min(calc(50vw - 32px), calc((100vh - 192px) * ${+ar.toFixed(4)}))` : 'calc(50vw - 32px)';
  return `(min-width: 1440px) ${large}, (max-width: 768px) calc(100vw - 48px), ${desktop}`;
}

export default function (eleventyConfig) {
  for (const pattern of ['jonasjohansson.se/**', 'projects/**/data.md', 'README.md', 'docs/**', 'screenshots/**', 'tests/**', '.cache/**']) eleventyConfig.ignores.add(pattern);
  eleventyConfig.setServerOptions({ domdiff: false, headers: { 'Cache-Control': 'no-store' } });
  eleventyConfig.addWatchTarget('projects/**/*');
  eleventyConfig.addWatchTarget('src/**/*');
  eleventyConfig.addWatchTarget('scripts/**/*');
  eleventyConfig.setWatchJavaScriptDependencies(false);
  eleventyConfig.addPassthroughCopy({ 'src/favicon': 'favicon', 'src/img': 'assets/img' });
  eleventyConfig.addPassthroughCopy('CNAME');
  eleventyConfig.addPassthroughCopy('projects/**/*.{mp4,webm,mov,mp3,m4a,ogg,wav}');
  eleventyConfig.setLibrary('njk', nunjucks.configure({ autoescape: true, trimBlocks: true, lstripBlocks: true }));
  eleventyConfig.addGlobalData('buildYear', new Date().getFullYear());
  eleventyConfig.addFilter('isoDate', value => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toISOString().slice(0, 10) : '');
  eleventyConfig.addFilter('markdown', renderMarkdown);
  eleventyConfig.addFilter('stripHtml', stripHtml);
  eleventyConfig.addFilter('truncate', (text, max = 160) => text?.length > max ? text.slice(0, max) + '…' : text || '');
  eleventyConfig.addFilter('findFirstText', blocks => blocks?.find(block => block.type === 'text')?.content || '');
  eleventyConfig.addFilter('jsonScript', value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026'));
  eleventyConfig.addNunjucksAsyncShortcode('responsiveImage', responsiveImage);
  eleventyConfig.addGlobalData('siteOgImage', () => ogImage('src/img/jonasjohansson-firestarter.jpg', 'site'));

  let siteData;
  function getSiteData() {
    if (!siteData) siteData = (async () => {
      const all = readProjects();
      const work = await Promise.all(all.filter(project => project.type === 'work').map(buildProject));
      // The wall runs around the colour wheel so neighbouring strips relate;
      // greys and near-blacks gather at the end, darkest last.
      const wallKey = ({ colour }) => colour.saturation < 0.15 ? 360 + (1 - colour.lightness) * 30 : colour.hue;
      // Unlisted projects keep their page but stay off the wall, filters and print portfolio.
      const wall = work.filter(project => !project.unlisted).sort((a, b) => wallKey(a) - wallKey(b));
      return { work, wall };
    })();
    return siteData;
  }
  eleventyConfig.addGlobalData('projects', async () => (await getSiteData()).work.map(({ slug, title, date, tags, color, unlisted }) => ({ slug, title, date, tags, color, unlisted: !!unlisted })));
  eleventyConfig.addGlobalData('projectContent', async () => Object.fromEntries((await getSiteData()).work.map(project => [project.slug, project])));
  eleventyConfig.addGlobalData('projectsForJS', async () => (await getSiteData()).wall.map(({ slug, title, color, tags, year, years }) => ({
    slug, title, color,
    // Year filters follow project dates without changing the authored categories.
    // A project spanning several years lists them in `years`; the date's year is always included.
    tags: year >= 2023 ? [...new Set([...tags, String(year), ...years])] : [...new Set([...tags, ...years])],
  })));
  eleventyConfig.addGlobalData('collectionItems', async () => (await getSiteData()).wall);

  eleventyConfig.addFilter("viteAsset", (filename) => {
    const isJS = filename.endsWith(".js");
    const isCSS = filename.endsWith(".css");
    const isFont = /\.(woff2?|ttf|otf)$/.test(filename);
    const subdir = isJS ? "js" : isCSS ? "css" : isFont ? "fonts" : "";
    const distPath = path.join(projectRoot, "dist", "assets", subdir);
    if (!existsSync(distPath)) return `/assets/${filename}`;
    const files = readdirSync(distPath);
    const ext = filename.split(".").pop();
    const pattern = new RegExp(`^${filename.replace(/\.[^.]+$/, "")}\\.[a-zA-Z0-9_-]+\\.${ext}$`);
    const matches = files.filter((file) => pattern.test(file));
    const match = matches.sort(
      (a, b) => statSync(path.join(distPath, b)).mtime.getTime() - statSync(path.join(distPath, a)).mtime.getTime()
    )[0];
    return match ? `/assets/${subdir}/${match}` : `/assets/${filename}`;
  });


  const projectRedirects = [
    { oldSlug: "dendrolux-tjoloholms-slott", newSlug: "svartljus" },
    { oldSlug: "dendrolux", newSlug: "svartljus" },
    { oldSlug: "crack", newSlug: "eastern-city-portal" },
    { oldSlug: "harpa-light-organ", newSlug: "harpa" },
    { oldSlug: "harpa-touch", newSlug: "harpa" },
    { oldSlug: "haven", newSlug: "icehotel" },
    { oldSlug: "mystery-on-the-icehotel-express", newSlug: "icehotel" },
    { oldSlug: "myriad", newSlug: "vista" },
  ];
  eleventyConfig.addGlobalData("projectRedirects", () => projectRedirects);


  if (process.env.ELEVENTY_RUN_MODE === 'build') {
    eleventyConfig.addTransform('htmlmin', async (content, outputPath) => {
      if (!outputPath?.endsWith('.html')) return content;
      return htmlMinifier.minify(content, { useShortDoctype: true, removeComments: true, collapseWhitespace: true, minifyCSS: true, minifyJS: false, removeEmptyAttributes: true, removeRedundantAttributes: true });
    });
  }
  eleventyConfig.on('eleventy.before', () => { siteData = null; });
  eleventyConfig.on('eleventy.after', () => publishImages());
  return {
    dir: { input: '.', includes: '_includes', layouts: '_includes/layouts', output: 'dist' },
    pathPrefix: prefix || '/', templateFormats: ['njk', 'md', 'html'],
    markdownTemplateEngine: 'njk', htmlTemplateEngine: 'njk', dataTemplateEngine: 'njk',
  };
}
