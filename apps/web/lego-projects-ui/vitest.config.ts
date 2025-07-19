/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // Test Environment
    environment: 'jsdom',
    
    // Setup Files
    setupFiles: ['./src/test/setup.ts'],
    
    // Global Test Configuration
    globals: true,
    
    // File Patterns
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'src/**/__tests__/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache',
      'build'
    ],
    
    // Coverage Configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/**',
        '**/coverage/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/main.tsx',
        '**/vite-env.d.ts'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    
    // Watch Options
    watch: false, // Disable watch mode for CI [[memory:3017388]]
    
    // Reporter Options
    reporters: ['verbose', 'json', 'html'],
    outputFile: {
      json: './test-results/results.json',
      html: './test-results/index.html'
    },
    
    // Performance
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // UI Configuration
    ui: true,
    
    // Retry Configuration
    retry: 2,
    
    // Parallel Execution
    maxConcurrency: 4,
    
    // Environment Variables
    env: {
      NODE_ENV: 'test',
      VITE_API_URL: 'http://localhost:3001',
      VITE_AUTH_SERVICE_URL: 'http://localhost:3002'
    }
  },
  
  // Path Resolution (matching main vite.config.ts)
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/store': path.resolve(__dirname, './src/store'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/config': path.resolve(__dirname, './src/config'),
      '@/assets': path.resolve(__dirname, './src/assets'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      
      // Monorepo Package Aliases
      '@repo/auth': path.resolve(__dirname, '../../../packages/auth/src'),
      '@repo/ui': path.resolve(__dirname, '../../../packages/ui/src'),
      '@repo/profile': path.resolve(__dirname, '../../../packages/profile/src'),
      '@repo/gallery': path.resolve(__dirname, '../../../packages/gallery/src'),
      '@repo/moc': path.resolve(__dirname, '../../../packages/moc/src'),
      '@repo/wishlist': path.resolve(__dirname, '../../../packages/wishlist/src'),
    }
  },
  
  // Define Global Constants for Tests
  define: {
    __APP_VERSION__: JSON.stringify('test-version'),
    __BUILD_TIME__: JSON.stringify('test-time'),
  }
}) 