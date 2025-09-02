import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  return {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      lib: {
        entry: {
          index: path.resolve(__dirname, 'src/index.ts'),
          'index.browser': path.resolve(__dirname, 'src/index.browser.ts'),
          'schemas/index': path.resolve(__dirname, 'src/schemas/index.ts'),
          'schemas/index.browser': path.resolve(__dirname, 'src/schemas/index.browser.ts'),
          'types/index': path.resolve(__dirname, 'src/types/index.ts'),
          'types/index.browser': path.resolve(__dirname, 'src/types/index.browser.ts'),
        },
        formats: ['es', 'cjs'],
      },
      outDir: 'dist',
      sourcemap: mode === 'development',
      rollupOptions: {
        external: ['sharp', 'zod'],
        output: {
          globals: {
            sharp: 'sharp',
            zod: 'zod',
          },
        },
      },
    },
    define: {
      __DEV__: mode === 'development',
    },
  };
});
