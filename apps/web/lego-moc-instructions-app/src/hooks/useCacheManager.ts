import { useCallback, useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { 
   
  MemoryCache, 
  StorageCache,
  useImageCache 
} from '@repo/cache'
import type {CacheStats} from '@repo/cache';

/**
 * Hook for managing all caching strategies in the application
 */
export function useCacheManager() {
  const dispatch = useDispatch()
  const { getStats: getImageStats, clearCache: clearImageCache } = useImageCache()
  
  const [memoryCache] = useState(() => new MemoryCache({
    maxSize: 100,
    maxAge: 5 * 60 * 1000, // 5 minutes
  }))
  
  const [localStorageCache] = useState(() => new StorageCache({
    storage: 'localStorage',
    maxSize: 50,
    maxAge: 30 * 60 * 1000, // 30 minutes
    keyPrefix: 'app_cache_',
  }))
  
  const [sessionStorageCache] = useState(() => new StorageCache({
    storage: 'sessionStorage',
    maxSize: 25,
    maxAge: 10 * 60 * 1000, // 10 minutes
    keyPrefix: 'session_cache_',
  }))

  const [stats, setStats] = useState<{
    memory: CacheStats
    localStorage: CacheStats
    sessionStorage: CacheStats
    image: {
      cacheApiSize: number
      localStorageSize: number
      totalEntries: number
    } | null
  } | null>(null)

  // Update statistics
  const updateStats = useCallback(async () => {
    const imageStats = await getImageStats()
    setStats({
      memory: memoryCache.getStats(),
      localStorage: localStorageCache.getStats(),
      sessionStorage: sessionStorageCache.getStats(),
      image: imageStats,
    })
  }, [memoryCache, localStorageCache, sessionStorageCache, getImageStats])

  // Clear all caches
  const clearAllCaches = useCallback(async () => {
    memoryCache.clear()
    localStorageCache.clear()
    sessionStorageCache.clear()
    await clearImageCache()
    
    // Clear RTK Query cache
    dispatch({ type: 'api/resetApiState' })
    
    await updateStats()
  }, [memoryCache, localStorageCache, sessionStorageCache, clearImageCache, dispatch, updateStats])

  // Clean up expired entries
  const cleanupExpired = useCallback(async () => {
    const memoryCleaned = memoryCache.cleanup()
    const localStorageCleaned = localStorageCache.cleanup()
    const sessionStorageCleaned = sessionStorageCache.cleanup()
    
    await updateStats()
    
    return {
      memory: memoryCleaned,
      localStorage: localStorageCleaned,
      sessionStorage: sessionStorageCleaned,
    }
  }, [memoryCache, localStorageCache, sessionStorageCache, updateStats])

  // Cache data with appropriate strategy
  const cacheData = useCallback((
    key: string, 
    data: unknown, 
    strategy: 'memory' | 'localStorage' | 'sessionStorage' = 'memory',
    maxAge?: number
  ) => {
    switch (strategy) {
      case 'memory':
        memoryCache.set(key, data, maxAge)
        break
      case 'localStorage':
        localStorageCache.set(key, data, maxAge)
        break
      case 'sessionStorage':
        sessionStorageCache.set(key, data, maxAge)
        break
    }
  }, [memoryCache, localStorageCache, sessionStorageCache])

  // Get cached data
  const getCachedData = useCallback(<T = unknown>(
    key: string, 
    strategy: 'memory' | 'localStorage' | 'sessionStorage' = 'memory'
  ): T | null => {
    switch (strategy) {
      case 'memory':
        return memoryCache.get<T>(key)
      case 'localStorage':
        return localStorageCache.get<T>(key)
      case 'sessionStorage':
        return sessionStorageCache.get<T>(key)
      default:
        return null
    }
  }, [memoryCache, localStorageCache, sessionStorageCache])

  // Check if data is cached
  const isCached = useCallback((
    key: string, 
    strategy: 'memory' | 'localStorage' | 'sessionStorage' = 'memory'
  ): boolean => {
    switch (strategy) {
      case 'memory':
        return memoryCache.has(key)
      case 'localStorage':
        return localStorageCache.has(key)
      case 'sessionStorage':
        return sessionStorageCache.has(key)
      default:
        return false
    }
  }, [memoryCache, localStorageCache, sessionStorageCache])

  // Delete cached data
  const deleteCachedData = useCallback((
    key: string, 
    strategy: 'memory' | 'localStorage' | 'sessionStorage' = 'memory'
  ): boolean => {
    switch (strategy) {
      case 'memory':
        return memoryCache.delete(key)
      case 'localStorage':
        return localStorageCache.delete(key)
      case 'sessionStorage':
        return sessionStorageCache.delete(key)
      default:
        return false
    }
  }, [memoryCache, localStorageCache, sessionStorageCache])

  // Update stats on mount and periodically
  useEffect(() => {
    updateStats()
    
    const interval = setInterval(updateStats, 30000) // Update every 30 seconds
    
    return () => clearInterval(interval)
  }, [updateStats])

  return {
    // Cache operations
    cacheData,
    getCachedData,
    isCached,
    deleteCachedData,
    
    // Cache management
    clearAllCaches,
    cleanupExpired,
    updateStats,
    
    // Statistics
    stats,
    
    // Individual cache instances (for advanced usage)
    memoryCache,
    localStorageCache,
    sessionStorageCache,
  }
} 