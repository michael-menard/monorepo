import { useEffect } from 'react'
import { useToast } from '@repo/app-component-library'
import { logger } from '@repo/logger'
import { useAppSelector } from '@/store/hooks'
import { selectAuth } from '@/store/slices/authSlice'
import { isTokenExpired } from '@repo/auth-utils/jwt'
import { useAuth } from '@/services/auth/AuthProvider'

/**
 * Threshold in seconds before token expiry to trigger refresh
 * Set to 5 minutes (300 seconds) to match CognitoTokenManager buffer
 */
const REFRESH_THRESHOLD_SECONDS = 5 * 60

/**
 * Interval in milliseconds to check token expiry
 * Check every minute (60,000 ms)
 */
const CHECK_INTERVAL_MS = 60 * 1000

/**
 * Hook to automatically refresh authentication tokens before they expire.
 *
 * This hook:
 * - Checks token expiry every minute
 * - Triggers refresh when token expires within 5 minutes
 * - Shows toast notification if refresh fails
 * - Logs out user if refresh fails
 *
 * The actual token refresh is handled by:
 * 1. AuthProvider.refreshTokens() - Calls Amplify fetchAuthSession({ forceRefresh: true })
 * 2. AuthProvider Hub listener - Updates Redux when Amplify emits tokenRefresh event
 * 3. CognitoTokenManager - Manages token state and automatic refresh on API calls
 *
 * This hook provides proactive refresh to prevent token expiry during user activity.
 *
 * @example
 * ```tsx
 * function App() {
 *   useTokenRefresh() // Add at app level
 *   return <RouterProvider router={router} />
 * }
 * ```
 */
export const useTokenRefresh = () => {
  const { isAuthenticated, tokens } = useAppSelector(selectAuth)
  const { refreshTokens } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    // Only run for authenticated users with tokens
    if (!isAuthenticated || !tokens?.accessToken) {
      return
    }

    const checkAndRefresh = async () => {
      try {
        // Check if token expires within threshold (5 minutes)
        if (isTokenExpired(tokens.accessToken!, REFRESH_THRESHOLD_SECONDS)) {
          logger.info('Token expiring soon, triggering refresh', {
            threshold: REFRESH_THRESHOLD_SECONDS,
          })

          // Trigger refresh - this will:
          // 1. Call Amplify fetchAuthSession({ forceRefresh: true })
          // 2. Amplify will emit 'tokenRefresh' Hub event
          // 3. AuthProvider Hub listener will update Redux
          await refreshTokens()

          logger.info('Token refresh successful')
        }
      } catch (error) {
        // Error handling is done by AuthProvider Hub listener
        // which listens for 'tokenRefresh_failure' event and logs out user
        // We just show a user-friendly notification here
        logger.error('Token refresh failed in useTokenRefresh', { error })

        toast({
          title: 'Session Expired',
          description: 'Please sign in again.',
          variant: 'destructive',
        })
      }
    }

    // Check immediately on mount
    checkAndRefresh()

    // Check every minute
    const interval = setInterval(checkAndRefresh, CHECK_INTERVAL_MS)

    // Cleanup interval on unmount
    return () => clearInterval(interval)
  }, [isAuthenticated, tokens?.accessToken, refreshTokens, toast])
}
