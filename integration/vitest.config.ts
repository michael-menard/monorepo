import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    name: 'integration',
    environment: 'jsdom',
    setupFiles: ['../__tests__/setup.ts'],
    globals: true,
    testTimeout: 10000, // Longer timeout for integration tests
    hookTimeout: 10000,
    teardownTimeout: 10000,
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: '../coverage/integration',
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.config.*',
        '**/test/**',
        '**/__tests__/**',
        '**/*.d.ts',
        '**/coverage/**',
        '**/integration/**', // Don't include test files in coverage
      ],
      thresholds: {
        global: {
          branches: 70, // Lower threshold for integration tests
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },
    // Run integration tests sequentially to avoid resource conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
  resolve: {
    alias: {
      '@repo/auth': path.resolve(__dirname, '../packages/core/auth/src'),
      '@repo/ui': path.resolve(__dirname, '../packages/core/ui/src'),
      '@repo/cache': path.resolve(__dirname, '../packages/core/cache/src'),
      '@repo/gallery': path.resolve(__dirname, '../packages/features/gallery/src'),
      '@repo/moc-instructions': path.resolve(__dirname, '../packages/features/moc-instructions/src'),
      '@repo/profile': path.resolve(__dirname, '../packages/features/profile/src'),
      '@repo/features-wishlist': path.resolve(__dirname, '../packages/features/wishlist/src'),
      '@repo/upload': path.resolve(__dirname, '../packages/tools/upload/src'),
      '@repo/mock-data': path.resolve(__dirname, '../packages/tools/mock-data/src'),
    },
  },
});
