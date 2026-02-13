import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  return {
    plugins: [
      dts({
        insertTypesEntry: true,
        exclude: ['**/*.test.ts', '**/*.test.tsx', 'src/__tests__/**'],
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      lib: {
        entry: {
          index: path.resolve(__dirname, 'src/index.ts'),
          'jwt/index': path.resolve(__dirname, 'src/jwt/index.ts'),
          'guards/index': path.resolve(__dirname, 'src/guards/index.ts'),
        },
        formats: ['es'],
      },
      outDir: 'dist',
      sourcemap: mode === 'development',
      rollupOptions: {
        external: [/^@repo\/.*/, '@tanstack/react-router', 'zod'],
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
        },
      },
    },
    define: {
      __DEV__: mode === 'development',
    },
  }
})
