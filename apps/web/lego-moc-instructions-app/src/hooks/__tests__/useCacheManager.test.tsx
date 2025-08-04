import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { useCacheManager } from '../useCacheManager.js'

// Mock the shared-cache package
vi.mock('@repo/shared-cache', () => ({
  MemoryCache: vi.fn().mockImplementation(() => ({
    set: vi.fn(),
    get: vi.fn(),
    has: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
    cleanup: vi.fn(),
    getStats: vi.fn().mockReturnValue({
      hits: 10,
      misses: 5,
      size: 3,
      maxSize: 100,
      hitRate: 0.67,
      averageAge: 5000,
    }),
  })),
  StorageCache: vi.fn().mockImplementation(() => ({
    set: vi.fn(),
    get: vi.fn(),
    has: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
    cleanup: vi.fn(),
    getStats: vi.fn().mockReturnValue({
      hits: 8,
      misses: 2,
      size: 2,
      maxSize: 50,
      hitRate: 0.8,
      averageAge: 10000,
    }),
  })),
  useImageCache: vi.fn().mockReturnValue({
    getStats: vi.fn().mockResolvedValue({
      cacheApiSize: 5,
      localStorageSize: 3,
      totalEntries: 8,
    }),
    clearCache: vi.fn().mockResolvedValue(undefined),
  }),
}))

// Create a mock store
const createMockStore = () => {
  return configureStore({
    reducer: {
      api: (state = {}) => state,
    },
  })
}

