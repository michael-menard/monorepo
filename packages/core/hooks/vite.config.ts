import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  return {
    plugins: [
      react(),
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
          useLocalStorage: path.resolve(__dirname, 'src/useLocalStorage.ts'),
          useUnsavedChangesPrompt: path.resolve(__dirname, 'src/useUnsavedChangesPrompt.ts'),
          useDelayedShow: path.resolve(__dirname, 'src/useDelayedShow.ts'),
          useMultiSelect: path.resolve(__dirname, 'src/useMultiSelect.ts'),
        },
        formats: ['es'],
      },
      outDir: 'dist',
      sourcemap: mode === 'development',
      rollupOptions: {
        external: [
          'react',
          'react-dom',
          /^@repo\/.*/,
          '@tanstack/react-router',
          'zod',
        ],
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM',
          },
        },
      },
    },
    define: {
      __DEV__: mode === 'development',
    },
  }
})
