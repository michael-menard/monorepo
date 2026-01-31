import { defineConfig } from 'vitest/config'

export default defineConfig({
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
  },
})
