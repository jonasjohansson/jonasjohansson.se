import { readdirSync, readFileSync, statSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import markdownIt from "markdown-it";
import Image from "@11ty/eleventy-img";
import nunjucks from "nunjucks";
import matter from "gray-matter";
import htmlMinifier from "html-minifier-terser";

const md = markdownIt({ html: true, breaks: false, linkify: true });
const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const slug = (s) =>
  String(s)
    .trim()
    .toLowerCase()
    .replace(/å/g, "a")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export default function (eleventyConfig) {
  eleventyConfig.ignores.add("jonasjohansson.se/**");
  eleventyConfig.ignores.add("projects/**/data.md");
  // Ignore root-level .md files (documentation files, not templates)
  eleventyConfig.ignores.add("SEO.md");
  eleventyConfig.ignores.add("RESUME_SETUP.md");
  eleventyConfig.ignores.add("README.md");
  eleventyConfig.setServerOptions({
    domdiff: false,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
  eleventyConfig.addWatchTarget("projects/**/*");
  eleventyConfig.addWatchTarget("src/**/*");
  eleventyConfig.setWatchJavaScriptDependencies(false);
  eleventyConfig.addPassthroughCopy("site.webmanifest");
  eleventyConfig.addPassthroughCopy("favicon.*");
  eleventyConfig.addPassthroughCopy("apple-touch-icon.png");
  eleventyConfig.addPassthroughCopy("web-app-manifest-*.png");
  eleventyConfig.addPassthroughCopy("CNAME");
  eleventyConfig.addPassthroughCopy({ "src/img": "assets/img" });
  // Pass through project assets (videos, about images, etc.)
  // Note: images are also processed by eleventy-img to /img/ but the originals
  // are needed for about section images and as fallbacks
  eleventyConfig.addPassthroughCopy({ projects: "projects" });

  eleventyConfig.addGlobalData("isDev", process.env.ELEVENTY_RUN_MODE !== "build");
  eleventyConfig.addGlobalData("buildYear", new Date().getFullYear());
  
  // Add about.md as global data
  eleventyConfig.addGlobalData("about", () => {
    const aboutPath = path.join(projectRoot, "_data", "about.md");
    if (existsSync(aboutPath)) {
      return readFileSync(aboutPath, "utf8");
    }
    return "";
  });

  eleventyConfig.setLibrary("njk", nunjucks.configure({ autoescape: true, throwOnUndefined: false, trimBlocks: true, lstripBlocks: true }));

  eleventyConfig.addFilter("isoDate", (d) => {
    if (!d) return "";
    const dt = new Date(d);
    return isNaN(dt) ? "" : dt.toISOString().slice(0, 10);
  });

  eleventyConfig.addFilter("viteAsset", (filename) => {
    const isJS = filename.endsWith(".js");
    const isCSS = filename.endsWith(".css");
    const subdir = isJS ? "js" : isCSS ? "css" : "";
    const distPath = path.join(projectRoot, "dist", "assets", subdir);
    if (!existsSync(distPath)) return `/assets/${filename}`;
    const files = readdirSync(distPath);
    const pattern = new RegExp(`^${filename.replace(/\.(js|css)$/, "")}\\.[a-zA-Z0-9_-]+\\.(js|css)$`);
    const matches = files.filter((file) => pattern.test(file));
    const match = matches.sort(
      (a, b) => statSync(path.join(distPath, b)).mtime.getTime() - statSync(path.join(distPath, a)).mtime.getTime()
    )[0];
    return match ? `/assets/${subdir}/${match}` : `/assets/${filename}`;
  });

  eleventyConfig.addFilter("markdown", (str) => {
    const rendered = md.render(str);
    // Add target="_blank" and rel="noopener" to external links for security
    return rendered.replace(/<a href="(https?:\/\/[^"]*)">/g, '<a href="$1" target="_blank" rel="noopener noreferrer">');
  });

  eleventyConfig.addFilter("split", (str, separator) => {
    return str.split(separator);
  });

  // Sort array of strings by length descending
  eleventyConfig.addFilter("sortByLength", (arr) => {
    if (!Array.isArray(arr)) return arr;
    return [...arr].sort((a, b) => String(b).length - String(a).length);
  });

  const urlPathBase = process.env.PATH_PREFIX ? `${process.env.PATH_PREFIX}/img` : "/img";

  const singleImageOptions = {
    widths: [null],
    formats: ["jpeg"],
    urlPath: urlPathBase,
    outputDir: "dist/img",
    sharpJpegOptions: { quality: 90, progressive: true, mozjpeg: true },
  };

  // Add about images list as global data
  // Returns source paths - images will be processed when used via responsiveImage shortcode
  eleventyConfig.addGlobalData("aboutImages", () => {
    const aboutDir = path.join(projectRoot, "projects", "about");
    if (!existsSync(aboutDir)) return ["projects/about/01.jpg"];
    
    try {
      const files = readdirSync(aboutDir, { withFileTypes: true })
        .filter((f) => f.isFile())
        .map((f) => f.name);
      
      const imageFiles = files.filter((name) => {
        const ext = path.extname(name).toLowerCase();
        return [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext);
      });
      
      // Return source paths - JavaScript will use these to switch images
      const images = imageFiles.map((name) => `projects/about/${name}`);
      
      return images.length > 0 ? images : ["projects/about/01.jpg"];
    } catch (err) {
      console.warn("Error reading about images:", err);
      return ["projects/about/01.jpg"]; // Fallback
    }
  });

  // Shared image processing function to ensure strips and hero use same images
  async function processImageForStrips(src) {
    try {
      const srcPath = path.join(process.cwd(), src);
      const metadata = await Image(srcPath, singleImageOptions);
      const jpeg = metadata.jpeg?.[0];
      if (jpeg?.url) {
        return jpeg.url.startsWith('/') ? jpeg.url : `/${jpeg.url}`;
      }
      return null;
    } catch (err) {
      return null;
    }
  }

  eleventyConfig.addNunjucksAsyncShortcode(
    "responsiveImage",
    async (src, alt, className = "media-img", sizes) => {
      try {
        const srcPath = path.join(process.cwd(), src);
        const metadata = await Image(srcPath, singleImageOptions);
        const jpeg = metadata.jpeg?.[0];
        if (!jpeg) {
          return `<img src="${src}" alt="${alt}" class="${className}" />`;
        }

        const attrs = {
          alt,
          class: className,
          loading: className?.includes("lcp") ? "eager" : "lazy",
          decoding: "async",
          src: jpeg.url,
          ...(jpeg.width && jpeg.height ? { width: jpeg.width, height: jpeg.height } : {}),
          ...(sizes ? { sizes } : {}),
        };
        if (className?.includes("lcp")) attrs.fetchpriority = "high";

        const attrString = Object.entries(attrs)
          .filter(([_, value]) => value !== undefined && value !== null && value !== "")
          .map(([key, value]) => `${key}="${String(value).replace(/"/g, "&quot;")}"`)
          .join(" ");

        return `<img ${attrString} />`;
      } catch (err) {
        return `<img src="${src}" alt="${alt}" class="${className}" />`;
      }
    }
  );

  // Shared project scanner — cached so both `projects` and `projectsForJS` reuse one scan
  let _projectsCache = null;
  function scanProjects() {
    if (_projectsCache) return _projectsCache;
    const root = "projects";
    if (!existsSync(root)) { _projectsCache = []; return _projectsCache; }

    const dirs = readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    const projects = dirs.map((dir) => {
      const dirPath = path.join(root, dir);
      const files = readdirSync(dirPath, { withFileTypes: true }).filter((f) => f.isFile());

      const images = [];
      const videos = [];
      const texts = [];

      let title = dir.replace(/[._-]+/g, " ").trim();
      let date = null;

      files.forEach((f) => {
        const ext = path.extname(f.name).toLowerCase();
        if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) {
          const relFsPath = `${root}/${dir}/${f.name}`;
          images.push({ src: relFsPath, alt: title });
        } else if ([".mp4", ".webm", ".mov"].includes(ext)) {
          const relFsPath = `${root}/${dir}/${f.name}`;
          videos.push({ src: relFsPath });
        } else if ((ext === ".md" && f.name !== "data.md") || ext === ".txt") {
          const raw = readFileSync(path.join(dirPath, f.name), "utf8");
          texts.push(ext === ".md" ? md.render(raw) : `<p>${raw.replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br>")}</p>`);
        }
      });

      if (!date) {
        const mtimes = files.map((f) => statSync(path.join(dirPath, f.name)).mtimeMs);
        date = new Date(mtimes.length ? Math.max(...mtimes) : Date.now()).toISOString();
      }
      return { slug: dir, title, date, images, videos, texts };
    });
    projects.sort((a, b) => new Date(b.date) - new Date(a.date));
    _projectsCache = projects;
    return _projectsCache;
  }

  eleventyConfig.addGlobalData("projects", () => scanProjects());

  // Helper to extract first image from project directory
  function findFirstImageInDir(root, dir, dataMdPath) {
    // Try data.md first
    if (existsSync(dataMdPath)) {
      try {
        const fileContent = readFileSync(dataMdPath, "utf8");
        const parsed = matter(fileContent);
        const { blocks = [] } = parsed.data;
        const firstImageBlock = blocks.find((b) => b.type === "image");
        if (firstImageBlock?.src) {
          return `${root}/${dir}/${firstImageBlock.src}`;
        }
      } catch (err) {}
    }
    // Fallback to first image file
    const dirPath = path.join(root, dir);
    const files = readdirSync(dirPath, { withFileTypes: true }).filter((f) => f.isFile());
    for (const f of files) {
      const ext = path.extname(f.name).toLowerCase();
      if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) {
        return `${root}/${dir}/${f.name}`;
      }
    }
    return null;
  }

  eleventyConfig.addGlobalData("projectsForJS", async function() {
    // Derive from cached project scan to avoid scanning the filesystem twice
    const allProjects = scanProjects();
    const root = "projects";

    const results = await Promise.all(
      allProjects
        .filter((p) => p.slug !== "about")
        .map(async (project) => {
          const dirPath = path.join(root, project.slug);
          const dataMdPath = path.join(dirPath, "data.md");

          let title = project.title;
          let tags = [];
          let year = new Date(project.date).getFullYear() || new Date().getFullYear();

          // Read data.md for richer metadata (tags, explicit title)
          if (existsSync(dataMdPath)) {
            try {
              const fileContent = readFileSync(dataMdPath, "utf8");
              const parsed = matter(fileContent);
              const { title: mdTitle, date, tags: mdTags = [] } = parsed.data;
              if (mdTitle) title = mdTitle;
              if (mdTags) tags = mdTags;
              if (date) year = new Date(date).getFullYear();
            } catch (err) {}
          }

          // Find first image using shared helper
          const firstImageSrc = findFirstImageInDir(root, project.slug, dataMdPath);
          let firstImageOptimized = null;

          if (firstImageSrc) {
            firstImageOptimized = await processImageForStrips(firstImageSrc);
            if (firstImageOptimized && !firstImageOptimized.startsWith('/')) {
              firstImageOptimized = `/${firstImageOptimized}`;
            }
          }
          return { title, images: firstImageOptimized?.startsWith('/') ? [firstImageOptimized] : [], tags, year, slug: project.slug };
        })
    );
    return results;
  });

  /** Project content scanner → reads data.md with YAML frontmatter */
  eleventyConfig.addGlobalData("projectContent", async () => {
    const root = "projects";
    if (!existsSync(root)) return {};

    const dirs = readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    const projectContent = {};

    for (const dir of dirs) {
      const dirPath = path.join(root, dir);
      const dataMdPath = path.join(dirPath, "data.md");
      if (!existsSync(dataMdPath)) continue;
      try {
        const fileContent = readFileSync(dataMdPath, "utf8");
        const parsed = matter(fileContent);
        const { title, date, tags = [], blocks = [], printable = true } = parsed.data;

        const year = date ? new Date(date).getFullYear() : new Date().getFullYear();
        const isoDate = date ? new Date(date).toISOString() : null;
        const projectTitle = title || dir.replace(/[._-]+/g, " ").trim();

        // Process blocks from frontmatter
        const content = blocks
          .map((block) => {
            const { type, src, content: textContent, colStart = 1, colSpan = 12, fontSize, textAlign, credits } = block;
            let fontSizeClass = "text-large";
            if (fontSize) {
              if (fontSize.includes("small") || fontSize.includes("1.2")) fontSizeClass = "text-small";
              else if (fontSize.includes("medium") || fontSize.includes("1.8")) fontSizeClass = "text-medium";
            }
            if (type === "image") return { type: "image", src: `${root}/${dir}/${src}`, alt: projectTitle, colStart, colSpan };
            if (type === "video") return { type: "video", src: `${root}/${dir}/${src}`, alt: projectTitle, colStart, colSpan };
            if (type === "text")
              return {
                type: "text",
                content: md.render(textContent || ""),
                colStart: colStart || 3,
                colSpan: colSpan || 8,
                fontSizeClass,
                textAlign: textAlign || "center",
              };
            if (type === "credits")
              return { type: "credits", credits: (credits || []).map((credit) => md.render(credit)), colStart, colSpan };
            return null;
          })
          .filter(Boolean);

        // Process hero image for OG tags
        const firstImageSrc = findFirstImageInDir(root, dir, dataMdPath);
        let heroImage = null;
        if (firstImageSrc) {
          heroImage = await processImageForStrips(firstImageSrc);
        }

        projectContent[dir] = { title: projectTitle, tags, year, date: isoDate, content, printable, heroImage };
      } catch (err) {}
    }
    return projectContent;
  });

  eleventyConfig.addFilter("findFirstImage", (content) => content?.find?.((b) => b.type === "image")?.src || null);
  eleventyConfig.addFilter("findFirstText", (content) => content?.find?.((b) => b.type === "text")?.content || null);
  eleventyConfig.addFilter("stripHtml", (str) => {
    if (!str) return "";
    // Remove HTML tags and decode HTML entities
    return str.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
  });
  eleventyConfig.addFilter("truncate", (str, length = 160) => (str && str.length > length ? str.substring(0, length) + "..." : str || ""));
  
  // Minify HTML in production builds only
  const isBuild = process.env.ELEVENTY_RUN_MODE === "build";
  if (isBuild) {
    eleventyConfig.addTransform("htmlmin", async (content, outputPath) => {
      // outputPath is relative to output directory (dist) or absolute path
      const isHtmlFile = outputPath && (outputPath.endsWith(".html") || outputPath.includes("/index.html"));
      if (isHtmlFile) {
        try {
          const minified = await htmlMinifier.minify(content, {
            useShortDoctype: true,
            removeComments: true,
            collapseWhitespace: true,
            minifyCSS: true,
            minifyJS: false, // JS is already minified by Vite
            removeEmptyAttributes: true,
            removeRedundantAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true,
            sortAttributes: true,
            sortClassName: true,
          });
          return minified;
        } catch (err) {
          console.warn(`HTML minification failed for ${outputPath}:`, err.message);
          return content;
        }
      }
      return content;
    });
  }
  
  eleventyConfig.setWatchThrottleWaitTime(0);

  // Ensure output directories exist before Eleventy writes
  eleventyConfig.on("beforeBuild", () => {
    _projectsCache = null; // Reset cache for fresh scan
    const outputDir = "dist";
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    // Ensure common subdirectories exist
    const subdirs = ["img", "about", "work"];
    subdirs.forEach((subdir) => {
      const dirPath = path.join(outputDir, subdir);
      if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
      }
    });
    
    // Ensure work subdirectories exist for all projects
    const projectsRoot = "projects";
    if (existsSync(projectsRoot)) {
      const projectDirs = readdirSync(projectsRoot, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
      
      projectDirs.forEach((projectDir) => {
        const workProjectPath = path.join(outputDir, "work", projectDir);
        if (!existsSync(workProjectPath)) {
          mkdirSync(workProjectPath, { recursive: true });
        }
      });
    }
  });

  return {
    dir: { input: ".", includes: "_includes", layouts: "_includes/layouts", output: "dist" },
    pathPrefix: process.env.PATH_PREFIX || "/",
    templateFormats: ["njk", "md", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk",
    passthroughFileCopy: true,
  };
}
