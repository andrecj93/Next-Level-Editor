import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "node:path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  optimizeDeps: {
    include: ["dompurify"],
  },
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "NextLevelEditor",
      fileName: (format) => `next-level-editor.${format}.js`,
    },
    rollupOptions: {
      external: ["vue"],
      output: {
        exports: "named",
        globals: {
          vue: "Vue",
        },
      },
    },
  },
});
