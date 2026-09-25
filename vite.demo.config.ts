import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  // Keep the redistributed demo fonts' copyright and SIL license notices.
  esbuild: { legalComments: 'inline' },
  base: '/Next-Level-Editor/',
  build: {
    outDir: 'dist-demo',
    emptyOutDir: true
  }
})
