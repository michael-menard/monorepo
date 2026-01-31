import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  test: {
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 8,
      },
    },
    fileParallelism: true,
    environment: 'jsdom',
    environmentMatchGlobs: [
      // Backend tests use node environment
      ['apps/api/**/*.{test,spec}.ts', 'node'],
      ['packages/backend/**/*.{test,spec}.ts', 'node'],
      // Frontend tests use jsdom environment
      ['**/*.{test,spec}.tsx', 'jsdom'],
      ['**/*.{test,spec}.jsx', 'jsdom'],
    ],
    include: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
      '**/__tests__/**/*.e2e.test.*',
      '**/__tests__/**/*.spec.*',
      '**/src/pages/auth/EmailVerificationPage/__tests__/**',
    ],
    globals: true,
    setupFiles: ['./__tests__/setup.ts'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.config.*',
        '**/test/**',
        '**/__tests__/**',
        '**/*.d.ts',
        '**/coverage/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@packages/ui': path.resolve(__dirname, './packages/ui/src'),
      '@packages/auth': path.resolve(__dirname, './packages/auth/src'),
      // Backend aliases for apps/api
      '@/core': path.resolve(__dirname, './apps/api/core'),
      '@/services': path.resolve(__dirname, './apps/api/services'),
      '@/routes': path.resolve(__dirname, './apps/api/routes'),
      '@/endpoints': path.resolve(__dirname, './apps/api/platforms/aws/endpoints'),
    },
  },
})
