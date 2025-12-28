import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@repo/ui': resolve(__dirname, '../../../packages/core/app-component-library/src'),
      '@repo/app-component-library': resolve(
        __dirname,
        '../../../packages/core/app-component-library/src',
      ),
      '@repo/design-system': resolve(__dirname, '../../../packages/core/design-system/src'),
      '@repo/logger': resolve(__dirname, '../../../packages/core/logger/src'),
    },
  },
})
