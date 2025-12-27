/**
 * Serverless Cache Manager
 * Centralized cache management for serverless applications with RTK Query integration
 */

import { createLogger } from '@repo/logger'
import type { RTKQueryCacheConfig } from '../schemas/cache'
import {
  ServerlessCache,
  type ServerlessCacheConfig,
  type BatchOperation,
  type BatchResult,
} from './serverlessCache'

const logger = createLogger('cache:serverless-manager')

export interface ServerlessCacheManagerConfig {
  // Cache instances configuration
  memory?: Partial<ServerlessCacheConfig>
  storage?: Partial<ServerlessCacheConfig>

  // Global settings
  enableGlobalBatching?: boolean
  globalBatchDelay?: number
  enableCacheWarming?: boolean
  warmingInterval?: number

  // Performance monitoring
  enableMetricsCollection?: boolean
  metricsReportingInterval?: number

  // RTK Query integration
  enableRTKQueryIntegration?: boolean
  rtkQueryCacheStrategy?: 'memory' | 'storage' | 'hybrid'
}

/**
 * Centralized cache manager for serverless applications
 */
export class ServerlessCacheManager {
  private memoryCache: ServerlessCache
  private storageCache?: ServerlessCache
  private config: ServerlessCacheManagerConfig
  private globalBatchTimer?: NodeJS.Timeout
  private metricsTimer?: NodeJS.Timeout
  private warmingTimer?: NodeJS.Timeout

  constructor(config: ServerlessCacheManagerConfig = {}) {
    this.config = {
      enableGlobalBatching: true,
      globalBatchDelay: 50,
      enableCacheWarming: true,
      warmingInterval: 5 * 60 * 1000, // 5 minutes
      enableMetricsCollection: true,
      metricsReportingInterval: 60 * 1000, // 1 minute
      enableRTKQueryIntegration: true,
      rtkQueryCacheStrategy: 'hybrid',
      ...config,
    }

    // Initialize memory cache
    this.memoryCache = new ServerlessCache({
      maxSize: 1000,
      maxAge: 5 * 60 * 1000,
      enableBatchOperations: true,
      enablePerformanceMonitoring: true,
      enableCircuitBreaker: true,
      ...this.config.memory,
    })

    // Initialize storage cache if in browser environment
    if (typeof window !== 'undefined') {
      try {
        this.storageCache = new ServerlessCache({
          maxSize: 500,
          maxAge: 30 * 60 * 1000, // 30 minutes for storage
          enableBatchOperations: true,
          enablePerformanceMonitoring: true,
          ...this.config.storage,
        })
      } catch (error) {
        logger.warn(
          'Failed to initialize storage cache',
          error instanceof Error ? error : new Error(String(error)),
        )
      }
    }

    this.startBackgroundTasks()
  }

  /**
   * Get value with intelligent cache selection
   */
  async get<T = unknown>(
    key: string,
    strategy: 'memory' | 'storage' | 'hybrid' = 'hybrid',
  ): Promise<T | null> {
    switch (strategy) {
      case 'memory':
        return this.memoryCache.get<T>(key)

      case 'storage':
        return this.storageCache?.get<T>(key) || null

      case 'hybrid':
      default: {
        // Try memory first, then storage
        const memoryResult = await this.memoryCache.get<T>(key)
        if (memoryResult !== null) {
          return memoryResult
        }

        if (this.storageCache) {
          const storageResult = await this.storageCache.get<T>(key)
          if (storageResult !== null) {
            // Promote to memory cache
            await this.memoryCache.set(key, storageResult)
            return storageResult
          }
        }

        return null
      }
    }
  }

  /**
   * Set value with intelligent cache selection
   */
  async set(
    key: string,
    data: unknown,
    maxAge?: number,
    strategy: 'memory' | 'storage' | 'hybrid' = 'hybrid',
  ): Promise<void> {
    switch (strategy) {
      case 'memory':
        await this.memoryCache.set(key, data, maxAge)
        break

      case 'storage':
        if (this.storageCache) {
          await this.storageCache.set(key, data, maxAge)
        }
        break

      case 'hybrid':
      default:
        // Set in both caches
        await this.memoryCache.set(key, data, maxAge)
        if (this.storageCache) {
          await this.storageCache.set(key, data, maxAge ? maxAge * 2 : undefined) // Longer TTL for storage
        }
        break
    }
  }

  /**
   * Delete from all caches
   */
  delete(key: string): void {
    this.memoryCache.delete(key)
    if (this.storageCache) {
      this.storageCache.delete(key)
    }
  }

  /**
   * Clear all caches
   */
  clear(): void {
    this.memoryCache.clear()
    if (this.storageCache) {
      this.storageCache.clear()
    }
  }

