/**
 * Shared Browser Context for BrickLink Scrapers
 *
 * Single Chrome instance shared across minifig, catalog, and prices workers.
 * Uses a persistent profile for session cookies and a single reusable page
 * to avoid Chrome profile recovery dialogs.
 *
 * Tracks consecutive navigation failures (ERR_ABORTED) and can trip a
 * circuit breaker to pause all BrickLink queues when the site is blocking us.
 */

import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { unlinkSync, readFileSync } from 'fs'
import { execSync } from 'child_process'
import { chromium, type BrowserContext, type Page } from 'playwright'
import { logger } from '@repo/logger'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CHROME_PROFILE = resolve(__dirname, '../../../scrapers/bricklink-minifigs/.chrome-profile')

let sharedContext: BrowserContext | null = null
let sharedPage: Page | null = null

// ── Navigation failure tracking ──────────────────────────────────────────

const NAV_FAILURE_THRESHOLD = 3
let consecutiveNavFailures = 0
let onNavigationBlock: (() => Promise<void>) | null = null

/**
 * Register a callback that fires when consecutive ERR_ABORTED failures
 * hit the threshold. Typically wired to trip the circuit breaker.
 */
export function setNavigationBlockHandler(handler: () => Promise<void>): void {
  onNavigationBlock = handler
}

/** Reset the consecutive failure counter (called on successful navigation). */
function resetNavFailures(): void {
  if (consecutiveNavFailures > 0) {
    logger.info(
      `[browser] Navigation succeeded — resetting failure counter (was ${consecutiveNavFailures})`,
    )
  }
  consecutiveNavFailures = 0
}

/** Increment the failure counter and trip the block handler if threshold reached. */
async function recordNavFailure(url: string, error: string): Promise<void> {
  consecutiveNavFailures++
  logger.warn(`[browser] Navigation failure ${consecutiveNavFailures}/${NAV_FAILURE_THRESHOLD}`, {
    url,
    error,
  })

  if (consecutiveNavFailures >= NAV_FAILURE_THRESHOLD && onNavigationBlock) {
    logger.error(
      `[browser] ${NAV_FAILURE_THRESHOLD} consecutive navigation failures — triggering block handler`,
    )
    await onNavigationBlock()
  }
}

/**
 * Get or create the shared browser page.
 * First call launches Chrome with the persistent profile.
 * Subsequent calls reuse the same page.
 */
export async function getSharedPage(): Promise<Page> {
  if (!sharedContext) {
    // Kill any orphaned Chrome process using this profile (e.g. after pkill of worker)
    try {
      const lockPath = join(CHROME_PROFILE, 'SingletonLock')
      const lockTarget = readFileSync(lockPath, 'utf8')
      // SingletonLock contains hostname-pid, e.g. "Michaels-Mac-mini-5024"
      const pidMatch = lockTarget.match(/-(\d+)$/)
      if (pidMatch) {
        const stalePid = pidMatch[1]
        try {
          execSync(`kill ${stalePid}`, { timeout: 5000 })
          logger.warn(`[browser] Killed orphaned Chrome process (PID ${stalePid})`)
          // Give it a moment to release the profile
          await new Promise(r => setTimeout(r, 1000))
        } catch {
          // Process already gone — fine
        }
      }
      unlinkSync(lockPath)
      logger.info('[browser] Removed stale SingletonLock')
    } catch {
      // Lock doesn't exist — fine
    }
    logger.info('[browser] Launching Chrome with persistent profile')
    sharedContext = await chromium.launchPersistentContext(CHROME_PROFILE, {
      headless: false,
      channel: 'chrome',
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-session-crashed-bubble',
        '--hide-crash-restore-bubble',
      ],
    })
  }

  if (!sharedPage || sharedPage.isClosed()) {
    sharedPage = await sharedContext.newPage()
  }

  return sharedPage
}

/**
 * Navigate to about:blank to clear page state between jobs.
 */
export async function resetPage(): Promise<void> {
  if (sharedPage && !sharedPage.isClosed()) {
    await sharedPage.goto('about:blank').catch(() => {})
  }
}

/**
 * Shut down the shared browser. Call on process exit.
 */
