/**
 * Story 3.1.10 + 3.1.20: Rate Limit Banner Component
 *
 * Banner for handling 429 Too Many Requests errors.
 * Shows countdown timer until retry is allowed.
 * Respects prefers-reduced-motion for animations.
 */

import { useState, useEffect, useCallback } from 'react'
import { Clock, RefreshCw } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle, Button, cn } from '@repo/app-component-library'
import type { RateLimitBannerProps } from './__types__'

/**
 * Format seconds as MM:SS
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Rate limit banner with countdown
 */
export function RateLimitBanner({
  visible,
  retryAfterSeconds,
  onRetry,
  onDismiss,
}: RateLimitBannerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(retryAfterSeconds)
  const [canRetry, setCanRetry] = useState(false)

  // Reset countdown when retryAfterSeconds changes
  useEffect(() => {
    setRemainingSeconds(retryAfterSeconds)
    setCanRetry(retryAfterSeconds <= 0)
  }, [retryAfterSeconds])

  // Countdown timer
  useEffect(() => {
    if (!visible || remainingSeconds <= 0) {
      return
    }

    const timer = setInterval(() => {
      setRemainingSeconds(prev => {
        const next = prev - 1
        if (next <= 0) {
          setCanRetry(true)
          return 0
        }
        return next
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [visible, remainingSeconds])

  const handleRetry = useCallback(() => {
    if (canRetry) {
      onRetry()
    }
  }, [canRetry, onRetry])

  if (!visible) {
    return null
  }

  return (
    <Alert variant="destructive" className="relative">
      <Clock className="h-4 w-4" />
      <AlertTitle>Rate Limit Exceeded</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>
          {canRetry
            ? 'You can now retry your request.'
            : `Too many requests. Please wait ${formatTime(remainingSeconds)} before retrying.`}
        </span>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            disabled={!canRetry}
            className="gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </Button>

          {onDismiss ? (
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              Dismiss
            </Button>
          ) : null}
        </div>
      </AlertDescription>

      {/* Progress indicator (Story 3.1.20: respects reduced motion) */}
      {!canRetry && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-destructive/20 overflow-hidden">
          <div
            className={cn(
              'h-full bg-destructive',
              'transition-all duration-1000 ease-linear',
              'motion-reduce:transition-none',
            )}
            style={{
              width: `${((retryAfterSeconds - remainingSeconds) / retryAfterSeconds) * 100}%`,
            }}
            role="progressbar"
            aria-valuenow={Math.round(
              ((retryAfterSeconds - remainingSeconds) / retryAfterSeconds) * 100,
            )}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Rate limit countdown progress"
          />
        </div>
      )}

      {/* Screen reader announcement */}
      <div role="timer" aria-live="polite" className="sr-only">
        {canRetry
          ? 'Rate limit expired. You can now retry.'
          : `${remainingSeconds} seconds remaining until you can retry.`}
      </div>
    </Alert>
  )
}
