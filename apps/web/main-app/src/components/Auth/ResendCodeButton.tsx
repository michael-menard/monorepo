import { useState, useEffect, useCallback } from 'react'
import { Button, cn } from '@repo/ui'

// SessionStorage keys for cooldown persistence
const RESEND_COOLDOWN_KEY = 'auth_resend_cooldown'
const RESEND_ATTEMPT_KEY = 'auth_resend_attempts'
const RESEND_ATTEMPT_RESET_KEY = 'auth_resend_attempt_reset'

// Default cooldown in seconds (base cooldown)
const DEFAULT_BASE_COOLDOWN_SECONDS = 60

// Maximum cooldown cap in seconds (10 minutes)
const MAX_COOLDOWN_SECONDS = 600

// Time after which attempt count resets (30 minutes of inactivity)
const ATTEMPT_RESET_MS = 30 * 60 * 1000

/**
 * Calculate exponential backoff cooldown based on attempt number
 * Formula: base * 2^(attempt-1), capped at max
 * Attempt 1: 60s, Attempt 2: 120s, Attempt 3: 240s, Attempt 4: 480s, Attempt 5+: 600s (capped)
 */
const calculateCooldown = (
  attemptNumber: number,
  baseCooldown: number,
  maxCooldown: number,
): number => {
  if (attemptNumber <= 0) return baseCooldown
  const exponentialCooldown = baseCooldown * Math.pow(2, attemptNumber - 1)
  return Math.min(exponentialCooldown, maxCooldown)
}

/**
 * Get remaining cooldown time from sessionStorage
 */
const getCooldownRemaining = (): number => {
  const stored = sessionStorage.getItem(RESEND_COOLDOWN_KEY)
  if (!stored) return 0

  const expiresAt = parseInt(stored, 10)
  if (isNaN(expiresAt)) return 0

  const remaining = Math.ceil((expiresAt - Date.now()) / 1000)
  return Math.max(0, remaining)
}

/**
 * Set cooldown expiration time in sessionStorage
 */
const setCooldown = (seconds: number): void => {
  const expiresAt = Date.now() + seconds * 1000
  sessionStorage.setItem(RESEND_COOLDOWN_KEY, expiresAt.toString())
}

/**
 * Get current attempt count from sessionStorage
 * Resets if last attempt was more than ATTEMPT_RESET_MS ago
 */
const getAttemptCount = (): number => {
  const resetTime = sessionStorage.getItem(RESEND_ATTEMPT_RESET_KEY)

  // Check if we should reset attempt count due to inactivity
  if (resetTime) {
    const resetAt = parseInt(resetTime, 10)
    if (!isNaN(resetAt) && Date.now() > resetAt) {
      // Reset attempts after inactivity period
      sessionStorage.removeItem(RESEND_ATTEMPT_KEY)
      sessionStorage.removeItem(RESEND_ATTEMPT_RESET_KEY)
      return 0
    }
  }

  const stored = sessionStorage.getItem(RESEND_ATTEMPT_KEY)
  if (!stored) return 0

  const attempts = parseInt(stored, 10)
  return isNaN(attempts) ? 0 : attempts
}

/**
 * Increment attempt count and update reset timer
 */
const incrementAttemptCount = (): number => {
  const currentAttempts = getAttemptCount()
  const newAttempts = currentAttempts + 1

  sessionStorage.setItem(RESEND_ATTEMPT_KEY, newAttempts.toString())
  // Set reset time to 30 minutes from now
  sessionStorage.setItem(RESEND_ATTEMPT_RESET_KEY, (Date.now() + ATTEMPT_RESET_MS).toString())

  return newAttempts
}

/**
 * Clear all cooldown and attempt data from sessionStorage
 */
const clearCooldownData = (): void => {
  sessionStorage.removeItem(RESEND_COOLDOWN_KEY)
  // Note: We don't clear attempt count here - it should persist until timeout
}

