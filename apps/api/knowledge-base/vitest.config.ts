import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      // Resolve @repo/logger from source during tests (dist/ may not be built in worktrees)
      '@repo/logger': resolve(__dirname, '../../..', 'packages/core/logger/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.test.ts', 'src/scripts/'],
      thresholds: {
        global: {
          statements: 45,
          branches: 45,
          functions: 45,
          lines: 45,
        },
      },
    },
    // Timeout for database operations
    testTimeout: 30000,
    // Run test files sequentially to prevent concurrent DB access across files
    fileParallelism: false,
  },
})
