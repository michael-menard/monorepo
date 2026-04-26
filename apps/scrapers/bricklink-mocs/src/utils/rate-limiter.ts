/**
 * File-based rate limiter for BrickLink scraping.
 *
 * Tracks timestamps of recent scrapes in a JSON file so the limit
 * persists across process invocations (important when BullMQ spawns
 * one process per job).
 *
 * Default: 20 scrapes per hour.
 */

import { existsSync, readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { logger } from '@repo/logger'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RATE_FILE = resolve(__dirname, '../../.rate-limit.json')

const DEFAULT_MAX_PER_HOUR = 20
const WINDOW_MS = 60 * 60 * 1000 // 1 hour

interface RateState {
  timestamps: number[]
}

function loadState(): RateState {
  if (existsSync(RATE_FILE)) {
    try {
      return JSON.parse(readFileSync(RATE_FILE, 'utf-8'))
    } catch {
      return { timestamps: [] }
    }
  }
  return { timestamps: [] }
}

function saveState(state: RateState): void {
  writeFileSync(RATE_FILE, JSON.stringify(state))
}

/**
 * Check if we're within the rate limit. Returns true if OK to proceed.
 * If over limit, returns false and logs when the window resets.
 */
export function checkRateLimit(maxPerHour?: number): { allowed: boolean; retryAfterMs?: number } {
  const envLimit = parseInt(process.env.SCRAPER_MAX_PER_HOUR || '', 10)
  const limit = maxPerHour ?? (envLimit || DEFAULT_MAX_PER_HOUR)
  const now = Date.now()
  const state = loadState()

  // Prune timestamps older than the window
  state.timestamps = state.timestamps.filter(t => now - t < WINDOW_MS)

  if (state.timestamps.length >= limit) {
    const oldest = state.timestamps[0]
    const retryAfterMs = WINDOW_MS - (now - oldest)
    const retryMins = Math.ceil(retryAfterMs / 60000)
    logger.warn(
      `[rate-limit] Rate limit reached: ${state.timestamps.length}/${limit} scrapes in the last hour. Retry in ${retryMins}m.`,
    )
    return { allowed: false, retryAfterMs }
  }

  return { allowed: true }
}

/**
 * Record a scrape attempt.
 */
export function recordScrape(): void {
  const state = loadState()
  state.timestamps.push(Date.now())
  // Keep only timestamps within the window
  const now = Date.now()
  state.timestamps = state.timestamps.filter(t => now - t < WINDOW_MS)
  saveState(state)

  logger.info(`[rate-limit] Recorded scrape (${state.timestamps.length} in last hour)`)
}

/**
 * Random delay between min and max milliseconds (human-like pacing).
 */
export function randomDelay(min = 5000, max = 10000): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
