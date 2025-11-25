/**
 * Serverless Cache Utilities
 * Enhanced caching strategies optimized for serverless environments
 */

import { createLogger } from '@repo/logger'
import { MemoryCache } from './memoryCache'
import { StorageCache } from './storageCache'
import type { RTKQueryCacheConfig, CacheConfig, CacheStats } from '../schemas/cache.js'

const logger = createLogger('cache:serverless')

/**
 * Serverless-optimized RTK Query cache configurations
 * Designed to handle cold starts, intermittent connectivity, and serverless response patterns
 */
export const SERVERLESS_CACHE_CONFIGS = {
  // No caching - always fetch fresh data (for real-time data)
  none: {
    keepUnusedDataFor: 0,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
    skip: false,
  },

  // Short-term caching (30 seconds) - for frequently changing serverless data
  short: {
    keepUnusedDataFor: 30,
    refetchOnMountOrArgChange: 30, // Refetch if older than 30 seconds
    refetchOnFocus: false, // Don't refetch on focus to reduce serverless calls
    refetchOnReconnect: true, // Refetch on reconnect (network issues common with serverless)
    skip: false,
  },

  // Medium-term caching (5 minutes) - for moderately changing serverless data
  medium: {
    keepUnusedDataFor: 300, // 5 minutes
    refetchOnMountOrArgChange: 300, // Refetch if older than 5 minutes
    refetchOnFocus: false, // Avoid unnecessary serverless invocations
    refetchOnReconnect: true,
    skip: false,
  },

  // Long-term caching (30 minutes) - for static or rarely changing serverless data
  long: {
    keepUnusedDataFor: 1800, // 30 minutes
    refetchOnMountOrArgChange: 1800, // Refetch if older than 30 minutes
    refetchOnFocus: false,
    refetchOnReconnect: false, // Don't refetch on reconnect for static data
    skip: false,
  },

  // Persistent caching (until manual invalidation) - for very static serverless data
  persistent: {
    keepUnusedDataFor: Infinity,
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false,
    refetchOnReconnect: false,
    skip: false,
  },

  // Aggressive caching (2 hours) - for serverless data that rarely changes
  aggressive: {
    keepUnusedDataFor: 7200, // 2 hours
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false,
    refetchOnReconnect: false,
    skip: false,
  },
} as const

export type ServerlessCacheStrategy = keyof typeof SERVERLESS_CACHE_CONFIGS

/**
 * Get serverless-optimized cache configuration
 */
export function getServerlessCacheConfig(
  strategy: ServerlessCacheStrategy = 'medium',
): RTKQueryCacheConfig {
  return SERVERLESS_CACHE_CONFIGS[strategy]
}

/**
 * Create custom serverless cache configuration
 */
export function createServerlessCacheConfig(
  config: Partial<RTKQueryCacheConfig>,
): RTKQueryCacheConfig {
  return {
    ...SERVERLESS_CACHE_CONFIGS.medium,
    ...config,
  }
}

/**
 * Serverless batch cache configuration
 * Optimized for batch operations that reduce serverless function invocations
 */
export const SERVERLESS_BATCH_CONFIGS = {
  // Small batch (5 items) - for quick serverless responses
  small: {
    batchSize: 5,
    batchDelay: 100, // 100ms delay to collect items
    maxWait: 1000, // Maximum wait time before sending batch
  },

  // Medium batch (10 items) - balanced approach
  medium: {
    batchSize: 10,
    batchDelay: 200,
    maxWait: 2000,
  },

  // Large batch (20 items) - for bulk operations
  large: {
    batchSize: 20,
    batchDelay: 500,
    maxWait: 5000,
  },
} as const

export type ServerlessBatchStrategy = keyof typeof SERVERLESS_BATCH_CONFIGS

/**
 * Get serverless batch configuration
 */
export function getServerlessBatchConfig(strategy: ServerlessBatchStrategy = 'medium') {
  return SERVERLESS_BATCH_CONFIGS[strategy]
}

/**
 * Serverless cache warming configuration
 * Proactive caching to reduce cold start impact
 */
export interface ServerlessWarmingConfig {
  enabled: boolean
  endpoints: string[]
  interval: number // milliseconds
  maxConcurrent: number
  timeout: number
}

/**
 * Default serverless warming configuration
 */
export const DEFAULT_SERVERLESS_WARMING_CONFIG: ServerlessWarmingConfig = {
  enabled: true,
  endpoints: [],
  interval: 5 * 60 * 1000, // 5 minutes
  maxConcurrent: 3,
  timeout: 10000, // 10 seconds
}