export async function shutdownBrowser(): Promise<void> {
  if (sharedPage && !sharedPage.isClosed()) {
    await sharedPage.close().catch(() => {})
    sharedPage = null
  }
  if (sharedContext) {
    logger.info('[browser] Closing Chrome')
    await sharedContext.close().catch(() => {})
    sharedContext = null
  }
}

/**
 * Dismiss cookie consent popups if present.
 */
export async function dismissCookiePopup(page: Page): Promise<void> {
  try {
    const cookieBtn = page
      .locator(
        'button:has-text("Accept"), button:has-text("Accept All"), button:has-text("I Accept"), button:has-text("OK"), button:has-text("Got it"), #onetrust-accept-btn-handler, .cookie-accept, [data-testid="cookie-accept"]',
      )
      .first()

    const isVisible = await cookieBtn.isVisible({ timeout: 1500 }).catch(() => false)
    if (isVisible) {
      logger.info('[browser] Dismissing cookie popup...')
      await cookieBtn.click()
      await page.waitForTimeout(500)
    }
  } catch {
    // No cookie popup — fine
  }
}

/**
 * Wait after navigation, checking if an age/birthday gate appears.
 * If detected, waits up to 2 minutes for it to be resolved in the browser.
 */
export async function waitForAgeGate(page: Page): Promise<void> {
  await page.waitForTimeout(3000)

  const hasAgeGate = await page
    .evaluate(() => {
      const body = document.body.innerText || ''
      return (
        document.querySelector(
          'select[name="yy"], #yearField, #divBirthDate, input[name="frmDate"]',
        ) !== null || /date of birth|enter your birthday|age verification|birth date/i.test(body)
      )
    })
    .catch(() => false)

  if (!hasAgeGate) {
    await dismissCookiePopup(page)
    return
  }

  logger.info('[browser] Birthday verification detected — waiting for manual input...')

  const start = Date.now()
  const timeout = 120000
  while (Date.now() - start < timeout) {
    await page.waitForTimeout(2000)

    const stillThere = await page
      .evaluate(() => {
        const body = document.body.innerText || ''
        return (
          document.querySelector(
            'select[name="yy"], #yearField, #divBirthDate, input[name="frmDate"]',
          ) !== null || /date of birth|enter your birthday|age verification|birth date/i.test(body)
        )
      })
      .catch(() => false)

    if (!stillThere) {
      logger.info('[browser] Birthday verification complete.')
      await page.waitForTimeout(1000)
      await dismissCookiePopup(page)
      return
    }
  }

  logger.warn('[browser] Timed out waiting for birthday verification — continuing...')
  await dismissCookiePopup(page)
}

/**
 * Navigate to a URL with ERR_ABORTED retry and failure tracking.
 * Retries once on ERR_ABORTED, then records the failure.
 * Resets the failure counter on success.
 */
export async function navigateWithRetry(
  page: Page,
  url: string,
  options: { waitUntil?: 'domcontentloaded' | 'networkidle'; timeout?: number } = {},
): Promise<void> {
  const waitUntil = options.waitUntil ?? 'domcontentloaded'
  const timeout = options.timeout ?? 30000

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await page.goto(url, { waitUntil, timeout })
      resetNavFailures()
      return
    } catch (navError) {
      const msg = navError instanceof Error ? navError.message : String(navError)
      if (msg.includes('ERR_ABORTED')) {
        if (attempt === 0) {
          logger.warn(`[browser] Navigation aborted, retrying in 3s...`, { url })
          await page.waitForTimeout(3000)
          continue
        }
        // Second attempt also failed — record and throw
        await recordNavFailure(url, msg)
      }
      throw navError
    }
  }
}

/**
 * Check if the page shows a rate limit / Cloudflare challenge.
 */
export async function checkRateLimited(
  page: Page,
): Promise<{ rateLimited: boolean; resetHint?: string }> {
  const bodyText = await page.evaluate(() => document.body?.innerText || '').catch(() => '')
  const lowerText = bodyText.toLowerCase()

  if (
    lowerText.includes('rate limit') ||
    lowerText.includes('too many requests') ||
    lowerText.includes('access denied') ||
    lowerText.includes('please verify you are a human')
  ) {
    const resetMatch = bodyText.match(/try again in (\d+)\s*(minutes?|hours?)/i)
    const resetHint = resetMatch ? `${resetMatch[1]} ${resetMatch[2]}` : undefined
    return { rateLimited: true, resetHint }
  }

  return { rateLimited: false }
}
