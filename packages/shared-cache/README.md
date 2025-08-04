# @repo/shared-cache

A comprehensive caching utilities package for the monorepo, providing multiple caching strategies for optimal performance.

## Features

- **Multiple Cache Types**: Memory, localStorage, sessionStorage, and Cache API
- **Image Caching**: Automatic image caching with Cache API and data URLs
- **RTK Query Integration**: Enhanced caching configurations for RTK Query
- **Performance Monitoring**: Built-in cache statistics and monitoring
- **Type Safety**: Full TypeScript support with Zod validation
- **React Components**: Ready-to-use React components for caching

## Installation

```bash
pnpm add @repo/shared-cache
```

## Quick Start

### Basic Caching

```typescript
import { MemoryCache, StorageCache } from '@repo/shared-cache'

// Memory cache (fastest, limited size)
const memoryCache = new MemoryCache({
  maxSize: 100,
  maxAge: 5 * 60 * 1000, // 5 minutes
})

// LocalStorage cache (persistent, slower)
const localStorageCache = new StorageCache({
  storage: 'localStorage',
  maxSize: 50,
  maxAge: 30 * 60 * 1000, // 30 minutes
})

// Cache data
memoryCache.set('key', { data: 'value' })
const data = memoryCache.get('key')
```

### Image Caching

```typescript
import { useImageCache, CachedImage } from '@repo/shared-cache'

// Using the hook
function MyComponent() {
  const { cacheImage, getCachedImage } = useImageCache()
  
  const handleImageLoad = async (url: string) => {
    await cacheImage(url)
  }
  
  return <CachedImage src="https://example.com/image.jpg" alt="Example" />
}

// Using the component
<CachedImage 
  src="https://example.com/image.jpg" 
  alt="Example"
  fallback="/placeholder.jpg"
  preload={true}
/>
```

### RTK Query Integration

```typescript
import { 
  getRTKQueryCacheConfig, 
  createCachedBaseQuery 
} from '@repo/shared-cache'

// Enhanced base query with caching headers
const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery(createCachedBaseQuery('/api', {
    maxAge: 300, // 5 minutes
  })),
  endpoints: (builder) => ({
    getData: builder.query({
      query: () => 'data',
      ...getRTKQueryCacheConfig('medium'), // 5 minutes cache
    }),
    getStaticData: builder.query({
      query: () => 'static-data',
      ...getRTKQueryCacheConfig('long'), // 30 minutes cache
    }),
  }),
})
```

### Cache Management

```typescript
import { useCacheManager, CacheManager } from '@repo/shared-cache'

// Using the hook
function MyComponent() {
  const { 
    cacheData, 
    getCachedData, 
    clearAllCaches, 
    stats 
  } = useCacheManager()
  
  // Cache data with different strategies
  cacheData('temp-data', data, 'memory', 60000) // 1 minute
  cacheData('persistent-data', data, 'localStorage') // 30 minutes default
  
  return <div>Cache hit rate: {(stats?.memory.hitRate * 100).toFixed(1)}%</div>
}

// Using the component
<CacheManager />
```

## API Reference

### MemoryCache

Fast in-memory cache with LRU eviction.

```typescript
const cache = new MemoryCache({
  maxSize: 100,        // Maximum number of entries
  maxAge: 300000,      // Default TTL in milliseconds
})

cache.set(key, value, maxAge?)     // Set value
cache.get(key)                     // Get value
cache.has(key)                     // Check if exists
cache.delete(key)                  // Delete entry
cache.clear()                      // Clear all entries
cache.cleanup()                    // Remove expired entries
cache.getStats()                   // Get cache statistics
```

### StorageCache

Persistent cache using localStorage or sessionStorage.

```typescript
const cache = new StorageCache({
  storage: 'localStorage',         // 'localStorage' or 'sessionStorage'
  maxSize: 50,                     // Maximum number of entries
  maxAge: 1800000,                 // Default TTL in milliseconds
  keyPrefix: 'cache_',             // Key prefix for namespacing
  compress: false,                 // Enable compression
})

// Same methods as MemoryCache
```

### ImageCache

Image caching using Cache API and data URLs.

```typescript
const imageCache = new ImageCache({
  cacheName: 'image-cache',        // Cache name for Cache API
  maxAge: 86400000,                // 24 hours default
  maxSize: 52428800,               // 50MB default
})

await imageCache.cacheImage(url)                    // Cache image
await imageCache.getImageAsDataURL(url)             // Get as data URL
await imageCache.cacheImageAsDataURL(url)           // Cache as data URL
imageCache.getCachedImage(url)                      // Get cached image
await imageCache.preloadImages(urls)                // Preload multiple images
await imageCache.clearCache()                       // Clear all cached images
await imageCache.getCacheStats()                    // Get statistics
```

