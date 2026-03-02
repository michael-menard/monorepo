/**
 * Cron Module Constants
 *
 * Integer lock keys for PostgreSQL advisory locks.
 * APIP-3090: Cron Scheduler Infrastructure
 *
 * ARCH-002: Use fixed integer constants instead of hashtext() —
 * hashtext() is a PostgreSQL internal function, not a JS function.
 */

/**
 * Advisory lock keys for cron jobs.
 * Each key is a unique integer used with pg_try_advisory_lock().
 * Session-level locks are auto-released on pg client disconnect.
 */
export const LOCK_KEYS = {
  /** Pattern miner cron job lock key */
  PATTERN_MINER: 42_001,

  /** Dead code reaper cron job lock key */
  DEAD_CODE_REAPER: 42_002,
} as const

export type LockKey = (typeof LOCK_KEYS)[keyof typeof LOCK_KEYS]
