import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
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
      // Proxy API requests to the backend server (localhost:3001)
      // V1-style paths: /api/wishlist -> /wishlist (used by wishlist-gallery-api.ts)
      '/api/wishlist': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log(`[Proxy] ${req.method} ${req.url} -> ${proxyReq.path}`)
            console.log(`[Proxy] Auth header: ${req.headers.authorization ? 'present' : 'missing'}`)
          })
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log(`[Proxy] Response ${proxyRes.statusCode} for ${req.url}`)
          })
          proxy.on('error', (err, req) => {
            console.error(`[Proxy] Error for ${req.url}:`, err.message)
          })
        },
      },
      // V2-style paths: /api/v2/wishlist/items -> /wishlist (used by wishlist-api.ts)
      '/api/v2/wishlist': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/v2\/wishlist\/items/, '/wishlist').replace(/^\/api\/v2\/wishlist/, '/wishlist'),
      },
      '/api/v2/health': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/v2/, ''),
      },
      '/api/v2/gallery': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/v2/, ''),
      },
      '/api/v2/sets': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/v2/, ''),
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
      // UI components are imported directly, no barrel file
      // API client uses direct imports, no barrel file
      '@repo/cache',
    ],
  },
  define: {
    // Enable React DevTools in development
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
  },
})
