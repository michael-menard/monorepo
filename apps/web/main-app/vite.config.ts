import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/components': resolve(__dirname, './src/components'),
      '@/lib': resolve(__dirname, './src/lib'),
      '@/hooks': resolve(__dirname, './src/hooks'),
      '@/services': resolve(__dirname, './src/services'),
      '@/store': resolve(__dirname, './src/store'),
      '@/types': resolve(__dirname, './src/types'),
      '@/routes': resolve(__dirname, './src/routes'),
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      // Proxy all /api/* requests to the backend server (localhost:9000)
      // Strips the /api prefix: /api/wishlist -> /wishlist
      '/api': {
        target: 'http://localhost:9000',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['@tanstack/react-router'],
          // UI components are imported directly, no barrel file
          auth: ['aws-amplify', '@aws-amplify/ui-react'],
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@tanstack/react-router',
    ],
    exclude: [
      // Exclude all workspace packages from pre-bundling
      '@repo/api-client',
      '@repo/app-component-library',
      '@repo/cache',
      '@repo/logger',
      '@repo/upload',
      '@repo/accessibility',
      '@repo/charts',
      '@repo/mock-data',
    ],
  },
  define: {
    // Enable React DevTools in development
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
  },
})
