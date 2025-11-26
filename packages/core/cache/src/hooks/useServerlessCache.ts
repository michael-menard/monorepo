/**
 * React Hook for Serverless Cache Management
 * Provides easy access to serverless caching capabilities in React components
 */

import { useCallback, useEffect, useState, useRef } from 'react'
import { createLogger } from '@repo/logger'
import {
  getServerlessCacheManager,
  type ServerlessCacheManagerConfig,
  type ServerlessCacheManager,
} from '../utils/serverlessCacheManager'
import type { BatchOperation, BatchResult } from '../utils/serverlessCache'

const logger = createLogger('cache:hook')

export interface UseServerlessCacheOptions {
  // Cache strategy
  strategy?: 'memory' | 'storage' | 'hybrid'

  // Auto-refresh options
  enableAutoRefresh?: boolean
  refreshInterval?: number

  // Performance monitoring
  enablePerformanceTracking?: boolean

  // Error handling
  onError?: (error: Error) => void
  onSuccess?: (operation: string, key: string) => void
}

export interface UseServerlessCacheReturn {
  // Basic operations
  get: <T = unknown>(key: string) => Promise<T | null>
  set: (key: string, data: unknown, maxAge?: number) => Promise<void>
  delete: (key: string) => void
  clear: () => void

  // Batch operations
  batch: (operations: BatchOperation[]) => Promise<BatchResult[]>

  // Cache state
  stats: ReturnType<ServerlessCacheManager['getStats']> | null
  isLoading: boolean
  error: Error | null

  // Utilities
  refresh: () => void
  preload: (keys: string[]) => Promise<void>
}

/**
 * Hook for serverless cache management
 */
