/**
 * Environment Configuration Helper with Zod Validation
 * Provides type-safe access to environment variables with validation and defaults
 */
import { z } from 'zod'

// =============================================================================
// ENVIRONMENT SCHEMAS
// =============================================================================

// Base environment schema
const EnvSchema = z.object({
  // Application Configuration
  VITE_APP_NAME: z.string().default('LEGO Projects UI'),
  VITE_APP_VERSION: z.string().default('1.0.0'),
  VITE_APP_DESCRIPTION: z.string().default('LEGO Projects Management Platform'),

  // API Configuration
  VITE_API_URL: z.string().url().default('http://localhost:8000'),
  VITE_API_TIMEOUT: z.string().transform(val => parseInt(val, 10)).pipe(z.number().positive()).default(10000),

  // Authentication Service
  VITE_AUTH_SERVICE_URL: z.string().url().default('http://localhost:5174'),
  VITE_AUTH_TOKEN_KEY: z.string().default('auth_token'),
  VITE_AUTH_REFRESH_TOKEN_KEY: z.string().default('refresh_token'),

  // Feature Flags
  VITE_FEATURE_GALLERY_ENABLED: z.string().transform(val => val === 'true').default(true),
  VITE_FEATURE_WISHLIST_ENABLED: z.string().transform(val => val === 'true').default(true),
  VITE_FEATURE_MOC_INSTRUCTIONS_ENABLED: z.string().transform(val => val === 'true').default(true),
  VITE_FEATURE_PROFILE_ENABLED: z.string().transform(val => val === 'true').default(true),
  VITE_FEATURE_DARK_MODE_ENABLED: z.string().transform(val => val === 'true').default(true),

  // Development Tools
  VITE_ENABLE_DEV_TOOLS: z.string().transform(val => val === 'true').optional(),
  VITE_ENABLE_REDUX_DEVTOOLS: z.string().transform(val => val === 'true').optional(),
  VITE_ENABLE_REACT_QUERY_DEVTOOLS: z.string().transform(val => val === 'true').optional(),

  // Analytics & Monitoring
  VITE_ANALYTICS_ENABLED: z.string().transform(val => val === 'true').default(false),
  VITE_ANALYTICS_ID: z.string().optional(),
  VITE_SENTRY_DSN: z.string().url().optional(),
  VITE_SENTRY_ENVIRONMENT: z.string().optional(),

  // Storage Configuration
  VITE_STORAGE_TYPE: z.enum(['localStorage', 'sessionStorage', 'indexedDB']).default('localStorage'),
  VITE_STORAGE_PREFIX: z.string().default('lego_projects_'),

  // Image & Asset Configuration
  VITE_IMAGE_CDN_URL: z.string().url().optional(),
  VITE_MAX_IMAGE_SIZE: z.string().transform(val => parseInt(val, 10)).pipe(z.number().positive()).default(5242880),
  VITE_SUPPORTED_IMAGE_TYPES: z.string().optional(),

  // Social Login
  VITE_GOOGLE_CLIENT_ID: z.string().optional(),
  VITE_FACEBOOK_APP_ID: z.string().optional(),
  VITE_GITHUB_CLIENT_ID: z.string().optional(),

  // Performance
  VITE_ENABLE_SERVICE_WORKER: z.string().transform(val => val === 'true').default(false),
  VITE_CACHE_TIMEOUT: z.string().transform(val => parseInt(val, 10)).pipe(z.number().positive()).default(300000),

  // Build Configuration
  VITE_BUILD_TARGET: z.string().optional(),
  VITE_SOURCE_MAPS: z.string().transform(val => val === 'true').optional(),
  VITE_BUNDLE_ANALYZER: z.string().transform(val => val === 'true').default(false),

  // Environment Mode
  MODE: z.enum(['development', 'staging', 'production', 'test']).default('development'),
})

// =============================================================================
// PARSE AND VALIDATE ENVIRONMENT
// =============================================================================

