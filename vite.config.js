import { defineConfig } from "vite";

export default defineConfig({
  clearScreen: false,
  build: {
    emptyOutDir: false,
    outDir: "dist/assets",
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    cssMinify: true,
    rollupOptions: {
      input: {
        main: "/src/js/main.js",
        styles: "/src/css/main.css",
      },
      output: {
        manualChunks: {
          vendor: ["src/js/router-simple.js", "src/js/strips.js"],
        },
      },
    },
  },
  css: {
    devSourcemap: false,
  },
});
