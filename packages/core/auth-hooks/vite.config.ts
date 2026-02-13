import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path'
import { defineConfig } from 'vite'

const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST

export default defineConfig({
  plugins: [react()],
  define: isTest
    ? {
        'import.meta.env.VITE_SERVERLESS_API_BASE_URL': JSON.stringify('http://localhost:3001'),
        'import.meta.env.VITE_ENABLE_MSW': JSON.stringify('false'),
      }
    : undefined,
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'AuthHooks',
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react-redux',
        '@reduxjs/toolkit',
        '@repo/api-client',
        '@repo/logger',
        'zod',
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react-redux': 'ReactRedux',
          '@reduxjs/toolkit': 'RTK',
        },
      },
    },
    sourcemap: true,
    emptyOutDir: true,
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
