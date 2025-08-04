import React from 'react'
import { useCacheManager } from '../hooks/useCacheManager.js'

/**
 * Cache management component for monitoring and controlling all caches
 */
export const CacheManager: React.FC = () => {
  const { stats, clearAllCaches, cleanupExpired, updateStats } = useCacheManager()

  if (!stats) {
    return (
      <div className="p-4 bg-gray-100 rounded-lg">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
          <div className="h-3 bg-gray-300 rounded w-1/2 mb-1"></div>
          <div className="h-3 bg-gray-300 rounded w-1/3"></div>
        </div>
      </div>
    )
  }

  const totalHits = stats.memory.hits + stats.localStorage.hits + stats.sessionStorage.hits
  const totalMisses = stats.memory.misses + stats.localStorage.misses + stats.sessionStorage.misses
  const totalHitRate = totalHits + totalMisses > 0 ? totalHits / (totalHits + totalMisses) : 0

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Cache Management</h2>
        <div className="flex space-x-2">
          <button
            onClick={cleanupExpired}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
          >
            Cleanup Expired
          </button>
          <button
            onClick={clearAllCaches}
            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
          >
            Clear All
          </button>
          <button
            onClick={updateStats}
            className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {(totalHitRate * 100).toFixed(1)}%
          </div>
          <div className="text-sm text-blue-800">Overall Hit Rate</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {stats.memory.size + stats.localStorage.size + stats.sessionStorage.size}
          </div>
          <div className="text-sm text-green-800">Total Cached Items</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {stats.image?.totalEntries || 0}
          </div>
          <div className="text-sm text-purple-800">Cached Images</div>
        </div>
      </div>

      {/* Detailed Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Memory Cache */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Memory Cache</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Size:</span>
              <span>{stats.memory.size} / {stats.memory.maxSize}</span>
            </div>
            <div className="flex justify-between">
              <span>Hit Rate:</span>
              <span>{(stats.memory.hitRate * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Hits:</span>
              <span>{stats.memory.hits}</span>
            </div>
            <div className="flex justify-between">
              <span>Misses:</span>
              <span>{stats.memory.misses}</span>
            </div>
            <div className="flex justify-between">
              <span>Average Age:</span>
              <span>{(stats.memory.averageAge / 1000).toFixed(1)}s</span>
            </div>
          </div>
        </div>

        {/* LocalStorage Cache */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">LocalStorage Cache</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Size:</span>
              <span>{stats.localStorage.size} / {stats.localStorage.maxSize}</span>
            </div>
            <div className="flex justify-between">
              <span>Hit Rate:</span>
              <span>{(stats.localStorage.hitRate * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Hits:</span>
              <span>{stats.localStorage.hits}</span>
            </div>
            <div className="flex justify-between">
              <span>Misses:</span>
              <span>{stats.localStorage.misses}</span>
            </div>
            <div className="flex justify-between">
              <span>Average Age:</span>
              <span>{(stats.localStorage.averageAge / 1000).toFixed(1)}s</span>
            </div>
          </div>
        </div>

        {/* SessionStorage Cache */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">SessionStorage Cache</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Size:</span>
              <span>{stats.sessionStorage.size} / {stats.sessionStorage.maxSize}</span>
            </div>
            <div className="flex justify-between">
              <span>Hit Rate:</span>
              <span>{(stats.sessionStorage.hitRate * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Hits:</span>
              <span>{stats.sessionStorage.hits}</span>
            </div>
            <div className="flex justify-between">
              <span>Misses:</span>
              <span>{stats.sessionStorage.misses}</span>
            </div>
            <div className="flex justify-between">
              <span>Average Age:</span>
              <span>{(stats.sessionStorage.averageAge / 1000).toFixed(1)}s</span>
            </div>
          </div>
        </div>

        {/* Image Cache */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Image Cache</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Cache API:</span>
              <span>{stats.image?.cacheApiSize || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>LocalStorage:</span>
              <span>{stats.image?.localStorageSize || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Total:</span>
              <span>{stats.image?.totalEntries || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cache Performance Tips */}
      <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
        <h4 className="text-sm font-semibold text-yellow-800 mb-2">Performance Tips</h4>
        <ul className="text-xs text-yellow-700 space-y-1">
          <li>• Memory cache is fastest but limited in size</li>
          <li>• LocalStorage persists across sessions but is slower</li>
          <li>• SessionStorage is cleared when tab closes</li>
          <li>• Image cache uses both Cache API and localStorage</li>
          <li>• RTK Query handles API response caching automatically</li>
        </ul>
      </div>
    </div>
  )
} 