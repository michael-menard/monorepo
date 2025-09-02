export const config = {
  api: {
    baseUrl: process.env.NODE_ENV === 'development' 
      ? '/api' // via Vite dev proxy to http://localhost:3000
      : '/api', // Production API endpoint
  },
  app: {
    name: 'LEGO MOC Instructions App',
    version: '1.0.0',
  },
} as const

export type Config = typeof config
