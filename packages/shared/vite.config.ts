import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        // Add workspace package aliases for better imports
        '@packages/ui': path.resolve(__dirname, '../ui/src'),
        '@packages/auth': path.resolve(__dirname, '../auth/src'),
        '@packages/wishlist': path.resolve(__dirname, '../wishlist/src'),
        '@packages/features': path.resolve(__dirname, '../features'),
      },
    },
    build: {
      lib: {
        entry: path.resolve(__dirname, 'src/index.ts'),
        name: 'Shared',
        fileName: 'index',
        formats: ['es', 'cjs'],
      },
      outDir: 'dist',
      sourcemap: mode === 'development',
      rollupOptions: {
        external: ['react', 'react-dom', 'zod', '@repo/ui', '@repo/ui/lib/utils', '@repo/profile', 'lucide-react'],
        output: {
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM',
            zod: 'zod',
            '@repo/ui': 'RepoUI',
            '@repo/profile': 'RepoProfile',
            'lucide-react': 'LucideReact',
          },
        },
      },
    },
    define: {
      __DEV__: mode === 'development',
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
    },
  };
}); 