  /**
   * Global batch operations across all caches
   */
  async globalBatch(operations: BatchOperation[]): Promise<BatchResult[]> {
    if (!this.config.enableGlobalBatching) {
      // Execute on memory cache only
      return this.memoryCache.batch(operations)
    }

    // Split operations by cache type
    const memoryOps: BatchOperation[] = []
    const storageOps: BatchOperation[] = []

    operations.forEach(op => {
      // Simple heuristic: larger data goes to storage, smaller to memory
      if (op.type === 'set' && op.data) {
        const size = JSON.stringify(op.data).length
        if (size > 10240) {
          // 10KB threshold
          storageOps.push(op)
        } else {
          memoryOps.push(op)
        }
      } else {
        memoryOps.push(op)
      }
    })

    // Execute batch operations in parallel
    const [memoryResults, storageResults] = await Promise.all([
      memoryOps.length > 0 ? this.memoryCache.batch(memoryOps) : Promise.resolve([]),
      storageOps.length > 0 && this.storageCache
        ? this.storageCache.batch(storageOps)
        : Promise.resolve([]),
    ])

    return [...memoryResults, ...storageResults]
  }

  /**
   * Get RTK Query cache configuration based on strategy
   */
  getRTKQueryCacheConfig(
    cacheStrategy: 'short' | 'medium' | 'long' | 'persistent' = 'medium',
  ): RTKQueryCacheConfig {
    const baseConfigs = {
      short: {
        keepUnusedDataFor: 30,
        refetchOnMountOrArgChange: 30,
        refetchOnFocus: false,
        refetchOnReconnect: true,
        skip: false,
      },
      medium: {
        keepUnusedDataFor: 300,
        refetchOnMountOrArgChange: 300,
        refetchOnFocus: false,
        refetchOnReconnect: true,
        skip: false,
      },
      long: {
        keepUnusedDataFor: 1800,
        refetchOnMountOrArgChange: 1800,
        refetchOnFocus: false,
        refetchOnReconnect: false,
        skip: false,
      },
      persistent: {
        keepUnusedDataFor: Infinity,
        refetchOnMountOrArgChange: false,
        refetchOnFocus: false,
        refetchOnReconnect: false,
        skip: false,
      },
    }

    return baseConfigs[cacheStrategy]
  }

  /**
   * Get comprehensive cache statistics
   */
  getStats() {
    const memoryStats = this.memoryCache.getStats()
    const storageStats = this.storageCache?.getStats()

    return {
      memory: memoryStats,
      storage: storageStats,
      combined: {
        totalSize: memoryStats.size + (storageStats?.size || 0),
        totalHits: memoryStats.hits + (storageStats?.hits || 0),
        totalMisses: memoryStats.misses + (storageStats?.misses || 0),
        combinedHitRate:
          (memoryStats.hits + (storageStats?.hits || 0)) /
          (memoryStats.hits +
            memoryStats.misses +
            (storageStats?.hits || 0) +
            (storageStats?.misses || 0)),
      },
    }
  }

  /**
   * Start background tasks
   */
  private startBackgroundTasks(): void {
    // Start metrics collection
    if (this.config.enableMetricsCollection) {
      this.metricsTimer = setInterval(() => {
        this.collectMetrics()
      }, this.config.metricsReportingInterval)
    }

    // Start cache warming
    if (this.config.enableCacheWarming) {
      this.warmingTimer = setInterval(() => {
        this.performCacheWarming()
      }, this.config.warmingInterval)
    }
  }

  /**
   * Stop background tasks
   */
  stop(): void {
    if (this.globalBatchTimer) {
      clearTimeout(this.globalBatchTimer)
    }
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer)
    }
    if (this.warmingTimer) {
      clearInterval(this.warmingTimer)
    }
  }

  /**
   * Collect and report cache metrics
   */
  private collectMetrics(): void {
    const stats = this.getStats()

    logger.info('Cache metrics report', undefined, {
      memory: {
        size: stats.memory.size,
        hitRate: stats.memory.hitRate,
        batchOperations: stats.memory.batchOperations,
      },
      storage: stats.storage
        ? {
            size: stats.storage.size,
            hitRate: stats.storage.hitRate,
            batchOperations: stats.storage.batchOperations,
          }
        : null,
      combined: stats.combined,
    })
  }

  /**
   * Perform cache warming operations
   */
  private async performCacheWarming(): Promise<void> {
    logger.debug('Performing cache warming')

    // This could be enhanced to warm specific keys based on usage patterns
    // For now, it's a placeholder for future implementation
  }
}

/**
 * Global serverless cache manager instance
 */
let globalCacheManager: ServerlessCacheManager | null = null

/**
 * Get or create global cache manager
 */
export function getServerlessCacheManager(
  config?: ServerlessCacheManagerConfig,
): ServerlessCacheManager {
  if (!globalCacheManager) {
    globalCacheManager = new ServerlessCacheManager(config)
  }
  return globalCacheManager
}

/**
 * Reset global cache manager (useful for testing)
 */
export function resetServerlessCacheManager(): void {
  if (globalCacheManager) {
    globalCacheManager.stop()
    globalCacheManager = null
  }
}
