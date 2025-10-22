import { defineConfig } from "vite";

export default defineConfig({
  clearScreen: false,
  build: {
    emptyOutDir: false,
    outDir: "dist",
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: false, // Temporarily disabled for debugging
        drop_debugger: true,
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
          vendor: ["src/js/router-simple.js", "src/js/strips.js"],
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
