import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@repo/auth': resolve(__dirname, '../../packages/auth/src'),
      '@repo/ui': resolve(__dirname, '../../packages/ui/dist'),
      '@repo/profile': resolve(__dirname, '../../packages/features/profile/src'),
      '@monorepo/shared': resolve(__dirname, '../../packages/shared/src'),
    },
  },
}) 