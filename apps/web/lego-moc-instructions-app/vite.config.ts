import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [viteReact()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@repo/auth': resolve(__dirname, '../../../packages/auth/src'),
      '@repo/ui': resolve(__dirname, '../../../packages/ui/src'),
      '@repo/profile': resolve(__dirname, '../../../packages/features/profile/src'),
      '@monorepo/shared': resolve(__dirname, '../../../packages/shared/src'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
