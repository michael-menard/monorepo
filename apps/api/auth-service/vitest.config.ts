// eslint-disable-next-line
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['src/types', 'src/utils/validation.ts'],
    },
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
  },
}); 