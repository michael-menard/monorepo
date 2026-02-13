/**
 * Story 3.1.10 + 3.1.20: Session Expired Banner Component
 *
 * Banner for handling expired upload sessions.
 * Provides action to refresh session for affected files.
 * Respects prefers-reduced-motion for animations.
 */

import { AlertCircle, RefreshCw } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle, Button, cn } from '@repo/app-component-library'
import type { SessionExpiredBannerProps } from './__types__'

/**
 * Session expired banner with refresh action
 */
export function SessionExpiredBanner({
  visible,
  expiredCount,
  onRefreshSession,
  isRefreshing = false,
}: SessionExpiredBannerProps) {
  if (!visible || expiredCount === 0) {
    return null
  }

  return (
    <Alert variant="destructive" className="border-yellow-500 bg-yellow-500/10">
      <AlertCircle className="h-4 w-4 text-yellow-600" />
      <AlertTitle className="text-yellow-700">Upload Session Expired</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span className="text-yellow-700">
          {expiredCount === 1
            ? '1 file needs a new upload session.'
            : `${expiredCount} files need new upload sessions.`}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={onRefreshSession}
          disabled={isRefreshing}
          aria-busy={isRefreshing}
          className="gap-1 border-yellow-500 text-yellow-700 hover:bg-yellow-500/20"
        >
          <RefreshCw
            className={cn('h-3 w-3', isRefreshing && 'animate-spin motion-reduce:animate-none')}
            aria-hidden="true"
          />
          {isRefreshing ? 'Refreshing...' : 'Refresh Session'}
        </Button>
      </AlertDescription>

      {/* Screen reader announcement */}
      <div role="alert" aria-live="assertive" className="sr-only">
        Upload session expired for {expiredCount} {expiredCount === 1 ? 'file' : 'files'}. Click
        Refresh Session to continue uploading.
      </div>
    </Alert>
  )
}