describe('useCacheManager', () => {
  let store: ReturnType<typeof createMockStore>

  beforeEach(() => {
    store = createMockStore()
    vi.clearAllMocks()
  })

  const renderHookWithProvider = () => {
    return renderHook(() => useCacheManager(), {
      wrapper: ({ children }) => (
        <Provider store={store}>{children}</Provider>
      ),
    })
  }

  it('should initialize with all cache types', () => {
    const { result } = renderHookWithProvider()

    expect(result.current.memoryCache).toBeDefined()
    expect(result.current.localStorageCache).toBeDefined()
    expect(result.current.sessionStorageCache).toBeDefined()
  })

  it('should provide cache operations', () => {
    const { result } = renderHookWithProvider()

    expect(typeof result.current.cacheData).toBe('function')
    expect(typeof result.current.getCachedData).toBe('function')
    expect(typeof result.current.isCached).toBe('function')
    expect(typeof result.current.deleteCachedData).toBe('function')
  })

  it('should provide cache management functions', () => {
    const { result } = renderHookWithProvider()

    expect(typeof result.current.clearAllCaches).toBe('function')
    expect(typeof result.current.cleanupExpired).toBe('function')
    expect(typeof result.current.updateStats).toBe('function')
  })

  it('should cache data in memory by default', () => {
    const { result } = renderHookWithProvider()

    act(() => {
      result.current.cacheData('test-key', 'test-value')
    })

    expect(result.current.memoryCache.set).toHaveBeenCalledWith('test-key', 'test-value', undefined)
  })

  it('should cache data in localStorage when specified', () => {
    const { result } = renderHookWithProvider()

    act(() => {
      result.current.cacheData('test-key', 'test-value', 'localStorage', 60000)
    })

    expect(result.current.localStorageCache.set).toHaveBeenCalledWith('test-key', 'test-value', 60000)
  })

  it('should cache data in sessionStorage when specified', () => {
    const { result } = renderHookWithProvider()

    act(() => {
      result.current.cacheData('test-key', 'test-value', 'sessionStorage')
    })

    expect(result.current.sessionStorageCache.set).toHaveBeenCalledWith('test-key', 'test-value', undefined)
  })

  it('should get cached data from memory by default', () => {
    const { result } = renderHookWithProvider()
    const mockData = { test: 'value' }
    ;(result.current.memoryCache.get as any).mockReturnValue(mockData)

    let retrievedData: any = null
    act(() => {
      retrievedData = result.current.getCachedData('test-key')
    })

    expect(result.current.memoryCache.get).toHaveBeenCalledWith('test-key')
    expect(retrievedData).toBe(mockData)
  })

  it('should get cached data from localStorage when specified', () => {
    const { result } = renderHookWithProvider()
    const mockData = { test: 'value' }
    ;(result.current.localStorageCache.get as any).mockReturnValue(mockData)

    let retrievedData: any = null
    act(() => {
      retrievedData = result.current.getCachedData('test-key', 'localStorage')
    })

    expect(result.current.localStorageCache.get).toHaveBeenCalledWith('test-key')
    expect(retrievedData).toBe(mockData)
  })

  it('should check if data is cached in memory by default', () => {
    const { result } = renderHookWithProvider()
    ;(result.current.memoryCache.has as any).mockReturnValue(true)

    let isCached = false
    act(() => {
      isCached = result.current.isCached('test-key')
    })

    expect(result.current.memoryCache.has).toHaveBeenCalledWith('test-key')
    expect(isCached).toBe(true)
  })

  it('should delete cached data from memory by default', () => {
    const { result } = renderHookWithProvider()
    ;(result.current.memoryCache.delete as any).mockReturnValue(true)

    let deleted = false
    act(() => {
      deleted = result.current.deleteCachedData('test-key')
    })

    expect(result.current.memoryCache.delete).toHaveBeenCalledWith('test-key')
    expect(deleted).toBe(true)
  })

  it('should clear all caches', async () => {
    const { result } = renderHookWithProvider()

    await act(async () => {
      await result.current.clearAllCaches()
    })

    expect(result.current.memoryCache.clear).toHaveBeenCalled()
    expect(result.current.localStorageCache.clear).toHaveBeenCalled()
    expect(result.current.sessionStorageCache.clear).toHaveBeenCalled()
  })

  it('should cleanup expired entries', async () => {
    const { result } = renderHookWithProvider()
    ;(result.current.memoryCache.cleanup as any).mockReturnValue(2)
    ;(result.current.localStorageCache.cleanup as any).mockReturnValue(1)
    ;(result.current.sessionStorageCache.cleanup as any).mockReturnValue(0)

    let cleanupResult: any = null
    await act(async () => {
      cleanupResult = await result.current.cleanupExpired()
    })

    expect(result.current.memoryCache.cleanup).toHaveBeenCalled()
    expect(result.current.localStorageCache.cleanup).toHaveBeenCalled()
    expect(result.current.sessionStorageCache.cleanup).toHaveBeenCalled()
    expect(cleanupResult).toEqual({
      memory: 2,
      localStorage: 1,
      sessionStorage: 0,
    })
  })

  it('should update statistics', async () => {
    const { result } = renderHookWithProvider()

    await act(async () => {
      await result.current.updateStats()
    })

    expect(result.current.memoryCache.getStats).toHaveBeenCalled()
    expect(result.current.localStorageCache.getStats).toHaveBeenCalled()
    expect(result.current.sessionStorageCache.getStats).toHaveBeenCalled()
  })

  it('should provide statistics', async () => {
    const { result } = renderHookWithProvider()

    await waitFor(() => {
      expect(result.current.stats).toBeDefined()
    })

    expect(result.current.stats).toMatchObject({
      memory: {
        hits: 10,
        misses: 5,
        size: 3,
        maxSize: 100,
        hitRate: 0.67,
        averageAge: 5000,
      },
      localStorage: {
        hits: 8,
        misses: 2,
        size: 2,
        maxSize: 50,
        hitRate: 0.8,
        averageAge: 10000,
      },
      sessionStorage: {
        hits: 8,
        misses: 2,
        size: 2,
        maxSize: 50,
        hitRate: 0.8,
        averageAge: 10000,
      },
      image: {
        cacheApiSize: 5,
        localStorageSize: 3,
        totalEntries: 8,
      },
    })
  })
}) 