import { resolve } from 'path'
import { createRequire } from 'module'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

const require = createRequire(import.meta.url)
const { readPort } = require('../../infra/ports.cjs')

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
    port: readPort('WORKFLOW_ADMIN_PORT'),
    host: true,
    proxy: {
      // Roadmap service (plans, stories, dashboard)
      '/api/v1': {
        target: `http://localhost:${readPort('ROADMAP_SVC_PORT')}`,
        changeOrigin: true,
      },
      // Default API gateway
      '/api': {
        target: `http://localhost:${readPort('LEGO_API_PORT')}`,
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
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@tanstack/react-router'],
    exclude: [
      '@repo/api-client',
      '@repo/app-component-library',
      '@repo/cache',
      '@repo/logger',
      '@repo/accessibility',
      '@repo/plan-chat',
      '@repo/workflow-roadmap',
    ],
  },
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
  },
})
