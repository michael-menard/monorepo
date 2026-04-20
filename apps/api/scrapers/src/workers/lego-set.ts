/**
 * LEGO.com Set Worker
 *
 * Scrapes a single LEGO.com product page and saves it as a set.
 */

import { chromium, type BrowserContext } from 'playwright'
import { initializeBucket, uploadToS3 } from '@repo/s3-client'
import { logger } from '@repo/logger'
import { z } from 'zod'
import type { LegoSetJob } from '../queues.js'

const API_BASE = process.env.LEGO_API_URL || 'http://localhost:9100'
const S3_BUCKET = process.env.S3_BUCKET || 'lego-moc-files'
const S3_ENDPOINT = process.env.S3_ENDPOINT || 'http://localhost:9000'

const LegoProductSchema = z.object({
  name: z.string(),
  description: z.string(),
  productId: z.string(),
  image: z.string().url(),
  pieceCount: z
    .object({ value: z.number() })
    .transform(p => p.value)
    .optional(),
  offers: z
    .object({
      price: z.number(),
      priceCurrency: z.string(),
    })
    .optional(),
})

const BreadcrumbSchema = z.object({
  itemListElement: z.array(
    z.object({
      name: z.string(),
      position: z.number(),
    }),
  ),
})

export interface LegoSetResult {
  success: boolean
  rateLimited?: boolean
  error?: string
  setId?: string
  url: string
}

export async function processLegoSet(job: LegoSetJob): Promise<LegoSetResult> {
  const { url, wishlist } = job

  const browser = await chromium.launch({ headless: false, channel: 'chrome' })
  const page = await browser.newPage()

  try {
    await initializeBucket(S3_BUCKET)

    logger.info(`[lego-set] Scraping ${url}`)
    await page.goto(url, { waitUntil: 'load', timeout: 30000 })

    // Age gate
    const continueBtn = await page.$('#age-gate-grown-up-cta')
    if (continueBtn && (await continueBtn.isVisible())) {
      await continueBtn.click()
      await page.waitForTimeout(2000)
    }

    // Cookie consent
    const cookieBtn =
      (await page.$('button:has-text("Accept All")')) ??
      (await page.$('button[data-test="cookie-accept-all"]')) ??
      (await page.$('button[id="onetrust-accept-btn-handler"]'))
    if (cookieBtn && (await cookieBtn.isVisible())) {
      await cookieBtn.click()
      await page.waitForTimeout(500)
    }

    // Wait for product JSON-LD
    await page
      .waitForSelector('script[data-test="product-schema"]', { timeout: 15000 })
      .catch(() => {
        return page.waitForFunction(
          () =>
            Array.from(document.querySelectorAll('script[type="application/ld+json"]')).some(s => {
              try {
                return JSON.parse(s.textContent || '')['@type'] === 'Product'
              } catch {
                return false
              }
            }),
          { timeout: 10000 },
        )
      })

    const jsonLdBlocks = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]')
      const blocks: unknown[] = []
      for (const s of scripts) {
        try {
          blocks.push(JSON.parse(s.textContent || ''))
        } catch {
          /* skip */
        }
      }
      return blocks
    })

    const productBlock = jsonLdBlocks.find((b: any) => b['@type'] === 'Product')
    if (!productBlock) {
      return { success: false, error: 'No Product JSON-LD found', url }
    }

    const product = LegoProductSchema.parse(productBlock)

    const breadcrumbBlock = jsonLdBlocks.find((b: any) => b['@type'] === 'BreadcrumbList')
    let theme = ''
    if (breadcrumbBlock) {
      const breadcrumbs = BreadcrumbSchema.parse(breadcrumbBlock)
      const themeItem = breadcrumbs.itemListElement.find(i => i.position === 2)
      theme = themeItem?.name ?? ''
    }

    // Download image
    const urlPath = new URL(product.image).pathname
    const ext = urlPath.match(/\.(png|jpg|jpeg|webp|gif)$/i)?.[0] || '.png'
    const s3Key = `sets/${product.productId}/images/product${ext}`
    const imgRes = await fetch(product.image)
    if (imgRes.ok) {
      const buffer = Buffer.from(await imgRes.arrayBuffer())
      const contentType =
        ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'
      await uploadToS3({ key: s3Key, body: buffer, contentType, bucket: S3_BUCKET })
    }

    const imageUrl = `${S3_ENDPOINT}/${S3_BUCKET}/${s3Key}`

    // Save via API
    const createPayload = {
      title: product.name,
      setNumber: product.productId,
      sourceUrl: url,
      pieceCount: product.pieceCount ?? undefined,
      theme: theme || undefined,
      imageUrl,
      description: product.description,
      purchasePrice: product.offers?.price ? String(product.offers.price) : undefined,
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
    logger.info(`[lego-set] Saved ${product.name} as ${saved.id}`)

    return { success: true, setId: saved.id, url }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error('[lego-set] Failed', { error: msg, url })
    return { success: false, error: msg, url }
  } finally {
    await page.close()
    await browser.close()
  }
}
