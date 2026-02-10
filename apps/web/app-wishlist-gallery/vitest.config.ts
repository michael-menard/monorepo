/// <reference types="vitest" />
import { resolve } from 'path'
import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/components': resolve(__dirname, './src/components'),
      '@/lib': resolve(__dirname, './src/lib'),
      '@/hooks': resolve(__dirname, './src/hooks'),
      '@/services': resolve(__dirname, './src/services'),
      '@/types': resolve(__dirname, './src/types'),
      '@/routes': resolve(__dirname, './src/routes'),
      '@/pages': resolve(__dirname, './src/pages'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/**/__tests__/**',
        'src/test/setup.ts',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
      ],
      thresholds: {
        'src/test/utils/**/*.ts': {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80,
        },
      },
    },
    // Mock environment variables
    env: {
      VITE_APP_NAME: 'App Wishlist Gallery',
      VITE_APP_VERSION: '1.0.0',
      VITE_APP_ENVIRONMENT: 'test',
      VITE_SERVERLESS_API_BASE_URL: 'http://localhost:3001',
      VITE_ENABLE_DEVTOOLS: 'false',
      VITE_ENABLE_PERFORMANCE_MONITORING: 'false',
      VITE_ENABLE_ERROR_REPORTING: 'false',
    },
  },
})
