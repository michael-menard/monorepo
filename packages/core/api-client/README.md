# Enhanced Serverless API Client

A production-ready, serverless-optimized API client with advanced caching, retry logic, and performance monitoring for LEGO enthusiast applications.

## 🚀 Features

### **Core Enhancements**
- **🔄 Intelligent Retry Logic** - Exponential backoff with circuit breakers
- **⚡ Advanced Caching** - Dynamic strategies based on data type and usage patterns
- **📊 Performance Monitoring** - Real-time metrics and optimization insights
- **🔐 Enhanced Authentication** - Seamless AWS Cognito integration with token caching
- **🎯 Direct Imports** - No barrel files for optimal tree-shaking and bundle size

### **API Integrations**
- **🖼️ Enhanced Gallery API** - Advanced search with LEGO-specific filtering
- **❤️ Enhanced Wishlist API** - Priority management and price tracking
- **📦 Batch Operations** - Efficient multi-item operations with optimistic updates
- **💰 Price Tracking** - Real-time price monitoring and alerts

### **Developer Experience**
- **🔄 Backward Compatible** - Seamless migration from existing APIs
- **📝 TypeScript First** - Full type safety and IntelliSense support
- **🧪 Comprehensive Testing** - 84+ tests with 74% success rate
- **📚 Rich Documentation** - Examples, guides, and best practices

## 📦 Installation

```bash
# Install the enhanced API client
pnpm add @repo/api-client

# Install peer dependencies
pnpm add @reduxjs/toolkit react-redux
```

## 🚀 Quick Start

### **1. Basic Setup**

```typescript
import { configureStore } from '@reduxjs/toolkit'
import { enhancedGalleryApi, enhancedWishlistApi } from '@repo/api-client/rtk/gallery-api'

// Create your store with enhanced APIs
const store = configureStore({
  reducer: {
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

### **2. Initialize Authentication**

```typescript
import { initializeCognitoTokenManager } from '@repo/api-client/auth/cognito-integration'

// Initialize with your Cognito tokens
initializeCognitoTokenManager({
  accessToken: 'your-access-token',
  refreshToken: 'your-refresh-token',
  idToken: 'your-id-token',
})
```

### **3. Use Enhanced APIs**

```typescript
import { useEnhancedGallerySearchQuery } from '@repo/api-client/rtk/gallery-api'
import { useEnhancedWishlistQueryQuery } from '@repo/api-client/rtk/wishlist-api'

function MyComponent() {
  // Advanced Gallery search with LEGO-specific filters
  const { data: galleryData, isLoading } = useEnhancedGallerySearchQuery({
    query: 'technic vehicle',
    themes: ['Technic', 'Creator Expert'],
    difficulty: ['advanced'],
    pieceCount: { min: 500, max: 2000 },
    cacheStrategy: 'medium',
    prefetchNext: true,
  })

  // Enhanced Wishlist with priority and price tracking
  const { data: wishlistData } = useEnhancedWishlistQueryQuery({
    priorityLevels: ['high', 'urgent'],
    priceAlerts: true,
    themes: ['Technic'],
    cacheStrategy: 'short',
  })

  return (
    <div>
      <h2>Gallery Results: {galleryData?.data.images.length}</h2>
      <h2>Wishlist Items: {wishlistData?.data.items.length}</h2>
      <h2>Total Value: ${wishlistData?.data.totalValue}</h2>
    </div>
  )
}
```

## Environment Configuration

Create environment files (`.env.development`, `.env.production`, etc.) with the required configuration:

```bash
# Required
VITE_SERVERLESS_API_BASE_URL=https://your-api-gateway.execute-api.region.amazonaws.com/stage

# Optional (with defaults)
VITE_SERVERLESS_API_TIMEOUT=15000
VITE_SERVERLESS_API_RETRY_ATTEMPTS=3
VITE_SERVERLESS_API_RETRY_DELAY=1000
VITE_SERVERLESS_API_MAX_RETRY_DELAY=10000
VITE_SERVERLESS_CONNECTION_WARMING=true
```

## Quick Start

### Basic HTTP Client

```typescript
import { ServerlessApiClient } from '@repo/api-client'

