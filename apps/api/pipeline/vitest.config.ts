import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    exclude: ['src/**/__tests__/integration/**'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['src/**/__tests__/**', 'vitest.config.ts'],
    },
  },
})
