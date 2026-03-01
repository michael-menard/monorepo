import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.test.ts'],
      thresholds: {
        global: {
          statements: 45,
          branches: 45,
          functions: 45,
          lines: 45,
        },
      },
    },
    fileParallelism: false,
    testTimeout: 30000,
  },
})
