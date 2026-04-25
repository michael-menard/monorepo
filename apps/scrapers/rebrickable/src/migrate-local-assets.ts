/**
 * Migrate locally downloaded assets (images + parts CSVs) to MinIO and gallery DB.
 *
 * For each MOC folder in data/downloads/:
 *   1. Upload images/ → MinIO → insert moc_files (gallery-image) + set thumbnailUrl
 *   2. Parse parts-rebrickable_csv.csv → insert moc_parts_lists + moc_parts
 *
 * Usage:
 *   pnpm --filter @repo/scraper-rebrickable migrate-assets
 *
 * Env vars: same as sync-to-gallery (.env)
 */

import { resolve, dirname, extname } from 'path'
import { fileURLToPath } from 'url'
import { readdir, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq, and } from 'drizzle-orm'
import { Pool } from 'pg'
import { logger } from '@repo/logger'
import * as gallerySchema from '../../../../packages/backend/db/src/schema.js'
import { initializeBucket, uploadToS3 } from '@repo/s3-client'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../.env') })

const DOWNLOADS_DIR = resolve(__dirname, '../data/downloads')
const S3_ENDPOINT = process.env.S3_ENDPOINT || 'http://localhost:9000'
const S3_BUCKET = process.env.S3_BUCKET || 'lego-moc-files'

const IMAGE_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

const INSTRUCTION_MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.io': 'application/octet-stream',
  '.studio': 'application/octet-stream',
  '.ldr': 'text/plain',
  '.mpd': 'text/plain',
  '.lxf': 'application/octet-stream',
  '.zip': 'application/zip',
  '.7z': 'application/x-7z-compressed',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
}

const PARTS_EXPORT_FILES: Array<{ filename: string; mimeType: string }> = [
  { filename: 'parts-rebrickable_csv.csv', mimeType: 'text/csv' },
  { filename: 'parts-lego_pab_csv.csv', mimeType: 'text/csv' },
  { filename: 'parts-bricklink_xml.xml', mimeType: 'application/xml' },
]

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

