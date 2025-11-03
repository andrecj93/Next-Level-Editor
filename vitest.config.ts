import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'json-summary'],
      exclude: [
        'node_modules/',
        'dist/',
        'src/demo/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '**/*.spec.ts',
        '**/*.test.ts'
      ],
      thresholds: {
        lines: 80,
        functions: 75,
        branches: 75,
        statements: 80
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
})