export function useServerlessCache(
  config?: ServerlessCacheManagerConfig,
  options: UseServerlessCacheOptions = {},
): UseServerlessCacheReturn {
  const {
    strategy = 'hybrid',
    enableAutoRefresh = false,
    refreshInterval = 60000, // 1 minute
    enablePerformanceTracking = true,
    onError,
    onSuccess,
  } = options

  const [stats, setStats] = useState<ReturnType<ServerlessCacheManager['getStats']> | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const cacheManagerRef = useRef<ServerlessCacheManager | null>(null)
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize cache manager
  useEffect(() => {
    try {
      cacheManagerRef.current = getServerlessCacheManager(config)
      setStats(cacheManagerRef.current.getStats())
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      if (onError) {
        onError(error)
      }
      logger.error('Failed to initialize cache manager', error)
    }
  }, [config, onError])

  // Auto-refresh stats
  useEffect(() => {
    if (enableAutoRefresh && cacheManagerRef.current) {
      refreshTimerRef.current = setInterval(() => {
        if (cacheManagerRef.current) {
          setStats(cacheManagerRef.current.getStats())
        }
      }, refreshInterval)

      return () => {
        if (refreshTimerRef.current) {
          clearInterval(refreshTimerRef.current)
        }
      }
    }
  }, [enableAutoRefresh, refreshInterval])

  // Get value from cache
  const get = useCallback(
    async <T = unknown>(key: string): Promise<T | null> => {
      if (!cacheManagerRef.current) {
        throw new Error('Cache manager not initialized')
      }

      setIsLoading(true)
      setError(null)

      try {
        const startTime = enablePerformanceTracking ? performance.now() : 0
        const result = await cacheManagerRef.current.get<T>(key, strategy)

        if (enablePerformanceTracking) {
          const duration = performance.now() - startTime
          logger.debug('Cache get operation completed', undefined, {
            key,
            duration,
            hit: result !== null,
          })
        }

        if (onSuccess) {
          onSuccess('get', key)
        }

        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        if (onError) {
          onError(error)
        }
        logger.error('Cache get operation failed', error, { key })
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [strategy, enablePerformanceTracking, onError, onSuccess],
  )

  // Set value in cache
  const set = useCallback(
    async (key: string, data: unknown, maxAge?: number): Promise<void> => {
      if (!cacheManagerRef.current) {
        throw new Error('Cache manager not initialized')
      }

      setIsLoading(true)
      setError(null)

      try {
        const startTime = enablePerformanceTracking ? performance.now() : 0
        await cacheManagerRef.current.set(key, data, maxAge, strategy)

        if (enablePerformanceTracking) {
          const duration = performance.now() - startTime
          logger.debug('Cache set operation completed', undefined, { key, duration })
        }

        if (onSuccess) {
          onSuccess('set', key)
        }

        // Update stats
        setStats(cacheManagerRef.current.getStats())
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        if (onError) {
          onError(error)
        }
        logger.error('Cache set operation failed', error, { key })
      } finally {
        setIsLoading(false)
      }
    },
    [strategy, enablePerformanceTracking, onError, onSuccess],
  )

  // Delete value from cache
  const deleteValue = useCallback(
    (key: string): void => {
      if (!cacheManagerRef.current) {
        throw new Error('Cache manager not initialized')
      }

      try {
        cacheManagerRef.current.delete(key)
        setStats(cacheManagerRef.current.getStats())

        if (onSuccess) {
          onSuccess('delete', key)
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        if (onError) {
          onError(error)
        }
        logger.error('Cache delete operation failed', error, { key })
      }
    },
    [onError, onSuccess],
  )

  // Clear all caches
  const clear = useCallback((): void => {
    if (!cacheManagerRef.current) {
      throw new Error('Cache manager not initialized')
    }

    try {
      cacheManagerRef.current.clear()
      setStats(cacheManagerRef.current.getStats())

      if (onSuccess) {
        onSuccess('clear', 'all')
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      if (onError) {
        onError(error)
      }
      logger.error('Cache clear operation failed', error)
    }
  }, [onError, onSuccess])

  // Batch operations
  const batch = useCallback(
    async (operations: BatchOperation[]): Promise<BatchResult[]> => {
      if (!cacheManagerRef.current) {
        throw new Error('Cache manager not initialized')
      }

      setIsLoading(true)
      setError(null)

      try {
        const startTime = enablePerformanceTracking ? performance.now() : 0
        const results = await cacheManagerRef.current.globalBatch(operations)

        if (enablePerformanceTracking) {
          const duration = performance.now() - startTime
          logger.debug('Cache batch operation completed', undefined, {
            operationCount: operations.length,
            duration,
            successCount: results.filter(r => r.success).length,
          })
        }

        // Update stats
        setStats(cacheManagerRef.current.getStats())

        return results
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        if (onError) {
          onError(error)
        }
        logger.error('Cache batch operation failed', error, { operationCount: operations.length })
        return []
      } finally {
        setIsLoading(false)
      }
    },
    [enablePerformanceTracking, onError],
  )

  // Refresh stats manually
  const refresh = useCallback((): void => {
    if (cacheManagerRef.current) {
      setStats(cacheManagerRef.current.getStats())
    }
  }, [])

  // Preload multiple keys
  const preload = useCallback(
    async (keys: string[]): Promise<void> => {
      if (!cacheManagerRef.current) {
        throw new Error('Cache manager not initialized')
      }

      setIsLoading(true)
      setError(null)

      try {
        const operations: BatchOperation[] = keys.map(key => ({
          type: 'get' as const,
          key,
        }))

        await batch(operations)

        logger.debug('Cache preload completed', undefined, { keyCount: keys.length })
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        if (onError) {
          onError(error)
        }
        logger.error('Cache preload failed', error, { keyCount: keys.length })
      } finally {
        setIsLoading(false)
      }
    },
    [batch, onError],
  )

  return {
    get,
    set,
    delete: deleteValue,
    clear,
    batch,
    stats,
    isLoading,
    error,
    refresh,
    preload,
  }
}

/**
 * Hook for simple cache operations with automatic key management
 */
export function useServerlessCacheValue<T = unknown>(
  key: string,
  defaultValue?: T,
  options: UseServerlessCacheOptions & { maxAge?: number } = {},
): {
  value: T | null
  setValue: (value: T) => Promise<void>
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
} {
  const { get, set } = useServerlessCache(undefined, options)
  const [value, setValue] = useState<T | null>(defaultValue || null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Load initial value
  useEffect(() => {
    const loadValue = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const cachedValue = await get<T>(key)
        setValue(cachedValue || defaultValue || null)
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        setValue(defaultValue || null)
      } finally {
        setIsLoading(false)
      }
    }

    loadValue()
  }, [key, defaultValue, get])

  // Set value and update cache
  const setValueAndCache = useCallback(
    async (newValue: T): Promise<void> => {
      setIsLoading(true)
      setError(null)

      try {
        await set(key, newValue, options.maxAge)
        setValue(newValue)
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
      } finally {
        setIsLoading(false)
      }
    },
    [key, set, options.maxAge],
  )

  // Refresh value from cache
  const refresh = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      const cachedValue = await get<T>(key)
      setValue(cachedValue || defaultValue || null)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
    } finally {
      setIsLoading(false)
    }
  }, [key, get, defaultValue])

  return {
    value,
    setValue: setValueAndCache,
    isLoading,
    error,
    refresh,
  }
}
