/**
 * BrickLink Studio MOC Scraper
 *
 * Scrapes a single BrickLink Studio design page:
 *   1. Launch browser (stealth mode)
 *   2. Restore / validate session (BrickLink login)
 *   3. Navigate to MOC detail page
 *   4. Scrape metadata, stats, images, parts list
 *   5. Upload images to MinIO
 *   6. Upsert to scraper DB
 *   7. Sync to gallery DB
 *
 * Usage:
 *   pnpm scrape --login                    # First-time: opens headed browser for manual login, saves session
 *   pnpm scrape --url "https://www.bricklink.com/v3/studio/design.page?idModel=657324"
 *   pnpm scrape --url "..." --headed       # Visual browser
 *   pnpm scrape --url "..." --dry-run      # Scrape only, no storage/DB writes
 */

import { existsSync, readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { chromium } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { config } from 'dotenv'
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import { logger } from '@repo/logger'
import { scrapeMocDetail, dismissPopups } from './scraper/scrape-moc-detail.js'
import { initBucket, uploadDesignImages } from './storage/minio.js'
import { writeToGallery } from './gallery/write-to-gallery.js'
import { getDbClient, closeDbClient, schema } from './db/client.js'
import { StepTracker } from './utils/step-tracker.js'
import { checkRateLimit, recordScrape, randomDelay } from './utils/rate-limiter.js'
import * as gallerySchema from '../../../../packages/backend/db/src/schema.js'
import type { ScrapedMocDetail } from './__types__/index.js'
import type { BrowserContext } from 'playwright'

const __dirname = dirname(fileURLToPath(import.meta.url))

config({ path: resolve(__dirname, '../.env') })

const SESSION_FILE = resolve(__dirname, '../.session.json')
const BRICKLINK_HOME = 'https://www.bricklink.com/'

// ─── CLI Args ─────────────────────────────────────────────────────────────

interface CliArgs {
  url: string
  headed: boolean
  dryRun: boolean
  login: boolean
  jobId?: string
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2)
  let url = ''
  let headed = process.env.SCRAPER_HEADED === 'true'
  let dryRun = false
  let login = false
  let jobId: string | undefined

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--url':
        url = args[++i] || ''
        break
      case '--headed':
        headed = true
        break
      case '--dry-run':
        dryRun = true
        break
      case '--login':
        login = true
        headed = true // login always needs headed mode
        break
      case '--job-id':
        jobId = args[++i]
        break
    }
  }

  if (!login && !url) {
    logger.error('[bricklink-mocs] --url or --login is required')
    process.exit(1)
  }

  return { url, headed, dryRun, login, jobId }
}

// ─── Session Management ─────────────────────────────────────────────────

async function isLoggedIn(context: BrowserContext): Promise<boolean> {
  const page = await context.newPage()
  try {
    await page.goto(BRICKLINK_HOME, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)

    // Check blapp.session.me — null means not logged in
    const me = await page.evaluate(() => {
      const session = (window as any).blapp?.session
      return session?.me ?? null
    })

    return me !== null
  } finally {
    await page.close()
  }
}

function loadSession(): string | null {
  if (existsSync(SESSION_FILE)) {
    logger.info('[session] Loading saved session from .session.json')
    return SESSION_FILE
  }
  return null
}

async function saveSession(context: BrowserContext): Promise<void> {
  const state = await context.storageState()
  writeFileSync(SESSION_FILE, JSON.stringify(state, null, 2))
  logger.info('[session] Saved session to .session.json')
}

/**
 * Interactive login flow. Opens a headed browser and waits for the user
 * to complete BrickLink's LEGO Account SSO login manually.
 */