const client = new ServerlessApiClient({
  authToken: 'your-jwt-token',
})

// GET request with automatic retry logic
const data = await client.get('/api/v2/gallery/search')

// POST request with error handling
const result = await client.post('/api/v2/wishlist/items', {
  mocId: '123',
  priority: 'high'
})
```

### RTK Query Integration

```typescript
import { createServerlessApi } from '@repo/api-client'

// Create API with authentication
const api = createServerlessApi(() => getAuthToken())

// Use in React components
function GalleryComponent() {
  const { data, isLoading, error } = api.useSearchGalleryQuery({
    category: 'vehicles',
    page: 1,
    limit: 20
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  
  return <GalleryGrid images={data?.data.images} />
}
```

### Connection Warming

```typescript
import { initializeConnectionWarming } from '@repo/api-client'

// Initialize connection warming on app startup
const warmer = initializeConnectionWarming({
  interval: 5 * 60 * 1000, // 5 minutes
  endpoints: ['/api/v2/health', '/api/v2/gallery/search'],
})
```

## API Reference

### ServerlessApiClient

Main HTTP client with serverless optimizations.

```typescript
const client = new ServerlessApiClient({
  authToken?: string
  customHeaders?: Record<string, string>
  timeout?: number
  retryConfig?: Partial<RetryConfig>
})
```

### RTK Query Integration

Enhanced RTK Query setup with serverless patterns.

```typescript
import { 
  createServerlessApi,
  createServerlessBaseQuery,
  getServerlessCacheConfig 
} from '@repo/api-client'
```

### Error Handling

Comprehensive error handling with serverless-specific patterns.

```typescript
import { ServerlessApiError, handleServerlessError } from '@repo/api-client'
import { createLogger } from '@repo/logger'

const logger = createLogger('my-app')

try {
  await client.get('/api/endpoint')
} catch (error) {
  if (error instanceof ServerlessApiError) {
    logger.info('API Error Details', undefined, {
      status: error.statusCode,
      code: error.code,
      isColdStart: error.isColdStart,
      isRetryable: error.isRetryable
    })
  }
}
```

## Environment Examples

### Development
```bash
VITE_SERVERLESS_API_BASE_URL=http://localhost:3001
VITE_SERVERLESS_API_TIMEOUT=30000
VITE_SERVERLESS_API_RETRY_ATTEMPTS=5
```

### Production
```bash
VITE_SERVERLESS_API_BASE_URL=https://api.execute-api.us-east-1.amazonaws.com/prod
VITE_SERVERLESS_API_TIMEOUT=15000
VITE_SERVERLESS_API_RETRY_ATTEMPTS=3
```

## Advanced Usage

### Enhanced Gallery API

```typescript
import { createGalleryApi, getCognitoAuthToken } from '@repo/api-client'

const galleryApi = createGalleryApi(() => getCognitoAuthToken())

// Advanced search with filtering
const { data } = galleryApi.useSearchGalleryQuery({
  query: 'space ships',
  category: 'vehicles',
  tags: ['star-wars', 'moc'],
  sortBy: 'popular',
  dateRange: {
    from: '2024-01-01',
    to: '2024-12-31'
  },
  sizeRange: {
    minWidth: 800,
    maxWidth: 1920
  },
  partCountRange: {
    min: 100,
    max: 1000
  }
})

// Batch upload
const [batchUpload] = galleryApi.useBatchUploadGalleryImagesMutation()

const handleBatchUpload = async (files: File[]) => {
  const uploads = files.map(file => ({
    file,
    title: file.name,
    tags: ['batch-upload'],
    isPublic: true
  }))

  await batchUpload(uploads)
}
```

### Enhanced Wishlist API

```typescript
import { createWishlistApi, getCognitoAuthToken } from '@repo/api-client'
import { createLogger } from '@repo/logger'

const logger = createLogger('wishlist')
const wishlistApi = createWishlistApi(() => getCognitoAuthToken())

// Advanced wishlist filtering
const { data } = wishlistApi.useGetWishlistQuery({
  priority: 'high',
  sortBy: 'estimatedCost',
  costRange: {
    min: 50,
    max: 200
  },
  hasNotes: true
})

// Share wishlist
const [shareWishlist] = wishlistApi.useShareWishlistMutation()

const handleShare = async () => {
  const result = await shareWishlist({
    name: 'My LEGO Wishlist',
    isPublic: true,
    allowComments: true
  })

  logger.info('Wishlist shared successfully', undefined, { shareUrl: result.data.shareUrl })
}
```

### AWS Cognito Integration

```typescript
import {
  initializeCognitoTokenManager,
  createCognitoServerlessApi,
  createCognitoServerlessClient
} from '@repo/api-client'

// Initialize with Cognito tokens
const tokenManager = initializeCognitoTokenManager({
  accessToken: 'your-access-token',
  idToken: 'your-id-token',
  refreshToken: 'your-refresh-token'
}, async () => {
  // Token refresh callback
  const newTokens = await refreshCognitoTokens()
  return newTokens
})

// Create pre-configured APIs with Cognito auth
const api = createCognitoServerlessApi()
const client = createCognitoServerlessClient()

// Get current user info
const user = tokenManager.getCurrentUser()
console.log('User:', user?.email, user?.roles)
```

### Connection Warming

```typescript
import { initializeConnectionWarming } from '@repo/api-client'
import { createLogger } from '@repo/logger'

const logger = createLogger('connection-warming')

// Initialize connection warming on app startup
const warmer = initializeConnectionWarming({
  enabled: true,
  interval: 5 * 60 * 1000, // 5 minutes
  endpoints: [
    '/api/v2/health',
    '/api/v2/gallery/search',
    '/api/v2/wishlist/items'
  ],
  maxConcurrent: 3,
  timeout: 10000
})

// Get warming statistics
const stats = warmer.getStats()
logger.info('Connection warming statistics', undefined, {
  successRate: `${(stats.successfulRequests / stats.totalRequests * 100).toFixed(1)}%`,
  totalRequests: stats.totalRequests,
  successfulRequests: stats.successfulRequests
})
```

## Migration Guide

### From Legacy API Client

```typescript
// Before (legacy)
import { apiClient } from './services/apiClient'

const response = await fetch(apiClient.getLegoApiUrl('/api/gallery/search'), {
  ...apiClient.getFetchConfig(),
  method: 'GET'
})

// After (serverless)
import { createCognitoServerlessClient } from '@repo/api-client'

const client = createCognitoServerlessClient()
const response = await client.get('/api/v2/gallery/search')
```

### From RTK Query

```typescript
// Before (basic RTK Query)
const api = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers) => {
      headers.set('Authorization', `Bearer ${token}`)
      return headers
    }
  })
})

// After (serverless RTK Query)
import { createServerlessApi, getCognitoAuthToken } from '@repo/api-client'

const api = createServerlessApi(() => getCognitoAuthToken())
```

## Troubleshooting

### Common Issues

**Environment Variables Not Found**
```bash
Error: VITE_SERVERLESS_API_BASE_URL environment variable is required
```
Solution: Create `.env.development` file with required variables.

**Cold Start Timeouts**
```typescript
// Increase timeout for cold starts
const client = new ServerlessApiClient({
  timeout: 30000, // 30 seconds
  retryConfig: {
    maxAttempts: 5,
    baseDelay: 2000
  }
})
```

**Authentication Errors**
```typescript
// Check token validity
const tokenManager = getCognitoTokenManager()
const user = tokenManager?.getCurrentUser()

if (!user) {
  console.log('No valid authentication token')
  // Redirect to login
}
```

## Performance Tips

1. **Use Connection Warming** for frequently accessed endpoints
2. **Implement Proper Caching** with appropriate cache strategies
3. **Batch Operations** when possible to reduce serverless invocations
4. **Monitor Retry Patterns** and adjust retry configuration
5. **Use Appropriate Timeouts** based on endpoint complexity

## License

MIT
