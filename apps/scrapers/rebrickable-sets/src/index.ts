import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { chromium, type Page } from 'playwright'
import { z } from 'zod'
import { initializeBucket, uploadToS3 } from '@repo/s3-client'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../.env') })

// --- Zod Schemas ---

const RebrickableSetSchema = z.object({
  setNumber: z.string(),
  name: z.string(),
  year: z.number().nullable(),
  theme: z.string().nullable(),
  partCount: z.number().nullable(),
  imageUrl: z.string().url().nullable(),
  description: z.string().nullable(),
  releaseDateStart: z.string().nullable(),
  releaseDateEnd: z.string().nullable(),
  tags: z.array(z.string()),
  externalIds: z.object({
    bricklink: z.string().nullable(),
    brickowl: z.string().nullable(),
    brickset: z.string().nullable(),
  }),
  ownershipCount: z.number().nullable(),
  ownershipRankAll: z.number().nullable(),
  ownershipRankYear: z.number().nullable(),
  images: z.array(z.string().url()),
  sourceUrl: z.string().url(),
})

type RebrickableSet = z.infer<typeof RebrickableSetSchema>

const API_BASE = process.env.LEGO_API_URL || 'http://localhost:9100'
const S3_BUCKET = process.env.S3_BUCKET || 'lego-moc-files'

// --- Extraction helpers ---

async function extractSetNumber(page: Page): Promise<string> {
  // From #page_data data-set_num attribute
  const setNum = await page.getAttribute('#page_data', 'data-set_num')
  if (setNum) return setNum

  // Fallback: from the h1 text like "LEGO SET 76919-1 - 2023 McLaren Formula 1 Car"
  const h1 = await page.textContent('#page_header h1')
  if (h1) {
    const match = h1.match(/(\d+-\d+)/)
    if (match) return match[1]
  }

  // Fallback: from URL
  const url = page.url()
  const urlMatch = url.match(/\/sets\/(\d+-\d+)\//)
  if (urlMatch) return urlMatch[1]

  throw new Error('Could not determine set number from page')
}

async function extractName(page: Page): Promise<string> {
  // From the sidebar table: first row "Name" cell
  const name = await page.evaluate(() => {
    const rows = document.querySelectorAll('#set_sidebar_top .table tr')
    for (const row of rows) {
      const label = row.querySelector('td:first-child')?.textContent?.trim()
      if (label === 'Name') {
        return row.querySelector('td:last-child')?.textContent?.trim() ?? null
      }
    }
    return null
  })
  if (name) return name

  // Fallback: from h1, strip prefix "LEGO SET XXXXX-X - "
  const h1 = await page.textContent('#page_header h1')
  if (h1) {
    const match = h1.match(/\d+-\d+\s*-\s*(.+)/)
    if (match) return match[1].trim()
    return h1.replace(/^LEGO SET\s*/i, '').trim()
  }

  throw new Error('Could not extract set name')
}

async function extractYear(page: Page): Promise<number | null> {
  const year = await page.evaluate(() => {
    const rows = document.querySelectorAll('#set_sidebar_top .table tr')
    for (const row of rows) {
      const label = row.querySelector('td:first-child')?.textContent?.trim()
      if (label === 'Released') {
        const link = row.querySelector('td:last-child a')
        if (link) {
          const num = parseInt(link.textContent?.trim() ?? '', 10)
          if (!isNaN(num)) return num
        }
      }
    }
    return null
  })
  return year
}

async function extractTheme(page: Page): Promise<string | null> {
  // From sidebar table "Theme" row
  const theme = await page.evaluate(() => {
    const rows = document.querySelectorAll('#set_sidebar_top .table tr')
    for (const row of rows) {
      const label = row.querySelector('td:first-child')?.textContent?.trim()
      if (label === 'Theme') {
        return row.querySelector('td:last-child a')?.textContent?.trim() ?? null
      }
    }
    return null
  })
  if (theme) return theme

  // Fallback: from breadcrumb JSON-LD
  const breadcrumbTheme = await page.evaluate(() => {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]')
    for (const s of scripts) {
      try {
        const data = JSON.parse(s.textContent || '')
        if (data['@type'] === 'BreadcrumbList') {
          const item = data.itemListElement?.find((i: { position: number }) => i.position === 2)
          return item?.item?.name ?? item?.name ?? null
        }
      } catch {
        // skip
      }
    }
    return null
  })
  return breadcrumbTheme
}

async function extractPartCount(page: Page): Promise<number | null> {
  const count = await page.evaluate(() => {
    const rows = document.querySelectorAll('#set_sidebar_top .table tr')
    for (const row of rows) {
      const label = row.querySelector('td:first-child')?.textContent?.trim()
      if (label === 'Inventory') {
        const text = row.querySelector('td:last-child')?.textContent?.trim() ?? ''
        const match = text.match(/(\d[\d,]*)\s*parts/)
        if (match) return parseInt(match[1].replace(/,/g, ''), 10)
      }
    }
    return null
  })
  return count
}

