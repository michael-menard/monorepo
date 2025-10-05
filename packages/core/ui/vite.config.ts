import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
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
