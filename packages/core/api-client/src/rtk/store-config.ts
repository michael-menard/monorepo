/**
 * Enhanced RTK Query Store Configuration for Serverless Applications
 * Optimized store setup with performance monitoring and serverless patterns
 */

import { configureStore, type Middleware } from '@reduxjs/toolkit'
import type { Api } from '@reduxjs/toolkit/query/react'
import { rtkQueryPerformanceMiddleware } from './performance-monitoring'
import { getConnectionWarmer } from '../retry/connection-warming'

export interface ServerlessStoreConfig {
  // API slices to include
  apis: Api<any, any, any, any>[]
  
  // Additional reducers
  reducers?: Record<string, any>
  
  // Performance monitoring
  enablePerformanceMonitoring?: boolean
  
  // Connection warming
  enableConnectionWarming?: boolean
  warmingEndpoints?: string[]
  
  // Development tools
  enableDevTools?: boolean
  
  // Custom middleware
  customMiddleware?: Middleware[]
  
  // Serializable check options
  serializableCheck?: {
    ignoredActions?: string[]
    ignoredPaths?: string[]
  }
}

/**
 * Create optimized Redux store for serverless applications
 */
export function createServerlessStore(config: ServerlessStoreConfig) {
  const {
    apis,
    reducers = {},
    enablePerformanceMonitoring = true,
    enableConnectionWarming = true,
    warmingEndpoints = [],
    enableDevTools = process.env.NODE_ENV === 'development',
    customMiddleware = [],
    serializableCheck = {},
  } = config

  // Build reducers object
  const storeReducers = {
    ...reducers,
  }

  // Add API reducers
  apis.forEach(api => {
    storeReducers[api.reducerPath] = api.reducer
  })

  // Build middleware array
  const middleware: Middleware[] = []

  // Add RTK Query middleware
  apis.forEach(api => {
    middleware.push(api.middleware)
  })

  // Add performance monitoring middleware
  if (enablePerformanceMonitoring) {
    middleware.push(rtkQueryPerformanceMiddleware)
  }

  // Add custom middleware
  middleware.push(...customMiddleware)

  // Configure store
  const store = configureStore({
    reducer: storeReducers,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: [
            // RTK Query actions
            'persist/PERSIST',
            'persist/REHYDRATE',
            // Custom ignored actions
            ...(serializableCheck.ignoredActions || []),
          ],
          ignoredPaths: [
            // Common non-serializable paths
            'meta.arg',
            'payload.timestamp',
            // Custom ignored paths
            ...(serializableCheck.ignoredPaths || []),
          ],
        },
      }).concat(middleware),
    devTools: enableDevTools && {
      name: 'Serverless App Store',
      trace: true,
      traceLimit: 25,
    },
  })

  // Initialize connection warming
  if (enableConnectionWarming && warmingEndpoints.length > 0) {
    const warmer = getConnectionWarmer()
    if (warmer) {
      warmer.updateConfig({
        enabled: true,
        endpoints: warmingEndpoints,
      })
      warmer.start()
    }
  }

  return store
}

/**
 * Create store configuration for different application types
 */
export const STORE_PRESETS = {
  // Minimal configuration for simple apps
  minimal: (apis: Api<any, any, any, any>[]): ServerlessStoreConfig => ({
    apis,
    enablePerformanceMonitoring: false,
    enableConnectionWarming: false,
    enableDevTools: false,
  }),

  // Development configuration with full monitoring
  development: (apis: Api<any, any, any, any>[]): ServerlessStoreConfig => ({
    apis,
    enablePerformanceMonitoring: true,
    enableConnectionWarming: true,
    enableDevTools: true,
    warmingEndpoints: ['/api/health', '/api/user/profile'],
  }),

  // Production configuration optimized for performance
  production: (apis: Api<any, any, any, any>[]): ServerlessStoreConfig => ({
    apis,
    enablePerformanceMonitoring: true,
    enableConnectionWarming: true,
    enableDevTools: false,
    warmingEndpoints: ['/api/health'],
    serializableCheck: {
      ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      ignoredPaths: ['meta.arg', 'payload.timestamp'],
    },
  }),

  // Testing configuration with minimal overhead
  testing: (apis: Api<any, any, any, any>[]): ServerlessStoreConfig => ({
    apis,
    enablePerformanceMonitoring: false,
    enableConnectionWarming: false,
    enableDevTools: false,
  }),
}

/**
 * Helper to create store with preset configuration
 */
export function createServerlessStoreWithPreset(
  preset: keyof typeof STORE_PRESETS,
  apis: Api<any, any, any, any>[],
  overrides: Partial<ServerlessStoreConfig> = {}
) {
  const baseConfig = STORE_PRESETS[preset](apis)
  const finalConfig = { ...baseConfig, ...overrides }
  return createServerlessStore(finalConfig)
}

/**
 * Store health monitoring utilities
 */
export function getStoreHealth(store: any) {
  const state = store.getState()
  
  // Check for common issues
  const issues: string[] = []
  
  // Check state size (warn if > 10MB)
  const stateSize = JSON.stringify(state).length
  if (stateSize > 10 * 1024 * 1024) {
    issues.push(`Large state size: ${(stateSize / 1024 / 1024).toFixed(2)}MB`)
  }
  
  // Check for stale cache data
  // This would need to be implemented based on specific API slices
  
  return {
    healthy: issues.length === 0,
    issues,
    stateSize,
    timestamp: Date.now(),
  }
}
