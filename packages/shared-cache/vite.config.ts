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
      },
    },
    build: {
      lib: {
        entry: path.resolve(__dirname, 'src/index.ts'),
        name: 'SharedCache',
        fileName: 'index',
        formats: ['es', 'cjs'],
      },
      outDir: 'dist',
      sourcemap: mode === 'development',
      emptyOutDir: true,
      rollupOptions: {
        external: ['react', 'react-dom', 'zod'],
        output: {
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM',
            zod: 'zod',
          },
        },
      },
    },
    esbuild: {
      target: 'esnext',
    },
    define: {
      __DEV__: mode === 'development',
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
    },
  };
});
