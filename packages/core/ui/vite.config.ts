import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  return {
    plugins: [
      react(),
      dts({
        insertTypesEntry: true,
        exclude: ['**/*.stories.ts', '**/*.stories.tsx', '**/*.test.ts', '**/*.test.tsx']
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      lib: {
        entry: path.resolve(__dirname, 'src/index.ts'),
        name: 'UI',
        fileName: 'index',
        formats: ['es', 'cjs'],
      },
      outDir: 'dist',
      sourcemap: mode === 'development',
      rollupOptions: {
        output: {
          // Ensure proper file extensions for ES modules
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
        },
        external: [
          'react',
          'react-dom',
          /^@radix-ui\/.*/,
          'class-variance-authority',
          'clsx',
          'framer-motion',
          'lucide-react',
          'tailwind-merge',
          'tailwindcss',
          'tailwindcss-animate',
          '@reduxjs/toolkit',
          'react-hook-form',
          '@hookform/resolvers',
          'zod',
          'browser-image-compression',
          'react-dropzone',
          'react-easy-crop',
          'cmdk',
          'i18next',
          'react-i18next',
          'next-themes',
          'sonner',
        ],
        output: {
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
  };
});
