import { CacheConfig, CacheEntry, CacheStats, CacheConfigSchema } from '../schemas/cache.js'

/**
 * Storage-based cache using localStorage or sessionStorage
 */
export class StorageCache {
  private storage: Storage
  private config: CacheConfig
  private stats = {
    hits: 0,
    misses: 0,
  }

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = CacheConfigSchema.parse(config)
    
    if (typeof window === 'undefined') {
      throw new Error('StorageCache requires a browser environment')
    }

    this.storage = this.config.storage === 'sessionStorage' ? sessionStorage : localStorage
  }

  /**
   * Set a value in the cache
   */
  set(key: string, data: unknown, maxAge?: number): void {
    const now = Date.now()
    const expiresAt = maxAge ? now + maxAge : this.config.maxAge ? now + this.config.maxAge : undefined

    const entry: CacheEntry = {
      key,
      data,
      timestamp: now,
      expiresAt,
      lastAccessed: now,
      hits: 0,
      size: this.calculateSize(data),
    }

    const fullKey = this.config.keyPrefix + key
    const serialized = this.config.compress 
      ? this.compress(JSON.stringify(entry))
      : JSON.stringify(entry)

    try {
      this.storage.setItem(fullKey, serialized)
    } catch (error) {
      // If storage is full, try to clean up and retry
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        this.cleanup()
        this.storage.setItem(fullKey, serialized)
      } else {
        throw error
      }
    }
  }

  /**
   * Get a value from the cache
   */
  get<T = unknown>(key: string): T | null {
    const fullKey = this.config.keyPrefix + key
    
    try {
      const serialized = this.storage.getItem(fullKey)
      
      if (!serialized) {
        this.stats.misses++
        return null
      }

      const entry: CacheEntry = JSON.parse(
        this.config.compress ? this.decompress(serialized) : serialized
      )

      // Check if entry has expired
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        this.storage.removeItem(fullKey)
        this.stats.misses++
        return null
      }

      // Update access statistics
      entry.hits++
      entry.lastAccessed = Date.now()
      this.stats.hits++

      // Update the entry in storage
      const updatedSerialized = this.config.compress 
        ? this.compress(JSON.stringify(entry))
        : JSON.stringify(entry)
      this.storage.setItem(fullKey, updatedSerialized)

      return entry.data as T
    } catch (error) {
      // If there's an error reading the entry, remove it
      this.storage.removeItem(fullKey)
      this.stats.misses++
      return null
    }
  }

  /**
   * Check if a key exists in the cache
   */
  has(key: string): boolean {
    const fullKey = this.config.keyPrefix + key
    const serialized = this.storage.getItem(fullKey)
    
    if (!serialized) return false

    try {
      const entry: CacheEntry = JSON.parse(
        this.config.compress ? this.decompress(serialized) : serialized
      )

      // Check if expired
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        this.storage.removeItem(fullKey)
        return false
      }

      return true
    } catch {
      return false
    }
  }

  /**
   * Delete a key from the cache
   */
  delete(key: string): boolean {
    const fullKey = this.config.keyPrefix + key
    const exists = this.storage.getItem(fullKey) !== null
    this.storage.removeItem(fullKey)
    return exists
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    const keys = Object.keys(this.storage)
    const prefixKeys = keys.filter(key => key.startsWith(this.config.keyPrefix))
    
    prefixKeys.forEach(key => {
      this.storage.removeItem(key)
    })

    this.stats.hits = 0
    this.stats.misses = 0
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = this.getAllEntries()
    const totalHits = this.stats.hits + this.stats.misses
    const hitRate = totalHits > 0 ? this.stats.hits / totalHits : 0

    const timestamps = entries.map(entry => entry.timestamp)
    const averageAge = timestamps.length > 0 
      ? timestamps.reduce((sum, ts) => sum + (Date.now() - ts), 0) / timestamps.length 
      : 0

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: entries.length,
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
    const keys = Object.keys(this.storage)
    return keys
      .filter(key => key.startsWith(this.config.keyPrefix))
      .map(key => key.slice(this.config.keyPrefix.length))
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.keys().length
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const keys = this.keys()
    let cleaned = 0

    keys.forEach(key => {
      if (!this.has(key)) {
        cleaned++
      }
    })

    return cleaned
  }

  /**
   * Get all entries from storage
   */
  private getAllEntries(): CacheEntry[] {
    const entries: CacheEntry[] = []
    const keys = this.keys()

    keys.forEach(key => {
      const entry = this.get(key)
      if (entry !== null) {
        // We need to reconstruct the entry from the storage
        const fullKey = this.config.keyPrefix + key
        const serialized = this.storage.getItem(fullKey)
        if (serialized) {
          try {
            const parsed = JSON.parse(
              this.config.compress ? this.decompress(serialized) : serialized
            )
            entries.push(parsed)
          } catch {
            // Skip invalid entries
          }
        }
      }
    })

    return entries
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

  /**
   * Simple compression using base64 encoding
   */
  private compress(data: string): string {
    if (typeof btoa === 'undefined') return data
    return btoa(data)
  }

  /**
   * Simple decompression using base64 decoding
   */
  private decompress(data: string): string {
    if (typeof atob === 'undefined') return data
    return atob(data)
  }
} 