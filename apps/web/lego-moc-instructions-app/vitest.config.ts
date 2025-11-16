import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    // Memory management
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Run tests in single process to reduce memory overhead
      },
    },
    // Reduce parallel execution to manage memory
    maxConcurrency: 1,
    // Timeout settings
    testTimeout: 30000,
    hookTimeout: 10000,
    // Test isolation - ensure clean DOM between tests
    isolate: true,
    // Clear mocks and DOM between tests
    clearMocks: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@repo/ui': resolve(__dirname, '../../../packages/core/ui/src'),
      '@repo/profile': resolve(__dirname, '../../../packages/features/profile/src'),
      '@monorepo/shared': resolve(__dirname, '../../../packages/shared/src'),
    },
  },
})
