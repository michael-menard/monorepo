import { resolve } from 'path'
import { createRequire } from 'module'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

const require = createRequire(import.meta.url)
const { readPort } = require('../../infra/ports.cjs')

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/components': resolve(__dirname, './src/components'),
      '@/store': resolve(__dirname, './src/store'),
    },
  },
  server: {
    port: readPort('PORT_MONITOR_PORT'),
    host: true,
    proxy: {
      '/api/v1': {
        target: `http://localhost:${readPort('ROADMAP_SVC_PORT')}`,
        changeOrigin: true,
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
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: ['@repo/app-component-library', '@repo/logger', '@repo/charts'],
  },
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
  },
})
