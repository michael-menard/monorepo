import type { CacheConfig, CacheStats } from '../schemas/cache.js'
/**
 * Memory-based cache with LRU eviction
 */
export declare class MemoryCache {
  private cache
  private config
  private stats
  constructor(config?: Partial<CacheConfig>)
  /**
   * Set a value in the cache
   */
  set(key: string, data: unknown, maxAge?: number): void
  /**
   * Get a value from the cache
   */
  get<T = unknown>(key: string): T | null
  /**
   * Check if a key exists in the cache
   */
  has(key: string): boolean
  /**
   * Delete a key from the cache
   */
  delete(key: string): boolean
  /**
   * Clear all entries from the cache
   */
  clear(): void
  /**
   * Get cache statistics
   */
  getStats(): CacheStats
  /**
   * Get all cache keys
   */
  keys(): string[]
  /**
   * Get cache size
   */
  size(): number
  /**
   * Clean up expired entries
   */
  cleanup(): number
  /**
   * Evict the oldest entry (LRU)
   */
  private evictOldest
  /**
   * Calculate approximate size of data
   */
  private calculateSize
}
//# sourceMappingURL=memoryCache.d.ts.map
