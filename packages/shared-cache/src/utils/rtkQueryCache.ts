import { RTKQueryCacheConfig } from '../schemas/cache.js'

/**
 * Default RTK Query cache configurations for different use cases
 */
export const RTK_QUERY_CACHE_CONFIGS = {
  // Short-lived cache for frequently changing data
  short: {
    keepUnusedDataFor: 30, // 30 seconds
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
    skip: false,
  },

  // Medium cache for moderately changing data
  medium: {
    keepUnusedDataFor: 5 * 60, // 5 minutes
    refetchOnMountOrArgChange: false,
    refetchOnFocus: true,
    refetchOnReconnect: true,
    skip: false,
  },

  // Long cache for static data
  long: {
    keepUnusedDataFor: 30 * 60, // 30 minutes
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false,
    refetchOnReconnect: true,
    skip: false,
  },

  // Persistent cache for rarely changing data
  persistent: {
    keepUnusedDataFor: 60 * 60, // 1 hour
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false,
    refetchOnReconnect: false,
    skip: false,
  },

  // Real-time cache for live data
  realtime: {
    keepUnusedDataFor: 0, // No cache
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
    pollingInterval: 5000, // Poll every 5 seconds
    skip: false,
  },
} as const

/**
 * Get RTK Query cache configuration by type
 */
export function getRTKQueryCacheConfig(type: keyof typeof RTK_QUERY_CACHE_CONFIGS): RTKQueryCacheConfig {
  return RTK_QUERY_CACHE_CONFIGS[type]
}

/**
 * Create custom RTK Query cache configuration
 */
export function createRTKQueryCacheConfig(config: Partial<RTKQueryCacheConfig>): RTKQueryCacheConfig {
  return {
    keepUnusedDataFor: 60, // Default 60 seconds
    refetchOnMountOrArgChange: false,
    refetchOnFocus: true,
    refetchOnReconnect: true,
    skip: false,
    ...config,
  }
}

/**
 * Optimistic update helper for RTK Query mutations
 */
export function createOptimisticUpdate<T, R>(
  updateQueryData: (queryName: string, arg: T, updateFn: (draft: R) => void) => any,
  queryName: string,
  arg: T,
  updateFn: (draft: R) => void
) {
  return updateQueryData(queryName, arg, updateFn)
}

/**
 * Cache invalidation helper for RTK Query
 */
export function createCacheInvalidation(tags: string[]) {
  return tags.map(tag => ({ type: tag, id: 'LIST' }))
}

/**
 * Cache update helper for RTK Query
 */
export function createCacheUpdate<T>(data: T, id?: string | number) {
  return { type: 'update' as const, data, id }
}

/**
 * Enhanced RTK Query base query with caching headers
 */
export function createCachedBaseQuery(baseURL: string, options: {
  cacheControl?: string
  etag?: boolean
  maxAge?: number
} = {}) {
  return {
    baseURL,
    prepareHeaders: (headers: Headers, { getState }: any) => {
      // Add cache control headers
      if (options.cacheControl) {
        headers.set('Cache-Control', options.cacheControl)
      } else if (options.maxAge) {
        headers.set('Cache-Control', `max-age=${options.maxAge}`)
      }

      // Add auth token if available
      const token = (getState() as any)?.auth?.tokens?.accessToken
      if (token) {
        headers.set('authorization', `Bearer ${token}`)
      }

      return headers
    },
  }
}

/**
 * Cache-aware error handling for RTK Query
 */
export function createCacheErrorHandler(
  error: any,
  retryCount: number = 0,
  maxRetries: number = 3
) {
  const isNetworkError = error?.status === 'FETCH_ERROR' || error?.status === 'TIMEOUT_ERROR'
  const isServerError = error?.status >= 500 && error?.status < 600
  const isClientError = error?.status >= 400 && error?.status < 500

  // Retry network errors and server errors
  if ((isNetworkError || isServerError) && retryCount < maxRetries) {
    return { retry: true, retryCount: retryCount + 1 }
  }

  // Don't retry client errors (4xx)
  if (isClientError) {
    return { retry: false }
  }

  // Default: don't retry
  return { retry: false }
}

/**
 * Cache performance monitoring for RTK Query
 */
export function createCacheMonitor() {
  const stats = {
    hits: 0,
    misses: 0,
    invalidations: 0,
    updates: 0,
  }

  return {
    // Track cache hits
    onCacheHit: () => {
      stats.hits++
    },

    // Track cache misses
    onCacheMiss: () => {
      stats.misses++
    },

    // Track cache invalidations
    onCacheInvalidation: () => {
      stats.invalidations++
    },

    // Track cache updates
    onCacheUpdate: () => {
      stats.updates++
    },

    // Get cache statistics
    getStats: () => ({
      ...stats,
      hitRate: stats.hits + stats.misses > 0 ? stats.hits / (stats.hits + stats.misses) : 0,
    }),

    // Reset statistics
    resetStats: () => {
      stats.hits = 0
      stats.misses = 0
      stats.invalidations = 0
      stats.updates = 0
    },
  }
} 