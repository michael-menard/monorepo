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
      
      '@/types': resolve(__dirname, './src/types'),
      '@/routes': resolve(__dirname, './src/routes'),
      '@/pages': resolve(__dirname, './src/pages'),
    },
  },
  server: {
    port: 3005,
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