export interface ResendCodeButtonProps {
  /** Async function called when resend is requested. Should throw on error. */
  onResend: () => Promise<{ success: boolean; error?: string }>
  /** Base cooldown duration in seconds (first attempt). Default: 60 */
  baseCooldownSeconds?: number
  /** Maximum cooldown duration in seconds (cap). Default: 600 (10 min) */
  maxCooldownSeconds?: number
  /** Additional CSS classes */
  className?: string
  /** Whether the button should be disabled externally */
  disabled?: boolean
  /** Callback when resend succeeds */
  onSuccess?: () => void
  /** Callback when resend fails with error message */
  onError?: (error: string) => void
  /** Custom text when button is active */
  activeText?: string
  /** Data test ID for testing */
  'data-testid'?: string
}

/**
 * Reusable resend code button with exponential backoff cooldown
 *
 * Features:
 * - Exponential backoff: 60s → 120s → 240s → 480s → 600s (capped)
 * - SessionStorage persistence (survives page refresh)
 * - Attempt count resets after 30 minutes of inactivity
 * - Loading state during request
 * - Accessible with proper ARIA attributes
 * - Works for both signup verification and MFA
 */
export function ResendCodeButton({
  onResend,
  baseCooldownSeconds = DEFAULT_BASE_COOLDOWN_SECONDS,
  maxCooldownSeconds = MAX_COOLDOWN_SECONDS,
  className,
  disabled = false,
  onSuccess,
  onError,
  activeText = "Didn't receive a code? Resend",
  'data-testid': testId = 'resend-code-button',
}: ResendCodeButtonProps) {
  // Initialize countdown from sessionStorage (for page refresh persistence)
  const [countdown, setCountdown] = useState(() => getCooldownRemaining())
  const [isLoading, setIsLoading] = useState(false)
  const [attemptCount, setAttemptCount] = useState(() => getAttemptCount())

  // Countdown timer effect
  useEffect(() => {
    if (countdown <= 0) return

    const timer = setInterval(() => {
      const remaining = getCooldownRemaining()
      setCountdown(remaining)

      // Clear cooldown data if countdown finished
      if (remaining <= 0) {
        clearCooldownData()
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [countdown])

  // Check for attempt count reset periodically
  useEffect(() => {
    const checkAttemptReset = () => {
      const currentAttempts = getAttemptCount()
      if (currentAttempts !== attemptCount) {
        setAttemptCount(currentAttempts)
      }
    }

    // Check every minute
    const timer = setInterval(checkAttemptReset, 60000)
    return () => clearInterval(timer)
  }, [attemptCount])

  const handleResend = useCallback(async () => {
    if (countdown > 0 || isLoading || disabled) return

    try {
      setIsLoading(true)

      const result = await onResend()

      if (result.success) {
        // Increment attempt count and calculate new cooldown
        const newAttemptCount = incrementAttemptCount()
        setAttemptCount(newAttemptCount)

        const cooldownDuration = calculateCooldown(
          newAttemptCount,
          baseCooldownSeconds,
          maxCooldownSeconds,
        )

        // Start cooldown
        setCooldown(cooldownDuration)
        setCountdown(cooldownDuration)
        onSuccess?.()
      } else {
        onError?.(result.error || 'Failed to resend code. Please try again.')
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to resend code. Please try again.'
      onError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [
    countdown,
    isLoading,
    disabled,
    onResend,
    baseCooldownSeconds,
    maxCooldownSeconds,
    onSuccess,
    onError,
  ])

  const isDisabled = countdown > 0 || isLoading || disabled

  // Format countdown for display (show minutes:seconds if over 60s)
  const formatCountdown = (seconds: number): string => {
    if (seconds <= 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Determine button text
  const buttonText = (() => {
    if (isLoading) return 'Sending...'
    if (countdown > 0) return `Resend code in ${formatCountdown(countdown)}`
    return activeText
  })()

  return (
    <Button
      type="button"
      variant="link"
      className={cn(
        'text-sm',
        countdown > 0 && 'text-muted-foreground cursor-not-allowed',
        className,
      )}
      onClick={handleResend}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-live="polite"
      data-testid={testId}
    >
      {buttonText}
    </Button>
  )
}
