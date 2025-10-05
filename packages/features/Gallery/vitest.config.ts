import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['../../../__tests__/setup.ts'],
    testTimeout: 5000,
    hookTimeout: 5000,
    teardownTimeout: 5000,
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
      ],
    },
    // All external dependencies (API calls, DB, Drizzle) must be mocked in tests.
    // See README or test/setup.ts for mocking patterns.
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}); 