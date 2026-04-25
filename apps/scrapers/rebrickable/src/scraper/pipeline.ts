import { readFile } from 'fs/promises'
import { basename, extname } from 'path'
import { eq, and } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { logger } from '@repo/logger'
import { getDbClient, closeDbClient } from '../db/client.js'
import {
  scrapeRuns,
  instructions as instructionsTable,
  parts as partsTable,
  instructionParts as instructionPartsTable,
} from '../db/schema.js'
import * as gallerySchema from '../../../../../packages/backend/db/src/schema.js'
import { mocSourceSets } from '../../../../../packages/backend/db/src/schema.js'
import {
  writeToGallery,
  writeImagesToGallery,
  patchGalleryMeta,
  findGalleryMoc,
} from '../gallery/write-to-gallery.js'
import type { GalleryPartData } from '../gallery/write-to-gallery.js'
import { createStealthBrowser, saveSession, hasExistingSession } from './browser.js'
import { cleanupDownload as _cleanupDownload } from './downloader.js'
import { computeHash } from '../utils/hash.js'
import { humanWait, waitBetweenInstructions, waitBetweenPages } from './human-behavior.js'
import { LoginPage } from '../pages/login-page.js'
import { PurchasesPage } from '../pages/purchases-page.js'
import { LikedMocsPage } from '../pages/liked-mocs-page.js'
import { MocDetailPage } from '../pages/moc-detail-page.js'
import { TokenBucketRateLimiter } from '../middleware/rate-limiter.js'
import { loadRobotsTxt, isAllowed } from '../middleware/robots.js'
import { RetryHandler } from '../middleware/retry.js'
import { CheckpointManager } from '../checkpoint/manager.js'
import { initBucket, uploadInstruction, uploadImage, listImages } from '../storage/minio.js'
import { normalizeParts } from '../data/normalizer.js'
import { enrichScrapeRun } from '../data/enricher.js'
import { ProgressTracker } from '../utils/progress.js'
import { StepTracker } from '../utils/step-tracker.js'
import type { CliOptions } from '../__types__/index.js'

const NOTIFICATIONS_URL = process.env.NOTIFICATIONS_SERVER_URL || 'http://localhost:3098'
const HMAC_SECRET = process.env.NOTIFICATIONS_HMAC_SECRET || ''

const MOC_SINGLE_STEPS = [
  { id: 'browser_launch', label: 'Launch browser' },
  { id: 'session_validate', label: 'Validate session' },
  { id: 'navigate_detail', label: 'Navigate to MOC page' },
  { id: 'scrape_detail', label: 'Scrape metadata' },
  { id: 'scrape_images', label: 'Download images' },
  { id: 'download_files', label: 'Download instruction files' },
  { id: 'upload_minio', label: 'Upload to storage' },
  { id: 'db_upsert', label: 'Save to database' },
  { id: 'gallery_sync', label: 'Sync gallery' },
  { id: 'scrape_parts', label: 'Scrape parts inventory' },
  { id: 'enrichment', label: 'Enrich data' },
]
import type { Browser, BrowserContext, Page } from 'playwright'

/**
 * --list-only mode: Login, paginate purchases/liked page, output MOC list as JSON to stdout.
 * No detail scraping, no downloads, no DB writes.
 */
export async function runListOnly(
  options: CliOptions,
  config: {
    username: string
    password: string
    userSlug: string
    rateLimit: number
    minDelayMs: number
  },
): Promise<void> {
  const rateLimiter = new TokenBucketRateLimiter({
    requestsPerMinute: config.rateLimit,
    minDelayMs: config.minDelayMs,
  })

  let browser: Browser | undefined
  let context: BrowserContext | undefined
  let page: Page | undefined

  try {
    // Launch browser
    const isFirstRun = !hasExistingSession()
    const browserResult = await createStealthBrowser({
      headed: options.headed || isFirstRun,
    })
    browser = browserResult.browser
    context = browserResult.context
    page = browserResult.page

    // Login
    const loginPage = new LoginPage(page)
    const sessionValid = await loginPage.checkSessionValid()
    if (!sessionValid) {
      logger.info('[list-only] No valid session, logging in...')
      await loginPage.login(config.username, config.password)
      await saveSession(context)
    } else {
      logger.info('[list-only] Existing session is valid')
    }

    // Build instruction list
    let instructionList: Array<{
      mocNumber: string
      title: string
      url: string
      author: string
    }>

    if (options.likedMocs) {
      const likedMocsPage = new LikedMocsPage(page)
      await rateLimiter.acquire()
      await likedMocsPage.navigate(config.userSlug)
      await waitBetweenPages()
      instructionList = await likedMocsPage.scrapeAllInstructions(options.limit)
    } else {
      const purchasesPage = new PurchasesPage(page)
      await rateLimiter.acquire()
      await purchasesPage.navigate(config.userSlug)
      await waitBetweenPages()
      instructionList = await purchasesPage.scrapeAllInstructions(options.limit)
    }

    if (options.limit) {
      instructionList = instructionList.slice(0, options.limit)
    }

    const output = instructionList.map(item => ({
      mocNumber: item.mocNumber,
      title: item.title,
      url: item.url,
      author: item.author,
    }))

    // Write JSON to a temp file so the worker can read it cleanly
    // without parsing stdout (which is mixed with logger output).
    const { writeFile } = await import('fs/promises')
    const { tmpdir } = await import('os')
    const { join } = await import('path')
    const outPath = join(tmpdir(), `rebrickable-list-${Date.now()}.json`)
    await writeFile(outPath, JSON.stringify(output))
    // Print the file path on a known line so the worker can find it
    process.stdout.write(`__MOC_LIST_FILE__${outPath}\n`)

    logger.info(`[list-only] Listed ${output.length} MOCs`)
  } finally {
    if (context) await saveSession(context).catch(() => {})
    if (browser) await browser.close().catch(() => {})
  }
}

/**
 * --single mode: Scrape exactly one MOC by number using the full pipeline logic.
 * Reuses the existing pipeline's per-MOC processing (detail, download, DB upsert, gallery sync).
 */
