import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { chromium } from 'playwright'
import { z } from 'zod'
import { initializeBucket, uploadToS3 } from '@repo/s3-client'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../.env') })

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

const API_BASE = process.env.LEGO_API_URL || 'http://localhost:9100'
const S3_BUCKET = process.env.S3_BUCKET || 'lego-moc-files'

/**
 * Download an image from a URL and upload it to MinIO/S3.
 * Returns the S3 key.
 */
async function downloadAndUploadImage(imageUrl: string, setNumber: string): Promise<string> {
  // Determine file extension from URL
  const urlPath = new URL(imageUrl).pathname
  const ext = urlPath.match(/\.(png|jpg|jpeg|webp|gif)$/i)?.[0] || '.png'
  const fileName = `product${ext}`
  const s3Key = `sets/${setNumber}/images/${fileName}`

  // Download the image
  console.log(`Downloading image...`)
  const res = await fetch(imageUrl)
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`)
  const buffer = Buffer.from(await res.arrayBuffer())

  // Upload to MinIO
  await initializeBucket(S3_BUCKET)
  const contentType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'
  await uploadToS3({ key: s3Key, body: buffer, contentType, bucket: S3_BUCKET })
  console.log(`Uploaded image → ${s3Key}`)

  return s3Key
}

async function scrape(url: string) {
  console.log(`Fetching ${url}...`)

  // Lego.com blocks headless browsers — must use headed mode with system Chrome
  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
  })
  const page = await browser.newPage()

  try {
    await page.goto(url, { waitUntil: 'load', timeout: 30000 })

    // Popup 1: Age gate — click "Continue" to enter LEGO.com
    await page.waitForSelector('#age-gate-grown-up-cta', { timeout: 5000 }).catch(() => {})
    const continueBtn = await page.$('#age-gate-grown-up-cta')
    if (continueBtn && (await continueBtn.isVisible())) {
      await continueBtn.click()
      await page.waitForTimeout(2000)
    }

    // Popup 2: Cookie consent — accept all
    await page
      .waitForSelector(
        'button:has-text("Accept All"), button[data-test="cookie-accept-all"], button[id="onetrust-accept-btn-handler"]',
        { timeout: 5000 },
      )
      .catch(() => {})
    const cookieBtn =
      (await page.$('button:has-text("Accept All")')) ??
      (await page.$('button[data-test="cookie-accept-all"]')) ??
      (await page.$('button[id="onetrust-accept-btn-handler"]'))
    if (cookieBtn && (await cookieBtn.isVisible())) {
      await cookieBtn.click()
      await page.waitForTimeout(500)
    }

    // Wait for the product schema JSON-LD to appear
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

    // Extract all JSON-LD blocks from the page
    const jsonLdBlocks = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]')
      const blocks: unknown[] = []
      for (const s of scripts) {
        try {
          blocks.push(JSON.parse(s.textContent || ''))
        } catch {
          // skip
        }
      }
      return blocks
    })

    // Find the product schema
    const productBlock = jsonLdBlocks.find((b: any) => b['@type'] === 'Product')
    if (!productBlock) {
      console.error('No Product JSON-LD found on page')
      process.exit(1)
    }

    const product = LegoProductSchema.parse(productBlock)

    // Find the breadcrumb schema for theme
    const breadcrumbBlock = jsonLdBlocks.find((b: any) => b['@type'] === 'BreadcrumbList')
    let theme = ''
    if (breadcrumbBlock) {
      const breadcrumbs = BreadcrumbSchema.parse(breadcrumbBlock)
      const themeItem = breadcrumbs.itemListElement.find(i => i.position === 2)
      theme = themeItem?.name ?? ''
    }

    const scraped = {
      name: product.name,
      description: product.description,
      productId: product.productId,
      theme,
      image: product.image,
      pieceCount: product.pieceCount ?? null,
      price: product.offers?.price ?? null,
      currency: product.offers?.priceCurrency ?? null,
      sourceUrl: url,
    }

    console.log()
    console.log(JSON.stringify(scraped, null, 2))

    const dryRun = process.argv.includes('--dry-run')
    if (dryRun) {
      console.log('\n--dry-run: skipping save')
      return
    }

    // Download product image and upload to MinIO
    const s3Key = await downloadAndUploadImage(scraped.image, scraped.productId)

    // Build the MinIO URL for the image
    const s3Endpoint = process.env.S3_ENDPOINT || 'http://localhost:9000'
    const imageUrl = `${s3Endpoint}/${S3_BUCKET}/${s3Key}`

    // Save to database via POST /sets
    console.log(`\nSaving to ${API_BASE}/sets...`)

    const createPayload = {
      title: scraped.name,
      setNumber: scraped.productId,
      sourceUrl: scraped.sourceUrl,
      pieceCount: scraped.pieceCount,
      theme: scraped.theme || undefined,
      imageUrl,
      description: scraped.description,
      purchasePrice: scraped.price ? String(scraped.price) : undefined,
      status: process.argv.includes('--wishlist') ? ('wanted' as const) : ('owned' as const),
    }

    const res = await fetch(`${API_BASE}/sets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createPayload),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error(`Failed to save set: ${res.status} ${res.statusText}`)
      console.error(body)
      process.exit(1)
    }

    const saved = await res.json()
    console.log(`Saved as set ${saved.id}`)
  } finally {
    await browser.close()
  }
}

// CLI
const url = process.argv[2]
if (!url || !url.includes('lego.com')) {
  console.error('Usage: pnpm scrape <lego.com product URL>')
  console.error('       pnpm scrape <url> --wishlist  (add to wishlist instead of collection)')
  console.error("       pnpm scrape <url> --dry-run   (scrape only, don't save)")
  console.error(
    'Example: pnpm scrape https://www.lego.com/en-us/product/lamborghini-revuelto-huracan-sto-77238',
  )
  process.exit(1)
}

scrape(url)
