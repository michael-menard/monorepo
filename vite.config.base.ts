import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode, command }) => {
  // Load env variables for the current mode
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [
      react(),
      // Security headers plugin
      {
        name: 'security-headers',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
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
              "font-src 'self'",
              "connect-src 'self' http://localhost:* https://*",
              "media-src 'self'",
              "object-src 'none'",
              "frame-src 'none'",
              "worker-src 'self' blob:",
              "form-action 'self'"
            ].join('; '));
            next();
          });
        },
        generateBundle(options, bundle) {
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
                <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' http://localhost:* https://*; media-src 'self'; object-src 'none'; frame-src 'none'; worker-src 'self' blob:; form-action 'self'">
              `;
              file.source = html.replace('</head>', `${securityHeaders}</head>`);
            }
          }
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        // Add workspace package aliases for better imports
        '@packages/ui': path.resolve(__dirname, '../ui/src'),
        '@packages/auth': path.resolve(__dirname, '../auth/src'),
        '@packages/shared': path.resolve(__dirname, '../shared/src'),
        '@packages/wishlist': path.resolve(__dirname, '../wishlist/src'),
        '@packages/features': path.resolve(__dirname, '../features'),
      },
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: mode === 'development',
      minify: mode === 'production',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            ui: ['@packages/ui'],
            auth: ['@packages/auth'],
          },
        },
      },
      // Ensure proper asset handling
      assetsInlineLimit: 4096,
      chunkSizeWarningLimit: 1000,
    },
    server: {
      port: 3000,
      host: true,
      open: true,
      // Enable CORS for development
      cors: true,
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
          "font-src 'self'",
          "connect-src 'self' http://localhost:* https://*",
          "media-src 'self'",
          "object-src 'none'",
          "frame-src 'none'",
          "worker-src 'self' blob:",
          "form-action 'self'"
        ].join('; ')
      }
    },
    define: {
      __DEV__: mode === 'development',
      // Expose environment variables to the client
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
      exclude: ['@packages/ui', '@packages/auth', '@packages/shared'],
    },
    // Environment variable handling
    envPrefix: ['VITE_', 'REACT_APP_'],
    // CSS handling
    css: {
      modules: {
        localsConvention: 'camelCase',
      },
      preprocessorOptions: {
        scss: {
          additionalData: `@import "${path.resolve(__dirname, 'src/styles/variables.scss')}";`,
        },
      },
    },
  };
}); 