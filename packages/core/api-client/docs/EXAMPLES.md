# Usage Examples: Enhanced Serverless API Client

Real-world examples showing how to use the enhanced serverless API client effectively.

## 📖 Table of Contents

- [Basic Setup](#basic-setup)
- [Gallery Examples](#gallery-examples)
- [Wishlist Examples](#wishlist-examples)
- [Authentication Examples](#authentication-examples)
- [Performance Examples](#performance-examples)
- [Advanced Patterns](#advanced-patterns)

## 🚀 Basic Setup

### **Complete App Setup**

```typescript
// store/index.ts
import { configureStore } from '@reduxjs/toolkit'
import { enhancedGalleryApi, enhancedWishlistApi } from '@repo/api-client/rtk/gallery-api'

export const store = configureStore({
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

// App.tsx
import { Provider } from 'react-redux'
import { store } from './store'
import { initializeCognitoTokenManager } from '@repo/api-client/auth/cognito-integration'

// Initialize authentication
initializeCognitoTokenManager({
  accessToken: process.env.REACT_APP_ACCESS_TOKEN!,
  refreshToken: process.env.REACT_APP_REFRESH_TOKEN!,
  idToken: process.env.REACT_APP_ID_TOKEN!,
})

function App() {
  return (
    <Provider store={store}>
      <YourAppComponents />
    </Provider>
  )
}
```

## 🖼️ Gallery Examples

### **Example 1: Advanced LEGO Set Search**

```typescript
import { useEnhancedGallerySearchQuery } from '@repo/api-client/rtk/gallery-api'

function LegoSetSearch() {
  const [searchParams, setSearchParams] = useState({
    query: '',
    themes: [] as string[],
    difficulty: [] as string[],
    pieceCount: { min: 0, max: 10000 },
  })

  const {
    data,
    isLoading,
    isFetching,
    error,
  } = useEnhancedGallerySearchQuery({
    ...searchParams,
    // Performance optimizations
    cacheStrategy: 'medium',
    prefetchNext: true,
    enableBatchLoading: true,
    // Enhanced features
    includeMetadata: true,
    includeThumbnails: true,
    sortBy: 'popularity',
    sortOrder: 'desc',
  })

  const handleThemeFilter = (theme: string) => {
    setSearchParams(prev => ({
      ...prev,
      themes: prev.themes.includes(theme)
        ? prev.themes.filter(t => t !== theme)
        : [...prev.themes, theme]
    }))
  }

  if (isLoading) return <div>Loading LEGO sets...</div>
  if (error) return <div>Error loading sets: {error.message}</div>

  return (
    <div>
      <h2>LEGO Set Gallery ({data?.data.totalCount} sets)</h2>
      
      {/* Theme filters */}
      <div className="filters">
        {['Technic', 'Creator Expert', 'Architecture', 'City'].map(theme => (
          <button
            key={theme}
            onClick={() => handleThemeFilter(theme)}
            className={searchParams.themes.includes(theme) ? 'active' : ''}
          >
            {theme}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="gallery-grid">
        {data?.data.images.map(image => (
          <div key={image.id} className="gallery-item">
            <img src={image.thumbnailUrl} alt={image.title} />
            <h3>{image.title}</h3>
            <p>Pieces: {image.pieceCount}</p>
            <p>Difficulty: {image.difficulty}</p>
            <div className="themes">
              {image.themes?.map(theme => (
                <span key={theme} className="theme-tag">{theme}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Performance info */}
      {data?.performance && (
        <div className="performance-info">
          <small>
            Loaded in {data.performance.duration}ms 
            {data.performance.cacheHit ? ' (cached)' : ' (network)'}
          </small>
        </div>
      )}
    </div>
  )
}
```

### **Example 2: Batch Gallery Operations**

```typescript
import { useEnhancedBatchGalleryOperationMutation } from '@repo/api-client/rtk/gallery-api'

function GalleryManager() {
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [batchOperation, { isLoading }] = useEnhancedBatchGalleryOperationMutation()

  const handleBatchTag = async (tags: string[]) => {
    try {
      await batchOperation({
        operation: 'updateTags',
        imageIds: selectedImages,
        data: { tags },
      }).unwrap()
      
      setSelectedImages([])
      // Show success message
    } catch (error) {
      // Handle error
    }
  }

  const handleBatchDelete = async () => {
    if (!confirm(`Delete ${selectedImages.length} images?`)) return

    try {
      await batchOperation({
        operation: 'delete',
        imageIds: selectedImages,
      }).unwrap()
      
      setSelectedImages([])
      // Show success message
    } catch (error) {
      // Handle error
    }
  }

  return (
    <div>
      <div className="batch-actions">
        <button 
          onClick={() => handleBatchTag(['featured'])}
          disabled={selectedImages.length === 0 || isLoading}
        >
          Mark as Featured ({selectedImages.length})
        </button>
        
        <button 
          onClick={handleBatchDelete}
          disabled={selectedImages.length === 0 || isLoading}
          className="danger"
        >
          Delete Selected ({selectedImages.length})
        </button>
      </div>

      {/* Gallery with selection */}
      <GalleryGrid 
        selectedImages={selectedImages}
        onSelectionChange={setSelectedImages}
      />
    </div>
  )
}
```

## ❤️ Wishlist Examples

### **Example 3: Smart Wishlist with Price Tracking**

```typescript
import { 
  useEnhancedWishlistQueryQuery,
  useGetEnhancedPriceEstimatesQuery,
  useManagePriceAlertsMutation 
} from '@repo/api-client/rtk/wishlist-api'

function SmartWishlist() {
  const [filters, setFilters] = useState({
    priorityLevels: ['high', 'urgent'] as const,
    priceAlerts: true,
    themes: ['Technic', 'Architecture'],
  })

  // Get wishlist items
  const {
    data: wishlistData,
    isLoading: isWishlistLoading,
  } = useEnhancedWishlistQueryQuery({
    ...filters,
    cacheStrategy: 'short', // Fresh data for price-sensitive info
    includePriceHistory: true,
    includeAvailability: true,
  })

  // Get price estimates for all items
  const itemIds = wishlistData?.data.items.map(item => item.id) || []
  const {
    data: priceData,
    isLoading: isPriceLoading,
  } = useGetEnhancedPriceEstimatesQuery(itemIds, {
    skip: itemIds.length === 0,
    refetchOnMountOrArgChange: 60, // Refetch every minute
  })

  const [managePriceAlerts] = useManagePriceAlertsMutation()

  const handleEnablePriceAlert = async (itemId: string, threshold: number) => {
    try {
      await managePriceAlerts({
        itemIds: [itemId],
        operation: 'enable',
        alertThreshold: threshold,
      }).unwrap()
    } catch (error) {
      console.error('Failed to enable price alert:', error)
    }
  }

  if (isWishlistLoading) return <div>Loading wishlist...</div>

  return (
    <div className="smart-wishlist">
      <div className="wishlist-summary">
        <h2>My LEGO Wishlist</h2>
        <div className="stats">
          <div>Total Items: {wishlistData?.data.totalCount}</div>
          <div>Total Value: ${wishlistData?.data.totalValue?.toFixed(2)}</div>
          <div>High Priority: {wishlistData?.data.highPriorityCount}</div>
          <div>Average Price: ${priceData?.data.averagePrice?.toFixed(2)}</div>
        </div>
      </div>

      <div className="wishlist-items">
        {wishlistData?.data.items.map(item => (
          <div key={item.id} className="wishlist-item">
            <h3>{item.title}</h3>
            <div className="item-details">
              <span className={`priority priority-${item.priority}`}>
                {item.priority.toUpperCase()}
              </span>
              {item.themes?.map(theme => (
                <span key={theme} className="theme">{theme}</span>
              ))}
            </div>
            
            <div className="price-info">
              <div>Estimated: ${item.estimatedCost?.toFixed(2)}</div>
              {item.priceAlerts ? (
                <span className="price-alert-active">🔔 Alert Active</span>
              ) : (
                <button 
                  onClick={() => handleEnablePriceAlert(item.id, item.estimatedCost! * 0.8)}
                  className="enable-alert"
                >
                  Enable Price Alert
                </button>
              )}
            </div>

            {item.isWatching && (
              <div className="watching">👀 Watching for price drops</div>
            )}
          </div>
        ))}
      </div>

      {/* Price history chart */}
      {priceData?.data.priceHistory && (
        <div className="price-history">
          <h3>Price History</h3>
          <PriceChart data={priceData.data.priceHistory} />
        </div>
      )}
    </div>
  )
}
```

### **Example 4: Wishlist Categories and Organization**

```typescript
function OrganizedWishlist() {
  const [activeCategory, setActiveCategory] = useState<string>('all')
  
  const {
    data: wishlistData,
    isLoading,
  } = useEnhancedWishlistQueryQuery({
    wishlistCategories: activeCategory === 'all' ? undefined : [activeCategory],
    sortBy: 'priority',
    sortOrder: 'desc',
    includeMetadata: true,
  })

  const categories = [
    { id: 'all', name: 'All Items', icon: '📋' },
    { id: 'birthday-gifts', name: 'Birthday Gifts', icon: '🎂' },
    { id: 'holiday-gifts', name: 'Holiday Gifts', icon: '🎄' },
    { id: 'personal-collection', name: 'Personal Collection', icon: '🏠' },
    { id: 'investment', name: 'Investment Sets', icon: '💰' },
  ]

  const getCategoryStats = (categoryId: string) => {
    if (!wishlistData?.data.items) return { count: 0, value: 0 }
    
    const items = categoryId === 'all' 
      ? wishlistData.data.items
      : wishlistData.data.items.filter(item => 
          item.wishlistCategories?.includes(categoryId)
        )
    
    return {
      count: items.length,
      value: items.reduce((sum, item) => sum + (item.estimatedCost || 0), 0)
    }
  }

  return (
    <div className="organized-wishlist">
      <div className="category-tabs">
        {categories.map(category => {
          const stats = getCategoryStats(category.id)
          return (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={activeCategory === category.id ? 'active' : ''}
            >
              <span className="icon">{category.icon}</span>
              <span className="name">{category.name}</span>
              <span className="stats">
                {stats.count} items • ${stats.value.toFixed(0)}
              </span>
            </button>
          )
        })}
      </div>

      <div className="wishlist-content">
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <WishlistGrid 
            items={wishlistData?.data.items || []}
            category={activeCategory}
          />
        )}
      </div>
    </div>
  )
}
```
