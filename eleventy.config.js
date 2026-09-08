import { readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import markdownIt from 'markdown-it';
import sharp from 'sharp';
import nunjucks from 'nunjucks';
import htmlMinifier from 'html-minifier-terser';
import { readProjects, SIZE_MAP, groupMedia } from './scripts/project-data.js';
import { responsiveImage, stripImage, ogImage, imageMetadata, publishImages } from './scripts/images.js';

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
      const ar = block.ar ?? metadata.width / metadata.height;
      const mobileSrc = block.mobileSrc ? `${project.directory}/${block.mobileSrc}` : null;
      const mobile = mobileSrc ? await sharp(mobileSrc).metadata() : metadata;
      return { ...block, src, mobileSrc, alt: block.alt || '', ar, mobileAr: mobile.width / mobile.height,
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
    if (block.type === 'text') {
      return { type: 'text', content: renderMarkdown(block.content), colStart: colStart || 2, colSpan: colSpan || 10,
        fontSizeClass: block.fontSize?.includes('small') || block.fontSize?.includes('1.2') ? 'text-small' : block.fontSize ? 'text-medium' : 'text-large' };
    }
    return { type: 'credits', credits: creditsMarkup(block.credits), colStart: colStart || 1, colSpan: colSpan || 12 };
  }));
  const grouped = groupMedia(content);
  for (const block of grouped) {
    if (block.type !== 'row') continue;
    for (const item of block.items) {
      // The desktop row fills the available track up to its height ceiling.
      const fraction = item.ar / block.arSum;
      const vw = +(fraction * 100).toFixed(3);
      const inset = +((112 + 16 * block.gutters) * fraction).toFixed(3);
      item.sizes = `(max-width: 768px) calc(100vw - 48px), min(calc(${vw}vw - ${inset}px), calc((100vh - 192px) * ${+item.ar.toFixed(4)}))`;
    }
  }
  const firstImage = content[0].type === 'video' ? `${project.directory}/${project.blocks[0].poster}` : content[0].src;
  const [thumbnail, og] = await Promise.all([stripImage(firstImage), ogImage(firstImage, project.slug)]);
  const { slug, title, date, tags, color = null } = project;
  return { slug, title, date, tags, color, year: new Date(date).getFullYear(), type: 'work',
    content: grouped, thumbnail, ogImage: og, presskit: project.presskit || null,
    description: stripHtml(content.find(block => block.type === 'text')?.content).slice(0, 160) };
}

function mediaSizes(span, ar) {
  const track = span && span < 12 ? `calc(${+(span / 12 * 100).toFixed(3)}vw - ${+(112 * span / 12 + 32 * (1 - span / 12)).toFixed(3)}px)` : 'calc(100vw - 112px)';
  const desktop = ar < 1 ? `min(${track}, calc((100vh - 192px) * ${+ar.toFixed(4)}))` : track;
  return `(max-width: 768px) calc(100vw - 48px), ${desktop}`;
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
  eleventyConfig.addPassthroughCopy('projects/**/*.{mp4,webm,mov}');
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
      return { work };
    })();
    return siteData;
  }
  eleventyConfig.addGlobalData('projects', async () => (await getSiteData()).work.map(({ slug, title, date, tags, color }) => ({ slug, title, date, tags, color })));
  eleventyConfig.addGlobalData('projectContent', async () => Object.fromEntries((await getSiteData()).work.map(project => [project.slug, project])));
  eleventyConfig.addGlobalData('projectsForJS', async () => (await getSiteData()).work.map(({ slug, title, color }) => ({ slug, title, color })));
  eleventyConfig.addGlobalData('collectionItems', async () => (await getSiteData()).work);

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