async function runLogin(): Promise<void> {
  logger.info('[login] Starting interactive login flow...')
  logger.info('[login] A browser window will open. Please log in to BrickLink manually.')
  logger.info('[login] Once logged in, the session will be saved automatically.')

  chromium.use(StealthPlugin())

  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled'],
  })

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
  })

  const page = await context.newPage()
  await page.goto(BRICKLINK_HOME, { waitUntil: 'domcontentloaded', timeout: 60000 })

  logger.info('[login] Waiting for you to log in... (checking every 5 seconds)')

  // Poll until user completes login
  let loggedIn = false
  const maxWait = 5 * 60 * 1000 // 5 minutes
  const start = Date.now()

  while (!loggedIn && Date.now() - start < maxWait) {
    await page.waitForTimeout(5000)

    const me = await page.evaluate(() => {
      const session = (window as any).blapp?.session
      return session?.me ?? null
    })

    if (me !== null) {
      loggedIn = true
      logger.info('[login] Login detected!')
    } else {
      const elapsed = Math.round((Date.now() - start) / 1000)
      logger.info(`[login] Still waiting... (${elapsed}s elapsed)`)
    }
  }

  if (!loggedIn) {
    logger.error('[login] Timed out waiting for login (5 minutes)')
    await browser.close()
    process.exit(1)
  }

  await saveSession(context)
  await browser.close()
  logger.info('[login] Session saved. You can now run scrapes without --login.')
}

// ─── Step Definitions ────────────────────────────────────────────────────

const STEPS = [
  { id: 'browser_launch', label: 'Launch browser' },
  { id: 'session_validate', label: 'Validate session' },
  { id: 'navigate_detail', label: 'Navigate to MOC page' },
  { id: 'scrape_detail', label: 'Scrape metadata & parts' },
  { id: 'upload_images', label: 'Upload images to storage' },
  { id: 'db_upsert', label: 'Save to scraper database' },
  { id: 'gallery_sync', label: 'Sync to gallery' },
]

// ─── Main Pipeline ───────────────────────────────────────────────────────

