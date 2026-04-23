/**
 * BrickLink Minifig Worker
 *
 * Processes a single minifig/CMF scrape job.
 * Scrapes detail page, parts inventory, and images — but NOT price guides.
 * Price guides are handled by the separate bricklink-prices queue.
 */

import { initializeBucket, uploadToS3 } from '@repo/s3-client'
import { logger } from '@repo/logger'
import type { BricklinkMinifigJob } from '../queues.js'
import {
  getSharedPage,
  resetPage,
  shutdownBrowser,
  navigateWithRetry,
  waitForAgeGate,
  checkRateLimited,
} from './shared-browser.js'
import { processBricklinkSet } from './bricklink-set.js'

const API_BASE = process.env.LEGO_API_URL || 'http://localhost:9100'
const S3_BUCKET = process.env.S3_BUCKET || 'lego-moc-files'
const S3_ENDPOINT = process.env.S3_ENDPOINT || 'http://localhost:9000'

export interface ScrapeResult {
  success: boolean
  rateLimited?: boolean
  resetHint?: string
  error?: string
  variantId?: string
  instanceId?: string
  itemNumber: string
  // Set-specific fields (when itemType='S')
  setId?: string
  minifigs?: Array<{ minifigNumber: string; quantity: number }>
}

export { shutdownBrowser }

/** Random delay between 5-8 seconds */
function randomDelay(): number {
  return Math.floor(Math.random() * 3001) + 5000
}

/**
 * Process a single BrickLink minifig scrape job.
 * Scrapes detail + parts + images, saves via API.
 * Does NOT scrape price guides (separate queue).
 */
export async function processBricklinkMinifig(job: BricklinkMinifigJob): Promise<ScrapeResult> {
  // Delegate set scraping to dedicated handler
  if (job.itemType === 'S') {
    const setResult = await processBricklinkSet(job)
    return {
      success: setResult.success,
      rateLimited: setResult.rateLimited,
      resetHint: setResult.resetHint,
      error: setResult.error,
      itemNumber: setResult.itemNumber,
      setId: setResult.setId,
      minifigs: setResult.minifigs,
    }
  }

  const { itemNumber, itemType, wishlist } = job
  const page = await getSharedPage()

  try {
    await initializeBucket(S3_BUCKET)

    // 1. Detail page
    const detailUrl = `https://www.bricklink.com/v2/catalog/catalogitem.page?${itemType}=${itemNumber}#T=S`
    logger.info(`[bricklink-minifig] Scraping ${itemType}=${itemNumber}`, { detailUrl })

    await navigateWithRetry(page, detailUrl, { timeout: 60000 })
    await waitForAgeGate(page)
    await page.waitForTimeout(randomDelay())

    // Check for rate limiting
    const rateLimitCheck = await checkRateLimited(page)
    if (rateLimitCheck.rateLimited) {
      return {
        success: false,
        rateLimited: true,
        resetHint: rateLimitCheck.resetHint,
        itemNumber,
      }
    }

    // Wait for the main image to confirm page loaded
    try {
      await page.waitForSelector('img.pciImageMain', { timeout: 15000 })
    } catch {
      await page.waitForSelector('img.pciImageMain', { timeout: 60000 })
    }

    // Extract basic info
    const basicInfo = await page.evaluate(() => {
      const mainImg = document.querySelector('img.pciImageMain')
      const mainImage = mainImg?.getAttribute('src') || ''

      let yearReleased = ''
      let category = ''
      let description = ''

      document.querySelectorAll('font[face="Tahoma,Arial"]').forEach(el => {
        const text = (el.textContent || '').trim()
        const yearMatch = text.match(/Year Released:\s*(\d{4})/)
        if (yearMatch) yearReleased = yearMatch[1]
        const catMatch = text.match(/Category:\s*([^\n<]+)/)
        if (catMatch) category = catMatch[1].trim()
      })

      const nameEl = document.querySelector(
        'td.pciMainImageHolder ~ td font[face="Tahoma,Arial"] strong',
      )
      if (nameEl) description = nameEl.textContent || ''

      const name = document.title.split(' : ')[0].trim()

      return { name, mainImage, yearReleased, category, description }
    })

    // 2. Download and upload main image
    let primaryImageUrl = basicInfo.mainImage
    if (basicInfo.mainImage) {
      try {
        const fullUrl = basicInfo.mainImage.startsWith('//')
          ? `https:${basicInfo.mainImage}`
          : basicInfo.mainImage
        const res = await fetch(fullUrl)
        if (res.ok) {
          const buffer = Buffer.from(await res.arrayBuffer())
          const s3Key = `minifigs/${itemNumber}/images/main.jpg`
          await uploadToS3({
            key: s3Key,
            body: buffer,
            contentType: 'image/jpeg',
            bucket: S3_BUCKET,
          })
          primaryImageUrl = `${S3_ENDPOINT}/${S3_BUCKET}/${s3Key}`
        }
      } catch (e) {
        logger.warn(`[bricklink-minifig] Image upload failed for ${itemNumber}`, { error: e })
      }
    }

    // 3. Save variant via API
    const variantPayload = {
      legoNumber: itemNumber,
      name: basicInfo.description || basicInfo.name,
      theme: basicInfo.category || undefined,
      year: basicInfo.yearReleased ? parseInt(basicInfo.yearReleased, 10) : undefined,
      imageUrl: primaryImageUrl,
      bricklinkUrl: `https://www.bricklink.com/v2/catalog/catalogitem.page?${itemType}=${itemNumber}`,
    }

    const variantRes = await fetch(`${API_BASE}/minifigs/variants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(variantPayload),
    })

    if (!variantRes.ok) {
      const body = await variantRes.text()
      return {
        success: false,
        error: `Failed to save variant: ${variantRes.status} — ${body}`,
        itemNumber,
      }
    }

    const variant = await variantRes.json()

    // 5. Check if instance already exists
    const existingRes = await fetch(
      `${API_BASE}/minifigs?limit=1&search=${encodeURIComponent(itemNumber)}`,
    )
    const existingData = existingRes.ok ? await existingRes.json() : null
    const existingInstances = existingData?.items ?? existingData?.data ?? []
    const alreadyExists = existingInstances.some(
      (inst: { variantId: string }) => inst.variantId === variant.id,
    )

    let instanceId: string | undefined

    if (!alreadyExists) {
      const instancePayload = {
        displayName: basicInfo.description || basicInfo.name,
        variantId: variant.id,
        status: wishlist ? 'wanted' : 'none',
        sourceType: 'bricklink',
        imageUrl: primaryImageUrl,
      }

      const instanceRes = await fetch(`${API_BASE}/minifigs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(instancePayload),
      })

      if (instanceRes.ok) {
        const instance = await instanceRes.json()
        instanceId = instance.id
      }
    }

    logger.info(`[bricklink-minifig] Completed ${itemNumber}`, {
      variantId: variant.id,
      instanceId,
    })

    return {
      success: true,
      variantId: variant.id,
      instanceId,
      itemNumber,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error(`[bricklink-minifig] Failed ${itemNumber}`, { error: msg })
    return { success: false, error: msg, itemNumber }
  } finally {
    await resetPage()
  }
}
