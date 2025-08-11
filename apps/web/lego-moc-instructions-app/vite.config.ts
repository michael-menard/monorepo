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
              <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' http://localhost:* https://* ws://localhost:* wss://localhost:*; media-src 'self'; object-src 'none'; frame-src 'none'; worker-src 'self' blob:; form-action 'self'">
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
        // Add security headers to HTML output
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@repo/ui'],
          auth: ['@repo/auth'],
        },
      },
    },
  }
})
