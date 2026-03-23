import { chromium } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, mkdirSync } from 'fs'
import { logger } from '@repo/logger'
import { BrowserConfigSchema } from '../__types__/index.js'
import type { BrowserConfig } from '../__types__/index.js'
import type { Browser, BrowserContext, Page } from 'playwright'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(__dirname, '../..')

// Common Chrome/macOS user agents
const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
]

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export async function createStealthBrowser(
  config?: Partial<BrowserConfig>,
): Promise<{ browser: Browser; context: BrowserContext; page: Page }> {
  const cfg = BrowserConfigSchema.parse(config || {})

  // Ensure profile directory exists
  const profileDir = resolve(PROJECT_ROOT, cfg.profileDir)
  if (!existsSync(profileDir)) {
    mkdirSync(profileDir, { recursive: true })
  }

  // Apply stealth plugin
  chromium.use(StealthPlugin())

  const viewport = pickRandom(cfg.viewportPool)
  const userAgent = pickRandom(USER_AGENTS)

  logger.info('[browser] Launching stealth browser', {
    headed: cfg.headed,
    viewport: `${viewport.width}x${viewport.height}`,
    userAgent: userAgent.slice(0, 50) + '...',
  })

  const browser = await chromium.launch({
    headless: !cfg.headed,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--no-default-browser-check',
      `--window-size=${viewport.width},${viewport.height}`,
    ],
  })

  const context = await browser.newContext({
    userAgent,
    viewport,
    locale: 'en-US',
    timezoneId: 'America/New_York',
    permissions: [],
    // Persist storage state if it exists
    ...(existsSync(resolve(profileDir, 'storage-state.json'))
      ? { storageState: resolve(profileDir, 'storage-state.json') }
      : {}),
  })

  // Remove webdriver flag
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
    // @ts-expect-error — injecting chrome runtime properties
    window.chrome = { runtime: {}, loadTimes: () => ({}), csi: () => ({}) }
  })

  const page = await context.newPage()

  return { browser, context, page }
}

export async function saveSession(
  context: BrowserContext,
  config?: Partial<BrowserConfig>,
): Promise<void> {
  const cfg = BrowserConfigSchema.parse(config || {})
  const profileDir = resolve(PROJECT_ROOT, cfg.profileDir)
  if (!existsSync(profileDir)) {
    mkdirSync(profileDir, { recursive: true })
  }
  await context.storageState({ path: resolve(profileDir, 'storage-state.json') })
  logger.info('[browser] Session state saved')
}

export function hasExistingSession(config?: Partial<BrowserConfig>): boolean {
  const cfg = BrowserConfigSchema.parse(config || {})
  const profileDir = resolve(PROJECT_ROOT, cfg.profileDir)
  return existsSync(resolve(profileDir, 'storage-state.json'))
}
