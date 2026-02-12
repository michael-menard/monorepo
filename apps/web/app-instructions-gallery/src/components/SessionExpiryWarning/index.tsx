/**
 * SessionExpiryWarning Component
 * Story INST-1105: Upload Instructions (Presigned >10MB)
 *
 * Features:
 * - AC8: Session TTL displayed to user
 * - AC21: Shows warning when session expires
 * - AC23: Refresh Session button for auto-refresh flow
 */

import { useMemo } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button, AppAlert } from '@repo/app-component-library'
import type { SessionExpiryWarningProps } from './__types__'

/**
 * Warning threshold - show warning when less than 5 minutes remain
 */
const WARNING_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Format time remaining as human-readable string
 */
function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'expired'

  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

export function SessionExpiryWarning({
  timeRemainingMs,
  onRefresh,
  isRefreshing = false,
}: SessionExpiryWarningProps) {
  /**
   * Determine if warning should be shown
   */
  const shouldShow = useMemo(() => {
    return timeRemainingMs <= WARNING_THRESHOLD_MS && timeRemainingMs > 0
  }, [timeRemainingMs])

  /**
   * Determine if session has expired
   */
  const isExpired = useMemo(() => {
    return timeRemainingMs <= 0
  }, [timeRemainingMs])

  /**
   * Format display time
   */
  const displayTime = useMemo(() => {
    return formatTimeRemaining(timeRemainingMs)
  }, [timeRemainingMs])

  // Don't render if no warning needed
  if (!shouldShow && !isExpired) {
    return null
  }

  return (
    <AppAlert
      variant={isExpired ? 'destructive' : 'warning'}
      title={isExpired ? 'Session Expired' : 'Session Expiring Soon'}
      className="mb-4"
      data-testid="session-expiry-warning"
      aria-live="polite"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm">
          {isExpired
            ? 'Your upload session has expired. Click refresh to continue.'
            : `Upload session expires in ${displayTime}. Refresh to extend.`}
        </p>
        <Button
          type="button"
          variant={isExpired ? 'default' : 'outline'}
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="w-full sm:w-auto"
          aria-label={isRefreshing ? 'Refreshing session...' : 'Refresh session'}
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          {isRefreshing ? 'Refreshing...' : 'Refresh Session'}
        </Button>
      </div>
    </AppAlert>
  )
}
