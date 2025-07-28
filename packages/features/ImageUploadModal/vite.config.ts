import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'index.tsx'),
      name: 'ImageUploadModal',
      fileName: 'index',
      formats: ['es', 'cjs'],
    },
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      external: ['react', 'react-dom', 'zod', '@repo/ui', '@monorepo/fileupload'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          zod: 'zod',
          '@repo/ui': 'RepoUI',
          '@monorepo/fileupload': 'RepoFileUpload',
        },
      },
    },
  },
  define: {
    __DEV__: false,
  },
});
