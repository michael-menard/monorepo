# Performance Guide: Enhanced Serverless API Client

Best practices and optimization strategies for maximum performance with the enhanced serverless API client.

## 🎯 Performance Overview

The enhanced API client provides multiple optimization strategies:
- **Intelligent Caching** - Dynamic cache strategies based on data type
- **Batch Operations** - Reduce network requests with bulk operations
- **Request Deduplication** - Prevent duplicate API calls
- **Performance Monitoring** - Real-time metrics and insights
- **Optimistic Updates** - Immediate UI feedback

## ⚡ Caching Strategies

### **Cache Strategy Selection**

Choose the right cache strategy based on your data characteristics:

```typescript
// Short cache (1 minute) - Real-time data
const { data } = useEnhancedWishlistQueryQuery({
  priceAlerts: true,
  cacheStrategy: 'short', // Price data changes frequently
})

// Medium cache (5 minutes) - Semi-dynamic data
const { data } = useEnhancedGallerySearchQuery({
  query: 'technic',
  cacheStrategy: 'medium', // Search results change moderately
})

// Long cache (30 minutes) - Static data
const { data } = useGetEnhancedGalleryStatsQuery(undefined, {
  cacheStrategy: 'long', // Statistics change infrequently
})

// Persistent cache - Rarely changing data
const { data } = useGetUserPreferencesQuery({
  cacheStrategy: 'persistent', // User preferences rarely change
})
```

### **Dynamic Cache Strategy**

The API client automatically selects cache strategies based on query complexity:

```typescript
// Automatically uses appropriate cache strategy
const { data } = useEnhancedGallerySearchQuery({
  // Simple query → longer cache
  category: 'vehicles',
  
  // Complex query → shorter cache
  query: 'technic crane',
  dateRange: { start: '2023-01-01', end: '2023-12-31' },
  
  // Price-sensitive query → shortest cache
  priceComparison: true,
})
```

## 🚀 Batch Operations

### **Gallery Batch Operations**

Use batch operations to reduce network requests:

```typescript
// ❌ Inefficient: Multiple individual requests
const updateIndividually = async (imageIds: string[]) => {
  for (const id of imageIds) {
    await updateGalleryImage({ id, tags: ['featured'] })
  }
}

// ✅ Efficient: Single batch request
const updateInBatch = async (imageIds: string[]) => {
  await batchGalleryOperation({
    operation: 'updateTags',
    imageIds,
    data: { tags: ['featured'] },
  })
}
```

### **Wishlist Batch Operations**

```typescript
// ✅ Batch priority updates
const [batchOperation] = useEnhancedBatchWishlistOperationMutation()

const updatePriorities = async (items: Array<{id: string, priority: string}>) => {
  // Group by priority for efficient batching
  const priorityGroups = items.reduce((groups, item) => {
    if (!groups[item.priority]) groups[item.priority] = []
    groups[item.priority].push(item.id)
    return groups
  }, {} as Record<string, string[]>)

  // Batch update each priority group
  await Promise.all(
    Object.entries(priorityGroups).map(([priority, itemIds]) =>
      batchOperation({
        operation: 'updatePriority',
        itemIds,
        data: { priority },
      })
    )
  )
}
```

## 📊 Performance Monitoring

### **Built-in Performance Tracking**

The API client automatically tracks performance metrics:

```typescript
import { performanceMonitor } from '@repo/api-client/lib/performance'

// Performance is automatically tracked for all API calls
const { data } = useEnhancedGallerySearchQuery({
  query: 'technic',
  // Performance data available in response
})

// Access performance data
console.log('Cache hit:', data?.performance?.cacheHit)
console.log('Duration:', data?.performance?.duration)
console.log('Source:', data?.performance?.source)
```

### **Custom Performance Tracking**

Track custom operations:

```typescript
const trackCustomOperation = async () => {
  const startTime = performance.now()
  
  // Your custom operation
  await someExpensiveOperation()
  
  const duration = performance.now() - startTime
  performanceMonitor.trackComponentRender('custom-operation', duration)
}
```

### **Performance Monitoring Dashboard**

Create a performance monitoring component:

```typescript
function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([])

  useEffect(() => {
    // Listen to performance events
    const unsubscribe = performanceMonitor.subscribe((metric) => {
      setMetrics(prev => [...prev.slice(-99), metric]) // Keep last 100 metrics
    })

    return unsubscribe
  }, [])

  const averageResponseTime = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length
  const cacheHitRate = metrics.filter(m => m.cacheHit).length / metrics.length

  return (
    <div className="performance-monitor">
      <h3>API Performance</h3>
      <div className="metrics">
        <div>Average Response Time: {averageResponseTime.toFixed(2)}ms</div>
        <div>Cache Hit Rate: {(cacheHitRate * 100).toFixed(1)}%</div>
        <div>Total Requests: {metrics.length}</div>
      </div>
    </div>
  )
}
```