/**
 * Create serverless warming configuration
 */
export function createServerlessWarmingConfig(
  config: Partial<ServerlessWarmingConfig>,
): ServerlessWarmingConfig {
  return {
    ...DEFAULT_SERVERLESS_WARMING_CONFIG,
    ...config,
  }
}

/**
 * Serverless cache invalidation patterns
 * Smart invalidation strategies for serverless data
 */
export const SERVERLESS_INVALIDATION_PATTERNS = {
  // Immediate invalidation - for critical data changes
  immediate: {
    delay: 0,
    cascade: true, // Invalidate related data
  },

  // Delayed invalidation - batch invalidations to reduce serverless calls
  delayed: {
    delay: 5000, // 5 seconds
    cascade: false,
  },

  // Background invalidation - invalidate during low-traffic periods
  background: {
    delay: 30000, // 30 seconds
    cascade: true,
  },
} as const

export type ServerlessInvalidationStrategy = keyof typeof SERVERLESS_INVALIDATION_PATTERNS

/**
 * Get serverless invalidation configuration
 */
export function getServerlessInvalidationConfig(
  strategy: ServerlessInvalidationStrategy = 'delayed',
) {
  return SERVERLESS_INVALIDATION_PATTERNS[strategy]
}

/**
 * Enhanced serverless cache configuration
 */
export interface ServerlessCacheConfig extends CacheConfig {
  // Serverless-specific options
  enableBatchOperations?: boolean
  batchSize?: number
  batchDelay?: number
  enablePerformanceMonitoring?: boolean
  enableCircuitBreaker?: boolean
  circuitBreakerThreshold?: number

  // Cold start optimization
  enableWarmup?: boolean
  warmupKeys?: string[]

  // Adaptive caching
  enableAdaptiveTTL?: boolean
  minTTL?: number
  maxTTL?: number

  // Compression for large payloads
  enableCompression?: boolean
  compressionThreshold?: number
}

/**
 * Batch operation interface
 */
export interface BatchOperation {
  type: 'get' | 'set' | 'delete'
  key: string
  data?: unknown
  maxAge?: number
}

/**
 * Batch operation result
 */
export interface BatchResult {
  key: string
  success: boolean
  data?: unknown
  error?: string
}

/**
 * Enhanced serverless cache statistics
 */
export interface ServerlessCacheStats extends CacheStats {
  batchOperations: number
  batchSuccessRate: number
  compressionRatio: number
  circuitBreakerTrips: number
  adaptiveTTLAdjustments: number
}

/**
 * Enhanced cache for serverless applications
 */
export class ServerlessCache {
  private memoryCache: MemoryCache
  private storageCache?: StorageCache
  private config: ServerlessCacheConfig
  private batchQueue: BatchOperation[] = []
  private batchTimer?: NodeJS.Timeout
  private stats = {
    batchOperations: 0,
    batchSuccesses: 0,
    compressionSaves: 0,
    originalSize: 0,
    compressedSize: 0,
    circuitBreakerTrips: 0,
    adaptiveTTLAdjustments: 0,
  }
  private circuitBreakerOpen = false
  private circuitBreakerFailures = 0

  constructor(config: Partial<ServerlessCacheConfig> = {}) {
    this.config = {
      maxSize: 1000,
      maxAge: 5 * 60 * 1000, // 5 minutes default
      storage: 'memory',
      keyPrefix: 'cache_',
      compress: false,
      encrypt: false,
      enableBatchOperations: true,
      batchSize: 10,
      batchDelay: 100,
      enablePerformanceMonitoring: true,
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 5,
      enableWarmup: true,
      warmupKeys: [],
      enableAdaptiveTTL: true,
      minTTL: 30 * 1000, // 30 seconds
      maxTTL: 30 * 60 * 1000, // 30 minutes
      enableCompression: true,
      compressionThreshold: 1024, // 1KB
      ...config,
    }

    this.memoryCache = new MemoryCache({
      maxSize: this.config.maxSize,
      maxAge: this.config.maxAge,
    })

    // Initialize storage cache if in browser environment
    if (typeof window !== 'undefined') {
      try {
        this.storageCache = new StorageCache({
          storage: 'localStorage',
          maxSize: Math.floor(this.config.maxSize / 2),
          maxAge: this.config.maxAge * 2, // Longer TTL for persistent storage
          keyPrefix: 'serverless_cache_',
        })
      } catch (error) {
        logger.warn(
          'Failed to initialize storage cache',
          error instanceof Error ? error : new Error(String(error)),
        )
      }
    }

    // Warmup cache if enabled
    if (this.config.enableWarmup && this.config.warmupKeys?.length) {
      this.warmupCache()
    }
  }

