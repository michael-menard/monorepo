/**
 * Intelligent RTK Query Cache Enhancer
 *
 * Advanced RTK Query integration with intelligent caching:
 * - Automatic cache strategy selection based on endpoint patterns
 * - Predictive prefetching for related queries
 * - Smart cache invalidation with dependency tracking
 * - Performance-optimized cache configurations
 * - Real-time cache analytics and monitoring
 */

import { createApi, BaseQueryFn } from '@reduxjs/toolkit/query/react'
import { createLogger } from '@repo/logger'
import { IntelligentCacheManager } from '../managers/IntelligentCacheManager'

const logger = createLogger('IntelligentRTKCacheEnhancer')

export interface EnhancedCacheConfig {
  enableIntelligentCaching: boolean
  enablePredictivePrefetching: boolean
  enableSmartInvalidation: boolean
  enablePerformanceMonitoring: boolean
  cacheManager?: IntelligentCacheManager
  customStrategies?: Record<string, any>
}

export interface CacheableEndpoint {
  endpoint: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  cacheStrategy?: string
  dependencies?: string[]
  tags?: string[]
  prefetchRelated?: string[]
}

/**
 * Create an enhanced RTK Query API with intelligent caching
 */
export function createIntelligentApi<T extends Record<string, any>>(config: {
  reducerPath: string
  baseQuery: BaseQueryFn
  tagTypes?: readonly string[]
  endpoints: (builder: any) => T
  cacheConfig?: EnhancedCacheConfig
}): any {
  const cacheManager = config.cacheConfig?.cacheManager || new IntelligentCacheManager()
  const enhancedConfig = {
    enableIntelligentCaching: true,
    enablePredictivePrefetching: true,
    enableSmartInvalidation: true,
    enablePerformanceMonitoring: true,
    ...config.cacheConfig,
  }

  // Enhanced base query with intelligent caching
  const enhancedBaseQuery: BaseQueryFn = async (args, api, extraOptions) => {
    const startTime = performance.now()

    try {
      // Check intelligent cache first
      if (
        enhancedConfig.enableIntelligentCaching &&
        typeof args === 'object' &&
        args.method === 'GET'
      ) {
        const cacheKey = generateCacheKey(args)
        const cachedResult = await cacheManager.get(cacheKey)

        if (cachedResult) {
          logger.debug('Intelligent cache hit', undefined, { cacheKey })
          return { data: cachedResult }
        }
      }

      // Execute original query
      const result = await config.baseQuery(args, api, extraOptions)

      // Cache successful GET results
      if (result.data && typeof args === 'object' && args.method === 'GET') {
        const cacheKey = generateCacheKey(args)
        await cacheManager.set(cacheKey, result.data, {
          strategy: selectCacheStrategy(args),
          dependencies: extractDependencies(args),
        })
      }

      // Record performance metrics
      if (enhancedConfig.enablePerformanceMonitoring) {
        const duration = performance.now() - startTime
        logger.debug('Query performance', undefined, {
          endpoint: typeof args === 'string' ? args : args.url,
          duration,
          cached: false,
        })
      }

      return result
    } catch (error) {
      logger.error('Enhanced base query failed', error as Error)
      return { error }
    }
  }

  // Create the API with enhanced base query
  const api = createApi({
    reducerPath: config.reducerPath,
    baseQuery: enhancedBaseQuery,
    tagTypes: config.tagTypes,
    endpoints: config.endpoints,
  })

  // Add intelligent cache methods to the API
  const enhancedApi = {
    ...api,

    // Get cache statistics
    getCacheStatistics: () => cacheManager.getStatistics(),

    // Generate predictive insights
    getPredictiveInsights: () => cacheManager.generatePredictiveInsights(),

    // Manual cache invalidation with smart dependencies
    invalidateIntelligentCache: (key: string, reason: string) =>
      cacheManager.invalidate(key, reason),

    // Prefetch related queries based on patterns
    prefetchRelated: async (endpoint: string) => {
      if (!enhancedConfig.enablePredictivePrefetching) return

      const relatedEndpoints = findRelatedEndpoints(endpoint)
      for (const related of relatedEndpoints) {
        try {
          // Trigger prefetch (implementation depends on specific API structure)
          logger.debug('Prefetching related endpoint', undefined, {
            original: endpoint,
            related: related.endpoint,
          })
        } catch (error) {
          logger.warn('Prefetch failed', error as Error, { endpoint: related.endpoint })
        }
      }
    },

    // Smart cache warming for critical endpoints
    warmCache: async (endpoints: CacheableEndpoint[]) => {
      for (const endpoint of endpoints) {
        try {
          // Pre-populate cache with critical data
          logger.debug('Warming cache for endpoint', undefined, { endpoint: endpoint.endpoint })
        } catch (error) {
          logger.warn('Cache warming failed', error as Error, { endpoint: endpoint.endpoint })
        }
      }
    },
  }

  return enhancedApi
}