### React Hooks

#### useImageCache

```typescript
const { 
  cacheImage, 
  getCachedImage, 
  preloadImages, 
  clearCache, 
  getStats 
} = useImageCache()
```

#### useCacheManager

```typescript
const {
  cacheData,
  getCachedData,
  isCached,
  deleteCachedData,
  clearAllCaches,
  cleanupExpired,
  updateStats,
  stats,
} = useCacheManager()
```

### React Components

#### CachedImage

```typescript
<CachedImage
  src="https://example.com/image.jpg"
  alt="Example"
  fallback="/placeholder.jpg"
  preload={true}
  onLoad={() => console.log('Image loaded')}
  onError={() => console.log('Image failed')}
  className="w-full h-full object-cover"
  loading="lazy"
/>
```

#### ImageGallery

```typescript
<ImageGallery
  images={[
    { id: '1', src: 'https://example.com/image1.jpg', alt: 'Image 1' },
    { id: '2', src: 'https://example.com/image2.jpg', alt: 'Image 2' },
  ]}
  onImageLoad={(id) => console.log(`Image ${id} loaded`)}
  onImageError={(id) => console.log(`Image ${id} failed`)}
/>
```

#### CacheManager

```typescript
<CacheManager />
```

### RTK Query Utilities

#### Cache Configurations

```typescript
// Predefined configurations
getRTKQueryCacheConfig('short')      // 30 seconds
getRTKQueryCacheConfig('medium')     // 5 minutes
getRTKQueryCacheConfig('long')       // 30 minutes
getRTKQueryCacheConfig('persistent') // 1 hour
getRTKQueryCacheConfig('realtime')   // No cache, polling

// Custom configuration
createRTKQueryCacheConfig({
  keepUnusedDataFor: 120,            // 2 minutes
  refetchOnFocus: false,
  pollingInterval: 10000,            // 10 seconds
})
```

#### Enhanced Base Query

```typescript
createCachedBaseQuery('/api', {
  cacheControl: 'max-age=300',       // Custom cache control
  etag: true,                        // Enable ETag support
  maxAge: 300,                       // 5 minutes
})
```

#### Cache Monitoring

```typescript
const monitor = createCacheMonitor()

monitor.onCacheHit()                 // Track cache hit
monitor.onCacheMiss()                // Track cache miss
monitor.onCacheInvalidation()        // Track invalidation
monitor.onCacheUpdate()              // Track updates
monitor.getStats()                   // Get statistics
monitor.resetStats()                 // Reset statistics
```

## Configuration

### Cache Configuration Schema

```typescript
interface CacheConfig {
  maxAge: number                     // Default TTL in milliseconds
  maxSize: number                    // Maximum number of entries
  storage: 'memory' | 'localStorage' | 'sessionStorage' | 'cache'
  keyPrefix: string                  // Key prefix for namespacing
  compress: boolean                  // Enable compression
  encrypt: boolean                   // Enable encryption (future)
}
```

### RTK Query Cache Configuration Schema

```typescript
interface RTKQueryCacheConfig {
  keepUnusedDataFor: number          // Cache duration in seconds
  refetchOnMountOrArgChange: boolean // Refetch on mount/arg change
  refetchOnFocus: boolean            // Refetch on window focus
  refetchOnReconnect: boolean        // Refetch on network reconnect
  pollingInterval?: number           // Polling interval in milliseconds
  skip: boolean                      // Skip query execution
}
```

## Performance Tips

1. **Use Memory Cache** for frequently accessed, temporary data
2. **Use LocalStorage Cache** for persistent data that doesn't change often
3. **Use SessionStorage Cache** for session-specific data
4. **Preload Images** for better user experience
5. **Monitor Cache Statistics** to optimize cache sizes and TTLs
6. **Clean Up Expired Entries** periodically to free memory
7. **Use Appropriate RTK Query Cache Configurations** based on data volatility

## Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run type checking
pnpm type-check
```

## Examples

See the test files for comprehensive examples of all features:

- `src/__tests__/memoryCache.test.ts` - Memory cache examples
- `src/__tests__/imageCache.test.ts` - Image caching examples
- `apps/web/lego-moc-instructions-app/src/hooks/__tests__/useCacheManager.test.tsx` - React hook examples 