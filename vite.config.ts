import { defineConfig } from 'vite';
import baseConfig from './vite.config.base';

export default defineConfig(({ mode, command }) => {
  const base = baseConfig({ mode, command });
  
  return {
    ...base,
    server: {
      ...base.server,
      proxy: {
        '/auth-ui': {
          target: 'http://localhost:5174',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/auth-ui/, ''),
        },
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
}); 