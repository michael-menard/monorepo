import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { fileURLToPath } from 'url';
import tailwindcss from '@tailwindcss/vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        // Add workspace package aliases for better imports
        '@packages/ui': path.resolve(__dirname, '../ui/src'),
        '@packages/shared': path.resolve(__dirname, '../shared/src'),
        '@packages/shared-cache': path.resolve(__dirname, '../shared-cache/src'),
        '@packages/wishlist': path.resolve(__dirname, '../wishlist/src'),
        '@packages/features': path.resolve(__dirname, '../features'),
      },
    },
    build: {
      lib: {
        entry: {
          index: path.resolve(__dirname, 'src/index.ts'),
          'react-router': path.resolve(__dirname, 'src/react-router.ts'),
        },
        formats: ['es', 'cjs'],
      },
      outDir: 'dist',
      sourcemap: mode === 'development',
      rollupOptions: {
        external: ['react', 'react-dom', 'react-router-dom', 'zod', '@packages/ui', '@packages/shared', '@repo/cache'],
        output: {
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM',
            'react-router-dom': 'ReactRouterDOM',
            zod: 'zod',
          },
        },
      },
    },
    define: {
      __DEV__: mode === 'development',
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
      exclude: ['@packages/ui', '@packages/shared', '@repo/cache'],
    },
  };
});
