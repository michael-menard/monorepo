/**
 * Rebrickable Set Worker
 *
 * Scrapes a single Rebrickable set page and saves it as a set.
 */

import { chromium, type BrowserContext } from 'playwright'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { initializeBucket, uploadToS3 } from '@repo/s3-client'
import { logger } from '@repo/logger'
import type { RebrickableSetJob } from '../queues.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CHROME_PROFILE = resolve(__dirname, '../../../scrapers/rebrickable-sets/.chrome-profile')
const API_BASE = process.env.LEGO_API_URL || 'http://localhost:9100'
const S3_BUCKET = process.env.S3_BUCKET || 'lego-moc-files'
const S3_ENDPOINT = process.env.S3_ENDPOINT || 'http://localhost:9000'

/** Random delay between 5-8 seconds */
function randomDelay(): number {
  return Math.floor(Math.random() * 3001) + 5000
}

export interface RebrickableSetResult {
  success: boolean
  rateLimited?: boolean
  resetHint?: string
  error?: string
  setId?: string
  setNumber?: string
  url: string
}

export async function processRebrickableSet(job: RebrickableSetJob): Promise<RebrickableSetResult> {
  const { url, wishlist } = job

  let context: BrowserContext | null = null

  try {
    context = await chromium.launchPersistentContext(CHROME_PROFILE, {
      headless: false,
      channel: 'chrome',
      args: ['--disable-blink-features=AutomationControlled'],
    })
    const page = context.pages()[0] || (await context.newPage())

    await initializeBucket(S3_BUCKET)

    logger.info(`[rebrickable-set] Scraping ${url}`)
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(randomDelay())

    // Check for rate limiting
    const bodyText = await page.evaluate(() => document.body?.innerText || '').catch(() => '')
    if (bodyText.toLowerCase().includes('quota') || bodyText.toLowerCase().includes('rate limit')) {
      const resetMatch = bodyText.match(/try again in (\d+)\s*(minutes?|hours?)/i)
      return {
        success: false,
        rateLimited: true,
        resetHint: resetMatch ? `${resetMatch[1]} ${resetMatch[2]}` : undefined,
        url,
      }
    }

    // Extract set data from the page
    const scraped = await page.evaluate(() => {
      const pageData = document.getElementById('page_data')
      const setNumber = pageData?.getAttribute('data-set_num') || ''

      let name = ''
      let year: number | null = null
      let theme = ''
      let partCount: number | null = null

      const rows = document.querySelectorAll('.set-details-table tr, .table-set-info tr')
      rows.forEach(row => {
        const cells = row.querySelectorAll('td')
        if (cells.length < 2) return
        const label = cells[0].textContent?.trim().toLowerCase() || ''
        const value = cells[1].textContent?.trim() || ''
        if (label.includes('name')) name = value
        if (label.includes('year')) year = parseInt(value, 10) || null
        if (label.includes('theme')) theme = value
        if (label.includes('pieces') || label.includes('parts'))
          partCount = parseInt(value.replace(/,/g, ''), 10) || null
      })

      if (!name) name = document.querySelector('h1')?.textContent?.trim() || ''

      const description =
        document.querySelector('meta[name="description"]')?.getAttribute('content') || ''
      const imageUrl =
        document.querySelector('meta[property="og:image"]')?.getAttribute('content') || ''

      return { setNumber, name, year, theme, partCount, description, imageUrl }
    })

    if (!scraped.setNumber) {
      return { success: false, error: 'Could not extract set number', url }
    }

    // Download image
    let imageUrl = scraped.imageUrl
    if (scraped.imageUrl) {
      try {
        const imgRes = await fetch(scraped.imageUrl)
        if (imgRes.ok) {
          const buffer = Buffer.from(await imgRes.arrayBuffer())
          const s3Key = `sets/${scraped.setNumber}/images/product.jpg`
          await uploadToS3({
            key: s3Key,
            body: buffer,
            contentType: 'image/jpeg',
            bucket: S3_BUCKET,
          })
          imageUrl = `${S3_ENDPOINT}/${S3_BUCKET}/${s3Key}`
        }
      } catch {
        // Use original URL
      }
    }

    // Save via API
    const createPayload = {
      title: scraped.name,
      setNumber: scraped.setNumber,
      sourceUrl: url,
      pieceCount: scraped.partCount ?? undefined,
      theme: scraped.theme || undefined,
      imageUrl,
      description: scraped.description || undefined,
      year: scraped.year ?? undefined,
      status: wishlist ? 'wanted' : 'owned',
    }

    const res = await fetch(`${API_BASE}/sets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createPayload),
    })

    if (!res.ok) {
      const body = await res.text()
      return { success: false, error: `Failed to save set: ${res.status} — ${body}`, url }
    }

    const saved = await res.json()
    logger.info(`[rebrickable-set] Saved ${scraped.name} as ${saved.id}`)

    return { success: true, setId: saved.id, setNumber: scraped.setNumber, url }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error('[rebrickable-set] Failed', { error: msg, url })
    return { success: false, error: msg, url }
  } finally {
    if (context) await context.close().catch(() => {})
  }
}
