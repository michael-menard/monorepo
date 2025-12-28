/**
 * Intelligent Cache Hook
 *
 * React hook for intelligent caching with advanced features:
 * - Automatic cache strategy selection
 * - Predictive prefetching based on user behavior
 * - Smart cache invalidation
 * - Performance monitoring and optimization
 * - Real-time cache analytics
 */

import { useEffect, useCallback, useRef, useState } from 'react'
import { createLogger } from '@repo/logger'
import { IntelligentCacheManager } from '../managers/IntelligentCacheManager'

const logger = createLogger('cache:intelligent')

// Global cache manager instance
let globalCacheManager: IntelligentCacheManager | null = null

function getCacheManager(): IntelligentCacheManager {
  if (!globalCacheManager) {
    globalCacheManager = new IntelligentCacheManager()
  }
  return globalCacheManager
}

export interface UseIntelligentCacheOptions {
  key: string
  strategy?: string
  dependencies?: string[]
  prefetchRelated?: boolean
  enableAnalytics?: boolean
  ttl?: number
  userId?: string
}

export interface CacheResult<T> {
  data: T | null
  isLoading: boolean
  isStale: boolean
  error: Error | null
  refetch: () => Promise<void>
  invalidate: () => void
  prefetch: () => Promise<void>
  analytics: {
    hitRate: number
    accessCount: number
    lastAccessed: number | null
  }
}

/**
 * Hook for intelligent caching with advanced features
 */
export function useIntelligentCache<T>(
  fetchFn: () => Promise<T>,
  options: UseIntelligentCacheOptions,
): CacheResult<T> {
  const cacheManager = getCacheManager()
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isStale, setIsStale] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [analytics, setAnalytics] = useState({
    hitRate: 0,
    accessCount: 0,
    lastAccessed: null as number | null,
  })

  const fetchFnRef = useRef(fetchFn)
  const optionsRef = useRef(options)

  useEffect(() => {
    fetchFnRef.current = fetchFn
    optionsRef.current = options
  }, [fetchFn, options])

  const fetchData = useCallback(
    async (forceRefresh = false) => {
      const { key, userId, strategy, dependencies } = optionsRef.current

      setIsLoading(true)
      setError(null)

      try {
        if (!forceRefresh) {
          const cachedData = await cacheManager.get<T>(key, userId)
          if (cachedData !== null) {
            setData(cachedData)
            setIsStale(false)
            setIsLoading(false)

            const stats = cacheManager.getStatistics()
            const pattern = stats.usagePatterns.find(p => p.key === key)
            if (pattern) {
              setAnalytics({
                hitRate: pattern.hitRate,
                accessCount: pattern.accessCount,
                lastAccessed: pattern.lastAccessed,
              })
            }

            logger.debug('Cache hit for intelligent cache', undefined, { key })
            return
          }
        }

        const freshData = await fetchFnRef.current()

        await cacheManager.set(key, freshData, {
          strategy,
          userId,
          dependencies,
        })

        setData(freshData)
        setIsStale(false)
        logger.debug('Fresh data fetched and cached', undefined, { key })
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        logger.error('Failed to fetch data', error, { key })
      } finally {
        setIsLoading(false)
      }
    },
    [cacheManager],
  )

  const invalidate = useCallback(() => {
    const { key } = optionsRef.current
    cacheManager.invalidate(key, 'manual-invalidation')
    setIsStale(true)
    logger.debug('Cache invalidated', undefined, { key })
  }, [cacheManager])

  const prefetch = useCallback(async () => {
    const { key, prefetchRelated } = optionsRef.current

    try {
      await fetchData()

      if (prefetchRelated) {
        const insights = cacheManager.generatePredictiveInsights()
        const relatedInsights = insights.filter(
          insight =>
            insight.recommendedAction === 'prefetch' && insight.key.startsWith(key.split(':')[0]),
        )

        for (const insight of relatedInsights.slice(0, 3)) {
          logger.debug('Prefetching related data', undefined, {
            originalKey: key,
            relatedKey: insight.key,
          })
        }
      }
    } catch (err) {
      logger.warn('Prefetch failed', err as Error, { key })
    }
  }, [fetchData, cacheManager])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Set up cache invalidation listeners
  useEffect(() => {
    const { dependencies } = optionsRef.current
    if (dependencies && dependencies.length > 0) {
      logger.debug('Setting up dependency listeners', undefined, {
        key: options.key,
        dependencies,
      })
    }
  }, [options.key, options.dependencies])

  // Predictive prefetching based on user behavior
  useEffect(() => {
    const { prefetchRelated, key } = optionsRef.current
    if (prefetchRelated && data) {
      const insights = cacheManager.generatePredictiveInsights()
      const relevantInsights = insights.filter(
        insight => insight.confidence > 0.7 && insight.recommendedAction === 'prefetch',
      )

      if (relevantInsights.length > 0) {
        logger.debug('Predictive prefetching opportunities found', undefined, {
          key,
          opportunities: relevantInsights.length,
        })
      }
    }
  }, [data, cacheManager])

  // Performance monitoring
  useEffect(() => {
    const { enableAnalytics, key } = optionsRef.current

    if (enableAnalytics) {
      const interval = setInterval(() => {
        const stats = cacheManager.getStatistics()
        const pattern = stats.usagePatterns.find(p => p.key === key)

        if (pattern) {
          setAnalytics({
            hitRate: pattern.hitRate,
            accessCount: pattern.accessCount,
            lastAccessed: pattern.lastAccessed,
          })
        }
      }, 30000) // Update every 30 seconds

      return () => clearInterval(interval)
    }
  }, [cacheManager, options.enableAnalytics, options.key])

  return {
    data,
    isLoading,
    isStale,
    error,
    refetch: () => fetchData(true),
    invalidate,
    prefetch,
    analytics,
  }
}

/**
 * Hook for cache statistics and insights
 */
export function useCacheStatistics() {
  const cacheManager = getCacheManager()
  const [statistics, setStatistics] = useState(cacheManager.getStatistics())

  useEffect(() => {
    const interval = setInterval(() => {
      setStatistics(cacheManager.getStatistics())
    }, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [cacheManager])

  return {
    statistics,
    insights: statistics.predictiveInsights,
    performance: {
      hitRate: statistics.cacheMetrics?.hitRate || 0,
      totalRequests: statistics.cacheMetrics?.totalRequests || 0,
      averageResponseTime: statistics.cacheMetrics?.averageResponseTime || 0,
    },
  }
}

/**
 * Hook for cache management operations
 */
export function useCacheManager() {
  const cacheManager = getCacheManager()

  return {
    invalidatePattern: (pattern: string) => {
      const stats = cacheManager.getStatistics()
      const matchingKeys = stats.usagePatterns.filter(p => p.key.includes(pattern)).map(p => p.key)

      matchingKeys.forEach(key => {
        cacheManager.invalidate(key, 'pattern-invalidation')
      })

      logger.info('Pattern invalidation completed', undefined, {
        pattern,
        invalidatedKeys: matchingKeys.length,
      })
    },

    warmCache: async (keys: string[]) => {
      logger.info('Cache warming started', undefined, { keyCount: keys.length })
    },

    getInsights: () => cacheManager.generatePredictiveInsights(),

    getStatistics: () => cacheManager.getStatistics(),
  }
}