async function run(): Promise<void> {
  const opts = parseArgs()

  // Handle login-only mode
  if (opts.login) {
    await runLogin()
    return
  }

  const db = getDbClient()
  const bucket = process.env.SCRAPER_BUCKET || 'rebrickable-instructions'
  const syncUserId = process.env.SYNC_USER_ID
  const notificationsUrl = process.env.NOTIFICATIONS_SERVER_URL || 'http://localhost:3098'
  const hmacSecret = process.env.NOTIFICATIONS_HMAC_SECRET

  // Extract idModel for logging
  const idModelMatch = opts.url.match(/idModel=(\d+)/)
  const idModel = idModelMatch ? idModelMatch[1] : 'unknown'

  // Create scrape run
  const [scrapeRun] = await db
    .insert(schema.scrapeRuns)
    .values({
      status: 'running',
      config: {
        url: opts.url,
        headed: opts.headed,
        dryRun: opts.dryRun,
        scraperType: 'bricklink-moc',
      },
    })
    .returning()

  // Step tracker for real-time UI updates
  const tracker = new StepTracker({
    jobId: opts.jobId,
    scrapeRunId: scrapeRun.id,
    mocNumber: `BL-${idModel}`,
    scraperType: 'bricklink-moc-single',
    notificationsUrl,
    hmacSecret,
    db,
  })

  await tracker.plan(STEPS)

  // Check rate limit before doing any work
  const rateCheck = checkRateLimit()
  if (!rateCheck.allowed) {
    const msg = `Rate limit exceeded. Retry after ${Math.ceil((rateCheck.retryAfterMs ?? 0) / 60000)} minutes.`
    await tracker.fail('browser_launch', msg)
    await db
      .update(schema.scrapeRuns)
      .set({
        status: 'failed',
        completedAt: new Date(),
        errors: [{ message: msg, timestamp: new Date().toISOString() }],
      })
      .where(eq(schema.scrapeRuns.id, scrapeRun.id))
    await closeDbClient()
    process.exitCode = 1
    return
  }

  let browser
  let galleryPool: Pool | null = null

  try {
    // ── Step 1: Launch browser ──────────────────────────────────────
    await tracker.start('browser_launch')
    chromium.use(StealthPlugin())

    browser = await chromium.launch({
      headless: !opts.headed,
      args: ['--disable-blink-features=AutomationControlled'],
    })

    // Restore session if available
    const sessionPath = loadSession()
    const contextOptions: Record<string, unknown> = {
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
    }
    if (sessionPath) {
      contextOptions.storageState = JSON.parse(readFileSync(sessionPath, 'utf-8'))
    }

    const context = await browser.newContext(contextOptions as any)
    const page = await context.newPage()
    await tracker.complete('browser_launch')

    // ── Step 2: Validate session ────────────────────────────────────
    await tracker.start('session_validate')
    const loggedIn = await isLoggedIn(context)

    if (loggedIn) {
      logger.info('[session] Session is valid — logged in to BrickLink')
      await tracker.complete('session_validate', { loggedIn: true })
    } else {
      logger.warn(
        '[session] Not logged in. Run `pnpm scrape --login` first for authenticated scraping.',
      )
      logger.warn('[session] Continuing without auth — file downloads will not be available.')
      await tracker.complete('session_validate', { loggedIn: false })
    }

    // ── Step 3: Navigate ────────────────────────────────────────────
    await tracker.start('navigate_detail')

    // Human-like delay before navigation (5-10s)
    const delay = randomDelay()
    logger.info(`[bricklink-mocs] Waiting ${Math.round(delay / 1000)}s before navigating...`)
    await page.waitForTimeout(delay)

    await page.goto(opts.url, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await dismissPopups(page)

    // Wait for JS rendering
    await page.waitForTimeout(2000)
    await tracker.complete('navigate_detail')

    // ── Step 4: Scrape ──────────────────────────────────────────────
    await tracker.start('scrape_detail')
    const mocData = await scrapeMocDetail(page, opts.url)
    await tracker.complete('scrape_detail', {
      title: mocData.title,
      author: mocData.author,
      partsCount: mocData.parts.length,
      imageCount: mocData.galleryImageUrls.length,
    })

    logger.info(`[bricklink-mocs] Scraped: "${mocData.title}" by ${mocData.author}`)
    logger.info(
      `[bricklink-mocs] Stats: ${mocData.likes} likes, ${mocData.views} views, ${mocData.downloads} downloads`,
    )
    logger.info(
      `[bricklink-mocs] Parts: ${mocData.lotCount} lots, ${mocData.itemCount} items, ${mocData.colorCount} colors`,
    )

    // Save session after successful scrape (refresh cookies)
    if (loggedIn) {
      await saveSession(context)
    }

    if (opts.dryRun) {
      logger.info('[bricklink-mocs] Dry run — skipping storage, DB, and gallery sync')
      await tracker.skip('upload_images')
      await tracker.skip('db_upsert')
      await tracker.skip('gallery_sync')
      await markComplete(db, scrapeRun.id, mocData)
      return
    }

    // ── Step 5: Upload images ───────────────────────────────────────
    await tracker.start('upload_images')
    await initBucket(bucket)

    const { mainImageS3Key, galleryImageS3Keys } = await uploadDesignImages(
      mocData.galleryImageUrls,
      mocData.idModel,
      bucket,
    )
    await tracker.complete('upload_images', {
      uploaded: galleryImageS3Keys.length,
      total: mocData.galleryImageUrls.length,
    })

    // ── Step 6: DB upsert ───────────────────────────────────────────
    await tracker.start('db_upsert')
    await upsertDesign(db, scrapeRun.id, mocData, mainImageS3Key, galleryImageS3Keys)
    await tracker.complete('db_upsert')

    // ── Step 7: Gallery sync ────────────────────────────────────────
    if (syncUserId) {
      await tracker.start('gallery_sync')
      galleryPool = createGalleryPool()
      const galleryDb = drizzle(galleryPool, { schema: gallerySchema })

      const galleryMocId = await writeToGallery(
        galleryDb as any,
        syncUserId,
        mocData,
        galleryImageS3Keys,
      )

      await tracker.complete('gallery_sync', { galleryMocId })
    } else {
      await tracker.skip('gallery_sync')
      logger.info('[bricklink-mocs] SYNC_USER_ID not set — skipping gallery sync')
    }

    await markComplete(db, scrapeRun.id, mocData)
    recordScrape()
    logger.info(`[bricklink-mocs] Done: BL-${mocData.idModel}`)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error(`[bricklink-mocs] Pipeline failed: ${msg}`)

    await db
      .update(schema.scrapeRuns)
      .set({
        status: 'failed',
        completedAt: new Date(),
        errors: [{ message: msg, timestamp: new Date().toISOString() }],
      })
      .where(eq(schema.scrapeRuns.id, scrapeRun.id))

    process.exitCode = 1
  } finally {
    if (browser) await browser.close().catch(() => {})
    if (galleryPool) await galleryPool.end().catch(() => {})
    await closeDbClient()
  }
}

// ─── DB Upsert ───────────────────────────────────────────────────────────

async function upsertDesign(
  db: ReturnType<typeof getDbClient>,
  scrapeRunId: string,
  data: ScrapedMocDetail,
  mainImageS3Key: string | null,
  galleryImageS3Keys: string[],
): Promise<void> {
  // Upsert design row
  const [design] = await db
    .insert(schema.bricklinkDesigns)
    .values({
      idModel: data.idModel,
      title: data.title,
      author: data.author,
      authorUrl: data.authorUrl,
      authorLocation: data.authorLocation,
      description: data.description,
      publishedDate: data.publishedDate,
      category: data.category,
      tags: data.tags,
      views: data.views,
      downloads: data.downloads,
      likes: data.likes,
      comments: data.comments,
      lotCount: data.lotCount,
      itemCount: data.itemCount,
      colorCount: data.colorCount,
      mainImageUrl: data.mainImageUrl,
      galleryImageUrls: data.galleryImageUrls,
      mainImageS3Key,
      galleryImageS3Keys,
      sourceUrl: data.sourceUrl,
      scrapeRunId,
    })
    .onConflictDoUpdate({
      target: [schema.bricklinkDesigns.idModel],
      set: {
        title: data.title,
        author: data.author,
        authorUrl: data.authorUrl,
        authorLocation: data.authorLocation,
        description: data.description,
        publishedDate: data.publishedDate,
        category: data.category,
        tags: data.tags,
        views: data.views,
        downloads: data.downloads,
        likes: data.likes,
        comments: data.comments,
        lotCount: data.lotCount,
        itemCount: data.itemCount,
        colorCount: data.colorCount,
        mainImageUrl: data.mainImageUrl,
        galleryImageUrls: data.galleryImageUrls,
        mainImageS3Key,
        galleryImageS3Keys,
        sourceUrl: data.sourceUrl,
        scrapeRunId,
        updatedAt: new Date(),
      },
    })
    .returning()

  // Replace parts: delete existing, bulk insert
  await db
    .delete(schema.bricklinkDesignParts)
    .where(eq(schema.bricklinkDesignParts.designId, design.id))

  if (data.parts.length > 0) {
    const CHUNK_SIZE = 500
    for (let i = 0; i < data.parts.length; i += CHUNK_SIZE) {
      const chunk = data.parts.slice(i, i + CHUNK_SIZE)
      await db.insert(schema.bricklinkDesignParts).values(
        chunk.map(p => ({
          designId: design.id,
          partNumber: p.partNumber,
          name: p.name,
          color: p.color,
          colorId: p.colorId,
          quantity: p.quantity,
          imageUrl: p.imageUrl,
        })),
      )
    }
  }

  logger.info(`[db] Upserted BL-${data.idModel}: "${data.title}" with ${data.parts.length} parts`)
}

// ─── Helpers ─────────────────────────────────────────────────────────────

async function markComplete(
  db: ReturnType<typeof getDbClient>,
  scrapeRunId: string,
  data: ScrapedMocDetail,
): Promise<void> {
  await db
    .update(schema.scrapeRuns)
    .set({
      status: 'completed',
      completedAt: new Date(),
      instructionsFound: 1,
      downloaded: 1,
      summary: {
        title: data.title,
        author: data.author,
        idModel: data.idModel,
        partsCount: data.parts.length,
        imageCount: data.galleryImageUrls.length,
      },
    })
    .where(eq(schema.scrapeRuns.id, scrapeRunId))
}

function createGalleryPool() {
  return new Pool({
    host: process.env.GALLERY_DB_HOST || 'localhost',
    port: parseInt(process.env.GALLERY_DB_PORT || '5432', 10),
    database: process.env.GALLERY_DB_NAME || 'monorepo',
    user: process.env.GALLERY_DB_USER || 'postgres',
    password: process.env.GALLERY_DB_PASSWORD || 'postgres',
    max: 3,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
  })
}

// ─── Entry ───────────────────────────────────────────────────────────────

run()