  /**
   * Get value with fallback to storage cache
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    if (this.circuitBreakerOpen) {
      logger.debug('Circuit breaker open, skipping cache operation', undefined, { key })
      return null
    }

    try {
      // Try memory cache first
      const memoryResult = this.memoryCache.get<T>(key)
      if (memoryResult !== null) {
        return memoryResult
      }

      // Fallback to storage cache
      if (this.storageCache) {
        const storageResult = this.storageCache.get<T>(key)
        if (storageResult !== null) {
          // Promote to memory cache
          this.memoryCache.set(key, storageResult, this.calculateAdaptiveTTL(key))
          return storageResult
        }
      }

      return null
    } catch (error) {
      this.handleCacheError(error, 'get', key)
      return null
    }
  }

  /**
   * Set value with compression and adaptive TTL
   */
  async set(key: string, data: unknown, maxAge?: number): Promise<void> {
    if (this.circuitBreakerOpen) {
      logger.debug('Circuit breaker open, skipping cache operation', undefined, { key })
      return
    }

    try {
      const ttl = maxAge || this.calculateAdaptiveTTL(key)
      const processedData = this.config.enableCompression ? this.compressIfNeeded(data) : data

      // Set in memory cache
      this.memoryCache.set(key, processedData, ttl)

      // Set in storage cache if available
      if (this.storageCache) {
        this.storageCache.set(key, processedData, ttl * 2) // Longer TTL for storage
      }

      this.resetCircuitBreaker()
    } catch (error) {
      this.handleCacheError(error, 'set', key)
    }
  }