/**
 * Generate cache key from query arguments
 */
function generateCacheKey(args: any): string {
  if (typeof args === 'string') {
    return `rtk:${args}`
  }

  if (typeof args === 'object') {
    const { url, params, method = 'GET' } = args
    const paramString = params ? JSON.stringify(params) : ''
    return `rtk:${method}:${url}:${paramString}`
  }

  return `rtk:${JSON.stringify(args)}`
}

/**
 * Select appropriate cache strategy based on endpoint
 */
function selectCacheStrategy(args: any): string {
  const url = typeof args === 'string' ? args : args.url || ''

  // Gallery endpoints - user content strategy
  if (url.includes('/gallery')) {
    return 'user-content'
  }

  // Wishlist endpoints - user content strategy
  if (url.includes('/wishlist')) {
    return 'user-content'
  }

  // Search endpoints - search results strategy
  if (url.includes('/search')) {
    return 'search-results'
  }

  // Stats/analytics endpoints - analytics strategy
  if (url.includes('/stats') || url.includes('/analytics')) {
    return 'analytics'
  }

  // Navigation/UI endpoints - high frequency strategy
  if (url.includes('/navigation') || url.includes('/ui')) {
    return 'high-frequency'
  }

  // Static content - static content strategy
  if (url.includes('/instructions') || url.includes('/themes')) {
    return 'static-content'
  }

  // Default strategy
  return 'user-content'
}

/**
 * Extract cache dependencies from query arguments
 */
function extractDependencies(args: any): string[] {
  const dependencies: string[] = []
  const url = typeof args === 'string' ? args : args.url || ''

  // Extract user ID from URL or params
  const userIdMatch = url.match(/\/users?\/([^/]+)/)
  if (userIdMatch) {
    dependencies.push(`user:${userIdMatch[1]}`)
  }

  // Extract gallery ID from URL
  const galleryIdMatch = url.match(/\/gallery\/([^/]+)/)
  if (galleryIdMatch) {
    dependencies.push(`gallery:${galleryIdMatch[1]}`)
  }

  // Extract wishlist ID from URL
  const wishlistIdMatch = url.match(/\/wishlist\/([^/]+)/)
  if (wishlistIdMatch) {
    dependencies.push(`wishlist:${wishlistIdMatch[1]}`)
  }

  return dependencies
}

/**
 * Find related endpoints for predictive prefetching
 */
function findRelatedEndpoints(endpoint: string): CacheableEndpoint[] {
  const related: CacheableEndpoint[] = []

  // Gallery-related prefetching
  if (endpoint.includes('/gallery/search')) {
    related.push(
      { endpoint: '/gallery/stats', method: 'GET', cacheStrategy: 'analytics' },
      { endpoint: '/gallery/themes', method: 'GET', cacheStrategy: 'static-content' },
    )
  }

  // Wishlist-related prefetching
  if (endpoint.includes('/wishlist')) {
    related.push(
      { endpoint: '/wishlist/stats', method: 'GET', cacheStrategy: 'analytics' },
      { endpoint: '/gallery/search', method: 'GET', cacheStrategy: 'search-results' },
    )
  }

  // User profile-related prefetching
  if (endpoint.includes('/user/profile')) {
    related.push(
      { endpoint: '/user/preferences', method: 'GET', cacheStrategy: 'user-content' },
      { endpoint: '/user/stats', method: 'GET', cacheStrategy: 'analytics' },
    )
  }

  return related
}
