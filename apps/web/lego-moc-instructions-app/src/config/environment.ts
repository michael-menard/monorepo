// Native backend configuration for development and production
export const config = {
  api: {
    // Main LEGO Projects API URL - uses env var for native backend support
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
    
    // Auth Service API URL - separate auth service
    authUrl: import.meta.env.VITE_AUTH_API_URL || 'http://localhost:5000',
    
    // API request timeout
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000'),
    
    // Number of retry attempts
    retryAttempts: parseInt(import.meta.env.VITE_API_RETRY_ATTEMPTS || '3'),
    
    // Enable API logging in development
    enableLogging: import.meta.env.VITE_ENABLE_API_LOGGING === 'true',
  },
  
  app: {
    name: 'LEGO MOC Instructions App',
    version: import.meta.env.VITE_APP_VERSION || '0.1.0',
    environment: import.meta.env.VITE_ENVIRONMENT || 'development',
    clientUrl: import.meta.env.VITE_CLIENT_URL || 'http://localhost:5173',
  },
  
  auth: {
    domain: import.meta.env.VITE_AUTH_DOMAIN || 'localhost',
    enabled: import.meta.env.VITE_ENABLE_AUTH === 'true',
    sessionTimeout: parseInt(import.meta.env.VITE_SESSION_TIMEOUT || '1440'), // minutes
  },
  
  features: {
    fileUpload: import.meta.env.VITE_ENABLE_FILE_UPLOAD === 'true',
    imageEditing: import.meta.env.VITE_ENABLE_IMAGE_EDITING === 'true',
    userProfiles: import.meta.env.VITE_ENABLE_USER_PROFILES === 'true',
    notifications: import.meta.env.VITE_ENABLE_NOTIFICATIONS === 'true',
    analytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    experimental: import.meta.env.VITE_ENABLE_EXPERIMENTAL === 'true',
  },
  
  storage: {
    provider: import.meta.env.VITE_STORAGE_PROVIDER || 'local',
    localUrl: import.meta.env.VITE_LOCAL_STORAGE_URL || 'http://localhost:3001/uploads',
    maxFileSize: parseInt(import.meta.env.VITE_MAX_FILE_SIZE || '10'), // MB
    allowedTypes: import.meta.env.VITE_ALLOWED_FILE_TYPES?.split(',') || ['image/jpeg', 'image/png', 'image/webp'],
    
    // Cloud storage options
    s3: {
      bucketName: import.meta.env.VITE_S3_BUCKET_NAME,
      region: import.meta.env.VITE_S3_REGION || 'us-east-1',
      cloudfrontUrl: import.meta.env.VITE_CLOUDFRONT_URL,
    },
    
    cloudinary: {
      cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
      uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
    },
  },
  
  ui: {
    theme: import.meta.env.VITE_DEFAULT_THEME || 'system',
    enableThemeSwitch: import.meta.env.VITE_ENABLE_THEME_SWITCH !== 'false',
    language: import.meta.env.VITE_DEFAULT_LANGUAGE || 'en',
    enableI18n: import.meta.env.VITE_ENABLE_I18N === 'true',
  },
  
  development: {
    enableDevtools: import.meta.env.VITE_ENABLE_DEVTOOLS === 'true',
    enableProfiling: import.meta.env.VITE_ENABLE_PROFILING === 'true',
    mockApi: import.meta.env.VITE_MOCK_API === 'true',
    mockApiDelay: parseInt(import.meta.env.VITE_MOCK_API_DELAY || '500'),
    verboseLogging: import.meta.env.VITE_VERBOSE_LOGGING === 'true',
  },
  
  security: {
    csrfEnabled: import.meta.env.VITE_CSRF_ENABLED !== 'false',
    cspMode: import.meta.env.VITE_CSP_MODE || 'report',
    enableHsts: import.meta.env.VITE_ENABLE_HSTS === 'true',
  },
  
  monitoring: {
    enableHealthCheck: import.meta.env.VITE_ENABLE_HEALTH_CHECK === 'true',
    healthCheckInterval: parseInt(import.meta.env.VITE_HEALTH_CHECK_INTERVAL || '5'), // minutes
    enableMetrics: import.meta.env.VITE_ENABLE_METRICS === 'true',
    enablePerformanceMonitoring: import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true',
  },
  
  external: {
    docs: {
      apiUrl: import.meta.env.VITE_API_DOCS_URL || 'http://localhost:3001/docs',
      mainUrl: import.meta.env.VITE_DOCS_URL || 'http://localhost:3000',
    },
    supportUrl: import.meta.env.VITE_SUPPORT_URL || 'https://github.com/your-repo/issues',
    
    // Analytics and monitoring services
    analytics: {
      gaId: import.meta.env.VITE_GA_MEASUREMENT_ID,
      sentryDsn: import.meta.env.VITE_SENTRY_DSN,
      hotjarId: import.meta.env.VITE_HOTJAR_SITE_ID,
    },
  },
} as const

export type Config = typeof config

// Environment helpers
export const isDevelopment = config.app.environment === 'development'
export const isProduction = config.app.environment === 'production'
export const isStaging = config.app.environment === 'staging'

// API URL builders for different services
export const getApiUrl = (path: string = '') => {
  const baseUrl = config.api.baseUrl.replace(/\/$/, '') // Remove trailing slash
  const cleanPath = path.replace(/^\//, '') // Remove leading slash
  return cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl
}

export const getAuthUrl = (path: string = '') => {
  const baseUrl = config.api.authUrl.replace(/\/$/, '') // Remove trailing slash
  const cleanPath = path.replace(/^\//, '') // Remove leading slash
  return cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl
}

// Storage URL builder
export const getStorageUrl = (path: string = '') => {
  if (config.storage.provider === 's3' && config.storage.s3.cloudfrontUrl) {
    const baseUrl = config.storage.s3.cloudfrontUrl.replace(/\/$/, '')
    const cleanPath = path.replace(/^\//, '')
    return cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl
  }
  
  const baseUrl = config.storage.localUrl.replace(/\/$/, '')
  const cleanPath = path.replace(/^\//, '')
  return cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl
}

// Debug configuration in development
if (isDevelopment && config.development.verboseLogging) {
  console.group('🔧 Application Configuration')
  console.log('Environment:', config.app.environment)
  console.log('API Base URL:', config.api.baseUrl)
  console.log('Auth API URL:', config.api.authUrl)
  console.log('Client URL:', config.app.clientUrl)
  console.log('Features:', config.features)
  console.log('Storage Provider:', config.storage.provider)
  console.groupEnd()
}

// Validate critical configuration
if (!config.api.baseUrl) {
  console.error('❌ VITE_API_BASE_URL is not configured. Please check your environment variables.')
}

if (config.auth.enabled && !config.api.authUrl) {
  console.error('❌ VITE_AUTH_API_URL is not configured but auth is enabled. Please check your environment variables.')
}

// Export individual configurations for convenience
export { config as default }
