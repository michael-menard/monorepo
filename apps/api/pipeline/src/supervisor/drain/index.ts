/**
 * Drain Module
 *
 * Idempotent SIGTERM/SIGINT handler registration and drain state machine.
 *
 * Lifecycle:
 *   SIGTERM/SIGINT → draining=true → Worker.pause()
 *     → poll activeJobs === 0 (or drainTimeoutMs hard limit)
 *     → Worker.close() → healthServer.stop() → process.exit(0)
 *   Timeout → drain_timeout_exceeded → process.exit(1)
 *
 * Design decisions:
 * - Module-level guard prevents duplicate signal handler registration (idempotency).
 * - drain() is ADDITIVE — does NOT modify supervisor.stop() contract (APIP-0020 compat).
 * - No external timer imports — uses globalThis.setTimeout so vitest fake timers work.
 *
 * APIP-2030: Graceful Shutdown, Health Check, and Deployment Hardening
 */

import { logger } from '@repo/logger'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DrainDependencies {
  /** Pauses the BullMQ Worker (stops accepting new jobs) */
  pauseWorker: () => Promise<void>
  /** Closes the BullMQ Worker (waits for active job to finish) */
  closeWorker: () => Promise<void>
  /** Stops the health HTTP server */
  stopHealthServer: () => Promise<void>
  /** Returns the number of currently active (in-flight) jobs */
  getActiveJobCount: () => number
  /** Maximum time to wait for in-flight jobs to finish (ms) */
  drainTimeoutMs: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Module-level idempotency guard
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Guard: true after registerDrainHandlers() has been called once.
 * Prevents duplicate SIGTERM/SIGINT listeners when start() is called multiple times.
 */
let _handlersRegistered = false

/**
 * Reset module-level guard (for testing only).
 * MUST be called in afterEach() when testing drain handler registration.
 */
export function resetDrainHandlers(): void {
  _handlersRegistered = false
}

// ─────────────────────────────────────────────────────────────────────────────
// Drain state machine
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Execute the drain sequence:
 * 1. Pause BullMQ Worker (no new jobs accepted)
 * 2. Wait for activeJobs === 0 (polling every 200ms)
 * 3. Hard timeout: if activeJobs > 0 after drainTimeoutMs → exit(1)
 * 4. Close Worker gracefully → stop health server → exit(0)
 *
 * This function is called from signal handlers and is NOT idempotent itself —
 * the idempotency guard is in registerDrainHandlers().
 */
export async function drain(deps: DrainDependencies, signal: string): Promise<void> {
  const { pauseWorker, closeWorker, stopHealthServer, getActiveJobCount, drainTimeoutMs } = deps

  logger.info('drain_started', {
    event: 'drain_started',
    signal,
    activeJobs: getActiveJobCount(),
    drainTimeoutMs,
  })

  // Step 1: Pause Worker — stop accepting new BullMQ jobs
  try {
    await pauseWorker()
    logger.info('worker_paused', { event: 'worker_paused' })
  } catch (e) {
    logger.error('worker_pause_failed', {
      event: 'worker_pause_failed',
      error: e instanceof Error ? e.message : String(e),
    })
    // Continue with drain even if pause fails — we still want to wait for in-flight
  }

  // Step 2: Wait for in-flight jobs to complete or timeout
  const drainResult = await waitForDrain(getActiveJobCount, drainTimeoutMs)

  if (!drainResult.success) {
    logger.error('drain_timeout_exceeded', {
      event: 'drain_timeout_exceeded',
      drainTimeoutMs,
      activeJobs: getActiveJobCount(),
    })

    // Step 3a: Timeout — close worker forcefully, stop health server, exit(1)
    try {
      await closeWorker()
    } catch {
      // ignore errors during forced close
    }
    try {
      await stopHealthServer()
    } catch {
      // ignore errors during health server stop
    }

    logger.info('supervisor_exiting', { event: 'supervisor_exiting', exitCode: 1 })
    process.exit(1)
    return
  }

  // Step 3b: Clean drain — all in-flight jobs completed
  logger.info('drain_complete', {
    event: 'drain_complete',
    activeJobs: getActiveJobCount(),
  })

  try {
    await closeWorker()
    logger.info('worker_closed', { event: 'worker_closed' })
  } catch (e) {
    logger.error('worker_close_failed', {
      event: 'worker_close_failed',
      error: e instanceof Error ? e.message : String(e),
    })
  }

  try {
    await stopHealthServer()
    logger.info('health_server_stopped', { event: 'health_server_stopped' })
  } catch (e) {
    logger.error('health_server_stop_failed', {
      event: 'health_server_stop_failed',
      error: e instanceof Error ? e.message : String(e),
    })
  }

  logger.info('supervisor_exiting', { event: 'supervisor_exiting', exitCode: 0 })
  process.exit(0)
}

/**
 * Poll activeJobs count until it reaches 0 or drainTimeoutMs elapses.
 * Uses globalThis.setTimeout so vitest fake timers can control timing in tests.
 */
async function waitForDrain(
  getActiveJobCount: () => number,
  drainTimeoutMs: number,
): Promise<{ success: boolean }> {
  if (getActiveJobCount() === 0) {
    return { success: true }
  }

  return new Promise(resolve => {
    const startTime = Date.now()
    const POLL_INTERVAL_MS = 200

    const timeoutHandle = globalThis.setTimeout(() => {
      clearInterval(pollHandle)
      resolve({ success: false })
    }, drainTimeoutMs)

    const pollHandle = setInterval(() => {
      if (getActiveJobCount() === 0) {
        clearInterval(pollHandle)
        clearTimeout(timeoutHandle)
        resolve({ success: true })
        return
      }

      // Extra guard: check elapsed time in case fake timers advance unevenly
      const elapsed = Date.now() - startTime
      if (elapsed >= drainTimeoutMs) {
        clearInterval(pollHandle)
        clearTimeout(timeoutHandle)
        resolve({ success: false })
      }
    }, POLL_INTERVAL_MS)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Signal handler registration (idempotent)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Register SIGTERM and SIGINT handlers for graceful drain.
 *
 * Idempotent: safe to call multiple times — subsequent calls are no-ops.
 * AC-2: SIGTERM → drain mode → clean exit.
 * AC-6: SIGINT triggers identical behavior to SIGTERM.
 * HP-8: process.listenerCount('SIGTERM') === 1 after multiple registrations.
 */
export function registerDrainHandlers(deps: DrainDependencies): void {
  if (_handlersRegistered) {
    logger.info('drain_handlers_already_registered', {
      event: 'drain_handlers_already_registered',
    })
    return
  }

  _handlersRegistered = true

  const onSignal = (signal: string) => {
    logger.info('signal_received', { event: 'signal_received', signal })
    void drain(deps, signal)
  }

  process.on('SIGTERM', () => onSignal('SIGTERM'))
  process.on('SIGINT', () => onSignal('SIGINT'))

  logger.info('drain_handlers_registered', {
    event: 'drain_handlers_registered',
    drainTimeoutMs: deps.drainTimeoutMs,
  })
}
