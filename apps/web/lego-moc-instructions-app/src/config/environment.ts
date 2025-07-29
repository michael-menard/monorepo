export const config = {
  api: {
    baseUrl: process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3001/api' // lego-projects-api dev server
      : '/api', // Production API endpoint
  },
  app: {
    name: 'LEGO MOC Instructions App',
    version: '1.0.0',
  },
} as const

export type Config = typeof config 