import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      exclude: ['**/*.test.ts', '**/*.spec.ts'],
    }),
  ],
  build: {
    lib: {
      entry: {
        'client/serverless-client': resolve(__dirname, 'src/client/serverless-client.ts'),
        'rtk/base-query': resolve(__dirname, 'src/rtk/base-query.ts'),
        'rtk/gallery-api': resolve(__dirname, 'src/rtk/gallery-api.ts'),
        'rtk/wishlist-api': resolve(__dirname, 'src/rtk/wishlist-api.ts'),
        'auth/cognito-integration': resolve(__dirname, 'src/auth/cognito-integration.ts'),
        'auth/auth-middleware': resolve(__dirname, 'src/auth/auth-middleware.ts'),
        'auth/rtk-auth-integration': resolve(__dirname, 'src/auth/rtk-auth-integration.ts'),
        'retry/retry-logic': resolve(__dirname, 'src/retry/retry-logic.ts'),
        'config/environments': resolve(__dirname, 'src/config/environments.ts'),
        'config/endpoints': resolve(__dirname, 'src/config/endpoints.ts'),
        'types/api-responses': resolve(__dirname, 'src/types/api-responses.ts'),
      },
      name: 'ApiClient',
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        '@reduxjs/toolkit',
        '@reduxjs/toolkit/query/react',
        'zod',
      ],
    },
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
