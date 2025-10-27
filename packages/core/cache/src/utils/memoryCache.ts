import { CacheConfigSchema } from '../schemas/cache.js'
import type { CacheConfig, CacheEntry, CacheStats } from '../schemas/cache.js'

/**
 * Memory-based cache with LRU eviction
 */
export class MemoryCache {
  private cache = new Map<string, CacheEntry>()
  private config: CacheConfig
  private stats = {
    hits: 0,
    misses: 0,
  }

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = CacheConfigSchema.parse(config)
  }

  /**
   * Set a value in the cache
   */
  set(key: string, data: unknown, maxAge?: number): void {
    const now = Date.now()
    const expiresAt = maxAge
      ? now + maxAge
      : this.config.maxAge
        ? now + this.config.maxAge
        : undefined

    const entry: CacheEntry = {
      key,
      data,
      timestamp: now,
      expiresAt,
      lastAccessed: now,
      hits: 0,
      size: this.calculateSize(data),
    }

    // Check if entry already exists
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }

    // Evict oldest entries if cache would be full after adding this entry
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest()
    }

    this.cache.set(key, entry)
  }

  /**
   * Get a value from the cache
   */
  get<T = unknown>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      this.stats.misses++
      return null
    }

    // Check if entry has expired
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      this.stats.misses++
      return null
    }

    // Update access statistics
    entry.hits++
    entry.lastAccessed = Date.now()
    this.stats.hits++

    // Move to end (LRU)
    this.cache.delete(key)
    this.cache.set(key, entry)

    return entry.data as T
  }

  /**
   * Check if a key exists in the cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    // Check if expired
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  /**
   * Delete a key from the cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear()
    this.stats.hits = 0
    this.stats.misses = 0
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values())
    const totalHits = this.stats.hits + this.stats.misses
    const hitRate = totalHits > 0 ? this.stats.hits / totalHits : 0

    const timestamps = entries.map(entry => entry.timestamp)
    const averageAge =
      timestamps.length > 0
        ? timestamps.reduce((sum, ts) => sum + (Date.now() - ts), 0) / timestamps.length
        : 0

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate,
      averageAge,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : undefined,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : undefined,
    }
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.cache.delete(key)
        cleaned++
      }
    }

    return cleaned
  }

  /**
   * Evict the oldest entry (LRU)
   */
  private evictOldest(): void {
    let oldestKey: string | null = null
    let oldestTime = Date.now()
    let oldestTimestamp = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      // First compare by lastAccessed time
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed
        oldestTimestamp = entry.timestamp
        oldestKey = key
      } else if (entry.lastAccessed === oldestTime && entry.timestamp < oldestTimestamp) {
        // If lastAccessed times are equal, use insertion timestamp
        oldestTimestamp = entry.timestamp
        oldestKey = key
      }
    }

    // If all entries have the same timestamps, pick the first one (Map preserves insertion order)
    if (oldestKey === null) {
      const firstKey = this.cache.keys().next().value
      oldestKey = firstKey || null
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  /**
   * Calculate approximate size of data
   */
  private calculateSize(data: unknown): number {
    try {
      return JSON.stringify(data).length
    } catch {
      return 0
    }
  }
}
