import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      overlay: true,
    },
  },
  optimizeDeps: {
    include: ['zustand', 'react', 'react-dom', 'react-router-dom', 'axios', 'framer-motion', 'lucide-react'],
  },
  // To prevent the outdated optimize dep error
  cacheDir: './.vite',
})