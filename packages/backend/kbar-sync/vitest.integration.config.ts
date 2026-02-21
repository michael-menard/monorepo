import { defineConfig } from 'vitest/config'

/**
 * Vitest config for integration tests (CLI + src).
 * Uses real PostgreSQL via testcontainers.
 *
 * Run with: pnpm test:integration
 * Skip containers: SKIP_TESTCONTAINERS=true pnpm test:integration
 *
 * IMPORTANT: pool='forks' with singleFork=true is required because testcontainers uses a
 * shared Ryuk reaper container. Running multiple test files in parallel causes "Expected
 * Reaper to map exposed port 8080" or "No host port found" errors. Single-fork sequential
 * execution ensures each file's container lifecycle completes before the next file begins.
 *
 * Excludes:
 * - artifact-sync.integration.test.ts (KBAR-0040 — pre-existing, run separately)
 * - integration.integration.test.ts (KBAR-0030 — pre-existing, requires @repo/db built)
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['scripts/**/*.integration.test.ts', 'src/**/*.integration.test.ts'],
    exclude: [
      'src/__tests__/artifact-sync.integration.test.ts',
      'src/__tests__/integration.integration.test.ts',
    ],
    testTimeout: 90000, // 90s for testcontainers startup
    // Per L-005: testcontainers Ryuk reaper requires sequential, single-process execution
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
})
