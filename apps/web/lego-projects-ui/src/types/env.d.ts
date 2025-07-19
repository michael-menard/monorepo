/// <reference types="vite/client" />

// Environment variables interface
interface ImportMetaEnv {
  // Application Configuration
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
  readonly VITE_APP_DESCRIPTION: string

  // API Configuration
  readonly VITE_API_URL: string
  readonly VITE_API_TIMEOUT: string

  // Authentication Service
  readonly VITE_AUTH_SERVICE_URL: string
  readonly VITE_AUTH_TOKEN_KEY: string
  readonly VITE_AUTH_REFRESH_TOKEN_KEY: string

  // Feature Flags
  readonly VITE_FEATURE_GALLERY_ENABLED: string
  readonly VITE_FEATURE_WISHLIST_ENABLED: string
  readonly VITE_FEATURE_MOC_INSTRUCTIONS_ENABLED: string
  readonly VITE_FEATURE_PROFILE_ENABLED: string
  readonly VITE_FEATURE_DARK_MODE_ENABLED: string

  // Development Tools
  readonly VITE_ENABLE_DEV_TOOLS: string
  readonly VITE_ENABLE_REDUX_DEVTOOLS: string
  readonly VITE_ENABLE_REACT_QUERY_DEVTOOLS: string

  // Analytics & Monitoring
  readonly VITE_ANALYTICS_ENABLED: string
  readonly VITE_ANALYTICS_ID: string
  readonly VITE_SENTRY_DSN: string
  readonly VITE_SENTRY_ENVIRONMENT: string

  // Storage Configuration
  readonly VITE_STORAGE_TYPE: string
  readonly VITE_STORAGE_PREFIX: string

  // Image & Asset Configuration
  readonly VITE_IMAGE_CDN_URL: string
  readonly VITE_MAX_IMAGE_SIZE: string
  readonly VITE_SUPPORTED_IMAGE_TYPES: string

  // Social Login
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_FACEBOOK_APP_ID: string
  readonly VITE_GITHUB_CLIENT_ID: string

  // Performance
  readonly VITE_ENABLE_SERVICE_WORKER: string
  readonly VITE_CACHE_TIMEOUT: string

  // Build Configuration
  readonly VITE_BUILD_TARGET: string
  readonly VITE_SOURCE_MAPS: string
  readonly VITE_BUNDLE_ANALYZER: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Global constants defined in vite.config.ts
declare const __APP_VERSION__: string
declare const __BUILD_TIME__: string 