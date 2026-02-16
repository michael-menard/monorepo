/**
 * BUGF-019: useRateLimitCooldown hook
 *
 * Reusable hook for handling rate limit cooldowns with exponential backoff.
 * Persists state in sessionStorage and provides countdown/retry logic.
 *
 * Features:
 * - Exponential backoff: base * 2^(attempt-1), capped at max
 * - SessionStorage persistence (survives page refresh)
 * - Countdown timer with formatted display (MM:SS)
 * - Automatic cleanup on unmount
 *
 * @example
 * ```tsx
 * const { remainingSeconds, canRetry, handleRateLimitError, formattedTime } =
 *   useRateLimitCooldown('api-upload', 60, 600)
 *
 * // On 429 error:
 * handleRateLimitError()
 *
 * // Display:
 * {!canRetry && <p>Retry in {formattedTime}</p>}
 * ```
 */

import { useState, useEffect, useCallback } from 'react'

interface UseRateLimitCooldownParams {
  storageKeyPrefix: string
  baseCooldownSeconds?: number
  maxCooldownSeconds?: number
}

interface UseRateLimitCooldownReturn {
  /** Remaining seconds until retry is allowed */
  remainingSeconds: number
  /** Whether retry is currently allowed */
  canRetry: boolean
  /** Call this when a rate limit error occurs */
  handleRateLimitError: () => void
  /** Clear the cooldown and reset attempt count */
  clearCooldown: () => void
  /** Current attempt count */
  attemptCount: number
  /** Formatted time string (MM:SS) */
  formattedTime: string
}

/**
 * Calculate exponential backoff cooldown based on attempt number
 * Formula: base * 2^(attempt-1), capped at max
 */
function calculateCooldown(
  attemptNumber: number,
  baseCooldown: number,
  maxCooldown: number,
): number {
  if (attemptNumber <= 0) return baseCooldown
  const exponentialCooldown = baseCooldown * Math.pow(2, attemptNumber - 1)
  return Math.min(exponentialCooldown, maxCooldown)
}

/**
 * Format seconds as MM:SS
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Hook for managing rate limit cooldowns with exponential backoff
 */
export function useRateLimitCooldown({
  storageKeyPrefix,
  baseCooldownSeconds = 60,
  maxCooldownSeconds = 600,
}: UseRateLimitCooldownParams): UseRateLimitCooldownReturn {
  const attemptsKey = `${storageKeyPrefix}:attempts`
  const lastAttemptKey = `${storageKeyPrefix}:lastAttempt`
  const cooldownUntilKey = `${storageKeyPrefix}:cooldownUntil`

  // Get initial state from sessionStorage
  const getStoredAttempts = useCallback((): number => {
    const stored = sessionStorage.getItem(attemptsKey)
    if (!stored) return 0
    const attempts = parseInt(stored, 10)
    return isNaN(attempts) ? 0 : attempts
  }, [attemptsKey])

  const getStoredCooldownRemaining = useCallback((): number => {
    const stored = sessionStorage.getItem(cooldownUntilKey)
    if (!stored) return 0

    const cooldownUntil = parseInt(stored, 10)
    if (isNaN(cooldownUntil)) return 0

    const remaining = Math.ceil((cooldownUntil - Date.now()) / 1000)
    return Math.max(0, remaining)
  }, [cooldownUntilKey])

  // Initialize state
  const [attemptCount, setAttemptCount] = useState(getStoredAttempts)
  const [remainingSeconds, setRemainingSeconds] = useState(getStoredCooldownRemaining)

  // Derived state
  const canRetry = remainingSeconds <= 0
  const formattedTime = formatTime(remainingSeconds)

  // Countdown timer effect
  useEffect(() => {
    if (remainingSeconds <= 0) {
      return
    }

    const timer = setInterval(() => {
      const remaining = getStoredCooldownRemaining()
      setRemainingSeconds(remaining)

      if (remaining <= 0) {
        // Cooldown finished, but don't reset attempt count
        sessionStorage.removeItem(cooldownUntilKey)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [remainingSeconds, getStoredCooldownRemaining, cooldownUntilKey])

  // Handle rate limit error - increment attempts and start cooldown
  const handleRateLimitError = useCallback(() => {
    const newAttemptCount = attemptCount + 1
    setAttemptCount(newAttemptCount)

    // Store attempt count and timestamp
    sessionStorage.setItem(attemptsKey, newAttemptCount.toString())
    sessionStorage.setItem(lastAttemptKey, Date.now().toString())

    // Calculate and set cooldown
    const cooldownDuration = calculateCooldown(
      newAttemptCount,
      baseCooldownSeconds,
      maxCooldownSeconds,
    )
    const cooldownUntil = Date.now() + cooldownDuration * 1000
    sessionStorage.setItem(cooldownUntilKey, cooldownUntil.toString())

    setRemainingSeconds(cooldownDuration)
  }, [
    attemptCount,
    attemptsKey,
    lastAttemptKey,
    cooldownUntilKey,
    baseCooldownSeconds,
    maxCooldownSeconds,
  ])

  // Clear cooldown and reset everything
  const clearCooldown = useCallback(() => {
    sessionStorage.removeItem(attemptsKey)
    sessionStorage.removeItem(lastAttemptKey)
    sessionStorage.removeItem(cooldownUntilKey)
    setAttemptCount(0)
    setRemainingSeconds(0)
  }, [attemptsKey, lastAttemptKey, cooldownUntilKey])

  return {
    remainingSeconds,
    canRetry,
    handleRateLimitError,
    clearCooldown,
    attemptCount,
    formattedTime,
  }
}
