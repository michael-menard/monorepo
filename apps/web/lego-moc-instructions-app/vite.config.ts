import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    viteReact(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: {
        enabled: true,
        type: 'module'
      },
      strategies: 'generateSW',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          // Cache API responses for offline access
          {
            urlPattern: /^https:\/\/.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              networkTimeoutSeconds: 3, // Fallback to cache after 3 seconds
              plugins: [
                {
                  cacheKeyWillBeUsed: async ({ request }) => {
                    // Only apply background sync to write operations (POST, PUT, DELETE)
                    if (request.method !== 'GET' && request.method !== 'HEAD') {
                      return `${request.url}?${Date.now()}`;
                    }
                    return request.url;
                  },
                },
              ],
            },
          },
          // Cache MOC instruction images
          {
            urlPattern: /^https:\/\/.*\/uploads\/.*\.(jpg|jpeg|png|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'moc-images',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Cache static assets with longer expiration
          {
            urlPattern: /\.(js|css|woff2|woff|ttf|eot)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Cache HTML pages for offline navigation
          {
            urlPattern: /^https:\/\/.*\/.*$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              networkTimeoutSeconds: 2,
            },
          },
        ],
        // Offline fallback page
        navigateFallback: '/index.html',
        navigateFallbackAllowlist: [/^(?!\/__).*/],
      },
      includeAssets: ['favicon.ico', 'logo192.png', 'logo512.png'],
      manifest: {
        name: 'Lego MOC Instructions App',
        short_name: 'Lego MOC Instructions',
        description: 'Create, share, and follow custom Lego MOC instructions with step-by-step guidance',
        theme_color: '#000000',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'logo192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'logo512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Create New MOC',
            short_name: 'New MOC',
            description: 'Start creating a new Lego MOC',
            url: '/create',
            icons: [{ src: 'logo192.png', sizes: '192x192' }]
          },
          {
            name: 'My Gallery',
            short_name: 'Gallery',
            description: 'View your created MOCs',
            url: '/gallery',
            icons: [{ src: 'logo192.png', sizes: '192x192' }]
          }
        ]
      }
    }),
    // Security headers plugin
    {
      name: 'security-headers',
      configureServer(server) {
        server.middlewares.use((_req, res, next) => {
          // Security headers for development
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.setHeader('X-Frame-Options', 'DENY');
          res.setHeader('X-XSS-Protection', '1; mode=block');
          res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
          res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
          res.setHeader('Content-Security-Policy', [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self' data: https:",
            "connect-src 'self' http://localhost:* https://* ws://localhost:* wss://localhost:*",
            "media-src 'self'",
            "object-src 'none'",
            "frame-src 'none'",
            "worker-src 'self' blob:",
            "form-action 'self'"
          ].join('; '));
          next();
        });
      },
      generateBundle(_options, bundle) {
        // Add security headers to HTML files in production build
        for (const fileName in bundle) {
          const file = bundle[fileName];
          if (file.type === 'asset' && fileName.endsWith('.html')) {
            const html = file.source.toString();
            const securityHeaders = `
              <meta http-equiv="X-Content-Type-Options" content="nosniff">
              <meta http-equiv="X-Frame-Options" content="DENY">
              <meta http-equiv="X-XSS-Protection" content="1; mode=block">
              <meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin">
              <meta http-equiv="Permissions-Policy" content="camera=(), microphone=(), geolocation=()">
              <meta http-equiv="Content-Security-Policy" content="default-src 'self'; base-uri 'self'; frame-ancestors 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self'; media-src 'self'; object-src 'none'; frame-src 'none'; worker-src 'self' blob:; form-action 'self'; upgrade-insecure-requests">
            `;
            file.source = html.replace('</head>', `${securityHeaders}</head>`);
          }
        }
      }
    }
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@repo/auth': resolve(__dirname, '../../../packages/auth/src'),
      '@repo/ui': resolve(__dirname, '../../../packages/ui/src'),
      '@repo/moc-instructions': resolve(__dirname, '../../../packages/features/moc-instructions/src'),
      '@repo/profile': resolve(__dirname, '../../../packages/features/profile/src'),
      '@repo/shared-cache': resolve(__dirname, '../../../packages/shared-cache/src'),
      '@repo/shared-image-utils': resolve(__dirname, '../../../packages/shared-image-utils'),
      '@monorepo/shared': resolve(__dirname, '../../../packages/shared/src'),
    },
  },
  define: {
    global: 'globalThis',
    'process.env': {},
  },

  server: {
    port: 3001,
    host: true,
    proxy: {
      // Auth service routes - proxy to auth-service on port 9000
      '/api/auth': {
        target: 'http://localhost:9000',
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path) => path // Keep the /api/auth prefix
      },
      // All other API routes - proxy to lego-projects-api on port 3000  
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        ws: true
      }
    },
    // Security headers for development server
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' data: https:",
        "connect-src 'self' http://localhost:* https://* ws://localhost:* wss://localhost:*",
        "media-src 'self'",
        "object-src 'none'",
        "frame-src 'none'",
        "worker-src 'self' blob:",
        "form-action 'self'"
      ].join('; ')
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Security headers for production build
    rollupOptions: {
      output: {
        // Optimized manual chunks for better code splitting
        manualChunks: (id) => {
          // Core React libraries - loaded on every page
          if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
            return 'react-vendor'
          }
          
          // Router - needed for navigation, but can be separate
          if (id.includes('@tanstack/react-router')) {
            return 'router'
          }
          
          // State management - used across most pages
          if (id.includes('@reduxjs/toolkit') || id.includes('react-redux') || id.includes('redux')) {
            return 'state'
          }
          
          // Shared UI components - frequently reused
          if (id.includes('@repo/ui') || id.includes('@monorepo/shared')) {
            return 'shared-ui'
          }
          
          // Feature-specific packages - can be lazy loaded per feature
          if (id.includes('@repo/moc-instructions')) {
            return 'moc-feature'
          }
          if (id.includes('@repo/profile')) {
            return 'profile-feature'
          }
          
          // Auth package - used in multiple places but not everywhere
          if (id.includes('@repo/auth')) {
            return 'auth'
          }
          
          // Image utilities - used in gallery and detail pages
          if (id.includes('@repo/shared-image-utils')) {
            return 'image-utils'
          }
          
          // Cache utilities
          if (id.includes('@repo/shared-cache')) {
            return 'cache-utils'
          }
          
          // Large third-party libraries that don't change often
          if (id.includes('node_modules')) {
            // Group smaller utilities together
            if (id.includes('clsx') || id.includes('class-variance-authority') || 
                id.includes('tailwind-merge') || id.includes('lucide-react')) {
              return 'ui-utils'
            }
            
            // Date/time libraries
            if (id.includes('date-fns') || id.includes('dayjs')) {
              return 'date-utils'
            }
            
            // Form libraries
            if (id.includes('react-hook-form') || id.includes('zod')) {
              return 'forms'
            }
            
            // Other vendor libraries
            return 'vendor'
          }
        },
      },
    },
  }
})
