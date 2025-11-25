// Schemas
export * from './schemas/cache'

// Types
export type { CacheStats, CacheConfig, CacheEntry } from './schemas/cache'

// Cache utilities
export { MemoryCache } from './utils/memoryCache'
export { StorageCache } from './utils/storageCache'
export { ImageCache, useImageCache } from './utils/imageCache'

// RTK Query cache utilities
export {
  RTK_QUERY_CACHE_CONFIGS,
  getRTKQueryCacheConfig,
  createRTKQueryCacheConfig,
  createOptimisticUpdate,
  createCacheInvalidation,
  createCacheUpdate,
  createCachedBaseQuery,
  createCacheErrorHandler,
  createCacheMonitor,
} from './utils/rtkQueryCache'

// Serverless cache utilities
export {
  SERVERLESS_CACHE_CONFIGS,
  SERVERLESS_BATCH_CONFIGS,
  SERVERLESS_INVALIDATION_PATTERNS,
  DEFAULT_SERVERLESS_WARMING_CONFIG,
  getServerlessCacheConfig,
  createServerlessCacheConfig,
  getServerlessBatchConfig,
  createServerlessWarmingConfig,
  getServerlessInvalidationConfig,
  ServerlessCache,
} from './utils/serverlessCache'
export type {
  ServerlessCacheStrategy,
  ServerlessBatchStrategy,
  ServerlessInvalidationStrategy,
  ServerlessWarmingConfig,
  ServerlessCacheConfig,
  BatchOperation,
  BatchResult,
  ServerlessCacheStats,
} from './utils/serverlessCache'

// Serverless cache manager
export {
  ServerlessCacheManager,
  getServerlessCacheManager,
  resetServerlessCacheManager,
} from './utils/serverlessCacheManager'
export type { ServerlessCacheManagerConfig } from './utils/serverlessCacheManager'

// Serverless cache hooks
export { useServerlessCache, useServerlessCacheValue } from './hooks/useServerlessCache'
export type {
  UseServerlessCacheOptions,
  UseServerlessCacheReturn,
} from './hooks/useServerlessCache'

// React components
export { CachedImage, ImageGallery, CacheStatus } from './components/CachedImage'

// Cache factory function
export async function createCache(
  type: 'memory' | 'localStorage' | 'sessionStorage',
  config?: any,
) {
  switch (type) {
    case 'memory': {
      const { MemoryCache } = await import('./utils/memoryCache')
      return new MemoryCache(config)
    }
    case 'localStorage':
    case 'sessionStorage': {
      const { StorageCache } = await import('./utils/storageCache')
      return new StorageCache({
        ...config,
        storage: type,
      })
    }
    default:
      throw new Error(`Unknown cache type: ${type}`)
  }
}
