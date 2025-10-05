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

// React components
export { CachedImage, ImageGallery, CacheStatus } from './components/CachedImage'

// Cache factory function
export async function createCache(type: 'memory' | 'localStorage' | 'sessionStorage', config?: any) {
  switch (type) {
    case 'memory':
      const { MemoryCache } = await import('./utils/memoryCache')
      return new MemoryCache(config)
    case 'localStorage':
    case 'sessionStorage':
      const { StorageCache } = await import('./utils/storageCache')
      return new StorageCache({
        ...config,
        storage: type,
      })
    default:
      throw new Error(`Unknown cache type: ${type}`)
  }
} 