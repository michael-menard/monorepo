# Migration Guide: Serverless API Client

This guide helps you migrate from the existing API client to the new serverless-optimized API client.

## Overview

The new `@repo/api-client` package provides:
- **Serverless-optimized** HTTP client with retry logic
- **Enhanced RTK Query** integration with serverless patterns
- **AWS Cognito** authentication integration
- **Connection warming** for improved performance
- **Advanced filtering** for Gallery and Wishlist APIs

## Step-by-Step Migration

### 1. Install the Package

```bash
pnpm add @repo/api-client
```

### 2. Environment Configuration

Create environment files with serverless API configuration:

```bash
# .env.development
VITE_SERVERLESS_API_BASE_URL=https://dev-api.execute-api.us-east-1.amazonaws.com/dev
VITE_SERVERLESS_API_TIMEOUT=30000
VITE_SERVERLESS_API_RETRY_ATTEMPTS=5

# .env.production  
VITE_SERVERLESS_API_BASE_URL=https://api.execute-api.us-east-1.amazonaws.com/prod
VITE_SERVERLESS_API_TIMEOUT=15000
VITE_SERVERLESS_API_RETRY_ATTEMPTS=3
```

### 3. Replace API Client Usage

#### Before: Legacy API Client

```typescript
// services/apiClient.ts
import { ApiClient } from './apiClient'

const apiClient = new ApiClient()

// Making requests
const response = await fetch(apiClient.getLegoApiUrl('/api/gallery/search'), {
  ...apiClient.getFetchConfig(),
  method: 'GET'
})
```

#### After: Serverless API Client

```typescript
// services/apiClient.ts
import { createCognitoServerlessClient } from '@repo/api-client'

const apiClient = createCognitoServerlessClient()

// Making requests
const response = await apiClient.get('/api/v2/gallery/search')
```

### 4. Migrate RTK Query Setup

#### Before: Basic RTK Query

```typescript
// services/api.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

const baseQueryWithAuth = fetchBaseQuery({
  baseUrl: apiClient.getLegoApiUrl('/api'),
  prepareHeaders: (headers) => {
    // Manual auth token injection
    const token = getAuthToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
    return headers
  }
})

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuth,
  endpoints: (builder) => ({
    getMOCInstructions: builder.query({
      query: () => 'mocs/search'
    })
  })
})
```

#### After: Serverless RTK Query

```typescript
// services/api.ts
import { createCognitoServerlessApi } from '@repo/api-client'

// Automatic Cognito auth integration
export const api = createCognitoServerlessApi()

// Or use enhanced APIs
import { createGalleryApi, createWishlistApi, getCognitoAuthToken } from '@repo/api-client'

export const galleryApi = createGalleryApi(() => getCognitoAuthToken())
export const wishlistApi = createWishlistApi(() => getCognitoAuthToken())
```

### 5. Update Authentication Integration

#### Before: Manual Token Management

```typescript
// hooks/useAuth.ts
const [authToken, setAuthToken] = useState<string>()

// Manual token injection in requests
const makeRequest = async (url: string) => {
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  })
}
```

#### After: Cognito Token Manager

```typescript
// hooks/useAuth.ts
import { initializeCognitoTokenManager } from '@repo/api-client'

const tokenManager = initializeCognitoTokenManager({
  accessToken: cognitoUser.accessToken,
  idToken: cognitoUser.idToken,
  refreshToken: cognitoUser.refreshToken
}, async () => {
  // Automatic token refresh
  return await refreshCognitoTokens()
})

// Automatic token injection in all API calls
```

### 6. Migrate Specific Endpoints

#### Gallery API Migration

```typescript
// Before
const { data } = useGetMOCInstructionsQuery()

// After - Enhanced with filtering
const { data } = galleryApi.useSearchGalleryQuery({
  category: 'vehicles',
  tags: ['star-wars'],
  sortBy: 'popular',
  partCountRange: { min: 100, max: 1000 }
})
```

#### Wishlist API Migration

```typescript
// Before
const { data } = useGetWishlistQuery()

// After - Enhanced with priority filtering
const { data } = wishlistApi.useGetWishlistQuery({
  priority: 'high',
  sortBy: 'estimatedCost',
  costRange: { min: 50, max: 200 }
})
```

## Breaking Changes

### URL Structure
- **Before**: `/api/mocs/search`
- **After**: `/api/v2/mocs/search`

### Response Format
- **Before**: Direct data response
- **After**: Standardized serverless response with metadata

```typescript
// Before
{ images: [...] }

// After  
{
  data: { images: [...] },
  meta: {
    requestId: 'uuid',
    timestamp: '2024-11-24T...',
    version: '2.0'
  }
}
```

### Error Handling
- **Before**: Basic HTTP errors
- **After**: Enhanced serverless error types

```typescript
// Before
catch (error) {
  console.log(error.message)
}

// After
import { createLogger } from '@repo/logger'
const logger = createLogger('my-app')

catch (error) {
  if (error instanceof ServerlessApiError) {
    logger.info('Serverless API Error', error, {
      isColdStart: error.isColdStart,
      isRetryable: error.isRetryable
    })
  }
}
```

## Testing Migration

### Update Tests

```typescript
// Before
import { apiClient } from '../services/apiClient'

// After
import { createCognitoServerlessClient } from '@repo/api-client'

const mockClient = createCognitoServerlessClient()
```

### Mock Environment Variables

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    env: {
      VITE_SERVERLESS_API_BASE_URL: 'https://test-api.example.com'
    }
  }
})
```

## Rollback Plan

If issues arise, you can temporarily rollback:

1. **Keep legacy API client** alongside new one
2. **Feature flag** to switch between clients
3. **Gradual migration** endpoint by endpoint

```typescript
// Gradual migration approach
const useNewApi = process.env.VITE_USE_SERVERLESS_API === 'true'

const apiClient = useNewApi 
  ? createCognitoServerlessClient()
  : legacyApiClient
```

## Performance Improvements

After migration, you should see:
- **Reduced cold start impact** with retry logic
- **Better error handling** for serverless patterns  
- **Improved caching** with serverless-optimized strategies
- **Connection warming** for frequently used endpoints

## Support

For migration issues:
1. Check the troubleshooting section in README.md
2. Review integration tests for usage examples
3. Consult the API documentation for endpoint changes