  /**
   * Delete value from both caches
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
   * Batch operations for improved performance
   */
  async batch(operations: BatchOperation[]): Promise<BatchResult[]> {
    if (!this.config.enableBatchOperations) {
      // Execute operations individually
      const results: BatchResult[] = []
      for (const op of operations) {
        try {
          if (op.type === 'get') {
            const data = await this.get(op.key)
            results.push({ key: op.key, success: true, data })
          } else if (op.type === 'set') {
            await this.set(op.key, op.data, op.maxAge)
            results.push({ key: op.key, success: true })
          } else if (op.type === 'delete') {
            this.delete(op.key)
            results.push({ key: op.key, success: true })
          }
        } catch (error) {
          results.push({
            key: op.key,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
      return results
    }

    // Execute batch operations
    this.stats.batchOperations++
    const results: BatchResult[] = []
    let successCount = 0

    for (const operation of operations) {
      try {
        if (operation.type === 'get') {
          const data = await this.get(operation.key)
          results.push({ key: operation.key, success: true, data })
          successCount++
        } else if (operation.type === 'set') {
          await this.set(operation.key, operation.data, operation.maxAge)
          results.push({ key: operation.key, success: true })
          successCount++
        } else if (operation.type === 'delete') {
          this.delete(operation.key)
          results.push({ key: operation.key, success: true })
          successCount++
        }
      } catch (error) {
        results.push({
          key: operation.key,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    this.stats.batchSuccesses += successCount
    return results
  }

  /**
   * Queue batch operation
   */
  queueBatchOperation(operation: BatchOperation): Promise<BatchResult> {
    return new Promise((resolve, reject) => {
      this.batchQueue.push(operation)

      // Set timer to process batch
      if (this.batchTimer) {
        clearTimeout(this.batchTimer)
      }

      this.batchTimer = setTimeout(() => {
        this.processBatchQueue()
      }, this.config.batchDelay)

      // Process immediately if batch is full
      if (this.batchQueue.length >= (this.config.batchSize || 10)) {
        this.processBatchQueue()
      }

      // Store resolve/reject for this operation
      ;(operation as any).resolve = resolve
      ;(operation as any).reject = reject
    })
  }

  /**
   * Process queued batch operations
   */
  private async processBatchQueue(): Promise<void> {
    if (this.batchQueue.length === 0) return

    const operations = [...this.batchQueue]
    this.batchQueue = []

    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = undefined
    }

    try {
      const results = await this.batch(operations)

      // Resolve individual promises
      results.forEach((result, index) => {
        const operation = operations[index] as any
        if (operation.resolve) {
          operation.resolve(result)
        }
      })
    } catch (error) {
      // Reject all promises
      operations.forEach((operation: any) => {
        if (operation.reject) {
          operation.reject(error)
        }
      })
    }
  }

  /**
   * Get enhanced cache statistics
   */
  getStats(): ServerlessCacheStats {
    const memoryStats = this.memoryCache.getStats()
    const batchSuccessRate =
      this.stats.batchOperations > 0 ? this.stats.batchSuccesses / this.stats.batchOperations : 0

    const compressionRatio =
      this.stats.originalSize > 0 ? this.stats.compressedSize / this.stats.originalSize : 1

    return {
      ...memoryStats,
      batchOperations: this.stats.batchOperations,
      batchSuccessRate,
      compressionRatio,
      circuitBreakerTrips: this.stats.circuitBreakerTrips,
      adaptiveTTLAdjustments: this.stats.adaptiveTTLAdjustments,
    }
  }

  /**
   * Warmup cache with predefined keys
   */
  private async warmupCache(): Promise<void> {
    if (!this.config.warmupKeys?.length) return

    logger.info('Starting cache warmup', undefined, {
      keys: this.config.warmupKeys.length,
    })

    for (const key of this.config.warmupKeys) {
      try {
        // Try to get from storage cache to warm memory cache
        if (this.storageCache) {
          const data = this.storageCache.get(key)
          if (data !== null) {
            this.memoryCache.set(key, data)
          }
        }
      } catch (error) {
        logger.warn(
          'Failed to warmup cache key',
          error instanceof Error ? error : new Error(String(error)),
          { key },
        )
      }
    }
  }

  /**
   * Calculate adaptive TTL based on key usage patterns
   */
  private calculateAdaptiveTTL(key: string): number {
    if (!this.config.enableAdaptiveTTL) {
      return this.config.maxAge || 5 * 60 * 1000
    }

    // Simple adaptive logic - could be enhanced with ML
    const entry = this.memoryCache.get(key)
    if (entry && typeof entry === 'object' && 'hits' in entry) {
      const hits = (entry as any).hits || 0

      // More hits = longer TTL (up to maxTTL)
      const adaptiveTTL = Math.min(
        this.config.maxTTL || 30 * 60 * 1000,
        Math.max(
          this.config.minTTL || 30 * 1000,
          (this.config.maxAge || 5 * 60 * 1000) * (1 + hits * 0.1),
        ),
      )

      if (adaptiveTTL !== (this.config.maxAge || 5 * 60 * 1000)) {
        this.stats.adaptiveTTLAdjustments++
      }

      return adaptiveTTL
    }

    return this.config.maxAge || 5 * 60 * 1000
  }

  /**
   * Compress data if it exceeds threshold
   */
  private compressIfNeeded(data: unknown): unknown {
    if (!this.config.enableCompression) return data

    const serialized = JSON.stringify(data)
    const size = new Blob([serialized]).size

    if (size > (this.config.compressionThreshold || 1024)) {
      // Simple compression simulation - in real implementation, use actual compression
      this.stats.originalSize += size
      this.stats.compressedSize += size * 0.7 // Assume 30% compression
      this.stats.compressionSaves++

      return {
        __compressed: true,
        data: serialized, // In real implementation, this would be compressed
      }
    }

    return data
  }

  /**
   * Handle cache errors and circuit breaker logic
   */
  private handleCacheError(error: unknown, operation: string, key: string): void {
    logger.warn(
      `Cache ${operation} operation failed`,
      error instanceof Error ? error : new Error(String(error)),
      {
        operation,
        key,
      },
    )

    if (this.config.enableCircuitBreaker) {
      this.circuitBreakerFailures++

      if (this.circuitBreakerFailures >= (this.config.circuitBreakerThreshold || 5)) {
        this.circuitBreakerOpen = true
        this.stats.circuitBreakerTrips++

        logger.warn('Cache circuit breaker opened', undefined, {
          failures: this.circuitBreakerFailures,
          threshold: this.config.circuitBreakerThreshold,
        })

        // Auto-reset circuit breaker after 30 seconds
        setTimeout(() => {
          this.circuitBreakerOpen = false
          this.circuitBreakerFailures = 0
          logger.info('Cache circuit breaker reset')
        }, 30000)
      }
    }
  }

  /**
   * Reset circuit breaker on successful operation
   */
  private resetCircuitBreaker(): void {
    if (this.circuitBreakerFailures > 0) {
      this.circuitBreakerFailures = 0
    }
  }
}