export async function runSingle(
  options: CliOptions,
  config: {
    username: string
    password: string
    userSlug: string
    bucket: string
    rateLimit: number
    minDelayMs: number
  },
): Promise<void> {
  const mocNumber = options.single!
  const mocUrl = `https://rebrickable.com/mocs/MOC-${mocNumber}/`

  logger.info(`[single] Scraping single MOC: MOC-${mocNumber}`)

  // Run the normal pipeline with a synthetic instruction list of one item
  // We set likedMocs=false, retryFailed=false, retryMissing=false to avoid those branches,
  // and inject our single MOC via a patched flow.
  // The simplest approach: call runPipeline but override the instruction list.
  // Instead, we pass through to runPipeline with a temporary override.
  // Actually, the cleanest approach is to run the pipeline normally — it will
  // paginate but we only process one item. But that's wasteful.
  // Instead, directly invoke the single-MOC processing inline.

  const db = getDbClient()
  const galleryPool = createGalleryPool()
  const galleryDb = drizzle(galleryPool, { schema: gallerySchema })
  const syncUserId = process.env.SYNC_USER_ID || ''
  const rateLimiter = new TokenBucketRateLimiter({
    requestsPerMinute: config.rateLimit,
    minDelayMs: config.minDelayMs,
  })
  const retry = new RetryHandler()

  let browser: Browser | undefined
  let context: BrowserContext | undefined
  let page: Page | undefined

  try {
    if (!options.dryRun) {
      await initBucket(config.bucket)
    }

    // Create scrape run
    const [run] = await db
      .insert(scrapeRuns)
      .values({
        status: 'running',
        config: { mode: 'single', mocNumber, options, ...config, password: '***' },
      })
      .returning()
    const scrapeRunId = run.id
    const checkpoint = new CheckpointManager(scrapeRunId)
    const steps = new StepTracker({
      jobId: options.jobId,
      scrapeRunId,
      mocNumber,
      scraperType: 'rebrickable-moc-single',
      notificationsUrl: NOTIFICATIONS_URL,
      hmacSecret: HMAC_SECRET,
      db,
    })
    await steps.plan(MOC_SINGLE_STEPS)

    // Skip if already completed (unless --force)
    if (!options.force && (await checkpoint.isCompleted(mocNumber))) {
      logger.info(`[single] MOC-${mocNumber} already completed — use --force to re-scrape`)
      await db
        .update(scrapeRuns)
        .set({ status: 'completed', completedAt: new Date(), skipped: 1, instructionsFound: 1 })
        .where(eq(scrapeRuns.id, scrapeRunId))
      return
    }

    // Launch browser
    await steps.start('browser_launch')
    const isFirstRun = !hasExistingSession()
    const browserResult = await createStealthBrowser({
      headed: options.headed || isFirstRun,
    })
    browser = browserResult.browser
    context = browserResult.context
    page = browserResult.page
    await steps.complete('browser_launch')

    // Login
    await steps.start('session_validate')
    const loginPage = new LoginPage(page)
    const sessionValid = await loginPage.checkSessionValid()
    if (!sessionValid) {
      logger.info('[single] No valid session, logging in...')
      await loginPage.login(config.username, config.password)
      await saveSession(context)
    }
    await steps.complete('session_validate', { hadValidSession: sessionValid })

    await db.update(scrapeRuns).set({ instructionsFound: 1 }).where(eq(scrapeRuns.id, scrapeRunId))

    // Navigate to MOC detail
    await steps.start('navigate_detail')
    await rateLimiter.acquire()
    await humanWait('thinking')
    const mocPage = new MocDetailPage(page)
    await retry.execute(() => mocPage.navigate(mocUrl), `navigate MOC-${mocNumber}`)
    await waitBetweenPages()
    await steps.complete('navigate_detail')

    // Scrape detail
    await steps.start('scrape_detail')
    const detail = await retry.execute(
      () => mocPage.scrapeDetail(mocNumber),
      `scrape MOC-${mocNumber}`,
    )

    await steps.complete('scrape_detail', { title: detail.title, partsCount: detail.partsCount })

    await steps.start('scrape_images')
    const images = await mocPage.scrapeImages(mocNumber)
    await steps.complete('scrape_images', { imagesFound: images.length })
    if (images.length > 0) {
      logger.info(`[single] MOC-${mocNumber}: downloaded ${images.length} images`)
    }

    await checkpoint.save(mocNumber, 'detail_scraped', {
      ...(detail as unknown as Record<string, unknown>),
      rebrickableUrl: mocUrl,
    })

    if (options.dryRun) {
      logger.info(
        `[single] MOC-${mocNumber} — ${detail.title} (dry run, ${detail.partsCount} parts)`,
      )
      await checkpoint.save(mocNumber, 'completed')
      await db
        .update(scrapeRuns)
        .set({ status: 'completed', completedAt: new Date(), downloaded: 1 })
        .where(eq(scrapeRuns.id, scrapeRunId))
      return
    }

    // Download files
    await steps.start('download_files')
    const fileList = await mocPage.scrapeFileList()
    let primaryDownloadPath: string | null = null
    let totalFileSize = 0

    if (fileList.length > 0) {
      logger.info(`[single] MOC-${mocNumber}: found ${fileList.length} files to download`)

      for (let fi = 0; fi < fileList.length; fi++) {
        const file = fileList[fi]
        logger.info(
          `[single] MOC-${mocNumber}: downloading file ${fi + 1}/${fileList.length}: ${file.fileName}`,
        )

        const downloadPath = await retry.execute(
          () => mocPage.triggerDownload(file, mocNumber),
          `download MOC-${mocNumber} file ${fi + 1}`,
        )

        if (downloadPath) {
          const buffer = await readFile(downloadPath)
          totalFileSize += buffer.length
          const fileName = basename(downloadPath)
          await uploadInstruction(downloadPath, mocNumber, fileName, config.bucket)
          logger.info(
            `[single] MOC-${mocNumber}: uploaded ${fileName} (${formatBytes(buffer.length)})`,
          )

          if (!primaryDownloadPath) {
            primaryDownloadPath = downloadPath
          }
        }
      }
    }
    await steps.complete('download_files', { filesFound: fileList.length, totalFileSize })

    if (primaryDownloadPath) {
      // Uploads happened inline during download — mark upload_minio as done
      await steps.start('upload_minio')
      await steps.complete('upload_minio', { filesUploaded: fileList.length })

      const buffer = await readFile(primaryDownloadPath)
      const contentHash = computeHash(buffer)
      const fileName = basename(primaryDownloadPath)
      const fileType = extname(fileName).replace('.', '').toUpperCase()

      await checkpoint.save(mocNumber, 'downloaded', {
        filePath: primaryDownloadPath,
        fileName,
        fileSize: totalFileSize,
        contentHash,
        fileCount: fileList.length,
      })
      await checkpoint.save(mocNumber, 'uploaded')

      await steps.start('db_upsert')
      const normalizedParts = normalizeParts(detail.parts)

      const instructionResult = await db
        .insert(instructionsTable)
        .values({
          mocNumber,
          title: detail.title,
          author: detail.author,
          rebrickableUrl: mocUrl,
          downloadUrl: mocUrl,
          partsCount: detail.partsCount,
          fileType,
          fileSizeBytes: totalFileSize,
          contentHash,
          minioKey: `mocs/MOC-${mocNumber}/${fileName}`,
          minioUrl: `mocs/MOC-${mocNumber}/${fileName}`,
          description: detail.description || null,
          descriptionHtml: detail.descriptionHtml || null,
          dateAdded: safeDate(detail.dateAdded),
          authorProfileUrl: detail.authorProfileUrl || null,
          tags: detail.tags.length > 0 ? detail.tags : null,
          scrapeRunId,
        })
        .onConflictDoUpdate({
          target: instructionsTable.mocNumber,
          set: {
            ...(detail.title ? { title: detail.title } : {}),
            ...(detail.author ? { author: detail.author } : {}),
            downloadUrl: mocUrl,
            ...(detail.partsCount != null ? { partsCount: detail.partsCount } : {}),
            ...(fileType ? { fileType } : {}),
            ...(totalFileSize ? { fileSizeBytes: totalFileSize } : {}),
            ...(contentHash ? { contentHash } : {}),
            minioKey: `mocs/MOC-${mocNumber}/${fileName}`,
            minioUrl: `mocs/MOC-${mocNumber}/${fileName}`,
            ...(detail.description ? { description: detail.description } : {}),
            ...(detail.descriptionHtml ? { descriptionHtml: detail.descriptionHtml } : {}),
            ...(safeDate(detail.dateAdded) ? { dateAdded: safeDate(detail.dateAdded) } : {}),
            ...(detail.authorProfileUrl ? { authorProfileUrl: detail.authorProfileUrl } : {}),
            ...(detail.tags.length > 0 ? { tags: detail.tags } : {}),
            scrapeRunId,
            updatedAt: new Date(),
          },
        })
        .returning()

      const inst = instructionResult[0]

      if (normalizedParts.length > 0) {
        for (const p of normalizedParts) {
          const [part] = await db
            .insert(partsTable)
            .values({
              partNumber: p.partNumber,
              color: p.color,
              name: p.name,
              category: p.category,
              imageUrl: p.imageUrl,
            })
            .onConflictDoUpdate({
              target: [partsTable.partNumber, partsTable.color],
              set: {
                ...(p.name ? { name: p.name } : {}),
                ...(p.category ? { category: p.category } : {}),
                ...(p.imageUrl ? { imageUrl: p.imageUrl } : {}),
              },
            })
            .returning()

          await db
            .insert(instructionPartsTable)
            .values({
              instructionId: inst.id,
              partId: part.id,
              quantity: p.quantity,
              isSpare: p.isSpare ?? 0,
            })
            .onConflictDoUpdate({
              target: [instructionPartsTable.instructionId, instructionPartsTable.partId],
              set: { quantity: p.quantity, isSpare: p.isSpare ?? 0 },
            })
        }
        logger.info(
          `[single] MOC-${mocNumber}: linked ${normalizedParts.length} parts to instruction`,
        )
      }

      await steps.complete('db_upsert', { partsLinked: normalizedParts.length })

      // Gallery sync
      await steps.start('gallery_sync')
      if (syncUserId) {
        const galleryParts: GalleryPartData[] = normalizedParts.map(p => ({
          partNumber: p.partNumber,
          partName: p.name,
          color: p.color,
          quantity: p.quantity,
        }))

        const galleryMocId = await writeToGallery(galleryDb as any, syncUserId, {
          mocNumber,
          title: detail.title,
          author: detail.author,
          description: detail.description || null,
          descriptionHtml: detail.descriptionHtml || null,
          dateAdded: safeDate(detail.dateAdded),
          authorProfileUrl: detail.authorProfileUrl || null,
          tags: detail.tags.length > 0 ? detail.tags : null,
          partsCount: detail.partsCount,
          rebrickableUrl: mocUrl,
          s3Key: `mocs/MOC-${mocNumber}/${fileName}`,
          fileType,
          parts: galleryParts.length > 0 ? galleryParts : undefined,
        })

        if (galleryMocId && images.length > 0) {
          for (const img of images) {
            const imgFileName = basename(img.filePath)
            await uploadImage(img.filePath, mocNumber, imgFileName, config.bucket)
          }
          const minioImages = await listImages(mocNumber, config.bucket)
          if (minioImages.length > 0) {
            const imageData = minioImages.map(key => ({
              s3Key: key,
              fileName: key.split('/').pop() || 'unknown',
            }))
            await writeImagesToGallery(galleryDb as any, galleryMocId, imageData)
          }
        }
      }

      await steps.complete('gallery_sync')
      await checkpoint.save(mocNumber, 'completed')
    } else {
      await steps.skip('upload_minio')
      await steps.skip('db_upsert')
      await steps.skip('gallery_sync')
      logger.warn(`[single] No files downloaded for MOC-${mocNumber}`)
    }

    // Write source sets (MOC → LEGO set relationships) to main DB
    if (detail.sourceSets.length > 0 && !options.dryRun) {
      logger.info(`[single] MOC-${mocNumber}: linking ${detail.sourceSets.length} source set(s)`)
      for (const sourceSet of detail.sourceSets) {
        await (galleryDb as any)
          .insert(mocSourceSets)
          .values({
            mocNumber: `MOC-${mocNumber}`,
            setNumber: sourceSet.setNumber,
          })
          .onConflictDoNothing()
      }
      logger.info(
        `[single] MOC-${mocNumber}: source sets linked: ${detail.sourceSets.map(s => s.setNumber).join(', ')}`,
      )
    }

    // Scrape parts from inventory tab
    await steps.start('scrape_parts')
    const partsResult = await mocPage.scrapePartsFromInventory(mocNumber)
    if (partsResult.parts.length > 0) {
      logger.info(
        `[single] MOC-${mocNumber}: scraped ${partsResult.parts.length} unique parts (${partsResult.parts.reduce((sum, p) => sum + p.quantity, 0)} total)`,
      )
    }

    await steps.complete('scrape_parts', {
      partsFound: partsResult.parts.length,
      exports: partsResult.exports.length,
    })

    // Enrichment
    await steps.start('enrichment')
    if (!options.dryRun) {
      const summary = await enrichScrapeRun(scrapeRunId)
      await db
        .update(scrapeRuns)
        .set({
          status: 'completed',
          completedAt: new Date(),
          downloaded: primaryDownloadPath ? 1 : 0,
          skipped: 0,
          summary: summary as any,
        })
        .where(eq(scrapeRuns.id, scrapeRunId))
    } else {
      await db
        .update(scrapeRuns)
        .set({ status: 'completed', completedAt: new Date(), downloaded: 1 })
        .where(eq(scrapeRuns.id, scrapeRunId))
    }
    await steps.complete('enrichment')

    logger.info(`[single] MOC-${mocNumber} — complete`)
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    logger.error(`[single] Failed MOC-${mocNumber}: ${errMsg}`)
    throw error
  } finally {
    if (context) await saveSession(context).catch(() => {})
    if (browser) await browser.close().catch(() => {})
    await galleryPool.end().catch(() => {})
    await closeDbClient()
  }
}

