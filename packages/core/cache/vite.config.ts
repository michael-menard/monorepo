import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/schemas/cache.ts'),
      name: 'SharedCache',
      fileName: 'shared-cache',
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['zod'],
      output: {
        globals: {
          zod: 'zod',
        },
      },
    },
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
