/**
 * Flush Timer Management (INFR-0050 AC-3)
 *
 * Manages periodic flush timer using setInterval.
 */

import type { FlushTimerHandle } from '../__types__/index'

/**
 * Start flush timer with configured interval
 *
 * @param intervalMs - Flush interval in milliseconds
 * @param onFlush - Callback to execute on each interval
 * @returns Timer handle for cleanup
 */
export function startFlushTimer(intervalMs: number, onFlush: () => void): FlushTimerHandle {
  return setInterval(onFlush, intervalMs)
}

/**
 * Stop flush timer
 *
 * @param timer - Timer handle from startFlushTimer
 */
export function stopFlushTimer(timer: FlushTimerHandle): void {
  if (timer) {
    clearInterval(timer)
  }
}
