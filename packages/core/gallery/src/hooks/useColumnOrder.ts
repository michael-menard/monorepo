import { useState, useEffect, useCallback } from 'react'
import { logger } from '@repo/logger'

interface UseColumnOrderProps {
  /** Unique key for localStorage */
  storageKey: string
  /** Initial column order if not found in storage */
  initialOrder: string[]
  /** Whether to persist to localStorage */
  persist?: boolean
}

interface UseColumnOrderReturn {
  columnOrder: string[]
  setColumnOrder: (order: string[]) => void
  resetColumnOrder: () => void
}

/**
 * Hook to manage column order with optional localStorage persistence
 */
export function useColumnOrder({
  storageKey,
  initialOrder,
  persist = true,
}: UseColumnOrderProps): UseColumnOrderReturn {
  const [columnOrder, setColumnOrderState] = useState<string[]>(() => {
    if (!persist) return initialOrder

    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsedOrder = JSON.parse(stored) as string[]
        // Validate that all initial columns are present
        const hasAllColumns = initialOrder.every(col => parsedOrder.includes(col))
        const hasExtraColumns = parsedOrder.some(col => !initialOrder.includes(col))

        // If columns have changed, use initial order
        if (!hasAllColumns || hasExtraColumns) {
          localStorage.setItem(storageKey, JSON.stringify(initialOrder))
          return initialOrder
        }
        return parsedOrder
      } else {
        // No stored value, save the initial order
        localStorage.setItem(storageKey, JSON.stringify(initialOrder))
      }
    } catch (error) {
      logger.warn('Failed to load column order from localStorage:', { error })
    }

    return initialOrder
  })

  const setColumnOrder = useCallback(
    (order: string[]) => {
      setColumnOrderState(order)

      if (persist) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(order))
        } catch (error) {
          logger.warn('Failed to save column order to localStorage:', { error })
        }
      }
    },
    [persist, storageKey],
  )

  const resetColumnOrder = useCallback(() => {
    setColumnOrderState(initialOrder)

    if (persist) {
      try {
        localStorage.removeItem(storageKey)
      } catch (error) {
        logger.warn('Failed to reset column order in localStorage:', { error })
      }
    }
  }, [initialOrder, persist, storageKey])

  // Sync with storage changes from other tabs
  useEffect(() => {
    if (!persist) return

    const handleStorageChange = (e: any) => {
      if (e.key === storageKey && e.newValue) {
        try {
          const newOrder = JSON.parse(e.newValue) as string[]
          setColumnOrderState(newOrder)
        } catch (error) {
          logger.warn('Failed to sync column order from storage event:', { error })
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [storageKey, persist])

  return {
    columnOrder,
    setColumnOrder,
    resetColumnOrder,
  }
}
