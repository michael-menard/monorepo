# Troubleshooting Guide: Enhanced Serverless API Client

Common issues and solutions when using the enhanced serverless API client.

## 🔍 Common Issues

### **1. Import Errors**

#### **Problem: "Module not found" errors**
```
Error: Module '@repo/api-client/rtk/gallery-api' not found
```

**Solution:**
```typescript
// ✅ Correct import paths
import { useEnhancedGallerySearchQuery } from '@repo/api-client/rtk/gallery-api'
import { useEnhancedWishlistQueryQuery } from '@repo/api-client/rtk/wishlist-api'
import { initializeCognitoTokenManager } from '@repo/api-client/auth/cognito-integration'

// ❌ Incorrect barrel file imports (deprecated)
import { useEnhancedGallerySearchQuery } from '@repo/api-client'
```

#### **Problem: TypeScript errors with hook imports**
```
Error: 'useEnhancedGallerySearchQuery' is not exported from module
```

**Solution:**
```typescript
// ✅ Import from the correct API file
import { 
  useEnhancedGallerySearchQuery,
  enhancedGalleryApi 
} from '@repo/api-client/rtk/gallery-api'

// ✅ For wishlist hooks
import { 
  useEnhancedWishlistQueryQuery,
  enhancedWishlistApi 
} from '@repo/api-client/rtk/wishlist-api'
```

### **2. Store Configuration Issues**

#### **Problem: "Cannot read property 'reducer' of undefined"**
```
Error: Cannot read property 'reducer' of undefined
```

**Solution:**
```typescript
// ✅ Correct store configuration
import { enhancedGalleryApi, enhancedWishlistApi } from '@repo/api-client/rtk/gallery-api'

const store = configureStore({
  reducer: {
    // Use the reducerPath property
    [enhancedGalleryApi.reducerPath]: enhancedGalleryApi.reducer,
    [enhancedWishlistApi.reducerPath]: enhancedWishlistApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      enhancedGalleryApi.middleware,
      enhancedWishlistApi.middleware
    ),
})
```

#### **Problem: Middleware not working**
```
Warning: RTK Query middleware not configured properly
```

**Solution:**
```typescript
// ✅ Ensure middleware is added correctly
const store = configureStore({
  reducer: {
    [enhancedGalleryApi.reducerPath]: enhancedGalleryApi.reducer,
    [enhancedWishlistApi.reducerPath]: enhancedWishlistApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Configure default middleware
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(
      // Add API middleware
      enhancedGalleryApi.middleware,
      enhancedWishlistApi.middleware
    ),
})
```

### **3. Authentication Issues**

#### **Problem: "Authentication token not found"**
```
Error: Request failed with status 401: Unauthorized
```

**Solution:**
```typescript
// ✅ Initialize authentication before making API calls
import { initializeCognitoTokenManager } from '@repo/api-client/auth/cognito-integration'

// Initialize with valid tokens
initializeCognitoTokenManager({
  accessToken: 'your-valid-access-token',
  refreshToken: 'your-valid-refresh-token',
  idToken: 'your-valid-id-token',
})

// ✅ Check if token is available
import { getCognitoAuthToken } from '@repo/api-client/auth/cognito-integration'

const token = getCognitoAuthToken()
if (!token) {
  // Redirect to login or refresh tokens
  console.error('No valid authentication token available')
}
```

#### **Problem: Token refresh failures**
```
Error: Failed to refresh authentication token
```

**Solution:**
```typescript
// ✅ Handle token refresh errors
import { 
  initializeCognitoTokenManager,
  onTokenRefreshError 
} from '@repo/api-client/auth/cognito-integration'

// Set up error handling
onTokenRefreshError((error) => {
  console.error('Token refresh failed:', error)
  // Redirect to login page
  window.location.href = '/login'
})
```

### **4. API Response Issues**

#### **Problem: "Unexpected response format"**
```
Error: Cannot read property 'data' of undefined
```

**Solution:**
```typescript
// ✅ Always check for data existence
const { data, isLoading, error } = useEnhancedGallerySearchQuery(params)

if (isLoading) return <div>Loading...</div>
if (error) return <div>Error: {error.message}</div>
if (!data?.data) return <div>No data available</div>

// Now safe to access data.data.images
const images = data.data.images
```

#### **Problem: Cache not working as expected**
```
Issue: Data not updating despite cache strategy
```

**Solution:**
```typescript
// ✅ Use appropriate cache strategies
const { data, refetch } = useEnhancedGallerySearchQuery({
  query: 'technic',
  cacheStrategy: 'short', // For frequently changing data
}, {
  // RTK Query options
  refetchOnMountOrArgChange: 300, // 5 minutes
  refetchOnFocus: false,
  refetchOnReconnect: true,
})

// ✅ Manual cache invalidation when needed
import { enhancedGalleryApi } from '@repo/api-client/rtk/gallery-api'

const invalidateCache = () => {
  dispatch(enhancedGalleryApi.util.invalidateTags(['Gallery']))
}
```

### **5. Performance Issues**

#### **Problem: Slow API responses**
```
Issue: API calls taking too long to complete
```

