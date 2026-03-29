/**
 * Sync Rebrickable scraper data → Gallery (monorepo) DB
 *
 * Reads instructions + parts from the scraper DB and upserts them into the
 * monorepo DB so the instructions gallery can display scraped MOCs.
 *
 * Both DBs share the same MinIO instance / bucket (`lego-moc-files`),
 * so no file copies are needed — only DB rows.
 *
 * Usage:
 *   pnpm --filter @repo/scraper-rebrickable sync
 *
 * Env vars: see .env (SCRAPER_DB_*, GALLERY_DB_*, S3_BUCKET, SYNC_USER_ID)
 */

import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq, and, sql } from 'drizzle-orm'
import { Pool } from 'pg'
import { logger } from '@repo/logger'
import * as scraperSchema from './db/schema.js'
import * as gallerySchema from '@repo/db/schema'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../.env') })

// ─── Config ───────────────────────────────────────────────────────────────────

const SYNC_USER_ID = process.env.SYNC_USER_ID || ''
if (!SYNC_USER_ID) {
  logger.error('[sync] SYNC_USER_ID env var is required')
  process.exit(1)
}

// ─── DB connections ───────────────────────────────────────────────────────────

function createScraperPool() {
  return new Pool({
    host: process.env.SCRAPER_DB_HOST || 'localhost',
    port: parseInt(process.env.SCRAPER_DB_PORT || '5432', 10),
    database: process.env.SCRAPER_DB_NAME || 'rebrickable',
    user: process.env.SCRAPER_DB_USER || 'postgres',
    password: process.env.SCRAPER_DB_PASSWORD || 'postgres',
    max: 3,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
  })
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

// ─── Main sync ────────────────────────────────────────────────────────────────

async function main() {
  const scraperPool = createScraperPool()
  const galleryPool = createGalleryPool()

  const scraperDb = drizzle(scraperPool, { schema: scraperSchema })
  const galleryDb = drizzle(galleryPool, { schema: gallerySchema })

  try {
    // 1. Fetch all scraped instructions that have been uploaded to MinIO
    const scraperInstructions = await scraperDb
      .select()
      .from(scraperSchema.instructions)
      .where(sql`${scraperSchema.instructions.minioKey} != ''`)

    logger.info(`[sync] Found ${scraperInstructions.length} scraped instructions with MinIO files`)

    let synced = 0
    let skipped = 0

    for (const instr of scraperInstructions) {
      try {
        const mocId = `MOC-${instr.mocNumber}`

        // Build designer JSONB from author + authorProfileUrl
        const designer = instr.author
          ? {
              username: instr.author,
              profileUrl: instr.authorProfileUrl || null,
            }
          : null

        // 2. Upsert moc_instructions
        const [upsertedMoc] = await galleryDb
          .insert(gallerySchema.mocInstructions)
          .values({
            userId: SYNC_USER_ID,
            title: instr.title,
            type: 'moc',
            mocId,
            author: instr.author || null,
            partsCount: instr.partsCount || null,
            description: instr.description || null,
            descriptionHtml: instr.descriptionHtml || null,
            uploadedDate: instr.dateAdded || null,
            designer,
            tags: (instr.tags as string[] | null)?.length ? instr.tags as string[] : null,
            status: 'published',
            visibility: 'public',
            sourcePlatform: {
              platform: 'rebrickable',
              sourceUrl: instr.rebrickableUrl || null,
              importedAt: new Date().toISOString(),
            },
          })
          .onConflictDoUpdate({
            target: [gallerySchema.mocInstructions.userId, gallerySchema.mocInstructions.title],
            set: {
              author: instr.author || null,
              partsCount: instr.partsCount || null,
              description: instr.description || null,
              descriptionHtml: instr.descriptionHtml || null,
              uploadedDate: instr.dateAdded || null,
              designer,
              tags: (instr.tags as string[] | null)?.length ? instr.tags as string[] : null,
              status: 'published',
              visibility: 'public',
              sourcePlatform: {
                platform: 'rebrickable',
                sourceUrl: instr.rebrickableUrl || null,
                importedAt: new Date().toISOString(),
              },
              updatedAt: new Date(),
            },
          })
          .returning()

        const galleryMocId = upsertedMoc.id

        // 3. Upsert moc_files with s3Key pointing to scraper's MinIO key
        const filename = instr.minioKey.split('/').pop() || `${mocId}.${instr.fileType || 'pdf'}`
        const mimeType = getMimeType(instr.fileType || 'pdf')
        const s3Key = instr.minioKey
        const fileUrl = `${process.env.S3_ENDPOINT || 'http://localhost:9000'}/${process.env.S3_BUCKET || 'lego-moc-files'}/${s3Key}`

        await galleryDb
          .insert(gallerySchema.mocFiles)
          .values({
            mocId: galleryMocId,
            fileType: 'instruction',
            fileUrl,
            s3Key,
            originalFilename: filename,
            mimeType,
          })
          .onConflictDoUpdate({
            target: [gallerySchema.mocFiles.mocId, gallerySchema.mocFiles.originalFilename],
            set: {
              fileUrl,
              s3Key,
              mimeType,
              updatedAt: new Date(),
            },
          })

        // 4. Sync parts: query scraper instruction_parts joined with parts
        const scraperParts = await scraperDb
          .select({
            partNumber: scraperSchema.parts.partNumber,
            partName: scraperSchema.parts.name,
            color: scraperSchema.parts.color,
            quantity: scraperSchema.instructionParts.quantity,
          })
          .from(scraperSchema.instructionParts)
          .innerJoin(
            scraperSchema.parts,
            eq(scraperSchema.instructionParts.partId, scraperSchema.parts.id),
          )
          .where(eq(scraperSchema.instructionParts.instructionId, instr.id))

        if (scraperParts.length > 0) {
          // 5. Upsert parts list
          const partsListTitle = 'Rebrickable Parts List'

          // Check for existing parts list
          const existingList = await galleryDb
            .select()
            .from(gallerySchema.mocPartsLists)
            .where(
              and(
                eq(gallerySchema.mocPartsLists.mocId, galleryMocId),
                eq(gallerySchema.mocPartsLists.title, partsListTitle),
              ),
            )
            .limit(1)

          let partsListId: string

          if (existingList.length > 0) {
            partsListId = existingList[0].id
            // Update total count
            await galleryDb
              .update(gallerySchema.mocPartsLists)
              .set({
                totalPartsCount: String(scraperParts.reduce((sum, p) => sum + p.quantity, 0)),
                updatedAt: new Date(),
              })
              .where(eq(gallerySchema.mocPartsLists.id, partsListId))
          } else {
            const [newList] = await galleryDb
              .insert(gallerySchema.mocPartsLists)
              .values({
                mocId: galleryMocId,
                title: partsListTitle,
                totalPartsCount: String(scraperParts.reduce((sum, p) => sum + p.quantity, 0)),
              })
              .returning()
            partsListId = newList.id
          }

          // 6. Replace parts: delete existing, bulk insert
          await galleryDb
            .delete(gallerySchema.mocParts)
            .where(eq(gallerySchema.mocParts.partsListId, partsListId))

          // Bulk insert in chunks of 500
          const CHUNK_SIZE = 500
          for (let i = 0; i < scraperParts.length; i += CHUNK_SIZE) {
            const chunk = scraperParts.slice(i, i + CHUNK_SIZE)
            await galleryDb.insert(gallerySchema.mocParts).values(
              chunk.map(p => ({
                partsListId,
                partId: p.partNumber,
                partName: p.partName || 'Unknown',
                quantity: p.quantity,
                color: p.color || 'Unknown',
              })),
            )
          }
        }

        // Update total piece count on the MOC
        const totalPieces = scraperParts.reduce((sum, p) => sum + p.quantity, 0)
        if (totalPieces > 0) {
          await galleryDb
            .update(gallerySchema.mocInstructions)
            .set({ totalPieceCount: totalPieces })
            .where(eq(gallerySchema.mocInstructions.id, galleryMocId))
        }

        synced++
        logger.info(
          `[sync] Synced ${mocId}: "${instr.title}" (${scraperParts.length} unique parts)`,
        )
      } catch (error) {
        skipped++
        const message = error instanceof Error ? error.message : String(error)
        logger.error(`[sync] Failed to sync MOC-${instr.mocNumber}: ${message}`)
      }
    }

    logger.info(`[sync] Done. Synced: ${synced}, Skipped: ${skipped}`)
  } finally {
    await scraperPool.end()
    await galleryPool.end()
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMimeType(fileType: string): string {
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    io: 'application/octet-stream',
    studio: 'application/octet-stream',
    ldr: 'text/plain',
    mpd: 'text/plain',
    lxf: 'application/octet-stream',
    zip: 'application/zip',
  }
  return map[fileType.toLowerCase()] || 'application/octet-stream'
}

// ─── Run ──────────────────────────────────────────────────────────────────────

main().catch(error => {
  logger.error('[sync] Fatal error:', error)
  process.exit(1)
})
