import type { RTKQueryCacheConfig } from '../schemas/cache.js'
/**
 * Default RTK Query cache configurations for different use cases
 */
export declare const RTK_QUERY_CACHE_CONFIGS: {
  readonly short: {
    readonly keepUnusedDataFor: 30
    readonly refetchOnMountOrArgChange: true
    readonly refetchOnFocus: true
    readonly refetchOnReconnect: true
    readonly skip: false
  }
  readonly medium: {
    readonly keepUnusedDataFor: number
    readonly refetchOnMountOrArgChange: false
    readonly refetchOnFocus: true
    readonly refetchOnReconnect: true
    readonly skip: false
  }
  readonly long: {
    readonly keepUnusedDataFor: number
    readonly refetchOnMountOrArgChange: false
    readonly refetchOnFocus: false
    readonly refetchOnReconnect: true
    readonly skip: false
  }
  readonly persistent: {
    readonly keepUnusedDataFor: number
    readonly refetchOnMountOrArgChange: false
    readonly refetchOnFocus: false
    readonly refetchOnReconnect: false
    readonly skip: false
  }
  readonly realtime: {
    readonly keepUnusedDataFor: 0
    readonly refetchOnMountOrArgChange: true
    readonly refetchOnFocus: true
    readonly refetchOnReconnect: true
    readonly pollingInterval: 5000
    readonly skip: false
  }
}
/**
 * Get RTK Query cache configuration by type
 */
export declare function getRTKQueryCacheConfig(
  type: keyof typeof RTK_QUERY_CACHE_CONFIGS,
): RTKQueryCacheConfig
/**
 * Create custom RTK Query cache configuration
 */
export declare function createRTKQueryCacheConfig(
  config: Partial<RTKQueryCacheConfig>,
): RTKQueryCacheConfig
/**
 * Optimistic update helper for RTK Query mutations
 */
export declare function createOptimisticUpdate<T, R>(
  updateQueryData: (queryName: string, arg: T, updateFn: (draft: R) => void) => any,
  queryName: string,
  arg: T,
  updateFn: (draft: R) => void,
): any
/**
 * Cache invalidation helper for RTK Query
 */
export declare function createCacheInvalidation(tags: string[]): {
  type: string
  id: string
}[]
/**
 * Cache update helper for RTK Query
 */
export declare function createCacheUpdate<T>(
  data: T,
  id?: string | number,
): {
  type: 'update'
  data: T
  id: string | number | undefined
}
/**
 * Enhanced RTK Query base query with caching headers
 */
export declare function createCachedBaseQuery(
  baseUrl: string,
  options?: {
    cacheControl?: string
    etag?: boolean
    maxAge?: number
  },
): {
  baseUrl: string
  prepareHeaders: (headers: Headers, { getState }: any) => Headers
}
/**
 * Cache-aware error handling for RTK Query
 */
export declare function createCacheErrorHandler(
  error: any,
  retryCount?: number,
  maxRetries?: number,
):
  | {
      retry: boolean
      retryCount: number
    }
  | {
      retry: boolean
      retryCount?: undefined
    }
/**
 * Cache performance monitoring for RTK Query
 */
export declare function createCacheMonitor(): {
  onCacheHit: () => void
  onCacheMiss: () => void
  onCacheInvalidation: () => void
  onCacheUpdate: () => void
  getStats: () => {
    hitRate: number
    hits: number
    misses: number
    invalidations: number
    updates: number
  }
  resetStats: () => void
}
//# sourceMappingURL=rtkQueryCache.d.ts.map