// Parse environment variables with fallbacks
const rawEnv = {
  VITE_APP_NAME: import.meta.env.VITE_APP_NAME,
  VITE_APP_VERSION: import.meta.env.VITE_APP_VERSION,
  VITE_APP_DESCRIPTION: import.meta.env.VITE_APP_DESCRIPTION,
  VITE_API_URL: import.meta.env.VITE_API_URL,
  VITE_API_TIMEOUT: import.meta.env.VITE_API_TIMEOUT,
  VITE_AUTH_SERVICE_URL: import.meta.env.VITE_AUTH_SERVICE_URL,
  VITE_AUTH_TOKEN_KEY: import.meta.env.VITE_AUTH_TOKEN_KEY,
  VITE_AUTH_REFRESH_TOKEN_KEY: import.meta.env.VITE_AUTH_REFRESH_TOKEN_KEY,
  VITE_FEATURE_GALLERY_ENABLED: import.meta.env.VITE_FEATURE_GALLERY_ENABLED,
  VITE_FEATURE_WISHLIST_ENABLED: import.meta.env.VITE_FEATURE_WISHLIST_ENABLED,
  VITE_FEATURE_MOC_INSTRUCTIONS_ENABLED: import.meta.env.VITE_FEATURE_MOC_INSTRUCTIONS_ENABLED,
  VITE_FEATURE_PROFILE_ENABLED: import.meta.env.VITE_FEATURE_PROFILE_ENABLED,
  VITE_FEATURE_DARK_MODE_ENABLED: import.meta.env.VITE_FEATURE_DARK_MODE_ENABLED,
  VITE_ENABLE_DEV_TOOLS: import.meta.env.VITE_ENABLE_DEV_TOOLS,
  VITE_ENABLE_REDUX_DEVTOOLS: import.meta.env.VITE_ENABLE_REDUX_DEVTOOLS,
  VITE_ENABLE_REACT_QUERY_DEVTOOLS: import.meta.env.VITE_ENABLE_REACT_QUERY_DEVTOOLS,
  VITE_ANALYTICS_ENABLED: import.meta.env.VITE_ANALYTICS_ENABLED,
  VITE_ANALYTICS_ID: import.meta.env.VITE_ANALYTICS_ID,
  VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
  VITE_SENTRY_ENVIRONMENT: import.meta.env.VITE_SENTRY_ENVIRONMENT,
  VITE_STORAGE_TYPE: import.meta.env.VITE_STORAGE_TYPE,
  VITE_STORAGE_PREFIX: import.meta.env.VITE_STORAGE_PREFIX,
  VITE_IMAGE_CDN_URL: import.meta.env.VITE_IMAGE_CDN_URL,
  VITE_MAX_IMAGE_SIZE: import.meta.env.VITE_MAX_IMAGE_SIZE,
  VITE_SUPPORTED_IMAGE_TYPES: import.meta.env.VITE_SUPPORTED_IMAGE_TYPES,
  VITE_GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  VITE_FACEBOOK_APP_ID: import.meta.env.VITE_FACEBOOK_APP_ID,
  VITE_GITHUB_CLIENT_ID: import.meta.env.VITE_GITHUB_CLIENT_ID,
  VITE_ENABLE_SERVICE_WORKER: import.meta.env.VITE_ENABLE_SERVICE_WORKER,
  VITE_CACHE_TIMEOUT: import.meta.env.VITE_CACHE_TIMEOUT,
  VITE_BUILD_TARGET: import.meta.env.VITE_BUILD_TARGET,
  VITE_SOURCE_MAPS: import.meta.env.VITE_SOURCE_MAPS,
  VITE_BUNDLE_ANALYZER: import.meta.env.VITE_BUNDLE_ANALYZER,
  MODE: import.meta.env.MODE,
}

// Validate environment variables
const envParseResult = EnvSchema.safeParse(rawEnv)

if (!envParseResult.success) {
  console.error('❌ Environment validation failed:')
  console.error(envParseResult.error.flatten())
  throw new Error('Invalid environment configuration')
}

const env = envParseResult.data

// =============================================================================
// CONFIGURATION OBJECTS
// =============================================================================

// Application Configuration
export const app = {
  name: env.VITE_APP_NAME,
  version: env.VITE_APP_VERSION,
  description: env.VITE_APP_DESCRIPTION,
  buildVersion: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : env.VITE_APP_VERSION,
  buildTime: typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : new Date().toISOString(),
} as const

// API Configuration
export const api = {
  baseUrl: env.VITE_API_URL,
  timeout: env.VITE_API_TIMEOUT,
} as const

// Authentication Configuration
export const auth = {
  serviceUrl: env.VITE_AUTH_SERVICE_URL,
  tokenKey: env.VITE_AUTH_TOKEN_KEY,
  refreshTokenKey: env.VITE_AUTH_REFRESH_TOKEN_KEY,
} as const

