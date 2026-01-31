/**
 * useLocalStorage Hook Tests
 *
 * Story WISH-2015: Sort Mode Persistence (localStorage)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { z } from 'zod'
import {
  useLocalStorage,
  isLocalStorageAvailable,
  readFromStorage,
  writeToStorage,
  removeFromStorage,
} from '../useLocalStorage'

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

describe('useLocalStorage', () => {
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

  describe('isLocalStorageAvailable', () => {
    it('returns true when localStorage is available', () => {
      expect(isLocalStorageAvailable()).toBe(true)
    })

    it('returns false when localStorage throws on setItem', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('localStorage is disabled')
      })
      expect(isLocalStorageAvailable()).toBe(false)
    })
  })

  describe('readFromStorage', () => {
    it('returns default value when key does not exist', () => {
      const result = readFromStorage('nonexistent', 'default')
      expect(result).toBe('default')
    })

    it('returns parsed JSON value from storage', () => {
      localStorageMock.setItem('testKey', JSON.stringify('stored'))
      const result = readFromStorage('testKey', 'default')
      expect(result).toBe('stored')
    })

    it('handles raw string values', () => {
      localStorageMock.setItem('testKey', 'rawString')
      const result = readFromStorage('testKey', 'default')
      expect(result).toBe('rawString')
    })

    it('validates value with Zod schema and returns it when valid', () => {
      const schema = z.enum(['a', 'b', 'c'])
      localStorageMock.setItem('testKey', JSON.stringify('b'))
      const result = readFromStorage('testKey', 'a', schema)
      expect(result).toBe('b')
    })

    it('returns default value when Zod validation fails', () => {
      const schema = z.enum(['a', 'b', 'c'])
      localStorageMock.setItem('testKey', JSON.stringify('invalid'))
      const result = readFromStorage('testKey', 'a', schema)
      expect(result).toBe('a')
    })
  })

  describe('writeToStorage', () => {
    it('writes JSON stringified value to localStorage', () => {
      const result = writeToStorage('testKey', 'testValue')
      expect(result).toBe(true)
      expect(localStorageMock.setItem).toHaveBeenCalledWith('testKey', '"testValue"')
    })

    it('handles quota exceeded error gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        const error = new Error('Quota exceeded')
        error.name = 'QuotaExceededError'
        throw error
      })
      const result = writeToStorage('testKey', 'testValue')
      expect(result).toBe(false)
    })

    it('handles other errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Unknown error')
      })
      const result = writeToStorage('testKey', 'testValue')
      expect(result).toBe(false)
    })
  })

  describe('removeFromStorage', () => {
    it('removes key from localStorage', () => {
      const result = removeFromStorage('testKey')
      expect(result).toBe(true)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('testKey')
    })

    it('handles errors gracefully', () => {
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error('Remove error')
      })
      const result = removeFromStorage('testKey')
      expect(result).toBe(false)
    })
  })

  describe('useLocalStorage hook', () => {
    it('initializes with default value when localStorage is empty', () => {
      const { result } = renderHook(() => useLocalStorage('testKey', 'default'))
      expect(result.current[0]).toBe('default')
    })

    it('initializes with value from localStorage', () => {
      localStorageMock.setItem('testKey', JSON.stringify('stored'))
      const { result } = renderHook(() => useLocalStorage('testKey', 'default'))
      expect(result.current[0]).toBe('stored')
    })

    it('updates state and localStorage when setValue is called', () => {
      const { result } = renderHook(() => useLocalStorage('testKey', 'default'))

      act(() => {
        const setValue = result.current[1]
        setValue('newValue')
      })

      expect(result.current[0]).toBe('newValue')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('testKey', '"newValue"')
    })

    it('removes value and resets to default when removeValue is called', () => {
      localStorageMock.setItem('testKey', JSON.stringify('stored'))
      const { result } = renderHook(() => useLocalStorage('testKey', 'default'))

      act(() => {
        const removeValue = result.current[2]
        removeValue()
      })

      expect(result.current[0]).toBe('default')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('testKey')
    })

    it('validates with Zod schema on initialization', () => {
      const schema = z.enum(['a', 'b', 'c'])
      localStorageMock.setItem('testKey', JSON.stringify('b'))
      const { result } = renderHook(() =>
        useLocalStorage('testKey', 'a', { schema }),
      )
      expect(result.current[0]).toBe('b')
    })

    it('falls back to default when Zod validation fails on initialization', () => {
      const schema = z.enum(['a', 'b', 'c'])
      localStorageMock.setItem('testKey', JSON.stringify('invalid'))
      const { result } = renderHook(() =>
        useLocalStorage('testKey', 'a', { schema }),
      )
      expect(result.current[0]).toBe('a')
    })

    it('handles object values correctly', () => {
      const defaultValue = { count: 0, name: 'default' }
      const { result } = renderHook(() => useLocalStorage('testKey', defaultValue))

      act(() => {
        const setValue = result.current[1]
        setValue({ count: 5, name: 'updated' })
      })

      expect(result.current[0]).toEqual({ count: 5, name: 'updated' })
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'testKey',
        '{"count":5,"name":"updated"}',
      )
    })

    it('handles array values correctly', () => {
      const defaultValue = ['a', 'b']
      const { result } = renderHook(() => useLocalStorage('testKey', defaultValue))

      act(() => {
        const setValue = result.current[1]
        setValue(['c', 'd', 'e'])
      })

      expect(result.current[0]).toEqual(['c', 'd', 'e'])
    })
  })
})
