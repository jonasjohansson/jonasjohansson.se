import { defineConfig } from "vite";

export default defineConfig({
  clearScreen: false,
  build: {
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
        manualChunks: {
          vendor: ["src/js/router.js", "src/js/strips.js"],
        },
      },
    },
  },
  css: {
    devSourcemap: false,
  },
  server: {
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  },
});
