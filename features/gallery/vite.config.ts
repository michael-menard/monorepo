import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// Shared config import can be added here in the future
// import baseConfig from '../../vite-config/vite.config.base';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Add more shared or package-specific config here as needed
}); 