/**
 * --retry-missing --single mode: Backfill a single MOC.
 * Assesses what's missing (detail, images, gallery meta) and patches selectively.
 */
export async function runBackfillSingle(
  options: CliOptions,
  config: {
    username: string
    password: string
    bucket: string
    rateLimit: number
    minDelayMs: number
  },
): Promise<void> {
  const mocNumber = options.single!
  logger.info(`[backfill-single] Backfilling MOC-${mocNumber}`)

  const db = getDbClient()
  const galleryPool = createGalleryPool()
  const galleryDb = drizzle(galleryPool, { schema: gallerySchema })
  const rateLimiter = new TokenBucketRateLimiter({
    requestsPerMinute: config.rateLimit,
    minDelayMs: config.minDelayMs,
  })
  const retry = new RetryHandler()

  let browser: Browser | undefined
  let context: BrowserContext | undefined
  let page: Page | undefined

  try {
    await initBucket(config.bucket)

    // Create scrape run
    const [run] = await db
      .insert(scrapeRuns)
      .values({ status: 'running', config: { mode: 'backfill-single', mocNumber } })
      .returning()
    const scrapeRunId = run.id
    const checkpoint = new CheckpointManager(scrapeRunId)

    // Skip if already backfilled (unless --force)
    if (!options.force && (await checkpoint.hasBackfillCompleted(mocNumber))) {
      logger.info(`[backfill-single] MOC-${mocNumber} already backfilled — use --force to redo`)
      await db
        .update(scrapeRuns)
        .set({ status: 'completed', completedAt: new Date(), skipped: 1, instructionsFound: 1 })
        .where(eq(scrapeRuns.id, scrapeRunId))
      return
    }

    // Load instruction from DB
    const [instr] = await db
      .select()
      .from(instructionsTable)
      .where(eq(instructionsTable.mocNumber, mocNumber))
      .limit(1)

    if (!instr) {
      logger.warn(
        `[backfill-single] MOC-${mocNumber} not found in instructions table — nothing to backfill`,
      )
      await db
        .update(scrapeRuns)
        .set({ status: 'completed', completedAt: new Date(), skipped: 1 })
        .where(eq(scrapeRuns.id, scrapeRunId))
      return
    }

    if (!instr.minioKey || instr.minioKey.length === 0) {
      logger.warn(`[backfill-single] MOC-${mocNumber} has no MinIO file — run normal scrape first`)
      await db
        .update(scrapeRuns)
        .set({ status: 'completed', completedAt: new Date(), skipped: 1 })
        .where(eq(scrapeRuns.id, scrapeRunId))
      return
    }

    await db.update(scrapeRuns).set({ instructionsFound: 1 }).where(eq(scrapeRuns.id, scrapeRunId))

    // Assess what needs backfilling
    const needs = await assessBackfillNeeds(instr, galleryDb as any, config.bucket)
    const needsBrowser = needs.scraperDetailMissing || needs.imagesMissingInMinio

    if (!needsBrowser && !needs.imagesMissingInGallery && !needs.galleryMetaMissing) {
      logger.info(`[backfill-single] MOC-${mocNumber} — nothing missing, already complete`)
      await checkpoint.save(mocNumber, 'backfill_completed', { reason: 'nothing_missing' })
      await db
        .update(scrapeRuns)
        .set({ status: 'completed', completedAt: new Date(), skipped: 1 })
        .where(eq(scrapeRuns.id, scrapeRunId))
      return
    }

    logger.info(
      `[backfill-single] MOC-${mocNumber}: needs=${JSON.stringify({
        scraperDetail: needs.scraperDetailMissing,
        minioImages: needs.imagesMissingInMinio,
        galleryImages: needs.imagesMissingInGallery,
        galleryMeta: needs.galleryMetaMissing,
      })}`,
    )

    let updatedInstr = instr

    // Browser visit if needed
    if (needsBrowser) {
      const isFirstRun = !hasExistingSession()
      const browserResult = await createStealthBrowser({
        headed: options.headed || isFirstRun,
      })
      browser = browserResult.browser
      context = browserResult.context
      page = browserResult.page

      const loginPage = new LoginPage(page)
      const sessionValid = await loginPage.checkSessionValid()
      if (!sessionValid) {
        await loginPage.login(config.username, config.password)
        await saveSession(context)
      }

      await rateLimiter.acquire()
      await humanWait('thinking')

      const mocPage = new MocDetailPage(page)
      await retry.execute(() => mocPage.navigate(instr.rebrickableUrl), `navigate MOC-${mocNumber}`)
      await waitBetweenPages()

      // Re-scrape detail if fields are missing
      if (needs.scraperDetailMissing) {
        const detail = await retry.execute(
          () => mocPage.scrapeDetail(mocNumber),
          `scrape detail MOC-${mocNumber}`,
        )

        const scraperPatch: Record<string, unknown> = { updatedAt: new Date() }
        if (!instr.description && detail.description) scraperPatch.description = detail.description
        if (!instr.descriptionHtml && detail.descriptionHtml)
          scraperPatch.descriptionHtml = detail.descriptionHtml
        if (!instr.authorProfileUrl && detail.authorProfileUrl)
          scraperPatch.authorProfileUrl = detail.authorProfileUrl
        if ((!instr.tags || (instr.tags as string[]).length === 0) && detail.tags.length > 0)
          scraperPatch.tags = detail.tags
        if (!instr.dateAdded && detail.dateAdded)
          scraperPatch.dateAdded = safeDate(detail.dateAdded)
        if (!instr.author && detail.author) scraperPatch.author = detail.author

        if (Object.keys(scraperPatch).length > 1) {
          await db
            .update(instructionsTable)
            .set(scraperPatch as any)
            .where(eq(instructionsTable.mocNumber, mocNumber))
          logger.info(
            `[backfill-single] MOC-${mocNumber}: patched ${Object.keys(scraperPatch)
              .filter(k => k !== 'updatedAt')
              .join(', ')}`,
          )
        }

        const refreshed = await db
          .select()
          .from(instructionsTable)
          .where(eq(instructionsTable.mocNumber, mocNumber))
          .limit(1)
        if (refreshed[0]) updatedInstr = refreshed[0]
      }

      // Scrape + upload images if missing from MinIO
      if (needs.imagesMissingInMinio && !options.dryRun) {
        const images = await mocPage.scrapeImages(mocNumber)
        for (const img of images) {
          const fileName = basename(img.filePath)
          await uploadImage(img.filePath, mocNumber, fileName, config.bucket)
        }
        if (images.length > 0) {
          logger.info(
            `[backfill-single] MOC-${mocNumber}: uploaded ${images.length} images to MinIO`,
          )
        }
      }
    }

    // Sync images + gallery meta
    if (!options.dryRun) {
      const galleryMoc = await findGalleryMoc(galleryDb as any, mocNumber)
      if (galleryMoc) {
        const minioImages = await listImages(mocNumber, config.bucket)
        if (minioImages.length > 0 && needs.imagesMissingInGallery) {
          const imageData = minioImages.map(key => ({
            s3Key: key,
            fileName: key.split('/').pop() || 'unknown',
          }))
          await writeImagesToGallery(galleryDb as any, galleryMoc.id, imageData)
        }
        if (needs.galleryMetaMissing || needs.scraperDetailMissing) {
          await patchGalleryMeta(galleryDb as any, galleryMoc.id, {
            description: updatedInstr.description,
            descriptionHtml: updatedInstr.descriptionHtml,
            tags: updatedInstr.tags as string[] | null,
            dateAdded: updatedInstr.dateAdded,
            authorProfileUrl: updatedInstr.authorProfileUrl,
            author: updatedInstr.author,
          })
        }
      }
    }

    await checkpoint.save(mocNumber, 'backfill_completed', {
      scraperDetailPatched: needs.scraperDetailMissing,
      imagesUploaded: needs.imagesMissingInMinio,
      galleryImagesLinked: needs.imagesMissingInGallery,
      galleryMetaPatched: needs.galleryMetaMissing,
    })

    await db
      .update(scrapeRuns)
      .set({ status: 'completed', completedAt: new Date(), downloaded: 1 })
      .where(eq(scrapeRuns.id, scrapeRunId))

    logger.info(`[backfill-single] MOC-${mocNumber} — complete`)
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    logger.error(`[backfill-single] Failed MOC-${mocNumber}: ${errMsg}`)
    throw error
  } finally {
    if (context) await saveSession(context).catch(() => {})
    if (browser) await browser.close().catch(() => {})
    await galleryPool.end().catch(() => {})
    await closeDbClient()
  }
}

