import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_SERVERLESS_API_BASE_URL': JSON.stringify('http://localhost:3001'),
    'import.meta.env.VITE_ENABLE_MSW': JSON.stringify('false'),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
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
