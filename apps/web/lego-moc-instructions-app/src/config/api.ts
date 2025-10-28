// API Configuration for different environments
export const API_CONFIG = {
  // Development (local docker-compose)
  development: {
    AUTH_API_URL: 'http://localhost:3001',
    LEGO_API_URL: 'http://localhost:3000',
    WS_URL: 'ws://localhost:3001',
  },

  // Staging (AWS)
  staging: {
    AUTH_API_URL: import.meta.env.VITE_AUTH_API_URL || 'https://auth-api-staging.yourdomain.com',
    LEGO_API_URL: import.meta.env.VITE_LEGO_API_URL || 'https://lego-api-staging.yourdomain.com',
    WS_URL: import.meta.env.VITE_WS_URL || 'wss://auth-api-staging.yourdomain.com',
  },

  // Production (AWS)
  production: {
    AUTH_API_URL: import.meta.env.VITE_AUTH_API_URL || 'https://auth-api.yourdomain.com',
    LEGO_API_URL: import.meta.env.VITE_LEGO_API_URL || 'https://api.yourdomain.com',
    WS_URL: import.meta.env.VITE_WS_URL || 'wss://auth-api.yourdomain.com',
  },
} as const

// Get current environment
const getEnvironment = (): keyof typeof API_CONFIG => {
  // Check Vite environment variable first
  const viteEnv = import.meta.env.VITE_ENVIRONMENT
  if (viteEnv && viteEnv in API_CONFIG) {
    return viteEnv as keyof typeof API_CONFIG
  }

  // Fallback to NODE_ENV
  const nodeEnv = import.meta.env.NODE_ENV
  if (nodeEnv === 'production') return 'production'
  if (nodeEnv === 'staging') return 'staging'

  // Default to development
  return 'development'
}

// Export current config
export const currentConfig = API_CONFIG[getEnvironment()]

// Individual exports for convenience
export const AUTH_API_URL = currentConfig.AUTH_API_URL
export const LEGO_API_URL = currentConfig.LEGO_API_URL
export const WS_URL = currentConfig.WS_URL

// Helper function to build API URLs
export const buildApiUrl = (baseUrl: string, path: string): string => {
  // Remove trailing slash from baseUrl and leading slash from path
  const cleanBaseUrl = baseUrl.replace(/\/$/, '')
  const cleanPath = path.replace(/^\//, '')
  return `${cleanBaseUrl}/${cleanPath}`
}

// API endpoints
export const API_ENDPOINTS = {
  // Auth Service endpoints
  auth: {
    login: buildApiUrl(AUTH_API_URL, '/api/auth/login'),
    register: buildApiUrl(AUTH_API_URL, '/api/auth/register'),
    logout: buildApiUrl(AUTH_API_URL, '/api/auth/logout'),
    refresh: buildApiUrl(AUTH_API_URL, '/api/auth/refresh'),
    profile: buildApiUrl(AUTH_API_URL, '/api/auth/profile'),
    verify: buildApiUrl(AUTH_API_URL, '/api/auth/verify'),
  },

  // LEGO Projects API endpoints
  lego: {
    mocs: buildApiUrl(LEGO_API_URL, '/api/mocs'),
    sets: buildApiUrl(LEGO_API_URL, '/api/sets'),
    instructions: buildApiUrl(LEGO_API_URL, '/api/instructions'),
    search: buildApiUrl(LEGO_API_URL, '/api/search'),
    upload: buildApiUrl(LEGO_API_URL, '/api/upload'),
    wishlist: buildApiUrl(LEGO_API_URL, '/api/wishlist'),
  },
} as const

// Debug logging in development
if (getEnvironment() === 'development') {
  // API configuration logging removed for production
}
