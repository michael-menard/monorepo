/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/components': resolve(__dirname, './src/components'),
      '@/lib': resolve(__dirname, './src/lib'),
      '@/hooks': resolve(__dirname, './src/hooks'),
      '@/services': resolve(__dirname, './src/services'),
      '@/store': resolve(__dirname, './src/store'),
      '@/types': resolve(__dirname, './src/types'),
      '@/routes': resolve(__dirname, './src/routes'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov', 'text-summary'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/*.test.*',
        '**/*.spec.*',
        'dist/',
        'build/',
        'public/',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
      include: [
        'src/**/*.{ts,tsx}',
      ],
      // Coverage thresholds - enforce minimum coverage
      thresholds: {
        global: {
          branches: 25,
          functions: 45,
          lines: 45,
          statements: 45,
        },
        // Per-file thresholds for critical files (tested components)
        'src/store/slices/authSlice.ts': {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100,
        },
        'src/store/slices/navigationSlice.ts': {
          branches: 75,
          functions: 100,
          lines: 100,
          statements: 100,
        },
      },
      // Fail tests if coverage is below thresholds
      skipFull: false,
      all: true,
    },
    // Mock environment variables
    env: {
      VITE_APP_NAME: 'LEGO MOC Instructions',
      VITE_APP_VERSION: '1.0.0',
      VITE_APP_ENVIRONMENT: 'test',
      VITE_AWS_REGION: 'us-east-1',
      VITE_AWS_USER_POOL_ID: 'test-pool-id',
      VITE_AWS_USER_POOL_WEB_CLIENT_ID: 'test-client-id',
      VITE_SERVERLESS_API_BASE_URL: 'http://localhost:3001',
      VITE_ENABLE_DEVTOOLS: 'false',
      VITE_ENABLE_PERFORMANCE_MONITORING: 'false',
      VITE_ENABLE_ERROR_REPORTING: 'false',
    },
  },
})
