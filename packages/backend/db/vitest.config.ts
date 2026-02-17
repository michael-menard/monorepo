import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules/', 'dist/'],
    pool: 'forks',
    testTimeout: 30000, // Increased for testcontainers
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.test.ts', '**/__types__/**'],
      thresholds: {
        lines: 45,
        functions: 45,
        branches: 45,
        statements: 45,
      },
    },
  },
})
