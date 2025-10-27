import React, { useState } from 'react'
import { CacheStatus, CachedImage, ImageGallery } from '@repo/cache'
import { CacheManager } from '../../components/CacheManager'
import { useCacheManager } from '../../hooks/useCacheManager'

const demoImages = [
  {
    id: '1',
    src: 'https://picsum.photos/400/300?random=1',
    alt: 'Demo Image 1',
  },
  {
    id: '2',
    src: 'https://picsum.photos/400/300?random=2',
    alt: 'Demo Image 2',
  },
  {
    id: '3',
    src: 'https://picsum.photos/400/300?random=3',
    alt: 'Demo Image 3',
  },
  {
    id: '4',
    src: 'https://picsum.photos/400/300?random=4',
    alt: 'Demo Image 4',
  },
  {
    id: '5',
    src: 'https://picsum.photos/400/300?random=5',
    alt: 'Demo Image 5',
  },
  {
    id: '6',
    src: 'https://picsum.photos/400/300?random=6',
    alt: 'Demo Image 6',
  },
]

export const CacheDemoPage: React.FC = () => {
  const { cacheData, getCachedData, clearAllCaches } = useCacheManager()
  const [cacheKey, setCacheKey] = useState('demo-key')
  const [cacheValue, setCacheValue] = useState('demo-value')
  const [cachedResult, setCachedResult] = useState<string | null>(null)

  const handleCacheData = () => {
    cacheData(cacheKey, cacheValue, 'memory', 60000) // 1 minute
    setCachedResult('Data cached successfully!')
  }

  const handleGetCachedData = () => {
    const result = getCachedData(cacheKey)
    setCachedResult(result ? `Retrieved: ${result}` : 'No cached data found')
  }

  const handleClearCache = async () => {
    await clearAllCaches()
    setCachedResult('All caches cleared!')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Cache Management Demo</h1>

      {/* Cache Manager */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Cache Statistics & Management</h2>
        <CacheManager />
      </div>

      {/* Manual Cache Operations */}
      <div className="mb-8 p-6 bg-gray-50 rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">Manual Cache Operations</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Cache Key:</label>
            <input
              type="text"
              value={cacheKey}
              onChange={e => setCacheKey(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Cache Value:</label>
            <input
              type="text"
              value={cacheValue}
              onChange={e => setCacheValue(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>

        <div className="flex space-x-4 mb-4">
          <button
            onClick={handleCacheData}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Cache Data
          </button>
          <button
            onClick={handleGetCachedData}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Get Cached Data
          </button>
          <button
            onClick={handleClearCache}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Clear All Caches
          </button>
        </div>

        {cachedResult ? (
          <div className="p-3 bg-blue-100 border border-blue-300 rounded">
            <strong>Result:</strong> {cachedResult}
          </div>
        ) : null}
      </div>

      {/* Image Caching Demo */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Image Caching Demo</h2>

        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Single Cached Image</h3>
          <div className="w-64 h-48 border rounded overflow-hidden">
            <CachedImage
              src="https://picsum.photos/400/300?random=100"
              alt="Single cached image"
              className="w-full h-full object-cover"
              fallback="/placeholder-image.jpg"
            />
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Image Gallery (Preloaded)</h3>
          <ImageGallery
            images={demoImages}
            onImageLoad={id => console.log(`Image ${id} loaded`)}
            onImageError={id => console.log(`Image ${id} failed to load`)}
          />
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Image Cache Status</h3>
          <CacheStatus />
        </div>
      </div>

      {/* Performance Tips */}
      <div className="p-6 bg-yellow-50 rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">Performance Tips</h2>
        <ul className="space-y-2 text-sm">
          <li>
            • <strong>Memory Cache:</strong> Fastest but limited in size, perfect for frequently
            accessed data
          </li>
          <li>
            • <strong>LocalStorage Cache:</strong> Persistent across sessions, good for user
            preferences
          </li>
          <li>
            • <strong>SessionStorage Cache:</strong> Cleared when tab closes, good for
            session-specific data
          </li>
          <li>
            • <strong>Image Cache:</strong> Uses Cache API and localStorage for optimal performance
          </li>
          <li>
            • <strong>RTK Query:</strong> Automatically handles API response caching with
            configurable strategies
          </li>
          <li>
            • <strong>Cache Monitoring:</strong> Use the CacheManager component to monitor
            performance
          </li>
        </ul>
      </div>
    </div>
  )
}
