import { resolve } from 'path'
import { createRequire } from 'module'
import { config as loadEnv } from 'dotenv'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

const require = createRequire(import.meta.url)
const { readPort } = require('../../../infra/ports.cjs')

// Load .env.local so VITE_S3_ENDPOINT and VITE_LEGO_API_HOST are available to proxy config
loadEnv({ path: resolve(__dirname, '.env.local') })

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
    port: process.env.MAIN_APP_PORT
      ? parseInt(process.env.MAIN_APP_PORT)
      : readPort('MAIN_APP_PORT'),
    host: true,
    allowedHosts: true,
    proxy: {
      // Proxy all /api/* requests to the backend server
      // Strips the /api prefix: /api/wishlist -> /wishlist
      // Rewrites localhost:9000 URLs in JSON responses to /s3/ for Tailscale compatibility
      '/api': {
        target: `${process.env.VITE_LEGO_API_HOST || 'http://localhost'}:${process.env.VITE_LEGO_API_PORT || process.env.LEGO_API_PORT || readPort('LEGO_API_PORT')}`,
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, ''),
        selfHandleResponse: true,
        configure: proxy => {
          proxy.on('proxyRes', (proxyRes, _req, res) => {
            const contentType = proxyRes.headers['content-type'] || ''
            // Pass through non-JSON responses as-is
            if (!contentType.includes('application/json')) {
              res.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers)
              proxyRes.pipe(res)
              return
            }
            // Buffer JSON responses to rewrite MinIO URLs
            const chunks: Buffer[] = []
            proxyRes.on('data', (chunk: Buffer) => chunks.push(chunk))
            proxyRes.on('end', () => {
              let body = Buffer.concat(chunks).toString('utf-8')
              const s3Endpoint = process.env.VITE_S3_ENDPOINT || 'http://localhost:9000'
              body = body.replaceAll('http://localhost:9000/', `${s3Endpoint}/`)
              const headers = { ...proxyRes.headers }
              delete headers['content-length']
              headers['content-length'] = String(Buffer.byteLength(body))
              res.writeHead(proxyRes.statusCode ?? 200, headers)
              res.end(body)
            })
          })
        },
      },
      // Proxy MinIO/S3 requests for Tailscale compatibility
      '/s3': {
        target: process.env.VITE_S3_ENDPOINT || 'http://localhost:9000',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/s3/, ''),
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
          router: ['react-router-dom'],
          // UI components are imported directly, no barrel file
          auth: ['aws-amplify', '@aws-amplify/ui-react'],
        },
      },
    },
  },
  optimizeDeps: {
    force: true,
    include: ['react', 'react-dom', 'react-router-dom'],
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