// Feature Flags
export const features = {
  gallery: env.VITE_FEATURE_GALLERY_ENABLED,
  wishlist: env.VITE_FEATURE_WISHLIST_ENABLED,
  mocInstructions: env.VITE_FEATURE_MOC_INSTRUCTIONS_ENABLED,
  profile: env.VITE_FEATURE_PROFILE_ENABLED,
  darkMode: env.VITE_FEATURE_DARK_MODE_ENABLED,
} as const

// Development Tools
export const devTools = {
  enabled: env.VITE_ENABLE_DEV_TOOLS ?? (env.MODE === 'development'),
  reduxDevtools: env.VITE_ENABLE_REDUX_DEVTOOLS ?? (env.MODE === 'development'),
  reactQueryDevtools: env.VITE_ENABLE_REACT_QUERY_DEVTOOLS ?? (env.MODE === 'development'),
} as const

// Analytics & Monitoring
export const analytics = {
  enabled: env.VITE_ANALYTICS_ENABLED,
  id: env.VITE_ANALYTICS_ID || '',
  sentry: {
    dsn: env.VITE_SENTRY_DSN || '',
    environment: env.VITE_SENTRY_ENVIRONMENT || env.MODE,
  },
} as const

// Storage Configuration
export const storage = {
  type: env.VITE_STORAGE_TYPE,
  prefix: env.VITE_STORAGE_PREFIX,
} as const

// Image & Asset Configuration
export const assets = {
  imageCdnUrl: env.VITE_IMAGE_CDN_URL || '',
  maxImageSize: env.VITE_MAX_IMAGE_SIZE,
  supportedImageTypes: env.VITE_SUPPORTED_IMAGE_TYPES?.split(',') || [
    'image/jpeg',
    'image/png',
    'image/webp'
  ],
} as const

// Social Login Configuration
export const socialLogin = {
  google: {
    clientId: env.VITE_GOOGLE_CLIENT_ID || '',
  },
  facebook: {
    appId: env.VITE_FACEBOOK_APP_ID || '',
  },
  github: {
    clientId: env.VITE_GITHUB_CLIENT_ID || '',
  },
} as const

// Performance Configuration
export const performance = {
  serviceWorker: env.VITE_ENABLE_SERVICE_WORKER,
  cacheTimeout: env.VITE_CACHE_TIMEOUT,
} as const

// Build Configuration
export const build = {
  target: env.VITE_BUILD_TARGET || env.MODE,
  sourceMaps: env.VITE_SOURCE_MAPS ?? (env.MODE === 'development'),
  bundleAnalyzer: env.VITE_BUNDLE_ANALYZER,
} as const

// Environment Helpers
export const isDevelopment = env.MODE === 'development'
export const isProduction = env.MODE === 'production'
export const isStaging = env.MODE === 'staging'
export const isTest = env.MODE === 'test'

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

// Enhanced validation function
export const validateEnvironment = () => {
  const errors: string[] = []

  // Required variables in production
  if (isProduction) {
    if (!api.baseUrl || api.baseUrl.includes('localhost')) {
      errors.push('VITE_API_URL must be set to a production URL')
    }
    
    if (analytics.enabled && !analytics.id) {
      errors.push('VITE_ANALYTICS_ID is required when analytics is enabled')
    }

    if (analytics.sentry.dsn && !analytics.sentry.dsn.startsWith('https://')) {
      errors.push('VITE_SENTRY_DSN must be a valid HTTPS URL')
    }
  }

  // Validate social login configuration
  if (socialLogin.google.clientId && !socialLogin.google.clientId.endsWith('.googleusercontent.com')) {
    errors.push('VITE_GOOGLE_CLIENT_ID appears to be invalid')
  }

  if (errors.length > 0) {
    console.error('❌ Environment validation errors:', errors)
    throw new Error(`Environment validation failed: ${errors.join(', ')}`)
  }

  console.log('✅ Environment configuration validated successfully')
  return true
}

// Type-safe environment access
export const getEnvVar = <T extends keyof typeof env>(key: T): typeof env[T] => {
  return env[key]
}

// =============================================================================
// EXPORTS
// =============================================================================

// Export all configuration as a single object
export const config = {
  app,
  api,
  auth,
  features,
  devTools,
  analytics,
  storage,
  assets,
  socialLogin,
  performance,
  build,
  isDevelopment,
  isProduction,
  isStaging,
  isTest,
  validateEnvironment,
  getEnvVar,
} as const

// Type exports
export type AppConfig = typeof config
export type EnvVars = z.infer<typeof EnvSchema>

// Default export
export default config 