export * from './schemas/cache';
export type { CacheStats, CacheConfig, CacheEntry } from './schemas/cache';
export { MemoryCache } from './utils/memoryCache';
export { StorageCache } from './utils/storageCache';
export { ImageCache, useImageCache } from './utils/imageCache';
export { RTK_QUERY_CACHE_CONFIGS, getRTKQueryCacheConfig, createRTKQueryCacheConfig, createOptimisticUpdate, createCacheInvalidation, createCacheUpdate, createCachedBaseQuery, createCacheErrorHandler, createCacheMonitor, } from './utils/rtkQueryCache';
export { CachedImage, ImageGallery, CacheStatus } from './components/CachedImage';
export declare function createCache(type: 'memory' | 'localStorage' | 'sessionStorage', config?: any): Promise<import(".").MemoryCache | import(".").StorageCache>;
//# sourceMappingURL=index.d.ts.map