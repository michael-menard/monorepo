/**
 * Scrape a BrickLink Studio MOC detail page.
 *
 * Uses data-ts-name selectors for structured data and CSS class selectors
 * for parts list rows. All data is extracted from the server-rendered DOM
 * — no AJAX calls needed.
 */

import type { Page } from 'playwright'
import { logger } from '@repo/logger'
import type { ScrapedMocDetail, ScrapedPart } from '../__types__/index.js'

// ─── Helpers ──────────────────────────────────────────────────────────────

function parseIntSafe(text: string): number {
  const digits = text.replace(/[^0-9]/g, '')
  return digits ? parseInt(digits, 10) : 0
}

// ─── Main Scraper ─────────────────────────────────────────────────────────

export async function scrapeMocDetail(page: Page, url: string): Promise<ScrapedMocDetail> {
  const idModelMatch = url.match(/idModel=(\d+)/)
  if (!idModelMatch) {
    throw new Error(`Could not extract idModel from URL: ${url}`)
  }
  const idModel = parseInt(idModelMatch[1], 10)

  // Wait for the detail section to render
  await page.waitForSelector('[data-ts-name="studio-model__name"]', { timeout: 30000 })

  // ── Core metadata ───────────────────────────────────────────────────

  const title = await page
    .locator('[data-ts-name="studio-model__name"]')
    .textContent()
    .then(t => t?.trim() ?? '')

  const author = await page
    .locator('[data-ts-name="studio-model__user-name"]')
    .textContent()
    .then(t => t?.trim() ?? '')

  const authorUrl = await page
    .locator('[data-ts-name="studio-model__user-name"]')
    .getAttribute('href')
    .then(href => {
      if (!href) return null
      if (href.startsWith('//')) return `https:${href}`
      if (href.startsWith('/')) return `https://www.bricklink.com${href}`
      return href
    })

  const authorLocation = await page
    .locator('[data-ts-name="studio-model__user-location"]')
    .textContent()
    .then(t => t?.trim() ?? null)

  const publishedDate = await page
    .locator('[data-ts-name="studio-model__model-published-date"]')
    .textContent()
    .then(t => t?.replace(/^Published\s*/i, '').trim() ?? null)

  const category = await page
    .locator('[data-ts-name="studio-model__award"]')
    .textContent()
    .then(t => t?.trim() || null)
    .catch(() => null)

  // Description from og:description meta tag
  const description = await page.locator('meta[property="og:description"]').getAttribute('content')

  // ── Stats ───────────────────────────────────────────────────────────

  const viewsText = await page
    .locator('[data-ts-name="studio-model__meta--views"]')
    .textContent()
    .then(t => t ?? '0')
  const views = parseIntSafe(viewsText)

  const downloadsText = await page
    .locator('[data-ts-name="studio-model__meta--downloads"]')
    .textContent()
    .then(t => t ?? '0')
  const downloads = parseIntSafe(downloadsText)

  const likesText = await page
    .locator('[data-ts-name="studio-model__meta--likes"]')
    .textContent()
    .then(t => t ?? '0')
  const likes = parseIntSafe(likesText)

  const commentsText = await page
    .locator('[data-ts-name="studio-model__meta--comments"]')
    .textContent()
    .then(t => t ?? '0')
  const comments = parseIntSafe(commentsText)

  // ── Parts summary ──────────────────────────────────────────────────

  const lotText = await page
    .locator('[data-ts-name="studio-model__meta--lot-cnt"]')
    .textContent()
    .then(t => t ?? '0')
  const lotCount = parseIntSafe(lotText)

  const itemText = await page
    .locator('[data-ts-name="studio-model__meta--item-cnt"]')
    .textContent()
    .then(t => t ?? '0')
  const itemCount = parseIntSafe(itemText)

  const colorText = await page
    .locator('[data-ts-name="studio-model__meta--color-cnt"]')
    .textContent()
    .then(t => t ?? '0')
  const colorCount = parseIntSafe(colorText)

  // ── Tags ────────────────────────────────────────────────────────────

  const tagElements = page.locator('[data-ts-name="studio-model__tag"]')
  const tagCount = await tagElements.count()
  const tags: string[] = []
  for (let i = 0; i < tagCount; i++) {
    const text = await tagElements.nth(i).textContent()
    if (text?.trim()) tags.push(text.trim())
  }

  // ── Images ──────────────────────────────────────────────────────────

  const mainImageUrl = await page.locator('meta[property="og:image"]').getAttribute('content')

  // Gallery images: all bricklink.info images in the top section (before the gallery feed)
  const galleryImageUrls = await page.evaluate(() => {
    const images: string[] = []
    const allImgs = document.querySelectorAll('img')
    for (const img of allImgs) {
      const src = img.src || ''
      if (!src.includes('bricklink.info')) continue
      if (src.includes('idpic')) continue // Skip profile pictures
      const rect = img.getBoundingClientRect()
      if (rect.top > 1000) continue // Only top section (detail view, not gallery feed)
      if (!images.includes(src)) images.push(src)
    }
    return images
  })

  // ── Parts list ──────────────────────────────────────────────────────

  // Click the "Parts list" tab — it may not be active by default in headless mode
  const partsTab = page.locator('[data-ts-name="studio-model__details-tab--parts-list"]')
  if (await partsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await partsTab.click()
    // Wait for parts to render
    await page.waitForSelector('article.part-listing-item', { timeout: 10000 }).catch(() => {
      logger.warn('[scrape] Parts list did not render after clicking tab')
    })
  }

  const parts = await scrapeParts(page)

  logger.info(`[scrape] ${title}: ${parts.length} parts, ${galleryImageUrls.length} images`)

  return {
    idModel,
    title,
    author,
    authorUrl,
    authorLocation,
    description,
    publishedDate,
    category,
    tags,
    views,
    downloads,
    likes,
    comments,
    lotCount,
    itemCount,
    colorCount,
    mainImageUrl,
    galleryImageUrls,
    parts,
    sourceUrl: url,
  }
}

