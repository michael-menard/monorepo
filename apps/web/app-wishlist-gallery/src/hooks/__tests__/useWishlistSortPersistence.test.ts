/**
 * useWishlistSortPersistence Hook Tests
 *
 * Story WISH-2015: Sort Mode Persistence (localStorage)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  useWishlistSortPersistence,
  WISHLIST_SORT_STORAGE_KEY,
  DEFAULT_SORT_MODE,
} from '../useWishlistSortPersistence'

/**
 * Create a mock localStorage implementation
 */
const createLocalStorageMock = () => {
  let store: Record<string, string> = {}

  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    _getStore: () => store,
    _setStore: (newStore: Record<string, string>) => {
      store = newStore
    },
  }
}

describe('useWishlistSortPersistence', () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>
  const originalLocalStorage = globalThis.localStorage

  beforeEach(() => {
    localStorageMock = createLocalStorageMock()
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    })
  })

  describe('Constants', () => {
    it('exports correct storage key', () => {
      expect(WISHLIST_SORT_STORAGE_KEY).toBe('app.wishlist.sortMode')
    })

    it('exports correct default sort mode', () => {
      expect(DEFAULT_SORT_MODE).toBe('sortOrder-asc')
    })
  })

  describe('Initial Load', () => {
    it('returns default sort mode when localStorage is empty', () => {
      const { result } = renderHook(() => useWishlistSortPersistence())
      expect(result.current.sortMode).toBe(DEFAULT_SORT_MODE)
    })

    it('loads persisted sort mode from localStorage', () => {
      localStorageMock.setItem(WISHLIST_SORT_STORAGE_KEY, JSON.stringify('createdAt-desc'))
      const { result } = renderHook(() => useWishlistSortPersistence())
      expect(result.current.sortMode).toBe('createdAt-desc')
    })

    it('falls back to default for invalid localStorage value', () => {
      localStorageMock.setItem(WISHLIST_SORT_STORAGE_KEY, JSON.stringify('invalidSort'))
      const { result } = renderHook(() => useWishlistSortPersistence())
      expect(result.current.sortMode).toBe(DEFAULT_SORT_MODE)
    })

    it('handles malformed JSON in localStorage', () => {
      localStorageMock.setItem(WISHLIST_SORT_STORAGE_KEY, '{bad json')
      const { result } = renderHook(() => useWishlistSortPersistence())
      expect(result.current.sortMode).toBe(DEFAULT_SORT_MODE)
    })
  })

  describe('Persistence', () => {
    it('persists sort mode to localStorage on change', () => {
      const { result } = renderHook(() => useWishlistSortPersistence())

      act(() => {
        result.current.setSortMode('price-desc')
      })

      expect(result.current.sortMode).toBe('price-desc')
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        WISHLIST_SORT_STORAGE_KEY,
        '"price-desc"',
      )
    })

    it('validates sort mode before persisting', () => {
      const { result } = renderHook(() => useWishlistSortPersistence())

      act(() => {
        result.current.setSortMode('invalidSort')
      })

      // Should fall back to default for invalid sort
      expect(result.current.sortMode).toBe(DEFAULT_SORT_MODE)
    })

    it('accepts all valid sort modes', () => {
      const validSortModes = [
        'createdAt-asc',
        'createdAt-desc',
        'title-asc',
        'title-desc',
        'price-asc',
        'price-desc',
        'pieceCount-asc',
        'pieceCount-desc',
        'sortOrder-asc',
        'sortOrder-desc',
        'priority-asc',
        'priority-desc',
      ]

      for (const sortMode of validSortModes) {
        const { result } = renderHook(() => useWishlistSortPersistence())
        act(() => {
          result.current.setSortMode(sortMode)
        })
        expect(result.current.sortMode).toBe(sortMode)
      }
    })
  })

  describe('Clear', () => {
    it('clears persisted sort mode and resets to default', () => {
      localStorageMock.setItem(WISHLIST_SORT_STORAGE_KEY, JSON.stringify('createdAt-desc'))
      const { result } = renderHook(() => useWishlistSortPersistence())

      act(() => {
        result.current.clearSortMode()
      })

      expect(result.current.sortMode).toBe(DEFAULT_SORT_MODE)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(WISHLIST_SORT_STORAGE_KEY)
    })
  })

  describe('Restoration Tracking', () => {
    it('wasRestored is true when sort was restored from localStorage', () => {
      localStorageMock.setItem(WISHLIST_SORT_STORAGE_KEY, JSON.stringify('createdAt-desc'))
      const { result } = renderHook(() => useWishlistSortPersistence())
      expect(result.current.wasRestored).toBe(true)
    })

    it('wasRestored is false when using default sort mode', () => {
      const { result } = renderHook(() => useWishlistSortPersistence())
      expect(result.current.wasRestored).toBe(false)
    })

    it('wasRestored is false when restored value equals default', () => {
      localStorageMock.setItem(WISHLIST_SORT_STORAGE_KEY, JSON.stringify(DEFAULT_SORT_MODE))
      const { result } = renderHook(() => useWishlistSortPersistence())
      expect(result.current.wasRestored).toBe(false)
    })
  })
})
