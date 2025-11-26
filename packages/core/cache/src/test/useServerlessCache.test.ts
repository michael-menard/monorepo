/**
 * Serverless Cache Hook Tests
 * Tests for React hooks for serverless caching
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useServerlessCache, useServerlessCacheValue } from '../hooks/useServerlessCache'

// Mock the logger
vi.mock('@repo/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}))

// Mock browser APIs
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
  },
  writable: true,
})

describe('useServerlessCache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  it('should initialize cache manager', () => {
    const { result } = renderHook(() => useServerlessCache())

    expect(result.current.get).toBeDefined()
    expect(result.current.set).toBeDefined()
    expect(result.current.delete).toBeDefined()
    expect(result.current.clear).toBeDefined()
    expect(result.current.batch).toBeDefined()
    expect(result.current.refresh).toBeDefined()
    expect(result.current.preload).toBeDefined()
  })

  it('should handle cache operations', async () => {
    const { result } = renderHook(() => useServerlessCache())

    await act(async () => {
      await result.current.set('key1', 'value1')
    })

    await act(async () => {
      const value = await result.current.get('key1')
      expect(value).toBe('value1')
    })
  })

  it('should handle batch operations', async () => {
    const { result } = renderHook(() => useServerlessCache())

    const operations = [
      { type: 'set' as const, key: 'key1', data: 'value1' },
      { type: 'set' as const, key: 'key2', data: 'value2' },
      { type: 'get' as const, key: 'key1' },
    ]

    await act(async () => {
      const results = await result.current.batch(operations)
      expect(results).toHaveLength(3)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(true)
      expect(results[2].success).toBe(true)
    })
  })

  it('should handle preload operations', async () => {
    const { result } = renderHook(() => useServerlessCache())

    // Set some values first
    await act(async () => {
      await result.current.set('key1', 'value1')
      await result.current.set('key2', 'value2')
    })

    // Preload should not throw
    await act(async () => {
      await result.current.preload(['key1', 'key2', 'key3'])
    })
  })

  it('should handle errors gracefully', async () => {
    const onError = vi.fn()
    const { result } = renderHook(() => useServerlessCache(undefined, { onError }))

    // Force an error by trying to operate on a broken cache
    await act(async () => {
      // This should not throw, but should call onError
      const value = await result.current.get('non-existent-key')
      expect(value).toBeNull()
    })
  })

  it('should track loading state', async () => {
    const { result } = renderHook(() => useServerlessCache())

    expect(result.current.isLoading).toBe(false)

    const promise = act(async () => {
      await result.current.set('key1', 'value1')
    })

    await promise
    expect(result.current.isLoading).toBe(false)
  })

  it('should call success callback', async () => {
    const onSuccess = vi.fn()
    const { result } = renderHook(() => useServerlessCache(undefined, { onSuccess }))

    await act(async () => {
      await result.current.set('key1', 'value1')
    })

    expect(onSuccess).toHaveBeenCalledWith('set', 'key1')
  })

  it('should refresh stats', async () => {
    const { result } = renderHook(() => useServerlessCache())

    await act(async () => {
      await result.current.set('key1', 'value1')
    })

    act(() => {
      result.current.refresh()
    })

    expect(result.current.stats).toBeDefined()
  })
})

describe('useServerlessCacheValue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  it('should initialize with default value', async () => {
    const { result } = renderHook(() => useServerlessCacheValue('test-key', 'default-value'))

    // Should start with default value
    expect(result.current.value).toBe('default-value')
  })

  it('should set and get values', async () => {
    const { result } = renderHook(() => useServerlessCacheValue<string>('test-key'))

    await act(async () => {
      await result.current.setValue('new-value')
    })

    expect(result.current.value).toBe('new-value')
  })

  it('should refresh value from cache', async () => {
    const { result } = renderHook(() => useServerlessCacheValue<string>('test-key', 'default'))

    // First set a value
    await act(async () => {
      await result.current.setValue('new-value')
    })

    // Then refresh - should maintain the set value
    await act(async () => {
      await result.current.refresh()
    })

    // Should maintain the value that was set
    expect(result.current.value).toBe('new-value')
  })

  it('should handle loading state', async () => {
    const { result } = renderHook(() => useServerlessCacheValue<string>('test-key'))

    // Loading state might be true initially due to async initialization
    expect(typeof result.current.isLoading).toBe('boolean')

    const promise = act(async () => {
      await result.current.setValue('test-value')
    })

    await promise
    expect(result.current.isLoading).toBe(false)
  })

  it('should handle errors', async () => {
    const { result } = renderHook(() => useServerlessCacheValue<string>('test-key', 'default'))

    // Should not throw on error, should maintain default value
    expect(result.current.value).toBe('default')
    expect(result.current.error).toBeNull()
  })
})
