import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      // Resolve @repo/db from source during tests (dist/ may not be built in worktrees)
      '@repo/db': resolve(__dirname, '../../..', 'packages/backend/db/src/index.ts'),
      // Resolve @repo/logger from source during tests (dist/ may not be built in worktrees)
      '@repo/logger': resolve(__dirname, '../../..', 'packages/core/logger/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    // Integration tests share a real database — files must run sequentially
    // to prevent cross-file cleanup (db.delete) from clobbering other tests.
    fileParallelism: false,
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.test.ts', '**/__tests__/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
})
