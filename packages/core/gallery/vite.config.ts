import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path'
import { defineConfig } from 'vite'

const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: isTest
      ? {
          '@radix-ui/react-tooltip': resolve(__dirname, 'src/__tests__/stubs/radix-tooltip.tsx'),
          '@radix-ui/react-toggle-group': resolve(
            __dirname,
            'src/__tests__/stubs/radix-toggle-group.tsx',
          ),
        }
      : {},
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Gallery',
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: ['react', 'react-dom', '@repo/app-component-library', '@repo/logger', 'framer-motion'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
    sourcemap: true,
    emptyOutDir: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    deps: {
      inline: ['framer-motion', '@repo/logger'],
    },
  },
})