**Solution:**
```typescript
// ✅ Use performance optimizations
const { data } = useEnhancedGallerySearchQuery({
  query: 'technic',
  // Performance optimizations
  cacheStrategy: 'medium',
  prefetchNext: true,
  enableBatchLoading: true,
}, {
  // Skip unnecessary requests
  skip: !shouldFetchData,
})

// ✅ Monitor performance
import { performanceMonitor } from '@repo/api-client/lib/performance'

performanceMonitor.subscribe((metric) => {
  if (metric.duration > 1000) {
    console.warn('Slow API call detected:', metric)
  }
})
```

#### **Problem: Memory leaks with API calls**
```
Issue: Memory usage increasing over time
```

**Solution:**
```typescript
// ✅ Proper cleanup in components
useEffect(() => {
  return () => {
    // Cleanup subscriptions
    dispatch(enhancedGalleryApi.util.resetApiState())
  }
}, [])

// ✅ Use skip to prevent unnecessary calls
const { data } = useEnhancedGallerySearchQuery(params, {
  skip: !isComponentMounted || !shouldFetch,
})
```

## 🔧 Debugging Tools

### **1. Enable Debug Mode**

```typescript
// Enable detailed logging
import { performanceMonitor } from '@repo/api-client/lib/performance'

performanceMonitor.enableDebugMode()

// Log all API calls
const debugApiCalls = () => {
  const originalFetch = window.fetch
  window.fetch = async (...args) => {
    console.log('API Call:', args[0])
    const response = await originalFetch(...args)
    console.log('API Response:', response.status, response.statusText)
    return response
  }
}
```

### **2. Performance Monitoring**

```typescript
// Monitor API performance
const PerformanceDebugger = () => {
  const [metrics, setMetrics] = useState([])

  useEffect(() => {
    const unsubscribe = performanceMonitor.subscribe((metric) => {
      setMetrics(prev => [...prev.slice(-50), metric])
    })
    return unsubscribe
  }, [])

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, background: 'white', padding: '10px' }}>
      <h4>API Performance</h4>
      {metrics.slice(-5).map((metric, i) => (
        <div key={i}>
          {metric.operation}: {metric.duration.toFixed(2)}ms 
          {metric.cacheHit ? ' (cached)' : ' (network)'}
        </div>
      ))}
    </div>
  )
}
```

### **3. Network Request Debugging**

```typescript
// Debug network requests
const debugNetworkRequests = () => {
  // Intercept all fetch requests
  const originalFetch = window.fetch
  window.fetch = async (url, options) => {
    console.group(`🌐 API Request: ${url}`)
    console.log('Options:', options)
    console.log('Headers:', options?.headers)
    
    const start = performance.now()
    try {
      const response = await originalFetch(url, options)
      const duration = performance.now() - start
      
      console.log(`✅ Response: ${response.status} (${duration.toFixed(2)}ms)`)
      console.groupEnd()
      
      return response
    } catch (error) {
      const duration = performance.now() - start
      console.error(`❌ Error: ${error.message} (${duration.toFixed(2)}ms)`)
      console.groupEnd()
      throw error
    }
  }
}
```

## 📋 Diagnostic Checklist

When encountering issues, check these items:

### **Basic Setup**
- [ ] Correct import paths (direct imports, not barrel files)
- [ ] Store configured with proper reducers and middleware
- [ ] Authentication initialized before API calls
- [ ] Environment variables set correctly

### **API Configuration**
- [ ] Endpoints configured correctly
- [ ] Base URL set properly
- [ ] Authentication headers included
- [ ] CORS configured if needed

### **Performance**
- [ ] Appropriate cache strategies selected
- [ ] Batch operations used where applicable
- [ ] Performance monitoring enabled
- [ ] Memory leaks checked

### **Error Handling**
- [ ] Error boundaries implemented
- [ ] Retry logic configured
- [ ] Fallback UI for error states
- [ ] Logging configured for debugging

## 🆘 Getting Help

### **1. Check Documentation**
- [API Reference](./API_REFERENCE.md) - Complete API documentation
- [Migration Guide](./MIGRATION.md) - Upgrade from legacy APIs
- [Examples](./EXAMPLES.md) - Real-world usage examples
- [Performance Guide](./PERFORMANCE.md) - Optimization strategies

### **2. Enable Debugging**
```typescript
// Enable all debugging features
import { performanceMonitor } from '@repo/api-client/lib/performance'

// Enable debug mode
performanceMonitor.enableDebugMode()

// Log all performance metrics
performanceMonitor.subscribe(console.log)

// Debug network requests
debugNetworkRequests()
```

### **3. Create Minimal Reproduction**
When reporting issues, create a minimal example:

```typescript
// Minimal reproduction example
import { useEnhancedGallerySearchQuery } from '@repo/api-client/rtk/gallery-api'

function MinimalExample() {
  const { data, isLoading, error } = useEnhancedGallerySearchQuery({
    query: 'test',
  })

  console.log('Data:', data)
  console.log('Loading:', isLoading)
  console.log('Error:', error)

  return <div>Check console for debug info</div>
}
```

### **4. Report Issues**
Include this information when reporting issues:
- Exact error message and stack trace
- Code snippet showing the problem
- Browser and version
- Package versions
- Steps to reproduce
- Expected vs actual behavior
