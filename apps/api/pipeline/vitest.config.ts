import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts', 'src/**/*.test.ts', 'scripts/**/*.test.ts'],
    exclude: ['src/**/__tests__/integration/**'],
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.test.ts', 'src/scripts/'],
    },
    // Timeout for database operations
    testTimeout: 30000,
    // Run test files sequentially to prevent concurrent DB access across files
    fileParallelism: false,
  },
})