## 🎯 Optimization Best Practices

### **1. Use Appropriate Cache Strategies**

```typescript
// ✅ Good: Match cache strategy to data volatility
const { data: priceData } = useGetEnhancedPriceEstimatesQuery(itemIds, {
  cacheStrategy: 'short', // Prices change frequently
})

const { data: statsData } = useGetEnhancedGalleryStatsQuery(undefined, {
  cacheStrategy: 'long', // Stats change infrequently
})
```

### **2. Enable Prefetching for Pagination**

```typescript
// ✅ Good: Enable prefetching for better UX
const { data } = useEnhancedGallerySearchQuery({
  page: currentPage,
  limit: 20,
  prefetchNext: true, // Prefetch next page
})
```

### **3. Use Batch Loading for Related Data**

```typescript
// ✅ Good: Enable batch loading for related items
const { data } = useEnhancedWishlistQueryQuery({
  themes: ['Technic'],
  enableBatchLoading: true, // Load related items efficiently
  prefetchRelated: true, // Prefetch similar items
})
```

### **4. Optimize Query Parameters**

```typescript
// ❌ Avoid: Over-fetching data
const { data } = useEnhancedGallerySearchQuery({
  includeMetadata: true,
  includeThumbnails: true,
  includeFullImages: true, // Unnecessary for list view
})

// ✅ Good: Fetch only what you need
const { data } = useEnhancedGallerySearchQuery({
  includeMetadata: false, // Only if needed
  includeThumbnails: true, // For list view
})
```

### **5. Use Optimistic Updates**

```typescript
// ✅ Good: Optimistic updates for better UX
const [updateItem] = useUpdateWishlistItemMutation()

const handleTogglePurchased = async (itemId: string, isPurchased: boolean) => {
  // Optimistic update - UI updates immediately
  dispatch(
    wishlistApi.util.updateQueryData('enhancedWishlistQuery', {}, (draft) => {
      const item = draft.data.items.find(i => i.id === itemId)
      if (item) item.isPurchased = isPurchased
    })
  )

  try {
    await updateItem({ id: itemId, isPurchased }).unwrap()
  } catch (error) {
    // Revert on error
    dispatch(wishlistApi.util.invalidateTags(['WishlistItem']))
  }
}
```

## 📈 Performance Metrics

### **Key Performance Indicators**

Monitor these metrics for optimal performance:

1. **Response Time**
   - Target: < 200ms for cached requests
   - Target: < 1000ms for network requests

2. **Cache Hit Rate**
   - Target: > 70% for frequently accessed data
   - Target: > 90% for static data

3. **Error Rate**
   - Target: < 1% with retry logic
   - Target: < 0.1% for critical operations

4. **Bundle Size Impact**
   - Direct imports reduce bundle size by ~30%
   - Tree-shaking eliminates unused code

### **Performance Testing**

```typescript
// Performance test example
const performanceTest = async () => {
  const iterations = 100
  const times: number[] = []

  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    
    await enhancedGalleryApi.endpoints.enhancedGallerySearch.initiate({
      query: `test-${i}`,
      cacheStrategy: 'medium',
    })
    
    times.push(performance.now() - start)
  }

  const average = times.reduce((sum, time) => sum + time, 0) / times.length
  const p95 = times.sort()[Math.floor(times.length * 0.95)]

  console.log(`Average response time: ${average.toFixed(2)}ms`)
  console.log(`95th percentile: ${p95.toFixed(2)}ms`)
}
```

## 🔧 Troubleshooting Performance Issues

### **Common Performance Problems**

1. **Slow Initial Load**
   - Solution: Use appropriate cache strategies
   - Solution: Enable prefetching for critical data

2. **High Memory Usage**
   - Solution: Implement cache size limits
   - Solution: Clear unused cache entries

3. **Frequent Network Requests**
   - Solution: Use batch operations
   - Solution: Increase cache duration for stable data

4. **Poor Cache Hit Rate**
   - Solution: Review cache strategies
   - Solution: Normalize query parameters

### **Performance Debugging**

```typescript
// Enable performance debugging
const debugPerformance = () => {
  performanceMonitor.enableDebugMode()
  
  // Log all performance metrics
  performanceMonitor.subscribe((metric) => {
    console.log('Performance Metric:', {
      operation: metric.operation,
      duration: metric.duration,
      cacheHit: metric.cacheHit,
      timestamp: new Date().toISOString(),
    })
  })
}
```

## 🎯 Performance Checklist

- [ ] Use appropriate cache strategies for different data types
- [ ] Enable batch operations for multi-item updates
- [ ] Implement optimistic updates for better UX
- [ ] Use direct imports instead of barrel files
- [ ] Enable prefetching for pagination
- [ ] Monitor performance metrics regularly
- [ ] Test performance under load
- [ ] Optimize query parameters to fetch only needed data
