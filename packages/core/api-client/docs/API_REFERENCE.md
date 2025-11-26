# API Reference: Enhanced Serverless API Client

Complete reference for all APIs, hooks, and utilities in the enhanced serverless API client.

## 📖 Table of Contents

- [Gallery API](#gallery-api)
- [Wishlist API](#wishlist-api)
- [Authentication](#authentication)
- [Performance Monitoring](#performance-monitoring)
- [Types](#types)

## 🖼️ Gallery API

### **Enhanced Gallery Search**

#### `useEnhancedGallerySearchQuery(params, options?)`

Advanced gallery search with LEGO-specific filtering and performance optimizations.

**Parameters:**
```typescript
interface EnhancedGallerySearchParams {
  // Basic search
  query?: string
  category?: string
  tags?: string[]
  
  // LEGO-specific filters
  difficulty?: ('beginner' | 'intermediate' | 'advanced' | 'expert')[]
  pieceCount?: { min?: number, max?: number }
  themes?: string[] // 'City', 'Technic', 'Creator', etc.
  buildingTechniques?: string[] // 'SNOT', 'Microscale', etc.
  
  // Content filters
  hasInstructions?: boolean
  hasPartsList?: boolean
  isOriginalDesign?: boolean
  isFeatured?: boolean
  
  // Pagination
  page?: number
  limit?: number
  prefetchNext?: boolean
  
  // Sorting
  sortBy?: 'relevance' | 'date' | 'popularity' | 'title' | 'pieceCount'
  sortOrder?: 'asc' | 'desc'
  secondarySortBy?: 'date' | 'popularity' | 'title'
  
  // Performance options
  includeMetadata?: boolean
  includeThumbnails?: boolean
  cacheStrategy?: 'short' | 'medium' | 'long' | 'persistent'
  enableBatchLoading?: boolean
}
```

**Example:**
```typescript
const { data, isLoading, error } = useEnhancedGallerySearchQuery({
  query: 'technic vehicle',
  themes: ['Technic'],
  difficulty: ['advanced'],
  pieceCount: { min: 500, max: 2000 },
  cacheStrategy: 'medium',
  prefetchNext: true,
})
```

### **Batch Gallery Operations**

#### `useEnhancedBatchGalleryOperationMutation()`

Perform batch operations on multiple gallery items efficiently.

**Operations:**
- `delete` - Delete multiple images
- `updateTags` - Update tags for multiple images
- `updateCategory` - Update category for multiple images
- `archive` - Archive multiple images

**Example:**
```typescript
const [batchOperation, { isLoading }] = useEnhancedBatchGalleryOperationMutation()

// Batch update tags
await batchOperation({
  operation: 'updateTags',
  imageIds: ['img1', 'img2', 'img3'],
  data: { tags: ['featured', 'awesome'] },
})
```

### **Gallery Statistics**

#### `useGetEnhancedGalleryStatsQuery()`

Get comprehensive gallery statistics with caching.

**Returns:**
```typescript
interface GalleryStats {
  totalImages: number
  totalCategories: number
  popularCategories: string[]
  recentUploads: number
  topTags: string[]
  averageRating: number
}
```

## ❤️ Wishlist API

### **Enhanced Wishlist Query**

#### `useEnhancedWishlistQueryQuery(params, options?)`

Advanced wishlist management with LEGO-specific features and price tracking.

**Parameters:**
```typescript
interface EnhancedWishlistParams {
  // Basic filters
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  category?: string
  tags?: string[]
  
  // LEGO-specific filters
  themes?: string[]
  setNumbers?: string[]
  minifigures?: string[]
  availability?: ('available' | 'retired' | 'upcoming')[]
  condition?: ('new' | 'used' | 'sealed')[]
  
  // Advanced wishlist features
  priorityLevels?: ('low' | 'medium' | 'high' | 'urgent')[]
  wishlistCategories?: string[]
  priceAlerts?: boolean
  giftIdeas?: boolean
  seasonalItems?: ('holiday' | 'birthday' | 'anniversary')[]
  
  // Status filters
  isPurchased?: boolean
  isWatching?: boolean
  hasNotes?: boolean
  hasEstimatedCost?: boolean
  
  // Price and cost filtering
  costRange?: { min?: number, max?: number }
  partCountRange?: { min?: number, max?: number }
  
  // Performance options
  includeMetadata?: boolean
  includePriceHistory?: boolean
  includeAvailability?: boolean
  cacheStrategy?: 'short' | 'medium' | 'long' | 'persistent'
  enableBatchLoading?: boolean
  prefetchRelated?: boolean
}
```

**Example:**
```typescript
const { data, isLoading } = useEnhancedWishlistQueryQuery({
  priorityLevels: ['high', 'urgent'],
  themes: ['Technic', 'Architecture'],
  priceAlerts: true,
  costRange: { min: 50, max: 500 },
  cacheStrategy: 'short',
  includePriceHistory: true,
})
```

### **Price Tracking**

#### `useGetEnhancedPriceEstimatesQuery(itemIds)`

Get price estimates and history for wishlist items.

**Parameters:**
- `itemIds: string[]` - Array of item IDs to get price estimates for

**Returns:**
```typescript
interface PriceEstimates {
  totalValue: number
  averagePrice: number
  priceHistory: Array<{ date: string, price: number }>
  priceAlerts: Array<{ itemId: string, threshold: number, enabled: boolean }>
}
```

#### `useManagePriceAlertsMutation()`

Manage price alerts for wishlist items.

**Operations:**
- `enable` - Enable price alerts
- `disable` - Disable price alerts
- `update` - Update alert threshold

**Example:**
```typescript
const [managePriceAlerts] = useManagePriceAlertsMutation()

// Enable price alert
await managePriceAlerts({
  itemIds: ['item1', 'item2'],
  operation: 'enable',
  alertThreshold: 150,
})
```

### **Batch Wishlist Operations**

#### `useEnhancedBatchWishlistOperationMutation()`

Perform batch operations on multiple wishlist items.

**Operations:**
- `delete` - Delete multiple items
- `updatePriority` - Update priority for multiple items
- `updateCategory` - Update category for multiple items
- `archive` - Archive multiple items

**Example:**
```typescript
const [batchOperation] = useEnhancedBatchWishlistOperationMutation()

// Batch update priority
await batchOperation({
  operation: 'updatePriority',
  itemIds: ['item1', 'item2'],
  data: { priority: 'high' },
})
```

## 🔐 Authentication

### **Cognito Integration**

#### `initializeCognitoTokenManager(tokens)`

Initialize the Cognito token manager with user tokens.

**Parameters:**
```typescript
interface CognitoTokens {
  accessToken: string
  refreshToken: string
  idToken: string
}
```

**Example:**
```typescript
import { initializeCognitoTokenManager } from '@repo/api-client/auth/cognito-integration'

initializeCognitoTokenManager({
  accessToken: user.accessToken,
  refreshToken: user.refreshToken,
  idToken: user.idToken,
})
```

#### `getCognitoAuthToken()`

Get the current authentication token (automatically refreshed if needed).

**Returns:** `string | null` - Current valid access token or null if not authenticated

**Example:**
```typescript
import { getCognitoAuthToken } from '@repo/api-client/auth/cognito-integration'

const token = getCognitoAuthToken()
if (token) {
  // User is authenticated
}
```

## 📊 Performance Monitoring

### **Performance Monitor**

#### `performanceMonitor.trackComponentRender(componentId, duration)`

Track component render performance.

**Parameters:**
- `componentId: string` - Unique identifier for the component/operation
- `duration: number` - Duration in milliseconds

**Example:**
```typescript
import { performanceMonitor } from '@repo/api-client/lib/performance'

const startTime = performance.now()
// ... some operation
const duration = performance.now() - startTime

performanceMonitor.trackComponentRender('gallery-search', duration)
```

## 📝 Types

### **Common Response Types**

#### `ServerlessResponse<T>`
```typescript
interface ServerlessResponse<T> {
  success: boolean
  data: T
  error?: string
  performance?: {
    duration: number
    cacheHit: boolean
    source: 'cache' | 'network'
  }
}
```

#### `GallerySearchResponse`
```typescript
interface GallerySearchResponse extends ServerlessResponse<{
  images: GalleryImage[]
  totalCount: number
  categories: string[]
  popularTags: string[]
}> {
  pagination: {
    page: number
    limit: number
    hasMore: boolean
    prefetchedPages?: number[]
  }
}
```

#### `WishlistResponse`
```typescript
interface WishlistResponse extends ServerlessResponse<{
  items: WishlistItem[]
  totalCount: number
  totalValue: number
  highPriorityCount: number
}> {
  pagination: {
    page: number
    limit: number
    hasMore: boolean
  }
}
```

### **Entity Types**

#### `GalleryImage`
```typescript
interface GalleryImage {
  id: string
  title: string
  description?: string
  url: string
  thumbnailUrl?: string
  category: string
  tags: string[]
  themes?: string[]
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  pieceCount?: number
  hasInstructions: boolean
  isOriginalDesign: boolean
  isFeatured: boolean
  createdAt: string
  updatedAt: string
}
```

#### `WishlistItem`
```typescript
interface WishlistItem {
  id: string
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category: string
  tags: string[]
  themes?: string[]
  setNumbers?: string[]
  estimatedCost?: number
  actualCost?: number
  isPurchased: boolean
  isWatching: boolean
  hasNotes: boolean
  priceAlerts: boolean
  giftIdea: boolean
  seasonalItems?: string[]
  createdAt: string
  updatedAt: string
}
```
