import { defineConfig } from "vite";
import { readdirSync, statSync, rmSync, existsSync } from "fs";
import { join } from "path";

// Clean old asset files before build
function cleanOldAssets() {
  try {
    const assetsJsPath = "dist/assets/js";
    const assetsCssPath = "dist/assets/css";
    
    // Clean old JS files
    if (existsSync(assetsJsPath)) {
      const jsFiles = readdirSync(assetsJsPath);
      const mainFiles = jsFiles.filter(f => f.startsWith("main.") && f.endsWith(".js"));
      const vendorFiles = jsFiles.filter(f => f.startsWith("vendor.") && f.endsWith(".js"));

      if (mainFiles.length > 1) {
        const mainFilesWithTime = mainFiles.map(f => ({
          name: f,
          time: statSync(join(assetsJsPath, f)).mtimeMs
        })).sort((a, b) => b.time - a.time);
        
        mainFilesWithTime.slice(1).forEach(({ name }) => {
          rmSync(join(assetsJsPath, name), { force: true });
        });
      }
      
      if (vendorFiles.length > 1) {
        const vendorFilesWithTime = vendorFiles.map(f => ({
          name: f,
          time: statSync(join(assetsJsPath, f)).mtimeMs
        })).sort((a, b) => b.time - a.time);

        vendorFilesWithTime.slice(1).forEach(({ name }) => {
          rmSync(join(assetsJsPath, name), { force: true });
        });
      }
    }
    
    // Clean old CSS files
    if (existsSync(assetsCssPath)) {
      const cssFiles = readdirSync(assetsCssPath);
      const styleFiles = cssFiles.filter(f => f.startsWith("styles.") && f.endsWith(".css"));
      
      if (styleFiles.length > 1) {
        const styleFilesWithTime = styleFiles.map(f => ({
          name: f,
          time: statSync(join(assetsCssPath, f)).mtimeMs
        })).sort((a, b) => b.time - a.time);
        
        styleFilesWithTime.slice(1).forEach(({ name }) => {
          rmSync(join(assetsCssPath, name), { force: true });
        });
      }
    }
  } catch (error) {
    // Silently fail
  }
}

export default defineConfig({
  clearScreen: false,
  base: `${(process.env.PATH_PREFIX || '').replace(/\/$/, '')}/`,
  build: {
    // clean:dist owns production cleanup. Watch rebuilds must preserve the HTML
    // emitted by Eleventy. Reusable image encodings live in .cache/images.
    emptyOutDir: false,
    outDir: "dist",
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
        passes: 2, // Multiple passes for better minification
      },
      mangle: {
        safari10: true, // Fix Safari 10 compatibility
      },
    },
    cssMinify: true,
    rollupOptions: {
      input: {
        main: "src/js/main.js",
        walk: "src/js/walk/main.js",
        styles: "src/css/main.css",
      },
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.match(/\.(woff2?|ttf|eot)$/)) {
            return "assets/fonts/[name].[hash][extname]";
          }
          if (assetInfo.name && assetInfo.name.endsWith(".css")) {
            return "assets/css/[name].[hash].css";
          }
          return "assets/[name].[hash][extname]";
        },
        chunkFileNames: "assets/js/[name].[hash].js",
        entryFileNames: "assets/js/[name].[hash].js",
      },
    },
  },
  plugins: [
    {
      name: "clean-old-assets",
      buildStart() {
        cleanOldAssets();
      },
    },
  ],
  css: {
    devSourcemap: false,
  },
  server: {
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  },
});
