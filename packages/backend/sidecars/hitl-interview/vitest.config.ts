import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      // Resolve workspace packages from source during tests (dist/ may not be built in worktrees)
      '@repo/db': resolve(__dirname, '../../../..', 'packages/backend/db/src/index.ts'),
      '@repo/logger': resolve(__dirname, '../../../..', 'packages/core/logger/src/index.ts'),
      '@repo/sidecar-http-utils': resolve(__dirname, '../http-utils/src/index.ts'),
      '@repo/knowledge-base/db': resolve(
        __dirname,
        '../../../..',
        'apps/api/knowledge-base/src/db/index.ts',
      ),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/__tests__/**',
        'src/server.ts',
        'vitest.config.ts',
      ],
      thresholds: {
        lines: 45,
        functions: 45,
        branches: 45,
        statements: 45,
      },
    },
  },
})
