import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "node:path";
import autoprefixer from "autoprefixer";

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  // Types are emitted separately by `vue-tsc -p tsconfig.build.json` in the
  // build script (the official Vue path). It handles the main component's
  // `<script setup>` props cleanly, unlike vite-plugin-dts's .vue→virtual
  // transform, which trips TS4082 on this component.
  plugins: [vue()],

  // Transpilation target for broader browser support
  build: {
    target: "es2015", // Syntax floor; runtime target is Safari/iOS >= 12 (.browserslistrc). `globalThis` (Safari 12.1+) is polyfilled for the 12.0-12.1 sliver in src/index.ts.
    cssTarget: "chrome61", // Flexbox gap fallback

    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "NextLevelEditor",
      // ES build ships as .mjs (always ESM) and UMD as .umd.js (CJS-compatible),
      // so no top-level "type" field is needed and both Node ESM + CJS resolve
      // correctly via the package.json exports conditions.
      fileName: (format) =>
        format === "es" ? "next-level-editor.mjs" : "next-level-editor.umd.js",
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
      },
    },

    // Don't ship source maps in the published tarball (they were ~13 MB and
    // dominated the package). Consumers debug against their own app build.
    sourcemap: false,

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
    // Only downlevel to es2015 for the production build. Applying it during
    // dev serving lowers `import.meta` to `{}`, which breaks Vite's injected
    // `import.meta.hot` HMR code and crashes every SFC on load.
    target: command === "build" ? "es2015" : "esnext",
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
    // Honour a harness-assigned port (e.g. the preview tool) when present so the
    // dev server binds where the tooling expects it; fall back to Vite's default.
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
  },
}));
