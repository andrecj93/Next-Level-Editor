import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Catalog imports must work without loading Vue, DOM APIs, fonts or the editor.
export default defineConfig({
  build: {
    target: 'es2015',
    outDir: 'dist/locales',
    emptyOutDir: false,
    sourcemap: false,
    lib: {
      entry: {
        en: resolve(__dirname, 'src/locales/en.ts'),
        'pt-PT': resolve(__dirname, 'src/locales/pt-PT.ts'),
        formatter: resolve(__dirname, 'src/utils/editorLocale.ts'),
      },
      formats: ['es', 'cjs'],
      fileName: (format, name) => `${name}.${format === 'es' ? 'mjs' : 'cjs'}`,
    },
    rollupOptions: { output: { exports: 'named' } },
  },
});
