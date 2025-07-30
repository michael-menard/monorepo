import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    environmentMatchGlobs: [
      ['**/*.{test,spec}.tsx', 'jsdom'],
      ['**/*.{test,spec}.jsx', 'jsdom'],
    ],
    include: [
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
      '**/__tests__/**/*.e2e.test.*',
      '**/__tests__/**/*.spec.*',
      '**/src/pages/auth/EmailVerificationPage/__tests__/**'
    ],
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
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
        '**/coverage/**'
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@packages/ui': path.resolve(__dirname, './packages/ui/src'),
      '@packages/auth': path.resolve(__dirname, './packages/auth/src'),
    },
  },
}); 