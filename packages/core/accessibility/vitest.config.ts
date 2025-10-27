import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['../../../__tests__/setup.ts'],
    // Memory management
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    maxConcurrency: 1,
    testTimeout: 30000,
    hookTimeout: 10000,
    isolate: true,
    clearMocks: true,
    restoreMocks: true,
  },
})
