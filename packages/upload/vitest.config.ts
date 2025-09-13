import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    testTimeout: 10000, // 10 seconds for upload tests
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'src/__tests__/',
        'stories/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/*.stories.*',
        'dist/',
        'vite.config.ts',
        'vitest.config.ts',
      ],
      include: [
        'src/**/*.{ts,tsx}',
      ],
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        // Specific thresholds for critical modules
        'src/hooks/**': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95,
        },
        'src/utils/**': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95,
        },
      },
    },
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache', 'stories'],
    // Retry flaky tests
    retry: 2,
    // Run tests in parallel
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
