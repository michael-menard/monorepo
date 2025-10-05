import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MemoryCache } from '../utils/memoryCache.js'

describe('MemoryCache', () => {
  let cache: MemoryCache

  beforeEach(() => {
    cache = new MemoryCache({
      maxSize: 3,
      maxAge: 1000, // 1 second
    })
  })

  it('should set and get values', () => {
    cache.set('key1', 'value1')
    expect(cache.get('key1')).toBe('value1')
  })

  it('should return null for non-existent keys', () => {
    expect(cache.get('nonexistent')).toBeNull()
  })

  it('should check if key exists', () => {
    cache.set('key1', 'value1')
    expect(cache.has('key1')).toBe(true)
    expect(cache.has('nonexistent')).toBe(false)
  })

  it('should delete keys', () => {
    cache.set('key1', 'value1')
    expect(cache.delete('key1')).toBe(true)
    expect(cache.get('key1')).toBeNull()
    expect(cache.delete('nonexistent')).toBe(false)
  })

  it('should clear all entries', () => {
    cache.set('key1', 'value1')
    cache.set('key2', 'value2')
    cache.clear()
    expect(cache.get('key1')).toBeNull()
    expect(cache.get('key2')).toBeNull()
  })

  it('should evict oldest entries when cache is full', () => {
    cache.set('key1', 'value1')
    cache.set('key2', 'value2')
    cache.set('key3', 'value3')
    cache.set('key4', 'value4') // Should evict key1 (least recently used)

    expect(cache.get('key1')).toBeNull()
    expect(cache.get('key2')).toBe('value2')
    expect(cache.get('key3')).toBe('value3')
    expect(cache.get('key4')).toBe('value4')
  })

  it('should expire entries after maxAge', async () => {
    cache.set('key1', 'value1', 100) // 100ms
    expect(cache.get('key1')).toBe('value1')
    
    await new Promise(resolve => setTimeout(resolve, 150))
    expect(cache.get('key1')).toBeNull()
  })

  it('should not throw when accessing then inserting beyond capacity (smoke)', () => {
    cache.set('key1', 'value1')
    cache.set('key2', 'value2')
    cache.set('key3', 'value3')
    cache.get('key1')
    cache.set('key4', 'value4')
    expect(cache.size()).toBeLessThanOrEqual(3)
  })

  it('should provide cache statistics', () => {
    cache.set('key1', 'value1')
    cache.get('key1') // Hit
    cache.get('nonexistent') // Miss
    
    const stats = cache.getStats()
    expect(stats.hits).toBe(1)
    expect(stats.misses).toBe(1)
    expect(stats.size).toBe(1)
    expect(stats.maxSize).toBe(3)
    expect(stats.hitRate).toBe(0.5)
  })

  it('should clean up expired entries', async () => {
    cache.set('key1', 'value1', 100)
    cache.set('key2', 'value2', 200)
    
    await new Promise(resolve => setTimeout(resolve, 150))
    
    const cleaned = cache.cleanup()
    expect(cleaned).toBe(1) // key1 should be cleaned
    
    expect(cache.get('key1')).toBeNull()
    expect(cache.get('key2')).toBe('value2')
  })

  it('should get all keys', () => {
    cache.set('key1', 'value1')
    cache.set('key2', 'value2')
    
    const keys = cache.keys()
    expect(keys).toContain('key1')
    expect(keys).toContain('key2')
    expect(keys).toHaveLength(2)
  })

  it('should get cache size', () => {
    expect(cache.size()).toBe(0)
    cache.set('key1', 'value1')
    expect(cache.size()).toBe(1)
    cache.set('key2', 'value2')
    expect(cache.size()).toBe(2)
  })
}) 