/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    
    // Enhanced resolve configuration with comprehensive path aliases
    resolve: {
      alias: {
        // Local app aliases
        "@": path.resolve(__dirname, "./src"),
        "@/components": path.resolve(__dirname, "./src/components"),
        "@/pages": path.resolve(__dirname, "./src/pages"),
        "@/hooks": path.resolve(__dirname, "./src/hooks"),
        "@/utils": path.resolve(__dirname, "./src/utils"),
        "@/store": path.resolve(__dirname, "./src/store"),
        "@/services": path.resolve(__dirname, "./src/services"),
        "@/types": path.resolve(__dirname, "./src/types"),
        "@/config": path.resolve(__dirname, "./src/config"),
        "@/lib": path.resolve(__dirname, "./src/lib"),
        "@/layouts": path.resolve(__dirname, "./src/layouts"),
        
        // Monorepo package aliases
        "@repo/auth": path.resolve(__dirname, "../../../packages/auth/src/index.ts"),
        "@repo/ui": path.resolve(__dirname, "../../../packages/ui/src/index.ts"),
        "@repo/gallery": path.resolve(__dirname, "../../../packages/gallery/src/index.ts"),
        "@repo/wishlist": path.resolve(__dirname, "../../../packages/wishlist/src/index.ts"),
        "@repo/profile": path.resolve(__dirname, "../../../packages/profile/src/index.ts"),
        "@repo/moc": path.resolve(__dirname, "../../../packages/moc/src/index.ts"),
        
        // Package sub-module aliases
        "@repo/auth/*": path.resolve(__dirname, "../../../packages/auth/src/*"),
        "@repo/ui/*": path.resolve(__dirname, "../../../packages/ui/src/*"),
        "@repo/gallery/*": path.resolve(__dirname, "../../../packages/gallery/src/*"),
        "@repo/wishlist/*": path.resolve(__dirname, "../../../packages/wishlist/src/*"),
        "@repo/profile/*": path.resolve(__dirname, "../../../packages/profile/src/*"),
        "@repo/moc/*": path.resolve(__dirname, "../../../packages/moc/src/*"),
      },
    },
    
    // Development server configuration
    server: {
      port: 3000,
      host: true, // Allow access from network
      cors: true,
      proxy: {
        // Auth service proxy
        '/auth-ui': {
          target: 'http://localhost:5174',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/auth-ui/, ''),
        },
        // API proxy for backend services
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    
    // Build configuration
    build: {
      // Generate sourcemaps for production debugging
      sourcemap: mode === 'development',
      
      // Build optimizations
      rollupOptions: {
        output: {
          // Manual chunks for better caching
          manualChunks: {
            // Vendor chunks
            'react-vendor': ['react', 'react-dom'],
            'router-vendor': ['react-router-dom'],
            'ui-vendor': ['@radix-ui/react-avatar', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
            'utils-vendor': ['clsx', 'tailwind-merge', 'class-variance-authority'],
            'animation-vendor': ['framer-motion'],
            'icons-vendor': ['lucide-react'],
            
            // App chunks
            'auth': ['@repo/auth'],
            'ui-components': ['@repo/ui'],
            'gallery': ['@repo/gallery'],
            'wishlist': ['@repo/wishlist'],
            'profile': ['@repo/profile'],
            'moc': ['@repo/moc'],
          },
          
          // Asset file naming
          assetFileNames: (assetInfo) => {
            if (!assetInfo.name) return 'assets/[name]-[hash][extname]'
            
            if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name)) {
              return `assets/images/[name]-[hash][extname]`
            }
            if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name)) {
              return `assets/fonts/[name]-[hash][extname]`
            }
            return `assets/[name]-[hash][extname]`
          },
          
          // Chunk file naming
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
        },
      },
      
      // Target modern browsers for better optimization
      target: 'es2020',
      
      // Enable minification
      minify: 'esbuild',
      
      // CSS code splitting
      cssCodeSplit: true,
      
      // Chunk size warning limit
      chunkSizeWarningLimit: 1000,
      
      // Asset inlining threshold
      assetsInlineLimit: 4096,
    },
    
    // CSS configuration
    css: {
      devSourcemap: true,
      
      // PostCSS configuration (uses postcss.config.js)
      postcss: path.resolve(__dirname, '../../../postcss.config.js'),
    },
    
    // Environment variables configuration
    envPrefix: ['VITE_', 'REACT_APP_'],
    
    // Define global constants
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
    
    // Optimizations
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@radix-ui/react-avatar',
        '@radix-ui/react-dialog',
        '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-select',
        '@radix-ui/react-checkbox',
        '@radix-ui/react-switch',
        '@radix-ui/react-tabs',
        '@radix-ui/react-popover',
        '@radix-ui/react-tooltip',
        'clsx',
        'tailwind-merge',
        'class-variance-authority',
        'framer-motion',
        'lucide-react',
      ],
      exclude: [
        // Don't pre-bundle monorepo packages to ensure latest builds
        '@repo/auth',
        '@repo/ui',
        '@repo/gallery',
        '@repo/wishlist',
        '@repo/profile',
        '@repo/moc',
      ],
    },
    
    // Test configuration
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      coverage: {
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'src/test/',
          '**/*.d.ts',
          '**/*.test.{ts,tsx}',
          '**/*.spec.{ts,tsx}',
        ],
      },
    },
  }
})