export async function runPipeline(
  options: CliOptions,
  config: {
    username: string
    password: string
    userSlug: string
    bucket: string
    rateLimit: number
    minDelayMs: number
  },
): Promise<void> {
  const db = getDbClient()
  const galleryPool = createGalleryPool()
  const galleryDb = drizzle(galleryPool, { schema: gallerySchema })
  const syncUserId = process.env.SYNC_USER_ID || ''
  const rateLimiter = new TokenBucketRateLimiter({
    requestsPerMinute: config.rateLimit,
    minDelayMs: config.minDelayMs,
  })
  const retry = new RetryHandler()

  let browser: Browser | undefined
  let context: BrowserContext | undefined
  let page: Page | undefined
  let scrapeRunId: string | undefined

  // Proactive session refresh: re-authenticate before cookies expire.
  // Rebrickable sessions degrade silently — AJAX modal requests start returning 403
  // while isLoggedIn() still returns true because the page DOM is already loaded.
  // Refreshing every 45 min prevents cascade download failures mid-batch.
  const SESSION_REFRESH_INTERVAL_MS = 45 * 60 * 1000
  let lastAuthTime = Date.now()

  async function refreshSessionIfStale(): Promise<void> {
    const elapsed = Date.now() - lastAuthTime
    if (elapsed < SESSION_REFRESH_INTERVAL_MS) return

    logger.info(
      `[pipeline] Session is ${Math.round(elapsed / 60000)}m old — proactively refreshing auth...`,
    )
    const loginPage = new LoginPage(page!)
    await loginPage.login(config.username, config.password)
    await saveSession(context!)
    lastAuthTime = Date.now()
    logger.info('[pipeline] Session refreshed')
  }

  // Signal handling for graceful shutdown
  let interrupted = false
  const handleSignal = async () => {
    if (interrupted) return
    interrupted = true
    logger.info('[pipeline] Interrupt received, saving checkpoint...')

    if (scrapeRunId) {
      await db
        .update(scrapeRuns)
        .set({ status: 'interrupted', completedAt: new Date() })
        .where(eq(scrapeRuns.id, scrapeRunId))
    }

    if (context) {
      await saveSession(context).catch(() => {})
    }
    if (browser) {
      await browser.close().catch(() => {})
    }
    await closeDbClient()

    process.exit(0)
  }

  process.on('SIGINT', handleSignal)
  process.on('SIGTERM', handleSignal)

  try {
    // ── Step 1: Initialize infrastructure ────────────────────────────────
    logger.info('[pipeline] Initializing...')

    if (!options.dryRun) {
      await initBucket(config.bucket)
    }

    // ── Step 2: robots.txt ───────────────────────────────────────────────
    if (!options.ignoreRobots) {
      await loadRobotsTxt('https://rebrickable.com')
    }

    // ── Step 3: Check for interrupted runs ───────────────────────────────
    if (options.resume) {
      const interrupted = await CheckpointManager.findInterruptedRun()
      if (interrupted) {
        logger.info(
          `[pipeline] Found interrupted run from ${interrupted.startedAt.toISOString()} ` +
            `[${interrupted.downloaded}/${interrupted.instructionsFound} completed]`,
        )
        scrapeRunId = interrupted.id
        await db.update(scrapeRuns).set({ status: 'running' }).where(eq(scrapeRuns.id, scrapeRunId))
      }
    }

    // Create new run if not resuming
    if (!scrapeRunId) {
      const [run] = await db
        .insert(scrapeRuns)
        .values({
          status: 'running',
          config: { options, ...config, password: '***' },
        })
        .returning()

      scrapeRunId = run.id
    }

    const checkpoint = new CheckpointManager(scrapeRunId)

    // ── Step 4: Launch browser ───────────────────────────────────────────
    const isFirstRun = !hasExistingSession()
    const headed = options.headed || isFirstRun

    if (isFirstRun) {
      logger.info('[pipeline] First run detected — launching in headed mode for discovery')
    }

    const browserResult = await createStealthBrowser({ headed })
    browser = browserResult.browser
    context = browserResult.context
    page = browserResult.page

    // ── Step 5: Login ────────────────────────────────────────────────────
    const loginPage = new LoginPage(page)
    const sessionValid = await loginPage.checkSessionValid()

    if (!sessionValid) {
      logger.info('[pipeline] No valid session, logging in...')
      await loginPage.login(config.username, config.password)
      await saveSession(context)
    } else {
      logger.info('[pipeline] Existing session is valid')
    }
    lastAuthTime = Date.now()

    // ── Step 6: Build instruction list ───────────────────────────────────
    let instructionList: Array<{
      mocNumber: string
      title: string
      url: string
      author: string
      purchaseDate?: string
    }>

    if (options.retryFailed) {
      // --retry-failed: load partial MOCs from checkpoint (detail_scraped but never completed)
      const partialMocs = await CheckpointManager.findPartialMocs()
      logger.info(`[pipeline] --retry-failed: found ${partialMocs.length} partially scraped MOCs`)

      if (partialMocs.length === 0) {
        logger.info('[pipeline] No partial MOCs found — nothing to retry')
        await db
          .update(scrapeRuns)
          .set({ status: 'completed', completedAt: new Date(), instructionsFound: 0 })
          .where(eq(scrapeRuns.id, scrapeRunId))
        return
      }

      instructionList = partialMocs.map(m => ({
        mocNumber: m.mocNumber,
        title: m.title,
        url: m.rebrickableUrl,
        author: '',
      }))

      if (options.limit) {
        instructionList = instructionList.slice(0, options.limit)
      }
    } else if (options.likedMocs) {
      // --liked-mocs: two-phase discovery
      // Phase 1a: Paginate liked MOCs list to collect ALL MOC URLs
      const likedMocsPage = new LikedMocsPage(page)
      await rateLimiter.acquire()
      await likedMocsPage.navigate(config.userSlug)

      const allLikedMocs = await likedMocsPage.scrapeAllInstructions()
      logger.info(`[pipeline] Liked MOCs list: ${allLikedMocs.length} total`)

      // Phase 1b: Shuffle to randomize visit order (avoid bot-like sequential patterns)
      for (let i = allLikedMocs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[allLikedMocs[i], allLikedMocs[j]] = [allLikedMocs[j], allLikedMocs[i]]
      }
      logger.info(`[pipeline] Shuffled visit order`)

      // Phase 1c: Visit each detail page to check for free instructions
      const downloadQueue: typeof allLikedMocs = []
      let discoveryVisited = 0
      let discoverySkipped = 0

      for (const item of allLikedMocs) {
        if (interrupted) break

        // Stop when we have enough free MOCs
        if (options.limit && downloadQueue.length >= options.limit) {
          logger.info(`[pipeline] Discovery reached limit of ${options.limit} free MOCs — stopping`)
          break
        }

        // Skip already-completed MOCs
        if (!options.force && (await checkpoint.isCompleted(item.mocNumber))) {
          discoverySkipped++
          continue
        }

        discoveryVisited++
        await rateLimiter.acquire()
        await humanWait('scanning')

        try {
          const mocPage = new MocDetailPage(page!)
          await retry.execute(() => mocPage.navigate(item.url), `discover MOC-${item.mocNumber}`)

          const isFree = await mocPage.hasFreeInstructions()
          if (isFree) {
            downloadQueue.push(item)
            logger.info(
              `[pipeline] MOC-${item.mocNumber} "${item.title}" — FREE ✓ (queue: ${downloadQueue.length})`,
            )
          } else {
            logger.info(`[pipeline] MOC-${item.mocNumber} "${item.title}" — not free, skipping`)
          }

          await waitBetweenPages()

          // Refresh session periodically
          await refreshSessionIfStale()
        } catch (err) {
          logger.warn(`[pipeline] Discovery failed for MOC-${item.mocNumber}`, {
            error: err instanceof Error ? err.message : String(err),
          })
        }
      }

      logger.info(
        `[pipeline] Discovery complete: ${downloadQueue.length} free MOCs found, ` +
          `${discoveryVisited} visited, ${discoverySkipped} skipped (already completed)`,
      )

      instructionList = downloadQueue

      await db
        .update(scrapeRuns)
        .set({ instructionsFound: downloadQueue.length })
        .where(eq(scrapeRuns.id, scrapeRunId))
    } else {
      // Normal mode: scrape purchases list from Rebrickable
      const purchasesPage = new PurchasesPage(page)
      await rateLimiter.acquire()
      await purchasesPage.navigate(config.userSlug)

      const allInstructions = await purchasesPage.scrapeAllInstructions(options.limit)
      instructionList = allInstructions

      if (options.limit) {
        instructionList = instructionList.slice(0, options.limit)
        logger.info(`[pipeline] Limited to ${options.limit} instructions`)
      }

      await db
        .update(scrapeRuns)
        .set({ instructionsFound: allInstructions.length })
        .where(eq(scrapeRuns.id, scrapeRunId))
    }

    // Update run counts
    await db
      .update(scrapeRuns)
      .set({ instructionsFound: instructionList.length })
      .where(eq(scrapeRuns.id, scrapeRunId))

    // ── Step 7: Process each instruction ─────────────────────────────────
    const progress = new ProgressTracker(instructionList.length, 'Scraping')
    let downloadedCount = 0
    let skippedCount = 0
    const errors: Array<Record<string, unknown>> = []

    for (const item of instructionList) {
      if (interrupted) break

      // Check if already completed
      if (!options.force && (await checkpoint.isCompleted(item.mocNumber))) {
        skippedCount++
        progress.tick(`MOC-${item.mocNumber} — skipped (already completed)`)
        continue
      }

      // Check robots.txt
      if (!isAllowed(item.url, options.ignoreRobots)) {
        skippedCount++
        progress.tick(`MOC-${item.mocNumber} — skipped (robots.txt)`)
        continue
      }

      try {
        // Proactively refresh session every 45 min to prevent silent AJAX 403s
        await refreshSessionIfStale()

        await rateLimiter.acquire()
        await humanWait('thinking')

        // Navigate to MOC detail
        const mocPage = new MocDetailPage(page!)
        await retry.execute(() => mocPage.navigate(item.url), `navigate MOC-${item.mocNumber}`)

        await waitBetweenPages()

        // Scrape detail metadata (title, author, parts count)
        const detail = await retry.execute(
          () => mocPage.scrapeDetail(item.mocNumber),
          `scrape MOC-${item.mocNumber}`,
        )

        // Scrape all carousel images from thumbnail strip
        const images = await mocPage.scrapeImages(item.mocNumber)
        if (images.length > 0) {
          logger.info(`[pipeline] MOC-${item.mocNumber}: downloaded ${images.length} images`)
        }

        await checkpoint.save(item.mocNumber, 'detail_scraped', {
          ...(detail as unknown as Record<string, unknown>),
          rebrickableUrl: item.url,
        })

        if (options.dryRun) {
          progress.tick(
            `MOC-${item.mocNumber} — ${item.title} (dry run, ${detail.partsCount} parts)`,
          )
          downloadedCount++
          await checkpoint.save(item.mocNumber, 'completed')
          continue
        }

        // Download instruction files
        // For liked (free) MOCs: use direct download links
        // For purchased MOCs: use the modal-based flow
        // IMPORTANT: Do this BEFORE parts export — the BrickLink XML export
        // opens an inline overlay that corrupts the page state for modals.
        const fileList = options.likedMocs
          ? await mocPage.scrapeFreeFileList()
          : await mocPage.scrapeFileList()
        if (fileList.length > 0) {
          logger.info(
            `[pipeline] MOC-${item.mocNumber}: found ${fileList.length} files to download`,
          )

          // Download ALL files via the modal-based flow
          let primaryDownloadPath: string | null = null
          let totalFileSize = 0
          let consecutiveFileFailures = 0

          for (let fi = 0; fi < fileList.length; fi++) {
            const file = fileList[fi]
            logger.info(
              `[pipeline] MOC-${item.mocNumber}: downloading file ${fi + 1}/${fileList.length}: ${file.fileName}`,
            )

            // If we've hit 3 consecutive failures the session/rate-limit window
            // is likely exhausted. Check auth first, then re-navigate to the MOC page.
            if (consecutiveFileFailures >= 3) {
              logger.warn(
                `[pipeline] MOC-${item.mocNumber}: ${consecutiveFileFailures} consecutive file failures — ` +
                  `checking session and re-navigating...`,
              )

              const loginPage = new LoginPage(page!)
              const stillLoggedIn = await loginPage.isLoggedIn()
              if (!stillLoggedIn) {
                logger.warn('[pipeline] Session expired mid-batch — re-authenticating...')
                await loginPage.login(config.username, config.password)
                await saveSession(context!)
                lastAuthTime = Date.now()
                logger.info('[pipeline] Re-authenticated, resuming downloads...')
              }

              await rateLimiter.acquire()
              await mocPage.navigate(item.url)
              await humanWait('reading')
              consecutiveFileFailures = 0
            }

            const downloadPath = await retry.execute(
              () =>
                options.likedMocs
                  ? mocPage.downloadFreeFile(file, item.mocNumber)
                  : mocPage.triggerDownload(file, item.mocNumber),
              `download MOC-${item.mocNumber} file ${fi + 1}`,
            )

            if (downloadPath) {
              consecutiveFileFailures = 0
              const buffer = await readFile(downloadPath)
              const fileSize = buffer.length
              totalFileSize += fileSize

              // Upload each file to MinIO
              const fileName = basename(downloadPath)
              await uploadInstruction(downloadPath, item.mocNumber, fileName, config.bucket)
              logger.info(
                `[pipeline] MOC-${item.mocNumber}: uploaded ${fileName} (${formatBytes(fileSize)})`,
              )

              // Use the first successfully downloaded file as the primary for the DB record
              if (!primaryDownloadPath) {
                primaryDownloadPath = downloadPath
              }
            } else {
              consecutiveFileFailures++
              logger.warn(`[pipeline] MOC-${item.mocNumber}: failed to download ${file.fileName}`)
            }
          }

          if (primaryDownloadPath) {
            const buffer = await readFile(primaryDownloadPath)
            const contentHash = computeHash(buffer)
            const fileName = basename(primaryDownloadPath)
            const fileType = extname(fileName).replace('.', '').toUpperCase()

            await checkpoint.save(item.mocNumber, 'downloaded', {
              filePath: primaryDownloadPath,
              fileName,
              fileSize: totalFileSize,
              contentHash,
              fileCount: fileList.length,
            })

            await checkpoint.save(item.mocNumber, 'uploaded')

            // Normalize parts
            const normalizedParts = normalizeParts(detail.parts)

            // Upsert instruction record (uses primary file metadata)
            const instructionResult = await db
              .insert(instructionsTable)
              .values({
                mocNumber: item.mocNumber,
                title: detail.title,
                author: detail.author || item.author,
                purchaseDate: item.purchaseDate ? new Date(item.purchaseDate) : null,
                rebrickableUrl: item.url,
                downloadUrl: item.url,
                partsCount: detail.partsCount,
                fileType,
                fileSizeBytes: totalFileSize,
                contentHash,
                minioKey: `mocs/MOC-${item.mocNumber}/${fileName}`,
                minioUrl: `mocs/MOC-${item.mocNumber}/${fileName}`,
                description: detail.description || null,
                descriptionHtml: detail.descriptionHtml || null,
                dateAdded: safeDate(detail.dateAdded),
                authorProfileUrl: detail.authorProfileUrl || null,
                tags: detail.tags.length > 0 ? detail.tags : null,
                scrapeRunId,
              })
              .onConflictDoUpdate({
                target: instructionsTable.mocNumber,
                set: {
                  // Only overwrite fields when the new value is non-null/non-empty
                  // This preserves existing data when a re-scrape returns partial results
                  ...(detail.title ? { title: detail.title } : {}),
                  ...(detail.author || item.author ? { author: detail.author || item.author } : {}),
                  downloadUrl: item.url,
                  ...(detail.partsCount != null ? { partsCount: detail.partsCount } : {}),
                  ...(fileType ? { fileType } : {}),
                  ...(totalFileSize ? { fileSizeBytes: totalFileSize } : {}),
                  ...(contentHash ? { contentHash } : {}),
                  minioKey: `mocs/MOC-${item.mocNumber}/${fileName}`,
                  minioUrl: `mocs/MOC-${item.mocNumber}/${fileName}`,
                  ...(detail.description ? { description: detail.description } : {}),
                  ...(detail.descriptionHtml ? { descriptionHtml: detail.descriptionHtml } : {}),
                  ...(safeDate(detail.dateAdded) ? { dateAdded: safeDate(detail.dateAdded) } : {}),
                  ...(detail.authorProfileUrl ? { authorProfileUrl: detail.authorProfileUrl } : {}),
                  ...(detail.tags.length > 0 ? { tags: detail.tags } : {}),
                  scrapeRunId,
                  updatedAt: new Date(),
                },
              })
              .returning()

            const inst = instructionResult[0]

            // Upsert parts and link via instruction_parts join table
            if (normalizedParts.length > 0) {
              for (const p of normalizedParts) {
                const [part] = await db
                  .insert(partsTable)
                  .values({
                    partNumber: p.partNumber,
                    color: p.color,
                    name: p.name,
                    category: p.category,
                    imageUrl: p.imageUrl,
                  })
                  .onConflictDoUpdate({
                    target: [partsTable.partNumber, partsTable.color],
                    set: {
                      ...(p.name ? { name: p.name } : {}),
                      ...(p.category ? { category: p.category } : {}),
                      ...(p.imageUrl ? { imageUrl: p.imageUrl } : {}),
                    },
                  })
                  .returning()

                await db
                  .insert(instructionPartsTable)
                  .values({
                    instructionId: inst.id,
                    partId: part.id,
                    quantity: p.quantity,
                    isSpare: p.isSpare ?? 0,
                  })
                  .onConflictDoUpdate({
                    target: [instructionPartsTable.instructionId, instructionPartsTable.partId],
                    set: { quantity: p.quantity, isSpare: p.isSpare ?? 0 },
                  })
              }
              logger.info(
                `[pipeline] MOC-${item.mocNumber}: linked ${normalizedParts.length} parts to instruction`,
              )
            }

            // Write to gallery DB inline (replaces sync-to-gallery)
            if (syncUserId) {
              const galleryParts: GalleryPartData[] = normalizedParts.map(p => ({
                partNumber: p.partNumber,
                partName: p.name,
                color: p.color,
                quantity: p.quantity,
              }))

              const galleryMocId = await writeToGallery(galleryDb as any, syncUserId, {
                mocNumber: item.mocNumber,
                title: detail.title,
                author: detail.author || item.author,
                description: detail.description || null,
                descriptionHtml: detail.descriptionHtml || null,
                dateAdded: safeDate(detail.dateAdded),
                authorProfileUrl: detail.authorProfileUrl || null,
                tags: detail.tags.length > 0 ? detail.tags : null,
                partsCount: detail.partsCount,
                rebrickableUrl: item.url,
                s3Key: `mocs/MOC-${item.mocNumber}/${fileName}`,
                fileType: fileType,
                parts: galleryParts.length > 0 ? galleryParts : undefined,
              })

              // Upload scraped images to MinIO and write to gallery DB
              if (galleryMocId && images.length > 0) {
                for (const img of images) {
                  const imgFileName = basename(img.filePath)
                  await uploadImage(img.filePath, item.mocNumber, imgFileName, config.bucket)
                }
                const minioImages = await listImages(item.mocNumber, config.bucket)
                if (minioImages.length > 0) {
                  const imageData = minioImages.map(key => ({
                    s3Key: key,
                    fileName: key.split('/').pop() || 'unknown',
                  }))
                  await writeImagesToGallery(galleryDb as any, galleryMocId, imageData)
                  logger.info(
                    `[pipeline] MOC-${item.mocNumber}: uploaded ${images.length} images to gallery`,
                  )
                }
              }
            }

            await checkpoint.save(item.mocNumber, 'completed')
            downloadedCount++

            progress.tick(
              `MOC-${item.mocNumber} — ${detail.title} (${fileList.length} files, ${detail.partsCount} parts, ${formatBytes(totalFileSize)})`,
            )
          } else {
            logger.warn(
              `[pipeline] All ${fileList.length} file downloads failed for MOC-${item.mocNumber}`,
            )
            skippedCount++
            progress.tick(`MOC-${item.mocNumber} — ${item.title} (all downloads failed)`)
          }
        } else {
          logger.warn(`[pipeline] No download files found for MOC-${item.mocNumber}`)
          skippedCount++
          progress.tick(`MOC-${item.mocNumber} — ${item.title} (no files)`)
        }

        // Scrape parts from inventory tab — downloads all 3 export formats
        // Done AFTER file download since BrickLink XML export corrupts page state
        const partsResult = await mocPage.scrapePartsFromInventory(item.mocNumber)
        if (partsResult.parts.length > 0) {
          detail.parts = partsResult.parts
          detail.partsCount = partsResult.parts.reduce((sum, p) => sum + p.quantity, 0)
          logger.info(
            `[pipeline] MOC-${item.mocNumber}: scraped ${partsResult.parts.length} unique parts (${detail.partsCount} total)`,
          )
        }
        if (partsResult.exports.length > 0) {
          const saved = partsResult.exports.filter(e => e.filePath)
          logger.info(
            `[pipeline] MOC-${item.mocNumber}: saved ${saved.length} export files: ${saved.map(e => e.label).join(', ')}`,
          )
        }

        await waitBetweenInstructions()
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error)
        logger.error(`[pipeline] Failed MOC-${item.mocNumber}: ${errMsg}`)
        errors.push({ mocNumber: item.mocNumber, error: errMsg })
        progress.tick(`MOC-${item.mocNumber} — FAILED: ${errMsg}`)

        // Check if session expired and re-login
        if (errMsg.includes('403') || errMsg.includes('login')) {
          logger.info('[pipeline] Session may have expired, re-authenticating...')
          const loginPage = new LoginPage(page!)
          await loginPage.login(config.username, config.password)
          await saveSession(context!)
          lastAuthTime = Date.now()
        }
      }
    }

    // ── Step 8: Enrichment ───────────────────────────────────────────────
    if (!options.dryRun && downloadedCount > 0) {
      logger.info('[pipeline] Running enrichment pipeline...')
      const summary = await enrichScrapeRun(scrapeRunId)

      await db
        .update(scrapeRuns)
        .set({
          status: 'completed',
          completedAt: new Date(),
          downloaded: downloadedCount,
          skipped: skippedCount,
          errors: errors as any,
          summary: summary as any,
        })
        .where(eq(scrapeRuns.id, scrapeRunId))
    } else {
      await db
        .update(scrapeRuns)
        .set({
          status: 'completed',
          completedAt: new Date(),
          downloaded: downloadedCount,
          skipped: skippedCount,
          errors: errors as any,
        })
        .where(eq(scrapeRuns.id, scrapeRunId))
    }

    // ── Step 9: Final report ─────────────────────────────────────────────
    logger.info('═══════════════════════════════════════════════════════')
    logger.info('  Scrape Complete')
    logger.info('═══════════════════════════════════════════════════════')
    logger.info(`  Found:      ${instructionList.length} instructions`)
    logger.info(`  Downloaded: ${downloadedCount}`)
    logger.info(`  Skipped:    ${skippedCount}`)
    logger.info(`  Errors:     ${errors.length}`)
    logger.info('═══════════════════════════════════════════════════════')
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : JSON.stringify(error)
    logger.error(`[pipeline] Fatal error: ${errMsg}`)

    if (scrapeRunId) {
      await db
        .update(scrapeRuns)
        .set({
          status: 'failed',
          completedAt: new Date(),
          errors: [{ fatal: errMsg }] as any,
        })
        .where(eq(scrapeRuns.id, scrapeRunId))
    }

    throw error
  } finally {
    process.off('SIGINT', handleSignal)
    process.off('SIGTERM', handleSignal)

    if (context) {
      await saveSession(context).catch(() => {})
    }
    if (browser) {
      await browser.close().catch(() => {})
    }
    await galleryPool.end().catch(() => {})
    await closeDbClient()
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function safeDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

// ─── Backfill pipeline ────────────────────────────────────────────────────────

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

/**
 * What is missing for a given instruction row.
 * Evaluated before deciding whether a browser visit is needed.
 */
interface BackfillNeeds {
  scraperDetailMissing: boolean // description, authorProfileUrl, tags, or dateAdded empty
  imagesMissingInMinio: boolean
  imagesMissingInGallery: boolean
  galleryMetaMissing: boolean // gallery moc_instructions row has stale/null fields
}

async function assessBackfillNeeds(
  instr: typeof instructionsTable.$inferSelect,
  galleryDb: ReturnType<typeof drizzle>,
  bucket: string,
): Promise<BackfillNeeds> {
  const mocId = `MOC-${instr.mocNumber}`

  // 1. Scraper DB completeness
  const scraperDetailMissing =
    !instr.description ||
    !instr.authorProfileUrl ||
    !instr.tags ||
    (instr.tags as string[]).length === 0 ||
    !instr.dateAdded

  // 2. MinIO images
  const minioImages = await listImages(instr.mocNumber, bucket)
  const imagesMissingInMinio = minioImages.length === 0

  // 3. Gallery DB: find the moc_instructions row
  const galleryMocs = await (galleryDb as any)
    .select()
    .from(gallerySchema.mocInstructions)
    .where(eq(gallerySchema.mocInstructions.mocId, mocId))
    .limit(1)

  if (galleryMocs.length === 0) {
    // Not in gallery DB yet — writeToGallery in the main pipeline handles initial sync
    return {
      scraperDetailMissing,
      imagesMissingInMinio,
      imagesMissingInGallery: true,
      galleryMetaMissing: false,
    }
  }

  const galleryMoc = galleryMocs[0]

  // 4. Gallery images (moc_files rows)
  const galleryImages = await (galleryDb as any)
    .select()
    .from(gallerySchema.mocFiles)
    .where(
      and(
        eq(gallerySchema.mocFiles.mocId, galleryMoc.id),
        eq(gallerySchema.mocFiles.fileType, 'gallery-image'),
      ),
    )

  const imagesMissingInGallery = galleryImages.length === 0

  // 5. Gallery meta staleness
  const galleryMetaMissing =
    !galleryMoc.description ||
    !galleryMoc.thumbnailUrl ||
    !galleryMoc.tags ||
    (galleryMoc.tags as string[] | null)?.length === 0 ||
    !(galleryMoc.designer as any)?.profileUrl

  return {
    scraperDetailMissing,
    imagesMissingInMinio,
    imagesMissingInGallery,
    galleryMetaMissing,
  }
}

// Old syncImagesToGallery and patchGalleryMeta removed — now imported from gallery/write-to-gallery.ts

export async function runBackfillPipeline(
  options: CliOptions,
  config: {
    username: string
    password: string
    bucket: string
    rateLimit: number
    minDelayMs: number
  },
): Promise<void> {
  const db = getDbClient()
  const galleryPool = createGalleryPool()
  const galleryDb = drizzle(galleryPool, { schema: gallerySchema })

  const rateLimiter = new TokenBucketRateLimiter({
    requestsPerMinute: config.rateLimit,
    minDelayMs: config.minDelayMs,
  })
  const retry = new RetryHandler()

  let browser: Browser | undefined
  let context: BrowserContext | undefined
  let page: Page | undefined

  const SESSION_REFRESH_INTERVAL_MS = 45 * 60 * 1000
  let lastAuthTime = Date.now()

  async function refreshSessionIfStale(): Promise<void> {
    const elapsed = Date.now() - lastAuthTime
    if (elapsed < SESSION_REFRESH_INTERVAL_MS) return
    logger.info(`[backfill] Session is ${Math.round(elapsed / 60000)}m old — refreshing auth...`)
    const loginPage = new LoginPage(page!)
    await loginPage.login(config.username, config.password)
    await saveSession(context!)
    lastAuthTime = Date.now()
  }

  let interrupted = false
  const handleSignal = async () => {
    if (interrupted) return
    interrupted = true
    logger.info('[backfill] Interrupt received, shutting down...')
    if (context) await saveSession(context).catch(() => {})
    if (browser) await browser.close().catch(() => {})
    await galleryPool.end().catch(() => {})
    await closeDbClient()
    process.exit(0)
  }
  process.on('SIGINT', handleSignal)
  process.on('SIGTERM', handleSignal)

  try {
    await initBucket(config.bucket)

    if (!options.ignoreRobots) {
      await loadRobotsTxt('https://rebrickable.com')
    }

    // Create a scrape run record for this backfill pass
    const [run] = await db
      .insert(scrapeRuns)
      .values({ status: 'running', config: { mode: 'backfill', ...config } })
      .returning()
    const scrapeRunId = run.id
    const checkpoint = new CheckpointManager(scrapeRunId)

    // Load all instructions that have been successfully uploaded to MinIO
    const allInstructions = await db.select().from(instructionsTable)

    // Filter to only those with a primary file already uploaded (minioKey populated)
    const candidates = allInstructions.filter(i => i.minioKey && i.minioKey.length > 0)

    let workList = candidates
    if (options.limit) {
      workList = workList.slice(0, options.limit)
    }

    logger.info(`[backfill] Found ${candidates.length} instructions with MinIO files`)
    logger.info(`[backfill] Processing ${workList.length} instructions`)

    await db
      .update(scrapeRuns)
      .set({ instructionsFound: workList.length })
      .where(eq(scrapeRuns.id, scrapeRunId))

    const progress = new ProgressTracker(workList.length, 'Backfill')
    let patchedCount = 0
    let skippedCount = 0
    const errors: Array<Record<string, unknown>> = []

    for (const instr of workList) {
      if (interrupted) break

      // Skip if already backfilled in any previous run (unless --force)
      if (!options.force && (await checkpoint.hasBackfillCompleted(instr.mocNumber))) {
        skippedCount++
        progress.tick(`MOC-${instr.mocNumber} — skipped (already backfilled)`)
        continue
      }

      try {
        const needs = await assessBackfillNeeds(instr, galleryDb as any, config.bucket)

        const needsBrowser = needs.scraperDetailMissing || needs.imagesMissingInMinio

        if (!needsBrowser && !needs.imagesMissingInGallery && !needs.galleryMetaMissing) {
          skippedCount++
          await checkpoint.save(instr.mocNumber, 'backfill_completed', {
            reason: 'nothing_missing',
          })
          progress.tick(`MOC-${instr.mocNumber} — skipped (complete)`)
          continue
        }

        logger.info(
          `[backfill] MOC-${instr.mocNumber}: needs=${JSON.stringify({
            scraperDetail: needs.scraperDetailMissing,
            minioImages: needs.imagesMissingInMinio,
            galleryImages: needs.imagesMissingInGallery,
            galleryMeta: needs.galleryMetaMissing,
          })}`,
        )

        let updatedInstr = instr

        // ── Browser visit (only if scraper fields or images are missing) ──────
        if (needsBrowser) {
          if (!browser) {
            const isFirstRun = !hasExistingSession()
            const browserResult = await createStealthBrowser({
              headed: options.headed || isFirstRun,
            })
            browser = browserResult.browser
            context = browserResult.context
            page = browserResult.page

            const loginPage = new LoginPage(page)
            const sessionValid = await loginPage.checkSessionValid()
            if (!sessionValid) {
              await loginPage.login(config.username, config.password)
              await saveSession(context)
            }
            lastAuthTime = Date.now()
          }

          if (!isAllowed(instr.rebrickableUrl, options.ignoreRobots)) {
            skippedCount++
            progress.tick(`MOC-${instr.mocNumber} — skipped (robots.txt)`)
            continue
          }

          await refreshSessionIfStale()
          await rateLimiter.acquire()
          await humanWait('thinking')

          const mocPage = new MocDetailPage(page!)
          await retry.execute(
            () => mocPage.navigate(instr.rebrickableUrl),
            `navigate MOC-${instr.mocNumber}`,
          )
          await waitBetweenPages()

          // Re-scrape detail if fields are missing
          if (needs.scraperDetailMissing) {
            const detail = await retry.execute(
              () => mocPage.scrapeDetail(instr.mocNumber),
              `scrape detail MOC-${instr.mocNumber}`,
            )

            const scraperPatch: Record<string, unknown> = { updatedAt: new Date() }
            if (!instr.description && detail.description)
              scraperPatch.description = detail.description
            if (!instr.descriptionHtml && detail.descriptionHtml)
              scraperPatch.descriptionHtml = detail.descriptionHtml
            if (!instr.authorProfileUrl && detail.authorProfileUrl)
              scraperPatch.authorProfileUrl = detail.authorProfileUrl
            if ((!instr.tags || (instr.tags as string[]).length === 0) && detail.tags.length > 0)
              scraperPatch.tags = detail.tags
            if (!instr.dateAdded && detail.dateAdded)
              scraperPatch.dateAdded = safeDate(detail.dateAdded)
            if (!instr.author && detail.author) scraperPatch.author = detail.author

            if (Object.keys(scraperPatch).length > 1) {
              await db
                .update(instructionsTable)
                .set(scraperPatch as any)
                .where(eq(instructionsTable.mocNumber, instr.mocNumber))
              logger.info(
                `[backfill] MOC-${instr.mocNumber}: updated scraper DB fields: ${Object.keys(
                  scraperPatch,
                )
                  .filter(k => k !== 'updatedAt')
                  .join(', ')}`,
              )
            }

            // Refresh local instr object so gallery patch uses fresh data
            const refreshed = await db
              .select()
              .from(instructionsTable)
              .where(eq(instructionsTable.mocNumber, instr.mocNumber))
              .limit(1)
            if (refreshed[0]) updatedInstr = refreshed[0]
          }

          // Scrape + upload images if missing from MinIO
          if (needs.imagesMissingInMinio && !options.dryRun) {
            const images = await mocPage.scrapeImages(instr.mocNumber)

            for (const img of images) {
              const fileName = basename(img.filePath)
              await uploadImage(img.filePath, instr.mocNumber, fileName, config.bucket)
            }

            if (images.length > 0) {
              logger.info(
                `[backfill] MOC-${instr.mocNumber}: uploaded ${images.length} images to MinIO`,
              )
            }
          }

          await waitBetweenInstructions()
        }

        // ── Sync images from MinIO → gallery DB ──────────────────────────────
        if (!options.dryRun) {
          const galleryMoc = await findGalleryMoc(galleryDb as any, instr.mocNumber)

          if (galleryMoc) {
            const minioImages = await listImages(instr.mocNumber, config.bucket)
            if (minioImages.length > 0 && needs.imagesMissingInGallery) {
              const imageData = minioImages.map(key => ({
                s3Key: key,
                fileName: key.split('/').pop() || 'unknown',
              }))
              await writeImagesToGallery(galleryDb as any, galleryMoc.id, imageData)
            }

            // ── Patch gallery meta ──────────────────────────────────────────
            if (needs.galleryMetaMissing || needs.scraperDetailMissing) {
              await patchGalleryMeta(galleryDb as any, galleryMoc.id, {
                description: updatedInstr.description,
                descriptionHtml: updatedInstr.descriptionHtml,
                tags: updatedInstr.tags as string[] | null,
                dateAdded: updatedInstr.dateAdded,
                authorProfileUrl: updatedInstr.authorProfileUrl,
                author: updatedInstr.author,
              })
            }
          }
        }

        await checkpoint.save(instr.mocNumber, 'backfill_completed', {
          scraperDetailPatched: needs.scraperDetailMissing,
          imagesUploaded: needs.imagesMissingInMinio,
          galleryImagesLinked: needs.imagesMissingInGallery,
          galleryMetaPatched: needs.galleryMetaMissing,
        })
        patchedCount++
        progress.tick(`MOC-${instr.mocNumber} — backfilled`)
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error)
        logger.error(`[backfill] Failed MOC-${instr.mocNumber}: ${errMsg}`)
        errors.push({ mocNumber: instr.mocNumber, error: errMsg })
        progress.tick(`MOC-${instr.mocNumber} — FAILED: ${errMsg}`)

        if (errMsg.includes('403') || errMsg.includes('login')) {
          logger.info('[backfill] Session may have expired, re-authenticating...')
          if (page) {
            const loginPage = new LoginPage(page)
            await loginPage.login(config.username, config.password)
            await saveSession(context!)
            lastAuthTime = Date.now()
          }
        }
      }
    }

    await db
      .update(scrapeRuns)
      .set({
        status: 'completed',
        completedAt: new Date(),
        downloaded: patchedCount,
        skipped: skippedCount,
        errors: errors as any,
      })
      .where(eq(scrapeRuns.id, scrapeRunId))

    logger.info('═══════════════════════════════════════════════════════')
    logger.info('  Backfill Complete')
    logger.info('═══════════════════════════════════════════════════════')
    logger.info(`  Processed:  ${workList.length}`)
    logger.info(`  Patched:    ${patchedCount}`)
    logger.info(`  Skipped:    ${skippedCount}`)
    logger.info(`  Errors:     ${errors.length}`)
    logger.info('═══════════════════════════════════════════════════════')
  } finally {
    process.off('SIGINT', handleSignal)
    process.off('SIGTERM', handleSignal)
    if (context) await saveSession(context).catch(() => {})
    if (browser) await browser.close().catch(() => {})
    await galleryPool.end().catch(() => {})
    await closeDbClient()
  }
}
