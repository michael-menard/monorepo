import { existsSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { logger } from '@repo/logger'
import type { Page } from 'playwright'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCREENSHOT_DIR = resolve(__dirname, '../../data/screenshots')

export async function takeScreenshot(
  page: Page,
  label: string,
  subdirectory = 'discovery',
): Promise<string> {
  const dir = resolve(SCREENSHOT_DIR, subdirectory)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `${label}-${timestamp}.png`
  const filePath = resolve(dir, filename)

  await page.screenshot({ path: filePath, fullPage: true })
  logger.info(`[screenshot] Saved: ${subdirectory}/${filename}`)

  return filePath
}

export async function screenshotOnError<T>(
  page: Page,
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    await takeScreenshot(page, `error-${label}`, 'errors').catch(() => {
      // Ignore screenshot errors during error handling
    })
    throw error
  }
}
