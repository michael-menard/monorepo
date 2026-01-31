/**
 * Feature Flag Context (WISH-2009 - AC10)
 *
 * React context provider for feature flags.
 * Fetches flags from API on mount and provides isFeatureEnabled method.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import { type FeatureFlagsResponse, WishlistFlagKeys } from '@repo/api-client/schemas/feature-flags'

// ─────────────────────────────────────────────────────────────────────────────
// Context Types
// ─────────────────────────────────────────────────────────────────────────────

interface FeatureFlagContextValue {
  /** All flags as key-value pairs */
  flags: FeatureFlagsResponse
  /** Check if a specific flag is enabled */
  isFeatureEnabled: (flagKey: string) => boolean
  /** Whether flags are still loading */
  isLoading: boolean
  /** Error if flag fetch failed */
  error: Error | null
  /** Refresh flags from API */
  refetch: () => Promise<void>
}

const FeatureFlagContext = createContext<FeatureFlagContextValue | null>(null)

// ─────────────────────────────────────────────────────────────────────────────
// Provider Props
// ─────────────────────────────────────────────────────────────────────────────

interface FeatureFlagProviderProps {
  children: ReactNode
  /** API base URL (defaults to /api) */
  apiBaseUrl?: string
  /** Cache time in milliseconds (defaults to 5 minutes) */
  cacheTimeMs?: number
  /** Initial flags (for testing/SSR) */
  initialFlags?: FeatureFlagsResponse
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider Component
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_CACHE_TIME_MS = 5 * 60 * 1000 // 5 minutes

export function FeatureFlagProvider({
  children,
  apiBaseUrl = '/api',
  cacheTimeMs = DEFAULT_CACHE_TIME_MS,
  initialFlags = {},
}: FeatureFlagProviderProps) {
  const [flags, setFlags] = useState<FeatureFlagsResponse>(initialFlags)
  const [isLoading, setIsLoading] = useState(Object.keys(initialFlags).length === 0)
  const [error, setError] = useState<Error | null>(null)
  const [lastFetched, setLastFetched] = useState<number>(0)

  // Fetch flags from API
  const fetchFlags = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`${apiBaseUrl}/config/flags`, {
        credentials: 'include', // Include auth cookies
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch feature flags: ${response.status}`)
      }

      const data = (await response.json()) as FeatureFlagsResponse
      setFlags(data)
      setLastFetched(Date.now())
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      // Keep existing flags on error (stale-while-revalidate)
    } finally {
      setIsLoading(false)
    }
  }, [apiBaseUrl])

  // Refetch function (exposed to consumers)
  const refetch = useCallback(async () => {
    await fetchFlags()
  }, [fetchFlags])

  // Fetch flags on mount
  useEffect(() => {
    fetchFlags()
  }, [fetchFlags])

  // Refresh flags on window focus (stale-while-revalidate pattern)
  useEffect(() => {
    function handleFocus() {
      const now = Date.now()
      // Only refetch if cache is stale
      if (now - lastFetched > cacheTimeMs) {
        fetchFlags()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchFlags, lastFetched, cacheTimeMs])

  // Check if a flag is enabled
  const isFeatureEnabled = useCallback(
    (flagKey: string): boolean => {
      // Return false while loading (safe default)
      if (isLoading && Object.keys(flags).length === 0) {
        return false
      }

      return flags[flagKey] === true
    },
    [flags, isLoading],
  )

  const value = useMemo<FeatureFlagContextValue>(
    () => ({
      flags,
      isFeatureEnabled,
      isLoading,
      error,
      refetch,
    }),
    [flags, isFeatureEnabled, isLoading, error, refetch],
  )

  return <FeatureFlagContext.Provider value={value}>{children}</FeatureFlagContext.Provider>
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Use the feature flag context
 * Must be used within a FeatureFlagProvider
 */
export function useFeatureFlagContext(): FeatureFlagContextValue {
  const context = useContext(FeatureFlagContext)

  if (!context) {
    throw new Error('useFeatureFlagContext must be used within a FeatureFlagProvider')
  }

  return context
}

// Re-export flag keys for convenience
export { WishlistFlagKeys }
