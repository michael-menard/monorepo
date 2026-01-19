import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/__tests__/**',
        '**/index.ts', // Exclude re-export files
        '**/__types__/index.ts', // Exclude type re-export files
        '**/vitest.config.ts', // Exclude vitest config
        '**/tsconfig.json', // Exclude tsconfig
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
})
