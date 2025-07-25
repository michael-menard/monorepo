import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx'
    ],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html', 'lcov'],
    },
    globals: true,
    setupFiles: ['__tests__/setup.ts'],
  },
}); 