async function extractReleaseDates(
  page: Page,
): Promise<{ start: string | null; end: string | null }> {
  const dates = await page.evaluate(() => {
    const rows = document.querySelectorAll('#set_sidebar_top .table tr')
    for (const row of rows) {
      const label = row.querySelector('td:first-child')?.textContent?.trim()
      if (label === 'Released') {
        const dateText = row.querySelector('td:last-child .size-10')?.textContent?.trim() ?? ''
        // Format: "(March 1, 2024 to July 31, 2025)"
        const match = dateText.match(/\((.+?)\s+to\s+(.+?)\)/)
        if (match) {
          return { start: match[1], end: match[2] }
        }
      }
    }
    return { start: null, end: null }
  })
  return dates
}

async function extractDescription(page: Page): Promise<string | null> {
  // From meta description
  const desc = await page.getAttribute('meta[name="description"]', 'content')
  return desc || null
}

async function extractImageUrl(page: Page): Promise<string | null> {
  // From og:image meta tag — highest quality
  const ogImage = await page.getAttribute('meta[property="og:image"]', 'content')
  if (ogImage) return ogImage

  // Fallback: first slider image
  const sliderImg = await page.getAttribute('.flexslider .slides img.img-responsive', 'src')
  return sliderImg || null
}

async function extractAllImages(page: Page): Promise<string[]> {
  const images = await page.evaluate(() => {
    const imgs: string[] = []
    const slides = document.querySelectorAll(
      '.flexslider .slides li:not(.clone) img.img-responsive',
    )
    for (const img of slides) {
      // Prefer data-src (lazy-loaded full-size URL) over src (often a base64 placeholder)
      const src = img.getAttribute('data-src') || img.getAttribute('src')
      if (src && !src.startsWith('data:') && !imgs.includes(src)) {
        imgs.push(src)
      }
    }
    return imgs
  })
  return images
}

async function extractTags(page: Page): Promise<string[]> {
  const tags = await page.evaluate(() => {
    const tagElements = document.querySelectorAll('.sidebar_tags .tag .txt')
    return Array.from(tagElements)
      .map(el => el.textContent?.trim() ?? '')
      .filter(Boolean)
  })
  // Deduplicate (tags appear in sidebar on both sides)
  return [...new Set(tags)]
}

async function extractExternalIds(page: Page): Promise<{
  bricklink: string | null
  brickowl: string | null
  brickset: string | null
}> {
  const ids = await page.evaluate(() => {
    const result = {
      bricklink: null as string | null,
      brickowl: null as string | null,
      brickset: null as string | null,
    }
    const rows = document.querySelectorAll('#set_sidebar_top section table tr')
    for (const row of rows) {
      const label = row.querySelector('td:first-child')?.textContent?.trim()?.toLowerCase() ?? ''
      const value = row.querySelector('td:last-child a')?.textContent?.trim() ?? null
      if (label.includes('bricklink')) result.bricklink = value
      else if (label.includes('brickowl')) result.brickowl = value
      else if (label.includes('brickset')) result.brickset = value
    }
    return result
  })
  return ids
}

async function extractOwnershipStats(page: Page): Promise<{
  count: number | null
  rankAll: number | null
  rankYear: number | null
}> {
  const stats = await page.evaluate(() => {
    const result = {
      count: null as number | null,
      rankAll: null as number | null,
      rankYear: null as number | null,
    }
    const divs = document.querySelectorAll('.owned_sets_list div')
    for (const div of divs) {
      const text = div.textContent?.trim() ?? ''
      if (text.includes('who own this Set')) {
        const numText = div.querySelector('span.pull-right')?.textContent?.trim() ?? ''
        result.count = parseInt(numText.replace(/,/g, ''), 10) || null
      }
      if (text.includes('Rank (all)')) {
        const numText = div.querySelector('span.pull-right')?.textContent?.trim() ?? ''
        result.rankAll = parseInt(numText.replace(/,/g, ''), 10) || null
      }
      if (text.includes('Rank (year)')) {
        const numText = div.querySelector('span.pull-right')?.textContent?.trim() ?? ''
        result.rankYear = parseInt(numText.replace(/,/g, ''), 10) || null
      }
    }
    return result
  })
  return stats
}

// --- Image download/upload ---

