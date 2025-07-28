import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode, command }) => {
  // Load env variables for the current mode
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        // Add workspace package aliases for better imports
        '@packages/ui': path.resolve(__dirname, '../ui/src'),
        '@packages/auth': path.resolve(__dirname, '../auth/src'),
        '@packages/shared': path.resolve(__dirname, '../shared/src'),
        '@packages/wishlist': path.resolve(__dirname, '../wishlist/src'),
        '@packages/features': path.resolve(__dirname, '../features'),
      },
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: mode === 'development',
      minify: mode === 'production',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            ui: ['@packages/ui'],
            auth: ['@packages/auth'],
          },
        },
      },
      // Ensure proper asset handling
      assetsInlineLimit: 4096,
      chunkSizeWarningLimit: 1000,
    },
    server: {
      port: 3000,
      host: true,
      open: true,
      // Enable CORS for development
      cors: true,
    },
    define: {
      __DEV__: mode === 'development',
      // Expose environment variables to the client
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
      exclude: ['@packages/ui', '@packages/auth', '@packages/shared'],
    },
    // Environment variable handling
    envPrefix: ['VITE_', 'REACT_APP_'],
    // CSS handling
    css: {
      modules: {
        localsConvention: 'camelCase',
      },
      preprocessorOptions: {
        scss: {
          additionalData: `@import "${path.resolve(__dirname, 'src/styles/variables.scss')}";`,
        },
      },
    },
  };
}); 