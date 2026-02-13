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
          index: path.resolve(__dirname, 'src/index.ts'),
          'client/index': path.resolve(__dirname, 'src/client/index.ts'),
          'hooks/index': path.resolve(__dirname, 'src/hooks/index.ts'),
          'image/index': path.resolve(__dirname, 'src/image/index.ts'),
          'image/presets/index': path.resolve(__dirname, 'src/image/presets/index.ts'),
          'image/presets/__types__/index': path.resolve(__dirname, 'src/image/presets/__types__/index.ts'),
          'image/compression/index': path.resolve(__dirname, 'src/image/compression/index.ts'),
          'image/compression/__types__/index': path.resolve(__dirname, 'src/image/compression/__types__/index.ts'),
          'image/heic/index': path.resolve(__dirname, 'src/image/heic/index.ts'),
          'image/heic/__types__/index': path.resolve(__dirname, 'src/image/heic/__types__/index.ts'),
          'components/index': path.resolve(__dirname, 'src/components/index.ts'),
          'types/index': path.resolve(__dirname, 'src/types/index.ts'),
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
          'class-variance-authority',
          'clsx',
          'framer-motion',
          'tailwind-merge',
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
