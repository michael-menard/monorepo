import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path'
import { config } from 'dotenv'

// Load .env files before config is processed (Vite loads these after config, so we do it manually)
// Priority: local app .env.local > local app .env > root .env.local > root .env
const rootDir = resolve(__dirname, '../../..')
config({ path: resolve(__dirname, '.env.local') })
config({ path: resolve(__dirname, '.env') })
config({ path: resolve(rootDir, '.env.local') })
config({ path: resolve(rootDir, '.env') })

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
      
      '@/types': resolve(__dirname, './src/types'),
      '@/routes': resolve(__dirname, './src/routes'),
      '@/pages': resolve(__dirname, './src/pages'),
    },
  },
  server: {
    port: (() => {
      if (!process.env.FRONTEND_PORT) {
        throw new Error('FRONTEND_PORT environment variable is required. Set it in root .env')
      }
      return parseInt(process.env.FRONTEND_PORT)
    })(),
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['@tanstack/react-router'],
          ui: ['@repo/app-component-library'],
          
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@tanstack/react-router',
      '@repo/app-component-library',
      '@repo/api-client',
      '@repo/cache',
    ],
  },
  define: {
    // Enable React DevTools in development
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
  },
})
