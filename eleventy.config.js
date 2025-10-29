import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import markdownIt from "markdown-it";
import Image from "@11ty/eleventy-img";
import nunjucks from "nunjucks";
import matter from "gray-matter";

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
  // Serve original project assets during dev/build as a fallback
  // (Responsive images still emit to /img via the shortcode; this avoids 404s if processing falls back)
  eleventyConfig.addPassthroughCopy({ projects: "projects" });

  eleventyConfig.addGlobalData("isDev", process.env.ELEVENTY_RUN_MODE !== "build");
  eleventyConfig.addGlobalData("buildYear", new Date().getFullYear());
  eleventyConfig.addGlobalData("about", () => {
    const aboutPath = path.join(process.cwd(), "_data/about.md");
    return existsSync(aboutPath) ? readFileSync(aboutPath, "utf8") : "";
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
    // Add target="_blank" to external links
    return rendered.replace(/<a href="(https?:\/\/[^"]*)">/g, '<a href="$1" target="_blank">');
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

  eleventyConfig.addNunjucksAsyncShortcode(
    "responsiveImage",
    async (src, alt, className = "media-img", sizes = "(min-width: 800px) 980px, 100vw") => {
      try {
        const srcPath = path.join(process.cwd(), src);
        const metadata = await Image(srcPath, {
          widths: [1920, 2400],
          formats: ["jpeg"],
          urlPath: urlPathBase,
          outputDir: "dist/img",
          sharpJpegOptions: { quality: 90, progressive: true },
          sharpOptions: { animated: true },
          filenameFormat(id, fileSrc, width, format) {
            const dirSlug = slug(path.basename(path.dirname(fileSrc)));
            const baseSlug = slug(path.basename(fileSrc, path.extname(fileSrc)));
            return `${dirSlug}-${baseSlug}-${width}w-${String(id).slice(0, 8)}.${format}`;
          },
        });
        const largestJpeg = metadata.jpeg?.[metadata.jpeg.length - 1];
        const attrs = {
          alt,
          sizes,
          class: className,
          loading: "lazy",
          decoding: "async",
          ...(largestJpeg?.width && largestJpeg?.height ? { width: largestJpeg.width, height: largestJpeg.height } : {}),
        };
        if (className?.includes("lcp")) attrs.fetchpriority = "high";
        return Image.generateHTML(metadata, attrs, { whitespaceMode: "inline" });
      } catch (err) {
        return `<img src="${src}" alt="${alt}" class="${className}" />`;
      }
    }
  );

  eleventyConfig.addGlobalData("projects", () => {
    const root = "projects";
    if (!existsSync(root)) return [];

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
          const relFsPath = `${root}/${dir}/${f.name}`; // filesystem path for responsiveImage shortcode
          images.push({ src: relFsPath, alt: title });
        } else if ([".mp4", ".webm", ".mov"].includes(ext)) {
          const relFsPath = `${root}/${dir}/${f.name}`; // videos stay as passthrough
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
    return projects;
  });

  eleventyConfig.addGlobalData("projectsForJS", async () => {
    const root = "projects";
    if (!existsSync(root)) return [];

    const dirs = readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    const projects = await Promise.all(
      dirs.map(async (dir) => {
        const dirPath = path.join(root, dir);
        const dataMdPath = path.join(dirPath, "data.md");

        let title = dir.replace(/[._-]+/g, " ").trim();
        let tags = [];
        let year = new Date().getFullYear();
        let firstImageSrc = null;
        let firstImageOptimized = null;

        // Read data.md for metadata and first image
        if (existsSync(dataMdPath)) {
          try {
            const fileContent = readFileSync(dataMdPath, "utf8");
            const parsed = matter(fileContent);
            const { title: mdTitle, date, tags: mdTags = [], blocks = [] } = parsed.data;

            if (mdTitle) title = mdTitle;
            if (mdTags) tags = mdTags;
            if (date) year = new Date(date).getFullYear();

            // Find first image block
            const firstImageBlock = blocks.find((b) => b.type === "image");
            if (firstImageBlock && firstImageBlock.src) {
              firstImageSrc = `${root}/${dir}/${firstImageBlock.src}`;
            }
          } catch (err) {}
        }
        if (!firstImageSrc) {
          const files = readdirSync(dirPath, { withFileTypes: true }).filter((f) => f.isFile());
          for (const f of files) {
            const ext = path.extname(f.name).toLowerCase();
            if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) {
              firstImageSrc = `${root}/${dir}/${f.name}`;
              break;
            }
          }
        }

        if (firstImageSrc) {
          try {
            const srcPath = path.join(process.cwd(), firstImageSrc);
            const metadata = await Image(srcPath, {
              widths: [1920],
              formats: ["jpeg"],
              urlPath: urlPathBase,
              outputDir: "dist/img",
              sharpJpegOptions: { quality: 90, progressive: true },
              filenameFormat(id, fileSrc, width, format) {
                const dirSlug = slug(path.basename(path.dirname(fileSrc)));
                const baseName = path.basename(fileSrc, path.extname(fileSrc));
                const baseSlug = slug(baseName);
                const shortHash = String(id).slice(0, 8);
                return `${dirSlug}-${baseSlug}-${width}w-${shortHash}.${format}`;
              },
            });

            firstImageOptimized = metadata.jpeg?.[0]?.url;
          } catch (err) {}
        }
        return { title, images: firstImageOptimized ? [firstImageOptimized] : [], tags, year, slug: dir };
      })
    );
    return projects;
  });

  /** Project content scanner → reads data.md with YAML frontmatter */
  eleventyConfig.addGlobalData("projectContent", () => {
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

        let year = new Date().getFullYear();
        let isoDate = null;

        if (date) {
          isoDate = new Date(date).toISOString();
          year = new Date(date).getFullYear();
        }

        // Process blocks from frontmatter
        const content = blocks
          .map((block) => {
            const { type, src, content: textContent, colStart = 1, colSpan = 12, fontSize, textAlign, credits } = block;
            let fontSizeClass = "text-large";
            if (fontSize) {
              if (fontSize.includes("small") || fontSize.includes("1.2")) fontSizeClass = "text-small";
              else if (fontSize.includes("medium") || fontSize.includes("1.8")) fontSizeClass = "text-medium";
            }
            if (type === "image") return { type: "image", src: `${root}/${dir}/${src}`, alt: title || dir, colStart, colSpan };
            if (type === "video") return { type: "video", src: `${root}/${dir}/${src}`, alt: title || dir, colStart, colSpan };
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
        projectContent[dir] = { title: title || dir.replace(/[._-]+/g, " ").trim(), tags, year, date: isoDate, content, printable };
      } catch (err) {}
    }
    return projectContent;
  });

  eleventyConfig.addFilter("findFirstImage", (content) => content?.find?.((b) => b.type === "image")?.src || null);
  eleventyConfig.addFilter("findFirstText", (content) => content?.find?.((b) => b.type === "text")?.content || null);
  eleventyConfig.addFilter("truncate", (str, length = 160) => (str && str.length > length ? str.substring(0, length) + "..." : str || ""));
  eleventyConfig.setWatchThrottleWaitTime(0);

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
