/**
 * useWishlistSortPersistence Hook
 *
 * Wishlist-specific hook for persisting sort mode to localStorage.
 * Uses Zod validation from WishlistQueryParamsSchema.
 *
 * Story WISH-2015: Sort Mode Persistence (localStorage)
 */

import { useCallback, useMemo } from 'react'
import { z } from 'zod'
import { useLocalStorage } from '@repo/hooks/useLocalStorage'

/**
 * Storage key for wishlist sort mode (scoped to app)
 */
export const WISHLIST_SORT_STORAGE_KEY = 'app.wishlist.sortMode'

/**
 * Default sort mode for wishlist
 */
export const DEFAULT_SORT_MODE = 'sortOrder-asc'

/**
 * Zod schema for valid sort field values
 * Matches WishlistQueryParamsSchema.shape.sort but includes compound values
 */
const WishlistSortFieldSchema = z.enum([
  'createdAt',
  'title',
  'price',
  'pieceCount',
  'sortOrder',
  'priority',
])

/**
 * Schema for compound sort values (field-order format)
 * e.g., "createdAt-desc", "title-asc", "price-desc"
 */
const WishlistSortModeSchema = z.string().refine(
  value => {
    const parts = value.split('-')
    if (parts.length !== 2) return false
    const [field, order] = parts
    const fieldValid = WishlistSortFieldSchema.safeParse(field).success
    const orderValid = order === 'asc' || order === 'desc'
    return fieldValid && orderValid
  },
  { message: 'Invalid sort mode format. Expected "field-order" (e.g., "createdAt-desc")' },
)

export type WishlistSortMode = z.infer<typeof WishlistSortModeSchema>

/**
 * Return type for useWishlistSortPersistence hook
 */
interface UseWishlistSortPersistenceReturn {
  /** Current sort mode value */
  sortMode: string
  /** Set the sort mode (persists to localStorage) */
  setSortMode: (mode: string) => void
  /** Clear persisted sort mode (reset to default) */
  clearSortMode: () => void
  /** Whether the sort mode was restored from localStorage */
  wasRestored: boolean
}

/**
 * Hook for persisting wishlist sort mode to localStorage.
 *
 * Features:
 * - Validates sort mode against Zod schema
 * - Falls back to default if invalid value stored
 * - Tracks if sort was restored for screen reader announcement
 *
 * @returns Object with sortMode, setSortMode, clearSortMode, and wasRestored
 *
 * @example
 * ```tsx
 * const { sortMode, setSortMode, wasRestored } = useWishlistSortPersistence()
 *
 * // Use sortMode as initial value for FilterProvider
 * // Call setSortMode when user changes sort dropdown
 * ```
 */
/**
 * Check if a value was restored from localStorage (synchronous check)
 */
const checkWasRestored = (): boolean => {
  if (typeof window === 'undefined' || !('localStorage' in window)) {
    return false
  }

  try {
    const stored = window.localStorage.getItem(WISHLIST_SORT_STORAGE_KEY)
    if (!stored) return false

    // Parse the stored value (it's JSON stringified)
    let parsed: string
    try {
      parsed = JSON.parse(stored)
    } catch {
      parsed = stored
    }

    // Validate and check if different from default
    const result = WishlistSortModeSchema.safeParse(parsed)
    return result.success && result.data !== DEFAULT_SORT_MODE
  } catch {
    return false
  }
}

export function useWishlistSortPersistence(): UseWishlistSortPersistenceReturn {
  const [sortMode, setSortModeInternal, clearSortMode] = useLocalStorage(
    WISHLIST_SORT_STORAGE_KEY,
    DEFAULT_SORT_MODE,
    { schema: WishlistSortModeSchema },
  )

  // Check if this was restored from localStorage (computed once on mount)
  const wasRestored = useMemo(() => checkWasRestored(), [])

  // Wrapper to persist sort mode changes
  const setSortMode = useCallback(
    (mode: string) => {
      // Validate before saving
      const result = WishlistSortModeSchema.safeParse(mode)
      if (result.success) {
        setSortModeInternal(mode)
      } else {
        // If invalid, still update state but don't persist
        setSortModeInternal(DEFAULT_SORT_MODE)
      }
    },
    [setSortModeInternal],
  )

  return {
    sortMode,
    setSortMode,
    clearSortMode,
    wasRestored,
  }
}