async function downloadAndUploadImage(
  imageUrl: string,
  setNumber: string,
  fileName: string,
): Promise<string> {
  const urlPath = new URL(imageUrl).pathname
  const ext = urlPath.match(/\.(png|jpg|jpeg|webp|gif)$/i)?.[0] || '.jpg'
  const safeName = fileName.replace(/[^a-zA-Z0-9_-]/g, '_')
  const s3Key = `sets/${setNumber}/images/${safeName}${ext}`

  console.log(`  Downloading ${fileName}...`)
  const res = await fetch(imageUrl)
  if (!res.ok) {
    console.warn(`  Failed to download ${imageUrl}: ${res.status}`)
    return ''
  }
  const buffer = Buffer.from(await res.arrayBuffer())

  await uploadToS3({
    key: s3Key,
    body: buffer,
    contentType: ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg',
    bucket: S3_BUCKET,
  })
  console.log(`  Uploaded → ${s3Key}`)

  return s3Key
}

// --- Main scraper ---

async function scrape(url: string) {
  console.log(`Scraping ${url}...`)

  // Use a persistent browser profile so Cloudflare cookies survive between runs.
  // This avoids repeated challenges after the first successful verification.
  const userDataDir = resolve(__dirname, '../.chrome-profile')
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    channel: 'chrome',
    args: ['--disable-blink-features=AutomationControlled'],
  })
  const page = context.pages()[0] || (await context.newPage())

  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })

    if (response?.status() === 404) {
      throw new Error(`Page not found (404): ${url}`)
    }

    // Rebrickable uses Cloudflare protection — if challenged, click the checkbox
    // in the browser window. Persistent profile means this is usually only needed once.
    console.log('Waiting for page to load (click Cloudflare checkbox if prompted)...')
    await page.waitForSelector('#set_sidebar_top', { state: 'attached', timeout: 60000 })

    // Extract all data
    const setNumber = await extractSetNumber(page)
    const name = await extractName(page)
    const year = await extractYear(page)
    const theme = await extractTheme(page)
    const partCount = await extractPartCount(page)
    const imageUrl = await extractImageUrl(page)
    const description = await extractDescription(page)
    const releaseDates = await extractReleaseDates(page)
    const tags = await extractTags(page)
    const externalIds = await extractExternalIds(page)
    const ownership = await extractOwnershipStats(page)
    const images = await extractAllImages(page)

    const scraped: RebrickableSet = RebrickableSetSchema.parse({
      setNumber,
      name,
      year,
      theme,
      partCount,
      imageUrl,
      description,
      releaseDateStart: releaseDates.start,
      releaseDateEnd: releaseDates.end,
      tags,
      externalIds,
      ownershipCount: ownership.count,
      ownershipRankAll: ownership.rankAll,
      ownershipRankYear: ownership.rankYear,
      images,
      sourceUrl: url,
    })

    console.log()
    console.log(JSON.stringify(scraped, null, 2))

    const dryRun = process.argv.includes('--dry-run')
    if (dryRun) {
      console.log('\n--dry-run: skipping save')
      return
    }

    // Download and upload images
    await initializeBucket(S3_BUCKET)

    let primaryS3Key = ''
    if (scraped.imageUrl) {
      primaryS3Key = await downloadAndUploadImage(scraped.imageUrl, scraped.setNumber, 'product')
    }

    const uploadedImages: string[] = []
    for (let i = 0; i < scraped.images.length; i++) {
      const key = await downloadAndUploadImage(
        scraped.images[i],
        scraped.setNumber,
        `gallery_${i + 1}`,
      )
      if (key) uploadedImages.push(key)
    }

    // Build the MinIO URL for the primary image
    const s3Endpoint = process.env.S3_ENDPOINT || 'http://localhost:9000'
    const primaryImageUrl = primaryS3Key
      ? `${s3Endpoint}/${S3_BUCKET}/${primaryS3Key}`
      : scraped.imageUrl

    // Save to database via POST /sets
    console.log(`\nSaving to ${API_BASE}/sets...`)

    // Parse release date range strings into Date objects
    const parseLooseDate = (s: string | null): string | undefined => {
      if (!s) return undefined
      const d = new Date(s)
      return isNaN(d.getTime()) ? undefined : d.toISOString()
    }

    const createPayload = {
      title: scraped.name,
      setNumber: scraped.setNumber,
      sourceUrl: scraped.sourceUrl,
      pieceCount: scraped.partCount,
      theme: scraped.theme || undefined,
      imageUrl: primaryImageUrl,
      description: scraped.description || undefined,
      year: scraped.year ?? undefined,
      releaseDate: parseLooseDate(scraped.releaseDateStart),
      retireDate: parseLooseDate(scraped.releaseDateEnd),
      tags: scraped.tags,
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
    await context.close()
  }
}

// --- CLI ---

const url = process.argv[2]
if (!url || !url.includes('rebrickable.com')) {
  console.error('Usage: pnpm scrape <rebrickable.com set URL>')
  console.error('       pnpm scrape <url> --wishlist  (add to wishlist instead of collection)')
  console.error("       pnpm scrape <url> --dry-run   (scrape only, don't save)")
  console.error(
    'Example: pnpm scrape https://rebrickable.com/sets/76919-1/2023-mclaren-formula-1-car/',
  )
  process.exit(1)
}

scrape(url)
