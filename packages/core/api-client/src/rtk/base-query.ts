/**
 * RTK Query Base Query for Serverless APIs
 * Enhanced base query with retry logic and serverless optimizations
 */

import { fetchBaseQuery, type BaseQueryFn } from '@reduxjs/toolkit/query/react'
import type { FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { getServerlessApiConfig } from '../config/environments'
import {
  withRetry,
  withPriorityRetry,
  getRetryMetrics,
  getCircuitBreakerStates,
  type RetryConfig
} from '../retry/retry-logic'
import { handleServerlessError } from '../retry/error-handling'
import { performanceMonitor } from '../lib/performance'
import { createLogger } from '@repo/logger'

const logger = createLogger('api-client:base-query')

export interface ServerlessBaseQueryOptions {
  retryConfig?: Partial<RetryConfig>
  skipRetry?: boolean
  getAuthToken?: () => string | undefined
  customHeaders?: Record<string, string>
  // Enhanced serverless features
  enablePerformanceMonitoring?: boolean
  enableCircuitBreaker?: boolean
  enableConnectionWarming?: boolean
  priority?: 'low' | 'medium' | 'high' | 'critical'
  endpoint?: string
}

/**
 * Create serverless-optimized base query for RTK Query
 */
export function createServerlessBaseQuery(
  options: ServerlessBaseQueryOptions = {}
): BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> {
  const config = getServerlessApiConfig()
  const {
    retryConfig = {
      maxAttempts: config.retryAttempts,
      baseDelay: config.retryDelay,
      maxDelay: config.maxRetryDelay,
    },
    skipRetry = false,
    getAuthToken,
    customHeaders = {},
  } = options

  // Create base query with serverless configuration
  const baseQuery = fetchBaseQuery({
    baseUrl: config.baseUrl,
    timeout: config.timeout,
    prepareHeaders: (headers) => {
      // Set default headers
      headers.set('Content-Type', 'application/json')
      headers.set('Accept', 'application/json')

      // Add custom headers
      Object.entries(customHeaders).forEach(([key, value]) => {
        headers.set(key, value)
      })

      // Add authentication token
      const authToken = getAuthToken?.()
      if (authToken) {
        headers.set('Authorization', `Bearer ${authToken}`)
      }

      return headers
    },
  })

  // Enhanced base query with retry logic and performance monitoring
  const enhancedBaseQuery: BaseQueryFn<
    string | FetchArgs,
    unknown,
    FetchBaseQueryError
  > = async (args, api, extraOptions) => {
    const startTime = performance.now()
    const endpoint = options.endpoint || (typeof args === 'string' ? args : args.url)
    const priority = options.priority || 'medium'

    // Performance monitoring setup
    let requestId: string | undefined
    if (options.enablePerformanceMonitoring) {
      requestId = `rtk-${endpoint}-${Date.now()}`
      performanceMonitor.trackComponentRender(requestId, 0) // Start tracking
    }

    // Skip retry for specific requests
    const shouldSkipRetry = skipRetry || (extraOptions as any)?.skipRetry

    if (shouldSkipRetry) {
      const result = await baseQuery(args, api, extraOptions)

      // Track performance for non-retry requests
      if (options.enablePerformanceMonitoring && requestId) {
        const duration = performance.now() - startTime
        performanceMonitor.trackComponentRender(requestId, duration)
      }

      return result
    }

    // Wrap base query with enhanced retry logic
    try {
      const operation = async () => await baseQuery(args, api, extraOptions)

      let result
      if (options.priority && options.priority !== 'medium') {
        result = await withPriorityRetry(operation, priority, retryConfig, endpoint)
      } else {
        result = await withRetry(operation, retryConfig, endpoint)
      }

      // Track successful requests
      if (options.enablePerformanceMonitoring && requestId) {
        const duration = performance.now() - startTime
        performanceMonitor.trackComponentRender(requestId, duration)

        // Log slow requests
        if (duration > 1000) {
          logger.warn(`🐌 Slow RTK Query request: ${endpoint} took ${duration.toFixed(2)}ms`, undefined, {
            endpoint,
            duration
          })
        }
      }

      return result
    } catch (error) {
      // Track failed requests
      if (options.enablePerformanceMonitoring && requestId) {
        const duration = performance.now() - startTime
        performanceMonitor.trackComponentRender(`${requestId}-failed`, duration)
      }

      // Convert to RTK Query error format
      const serverlessError = handleServerlessError(error)

      return {
        error: {
          status: serverlessError.statusCode,
          data: {
            error: {
              code: serverlessError.code,
              message: serverlessError.message,
              details: serverlessError.details,
              requestId: serverlessError.requestId,
              timestamp: serverlessError.timestamp,
            },
          },
        } as FetchBaseQueryError,
      }
    }
  }

  return enhancedBaseQuery
}

/**
 * Create base query with authentication integration
 */
export function createAuthenticatedServerlessBaseQuery(
  getAuthToken: () => string | undefined,
  options: Omit<ServerlessBaseQueryOptions, 'getAuthToken'> = {}
): BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> {
  return createServerlessBaseQuery({
    ...options,
    getAuthToken,
  })
}

/**
 * Default serverless base query
 */
export const serverlessBaseQuery = createServerlessBaseQuery()

/**
 * Enhanced serverless cache configurations with performance optimizations
 */
export const SERVERLESS_CACHE_CONFIGS = {
  // No caching - always fetch fresh data (for real-time data)
  none: {
    keepUnusedDataFor: 0,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  },

  // Short-term caching (30 seconds) - for frequently changing data
  short: {
    keepUnusedDataFor: 30,
    refetchOnMountOrArgChange: 30,
    refetchOnFocus: false,
    refetchOnReconnect: true,
  },

  // Medium-term caching (5 minutes) - for moderately stable data
  medium: {
    keepUnusedDataFor: 300,
    refetchOnMountOrArgChange: 300,
    refetchOnFocus: false,
    refetchOnReconnect: true,
  },

  // Long-term caching (30 minutes) - for stable data
  long: {
    keepUnusedDataFor: 1800,
    refetchOnMountOrArgChange: 1800,
    refetchOnFocus: false,
    refetchOnReconnect: false,
  },

  // Persistent caching (until manual invalidation) - for static data
  persistent: {
    keepUnusedDataFor: Infinity,
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false,
    refetchOnReconnect: false,
  },

  // Adaptive caching - adjusts based on usage patterns
  adaptive: {
    keepUnusedDataFor: 600, // 10 minutes base
    refetchOnMountOrArgChange: 300, // 5 minutes
    refetchOnFocus: false,
    refetchOnReconnect: true,
  },

  // Background refresh - keeps data fresh in background
  backgroundRefresh: {
    keepUnusedDataFor: 1800, // 30 minutes
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false,
    refetchOnReconnect: true,
    pollingInterval: 300000, // 5 minutes
  },
} as const

export type ServerlessCacheStrategy = keyof typeof SERVERLESS_CACHE_CONFIGS

/**
 * Get cache configuration for serverless endpoints
 */
export function getServerlessCacheConfig(strategy: ServerlessCacheStrategy = 'medium') {
  return SERVERLESS_CACHE_CONFIGS[strategy]
}

/**
 * Create adaptive cache configuration based on usage patterns
 */
export function createAdaptiveCacheConfig(options: {
  baseKeepTime?: number
  refetchThreshold?: number
  usageFrequency?: 'low' | 'medium' | 'high'
  dataVolatility?: 'stable' | 'moderate' | 'volatile'
}) {
  const {
    baseKeepTime = 600,
    refetchThreshold = 300,
    usageFrequency = 'medium',
    dataVolatility = 'moderate',
  } = options

  // Adjust cache times based on usage frequency
  const frequencyMultiplier = {
    low: 0.5,
    medium: 1.0,
    high: 1.5,
  }[usageFrequency]

  // Adjust cache times based on data volatility
  const volatilityMultiplier = {
    stable: 2.0,
    moderate: 1.0,
    volatile: 0.5,
  }[dataVolatility]

  const adjustedKeepTime = baseKeepTime * frequencyMultiplier * volatilityMultiplier
  const adjustedRefetchTime = refetchThreshold * volatilityMultiplier

  return {
    keepUnusedDataFor: Math.max(30, adjustedKeepTime), // Minimum 30 seconds
    refetchOnMountOrArgChange: Math.max(15, adjustedRefetchTime), // Minimum 15 seconds
    refetchOnFocus: dataVolatility === 'volatile',
    refetchOnReconnect: true,
  }
}

/**
 * Performance-optimized cache configuration for serverless endpoints
 */
export function getPerformanceOptimizedCacheConfig(endpoint: string) {
  // Define endpoint-specific cache strategies
  const endpointStrategies: Record<string, ServerlessCacheStrategy> = {
    // Health checks - no caching
    '/health': 'none',
    '/api/health': 'none',

    // User profile - medium caching
    '/api/user/profile': 'medium',
    '/api/auth/profile': 'medium',

    // Gallery search - short caching (results change frequently)
    '/api/gallery/search': 'short',

    // Individual gallery items - long caching (stable data)
    '/api/gallery/': 'long', // Matches /api/gallery/{id}

    // Wishlist - medium caching
    '/api/wishlist': 'medium',

    // MOC instructions - long caching (stable content)
    '/api/mocs/': 'long',

    // Static data - persistent caching
    '/api/categories': 'persistent',
    '/api/tags': 'persistent',
  }

  // Find matching strategy
  for (const [pattern, strategy] of Object.entries(endpointStrategies)) {
    if (endpoint.includes(pattern)) {
      return getServerlessCacheConfig(strategy)
    }
  }

  // Default to medium caching
  return getServerlessCacheConfig('medium')
}
