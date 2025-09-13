import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { fileURLToPath } from 'url';
import tailwindcss from '@tailwindcss/vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'MonorepoGallery',
      fileName: 'index',
      formats: ['es']
    },
    rollupOptions: {
      external: [
        'react', 
        'react-dom', 
        'react/jsx-runtime',
        '@repo/ui',
        '@monorepo/upload',
        'framer-motion',
        'lucide-react',
        'clsx',
        'tailwind-merge',
        'zod',
        '@reduxjs/toolkit',
        'react-redux',
        'react-hook-form',
        '@hookform/resolvers',
        'class-variance-authority'
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime'
        }
      }
    },
    cssCodeSplit: false,
    sourcemap: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    postcss: {
      plugins: []
    }
  }
});
