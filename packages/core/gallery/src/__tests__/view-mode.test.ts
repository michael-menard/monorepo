import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { ViewModeSchema, type ViewMode } from '../types'
import {
  getViewModeStorageKey,
  getViewModeFromStorage,
  saveViewModeToStorage,
} from '../utils/view-mode-storage'
import { useViewMode } from '../hooks/useViewMode'

const createLocalStorageMock = () => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
}

describe('ViewMode infrastructure', () => {
  const originalLocalStorage = globalThis.localStorage

  beforeEach(() => {
    // @ts-expect-error - test override
    globalThis.localStorage = createLocalStorageMock()
  })

  afterAll(() => {
    if (originalLocalStorage) {
      // @ts-expect-error - restore
      globalThis.localStorage = originalLocalStorage
    }
  })

  describe('ViewModeSchema', () => {
    it('accepts valid modes', () => {
      expect(ViewModeSchema.parse('grid')).toBe('grid')
      expect(ViewModeSchema.parse('datatable')).toBe('datatable')
    })

    it('rejects invalid modes', () => {
      expect(() => ViewModeSchema.parse('invalid')).toThrow()
    })
  })

  describe('storage utilities', () => {
    it('builds storage key correctly', () => {
      expect(getViewModeStorageKey('wishlist')).toBe('gallery_view_mode_wishlist')
    })

    it('reads view mode from storage', () => {
      const key = getViewModeStorageKey('wishlist')
      globalThis.localStorage.setItem(key, 'datatable')
      const mode = getViewModeFromStorage('wishlist')
      expect(mode).toBe<'datatable' | 'grid'>('datatable')
    })

    it('returns null when storage empty', () => {
      const mode = getViewModeFromStorage('wishlist')
      expect(mode).toBeNull()
    })

    it('returns null for invalid stored values', () => {
      const key = getViewModeStorageKey('wishlist')
      globalThis.localStorage.setItem(key, 'invalid')
      const mode = getViewModeFromStorage('wishlist')
      expect(mode).toBeNull()
    })

    it('saves view mode to storage', () => {
      saveViewModeToStorage('wishlist', 'datatable')
      const key = getViewModeStorageKey('wishlist')
      expect(globalThis.localStorage.getItem(key)).toBe('datatable')
    })
  })

  describe('useViewMode hook', () => {
    it('initializes from localStorage when available', () => {
      const key = getViewModeStorageKey('wishlist')
      globalThis.localStorage.setItem(key, 'datatable')

      const { result } = renderHook(() => useViewMode('wishlist'))
      expect(result.current[0]).toBe<'datatable' | 'grid'>('datatable')
    })

    it('falls back to urlMode when storage empty', () => {
      const { result } = renderHook(() =>
        useViewMode('wishlist', { urlMode: 'datatable' }),
      )
      expect(result.current[0]).toBe<'datatable' | 'grid'>('datatable')
    })

    it('falls back to defaultMode when both storage and url empty', () => {
      const { result } = renderHook(() => useViewMode('wishlist'))
      expect(result.current[0]).toBe<'datatable' | 'grid'>('grid')
    })

    it('persists changes to localStorage', () => {
      const { result } = renderHook(() => useViewMode('wishlist'))

      act(() => {
        const setMode = result.current[1]
        setMode('datatable')
      })

      const key = getViewModeStorageKey('wishlist')
      expect(globalThis.localStorage.getItem(key)).toBe('datatable')
    })
  })
})
