import { defineConfig } from 'vitest/config'

/**
 * Vitest config for CLI integration tests only.
 * Uses real PostgreSQL via testcontainers.
 *
 * Run with: pnpm test:integration
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['scripts/**/*.integration.test.ts'],
    testTimeout: 90000, // 90s for testcontainers startup
  },
})
