import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MonorepoUpload',
      formats: ['es', 'cjs'],
      fileName: (format) => {
        const extension = format === 'es' ? 'js' : 'cjs';
        return `index.${extension}`;
      },
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@repo/ui',
        'sharp',
        'zod',
        'clsx',
        'tailwind-merge'
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
        },
      },
    },
    sourcemap: true,
    target: 'es2022',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});
