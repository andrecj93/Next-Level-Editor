import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/next-level-editor/',
  build: {
    outDir: 'dist-demo',
    emptyOutDir: true
  }
})