// ─── Parts Scraper ────────────────────────────────────────────────────────

async function scrapeParts(page: Page): Promise<ScrapedPart[]> {
  const articles = page.locator('article.part-listing-item')
  const count = await articles.count()

  if (count === 0) {
    logger.warn('[scrape] No parts found on page')
    return []
  }

  const parts: ScrapedPart[] = []

  for (let i = 0; i < count; i++) {
    const article = articles.nth(i)

    const partNumber = await article
      .locator('.part-listing-item__image div')
      .textContent()
      .then(t => t?.trim() ?? '')

    const name = await article
      .locator('.product-listing-item__name')
      .textContent()
      .then(t => t?.trim() ?? '')

    const imgSrc = await article
      .locator('.part-listing-item__image-item')
      .getAttribute('src')
      .then(src => {
        if (!src) return null
        return src.startsWith('//') ? `https:${src}` : src
      })

    // Extract color ID from image URL: /ItemImage/PN/{colorId}/{partNo}.png
    const colorIdMatch = imgSrc?.match(/\/PN\/(\d+)\//)
    const colorId = colorIdMatch ? parseInt(colorIdMatch[1], 10) : null

    // Get color name and quantity from the article's inner text
    // Format: "partNo\nName\nColor\nQuantity"
    const fullText = await article.innerText()
    const lines = fullText
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)

    // Color is the second-to-last line, quantity is the last
    // Pattern: [partNo, name, color, quantity] but name can span multiple lines
    let color = ''
    let quantity = 1

    if (lines.length >= 3) {
      // Last line is quantity (just a number)
      const lastLine = lines[lines.length - 1]
      quantity = parseIntSafe(lastLine)

      // Second to last is color
      color = lines[lines.length - 2]
    }

    if (partNumber) {
      parts.push({
        partNumber,
        name,
        color,
        colorId,
        quantity,
        imageUrl: imgSrc,
      })
    }
  }

  return parts
}

// ─── Cookie/Popup Dismissal ──────────────────────────────────────────────

export async function dismissPopups(page: Page): Promise<void> {
  // Dismiss cookie banner
  try {
    const okayBtn = page.locator('button:has-text("Okay")')
    if (await okayBtn.isVisible({ timeout: 3000 })) {
      await okayBtn.click()
      logger.info('[scrape] Dismissed cookie banner')
    }
  } catch {
    // No cookie banner — fine
  }
}