async function main() {
  const galleryPool = createGalleryPool()
  const db = drizzle(galleryPool, { schema: gallerySchema })

  await initializeBucket(S3_BUCKET)
  logger.info(`[migrate] Bucket "${S3_BUCKET}" ready`)

  // List all MOC folders
  const entries = await readdir(DOWNLOADS_DIR, { withFileTypes: true })
  const mocFolders = entries
    .filter(e => e.isDirectory() && e.name.startsWith('MOC-'))
    .map(e => e.name)

  logger.info(`[migrate] Found ${mocFolders.length} MOC folders in downloads`)

  let imagesUploaded = 0
  let instructionFilesUploaded = 0
  let partsImported = 0
  let thumbnailsSet = 0
  let partsFilesUploaded = 0
  let skipped = 0

  for (const folder of mocFolders) {
    // folder = "MOC-100690", mocNumber = "100690"
    const mocDir = resolve(DOWNLOADS_DIR, folder)
    const mocId = folder // "MOC-100690"

    // Find this MOC in the gallery DB (match by moc_id field)
    const mocs = await db
      .select()
      .from(gallerySchema.mocInstructions)
      .where(eq(gallerySchema.mocInstructions.mocId, mocId))
      .limit(1)

    if (mocs.length === 0) {
      logger.warn(`[migrate] ${folder}: not found in gallery DB — skipping`)
      skipped++
      continue
    }

    const moc = mocs[0]
    const galleryMocId = moc.id

    // ── 1. Upload images ─────────────────────────────────────────────────────
    const imagesDir = resolve(mocDir, 'images')
    let firstImageUrl: string | null = null

    if (existsSync(imagesDir)) {
      const imageFiles = (await readdir(imagesDir))
        .filter(f => IMAGE_MIME[extname(f).toLowerCase()])
        .sort() // image-01, image-02, ... — first is thumbnail

      for (const imgFile of imageFiles) {
        const imgPath = resolve(imagesDir, imgFile)
        const ext = extname(imgFile).toLowerCase()
        const contentType = IMAGE_MIME[ext] || 'image/jpeg'
        const s3Key = `mocs/${mocId}/images/${imgFile}`
        const fileUrl = `${S3_ENDPOINT}/${S3_BUCKET}/${s3Key}`

        // Skip if already in moc_files
        const existing = await db
          .select()
          .from(gallerySchema.mocFiles)
          .where(
            and(
              eq(gallerySchema.mocFiles.mocId, galleryMocId),
              eq(gallerySchema.mocFiles.originalFilename, imgFile),
            ),
          )
          .limit(1)

        if (existing.length === 0) {
          // Upload to MinIO
          const buffer = await readFile(imgPath)
          await uploadToS3({ key: s3Key, body: buffer, contentType, bucket: S3_BUCKET })

          // Insert moc_files row
          await db.insert(gallerySchema.mocFiles).values({
            mocId: galleryMocId,
            fileType: 'gallery-image',
            s3Key,
            originalFilename: imgFile,
            mimeType: contentType,
          })

          imagesUploaded++
        }

        if (!firstImageUrl) firstImageUrl = fileUrl
      }

      // Set thumbnailUrl on moc_instructions if not already set
      if (firstImageUrl && !moc.thumbnailUrl) {
        await db
          .update(gallerySchema.mocInstructions)
          .set({ thumbnailUrl: firstImageUrl })
          .where(eq(gallerySchema.mocInstructions.id, galleryMocId))
        thumbnailsSet++
      }
    }

    // ── 2. Upload all instruction files from the MOC folder ─────────────────
    const allFiles = await readdir(mocDir)
    const instructionFiles = allFiles.filter(f => {
      const ext = extname(f).toLowerCase()
      return INSTRUCTION_MIME[ext] && !f.startsWith('parts-') && f !== 'images'
    })

    for (const instrFile of instructionFiles) {
      const instrPath = resolve(mocDir, instrFile)
      const ext = extname(instrFile).toLowerCase()
      const contentType = INSTRUCTION_MIME[ext] || 'application/octet-stream'
      const s3Key = `mocs/${mocId}/${instrFile}`

      const existing = await db
        .select()
        .from(gallerySchema.mocFiles)
        .where(
          and(
            eq(gallerySchema.mocFiles.mocId, galleryMocId),
            eq(gallerySchema.mocFiles.originalFilename, instrFile),
          ),
        )
        .limit(1)

      if (existing.length === 0) {
        const buffer = await readFile(instrPath)
        await uploadToS3({ key: s3Key, body: buffer, contentType, bucket: S3_BUCKET })
        await db.insert(gallerySchema.mocFiles).values({
          mocId: galleryMocId,
          fileType: 'instruction',
          s3Key,
          originalFilename: instrFile,
          mimeType: contentType,
        })
        instructionFilesUploaded++
      }
    }

    // ── 3. Upload all parts export files as parts-list files ────────────────
    for (const { filename: partsFilename, mimeType: partsMime } of PARTS_EXPORT_FILES) {
      const partsFilePath = resolve(mocDir, partsFilename)
      if (!existsSync(partsFilePath)) continue

      const partsS3Key = `mocs/${mocId}/${partsFilename}`

      const existingParts = await db
        .select()
        .from(gallerySchema.mocFiles)
        .where(
          and(
            eq(gallerySchema.mocFiles.mocId, galleryMocId),
            eq(gallerySchema.mocFiles.originalFilename, partsFilename),
          ),
        )
        .limit(1)

      if (existingParts.length === 0) {
        const buffer = await readFile(partsFilePath)
        await uploadToS3({
          key: partsS3Key,
          body: buffer,
          contentType: partsMime,
          bucket: S3_BUCKET,
        })
        await db.insert(gallerySchema.mocFiles).values({
          mocId: galleryMocId,
          fileType: 'parts-list',
          s3Key: partsS3Key,
          originalFilename: partsFilename,
          mimeType: partsMime,
        })
        partsFilesUploaded++
      }
    }

    // ── 4. Import parts from rebrickable CSV ─────────────────────────────────
    const csvFilename = 'parts-rebrickable_csv.csv'
    const csvPath = resolve(mocDir, csvFilename)
    if (existsSync(csvPath)) {
      const csvText = await readFile(csvPath, 'utf-8')
      const parts = parseCsv(csvText)

      if (parts.length > 0) {
        const partsListTitle = 'Rebrickable Parts List'
        const totalQty = parts.reduce((s, p) => s + p.quantity, 0)

        // Upsert parts list
        const existing = await db
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

        if (existing.length > 0) {
          partsListId = existing[0].id
          await db
            .update(gallerySchema.mocPartsLists)
            .set({ totalPartsCount: String(totalQty), updatedAt: new Date() })
            .where(eq(gallerySchema.mocPartsLists.id, partsListId))
        } else {
          const [newList] = await db
            .insert(gallerySchema.mocPartsLists)
            .values({
              mocId: galleryMocId,
              title: partsListTitle,
              totalPartsCount: String(totalQty),
            })
            .returning()
          partsListId = newList.id
        }

        // Replace parts
        await db
          .delete(gallerySchema.mocParts)
          .where(eq(gallerySchema.mocParts.partsListId, partsListId))

        const CHUNK = 500
        for (let i = 0; i < parts.length; i += CHUNK) {
          await db.insert(gallerySchema.mocParts).values(
            parts.slice(i, i + CHUNK).map(p => ({
              partsListId,
              partId: p.partNumber,
              partName: p.name || 'Unknown',
              quantity: p.quantity,
              color: p.color || 'Unknown',
            })),
          )
        }

        partsImported += parts.length
        logger.info(`[migrate] ${folder}: imported ${parts.length} parts (${totalQty} total qty)`)
      }
    }

    logger.info(`[migrate] ${folder}: done`)
  }

  await galleryPool.end()

  logger.info('═══════════════════════════════════════════════════════')
  logger.info('  Migration Complete')
  logger.info(`  Images uploaded:   ${imagesUploaded}`)
  logger.info(`  Thumbnails set:    ${thumbnailsSet}`)
  logger.info(`  Instruction files: ${instructionFilesUploaded}`)
  logger.info(`  Parts files:       ${partsFilesUploaded}`)
  logger.info(`  Parts imported:    ${partsImported}`)
  logger.info(`  Skipped (no DB):   ${skipped}`)
  logger.info('═══════════════════════════════════════════════════════')
}

// ─── CSV parser ───────────────────────────────────────────────────────────────

interface CsvPart {
  partNumber: string
  name: string
  color: string
  quantity: number
}

function parseCsv(csvText: string): CsvPart[] {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''))

  const results: CsvPart[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = (values[idx] || '').replace(/^"|"$/g, '')
    })

    const partNumber = row['part'] || row['part_num'] || row['partnumber'] || ''
    if (!partNumber) continue

    const quantity = parseInt(row['quantity'] || row['qty'] || '1', 10) || 1
    results.push({
      partNumber,
      name: row['name'] || row['part_name'] || '',
      color: row['color'] || row['color_name'] || '',
      quantity,
    })
  }

  return results
}

function parseCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  values.push(current.trim())
  return values
}

main().catch(error => {
  logger.error('[migrate] Fatal error:', error)
  process.exit(1)
})
