import { readFile } from 'fs/promises'
import { basename, extname } from 'path'
import { eq } from 'drizzle-orm'
import { logger } from '@repo/logger'
import { getDbClient, closeDbClient } from '../db/client.js'
import { scrapeRuns, instructions as instructionsTable, parts as partsTable, instructionParts as instructionPartsTable } from '../db/schema.js'
import { createStealthBrowser, saveSession, hasExistingSession } from './browser.js'
import { cleanupDownload as _cleanupDownload } from './downloader.js'
import { computeHash } from '../utils/hash.js'
import { humanWait, waitBetweenInstructions, waitBetweenPages } from './human-behavior.js'
import { LoginPage } from '../pages/login-page.js'
import { PurchasesPage } from '../pages/purchases-page.js'
import { MocDetailPage } from '../pages/moc-detail-page.js'
import { TokenBucketRateLimiter } from '../middleware/rate-limiter.js'
import { loadRobotsTxt, isAllowed } from '../middleware/robots.js'
import { RetryHandler } from '../middleware/retry.js'
import { CheckpointManager } from '../checkpoint/manager.js'
import { initBucket, uploadInstruction } from '../storage/minio.js'
import { normalizeParts } from '../data/normalizer.js'
import { enrichScrapeRun } from '../data/enricher.js'
import { ProgressTracker } from '../utils/progress.js'
import type { CliOptions } from '../__types__/index.js'
import type { Browser, BrowserContext, Page } from 'playwright'

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
  const rateLimiter = new TokenBucketRateLimiter({
    requestsPerMinute: config.rateLimit,
    minDelayMs: config.minDelayMs,
  })
  const retry = new RetryHandler()

  let browser: Browser | undefined
  let context: BrowserContext | undefined
  let page: Page | undefined
  let scrapeRunId: string | undefined

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
        await db
          .update(scrapeRuns)
          .set({ status: 'running' })
          .where(eq(scrapeRuns.id, scrapeRunId))
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

    // ── Step 6: Scrape purchases list ────────────────────────────────────
    const purchasesPage = new PurchasesPage(page)
    await rateLimiter.acquire()
    await purchasesPage.navigate(config.userSlug)

    const allInstructions = await purchasesPage.scrapeAllInstructions(options.limit)
    let instructionList = allInstructions

    // Apply limit
    if (options.limit) {
      instructionList = instructionList.slice(0, options.limit)
      logger.info(`[pipeline] Limited to ${options.limit} instructions`)
    }

    // Update run counts
    await db
      .update(scrapeRuns)
      .set({ instructionsFound: allInstructions.length })
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
        await rateLimiter.acquire()
        await humanWait('thinking')

        // Navigate to MOC detail
        const mocPage = new MocDetailPage(page!)
        await retry.execute(
          () => mocPage.navigate(item.url),
          `navigate MOC-${item.mocNumber}`,
        )

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

        await checkpoint.save(item.mocNumber, 'detail_scraped', detail as unknown as Record<string, unknown>)

        if (options.dryRun) {
          progress.tick(`MOC-${item.mocNumber} — ${item.title} (dry run, ${detail.partsCount} parts)`)
          downloadedCount++
          await checkpoint.save(item.mocNumber, 'completed')
          continue
        }

        // Download instruction files via the modal-based flow
        // IMPORTANT: Do this BEFORE parts export — the BrickLink XML export
        // opens an inline overlay that corrupts the page state for modals.
        const fileList = await mocPage.scrapeFileList()
        if (fileList.length > 0) {
          logger.info(`[pipeline] MOC-${item.mocNumber}: found ${fileList.length} files to download`)

          // Download ALL files via the modal-based flow
          let primaryDownloadPath: string | null = null
          let totalFileSize = 0

          for (let fi = 0; fi < fileList.length; fi++) {
            const file = fileList[fi]
            logger.info(`[pipeline] MOC-${item.mocNumber}: downloading file ${fi + 1}/${fileList.length}: ${file.fileName}`)

            const downloadPath = await retry.execute(
              () => mocPage.triggerDownload(file, item.mocNumber),
              `download MOC-${item.mocNumber} file ${fi + 1}`,
            )

            if (downloadPath) {
              const buffer = await readFile(downloadPath)
              const fileSize = buffer.length
              totalFileSize += fileSize

              // Upload each file to MinIO
              const fileName = basename(downloadPath)
              await uploadInstruction(downloadPath, item.mocNumber, fileName, config.bucket)
              logger.info(`[pipeline] MOC-${item.mocNumber}: uploaded ${fileName} (${formatBytes(fileSize)})`)

              // Use the first successfully downloaded file as the primary for the DB record
              if (!primaryDownloadPath) {
                primaryDownloadPath = downloadPath
              }
            } else {
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
                scrapeRunId,
              })
              .onConflictDoUpdate({
                target: instructionsTable.mocNumber,
                set: {
                  title: detail.title,
                  author: detail.author || item.author,
                  downloadUrl: item.url,
                  partsCount: detail.partsCount,
                  fileType,
                  fileSizeBytes: totalFileSize,
                  contentHash,
                  minioKey: `mocs/MOC-${item.mocNumber}/${fileName}`,
                  minioUrl: `mocs/MOC-${item.mocNumber}/${fileName}`,
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
                      name: p.name || undefined,
                      category: p.category || undefined,
                      imageUrl: p.imageUrl || undefined,
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
              logger.info(`[pipeline] MOC-${item.mocNumber}: linked ${normalizedParts.length} parts to instruction`)
            }

            await checkpoint.save(item.mocNumber, 'completed')
            downloadedCount++

            progress.tick(
              `MOC-${item.mocNumber} — ${detail.title} (${fileList.length} files, ${detail.partsCount} parts, ${formatBytes(totalFileSize)})`,
            )
          } else {
            logger.warn(`[pipeline] All ${fileList.length} file downloads failed for MOC-${item.mocNumber}`)
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
          logger.info(`[pipeline] MOC-${item.mocNumber}: scraped ${partsResult.parts.length} unique parts (${detail.partsCount} total)`)
        }
        if (partsResult.exports.length > 0) {
          const saved = partsResult.exports.filter(e => e.filePath)
          logger.info(`[pipeline] MOC-${item.mocNumber}: saved ${saved.length} export files: ${saved.map(e => e.label).join(', ')}`)
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
    logger.info(`  Found:      ${allInstructions.length} instructions`)
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
    await closeDbClient()
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}
