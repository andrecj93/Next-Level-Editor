import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "node:path";
import autoprefixer from "autoprefixer";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],

  // Transpilation target for broader browser support
  build: {
    target: "es2015", // Support Safari 10+, iOS 10+
    cssTarget: "chrome61", // Flexbox gap fallback

    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "NextLevelEditor",
      fileName: (format) => `next-level-editor.${format}.js`,
      formats: ["es", "umd"],
    },

    rollupOptions: {
      external: ["vue"],
      output: {
        exports: "named",
        globals: {
          vue: "Vue",
        },
        // Keep names for better debugging
        compact: false,
        sourcemap: true,
      },
    },

    // Module preload polyfill (updated config name)
    modulePreload: {
      polyfill: true,
    },

    // Minification compatible with older browsers
    minify: "esbuild",

    // CSS code splitting disabled for library
    cssCodeSplit: false,
  },

  // ESBuild transpilation settings
  esbuild: {
    target: "es2015",
    // Keep class/function names for debugging
    keepNames: true,
  },

  // PostCSS with Autoprefixer for CSS compatibility
  css: {
    postcss: {
      plugins: [
        autoprefixer({
          overrideBrowserslist: [
            "last 2 Chrome versions",
            "last 2 Firefox versions",
            "last 2 Safari versions",
            "last 2 Edge versions",
            "iOS >= 12",
            "Safari >= 12",
            "ChromeAndroid >= 90",
            "FirefoxAndroid >= 90",
            "not dead",
            "> 0.2%",
          ],
        }),
      ],
    },
  },

  // Optimize dependencies
  optimizeDeps: {
    include: ["dompurify"],
    esbuildOptions: {
      target: "es2015",
    },
  },

  // Disable HMR when running tests
  server: {
    hmr: process.env.DISABLE_HMR !== "true",
  },
});
