/**
 * useLocalStorage Hook
 *
 * Generic reusable hook for localStorage persistence with:
 * - Optional Zod schema validation
 * - Graceful error handling (quota exceeded, incognito mode)
 * - SSR safety (window check)
 *
 * Story WISH-2015: Sort Mode Persistence (localStorage)
 */

import { useState, useCallback, useEffect } from 'react'
import type { z } from 'zod'
import { logger } from '@repo/logger'

/**
 * Options for useLocalStorage hook
 */
interface UseLocalStorageOptions<T> {
  /** Optional Zod schema for validation */
  schema?: z.ZodSchema<T>
}

/**
 * Check if localStorage is available (SSR-safe, incognito-safe)
 */
const isLocalStorageAvailable = (): boolean => {
  try {
    if (typeof window === 'undefined' || !('localStorage' in window)) {
      return false
    }
    // Test write/read to detect incognito mode restrictions
    const testKey = '__localStorage_test__'
    window.localStorage.setItem(testKey, 'test')
    window.localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

/**
 * Read value from localStorage with optional Zod validation
 */
const readFromStorage = <T>(key: string, defaultValue: T, schema?: z.ZodSchema<T>): T => {
  if (!isLocalStorageAvailable()) {
    return defaultValue
  }

  try {
    const stored = window.localStorage.getItem(key)
    if (stored === null) {
      return defaultValue
    }

    // Parse JSON (handle raw strings for simple values)
    let parsed: unknown
    try {
      parsed = JSON.parse(stored)
    } catch {
      // If JSON parse fails, use the raw string value
      parsed = stored
    }

    // Validate with Zod schema if provided
    if (schema) {
      const result = schema.safeParse(parsed)
      if (result.success) {
        return result.data
      }
      // Invalid value - log warning and return default
      logger.warn('Invalid localStorage value', {
        key,
        value: stored,
        error: result.error.message,
      })
      return defaultValue
    }

    return parsed as T
  } catch (error) {
    logger.warn('Error reading from localStorage', {
      key,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return defaultValue
  }
}

/**
 * Write value to localStorage
 */
const writeToStorage = <T>(key: string, value: T): boolean => {
  if (!isLocalStorageAvailable()) {
    return false
  }

  try {
    const serialized = JSON.stringify(value)
    window.localStorage.setItem(key, serialized)
    return true
  } catch (error) {
    // Handle quota exceeded error
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      logger.warn('localStorage quota exceeded', {
        key,
        error: error.message,
      })
    } else {
      logger.warn('Error writing to localStorage', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
    return false
  }
}

/**
 * Remove value from localStorage
 */
const removeFromStorage = (key: string): boolean => {
  if (!isLocalStorageAvailable()) {
    return false
  }

  try {
    window.localStorage.removeItem(key)
    return true
  } catch (error) {
    logger.warn('Error removing from localStorage', {
      key,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return false
  }
}

/**
 * Generic hook for localStorage persistence with optional Zod validation.
 *
 * @param key - localStorage key
 * @param defaultValue - Default value if key doesn't exist or is invalid
 * @param options - Optional configuration (schema for validation)
 * @returns Tuple of [value, setValue, removeValue]
 *
 * @example
 * ```tsx
 * // Simple usage
 * const [theme, setTheme] = useLocalStorage('theme', 'light')
 *
 * // With Zod validation
 * const sortSchema = z.enum(['createdAt', 'title', 'price'])
 * const [sort, setSort] = useLocalStorage('sort', 'createdAt', { schema: sortSchema })
 * ```
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  options: UseLocalStorageOptions<T> = {},
): [T, (value: T) => void, () => void] {
  const { schema } = options

  // Initialize state from localStorage
  const [storedValue, setStoredValue] = useState<T>(() => {
    return readFromStorage(key, defaultValue, schema)
  })

  // Sync with localStorage on mount (for SSR hydration)
  useEffect(() => {
    const value = readFromStorage(key, defaultValue, schema)
    setStoredValue(value)
  }, [key, defaultValue, schema])

  // Set value and persist to localStorage
  const setValue = useCallback(
    (value: T) => {
      setStoredValue(value)
      writeToStorage(key, value)
    },
    [key],
  )

  // Remove value from localStorage
  const removeValue = useCallback(() => {
    setStoredValue(defaultValue)
    removeFromStorage(key)
  }, [key, defaultValue])

  return [storedValue, setValue, removeValue]
}

export { isLocalStorageAvailable, readFromStorage, writeToStorage, removeFromStorage }
