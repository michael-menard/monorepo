/**
 * Write scraped MOC data directly to gallery tables.
 *
 * Replaces sync-to-gallery.ts — the scraper writes to the gallery DB inline
 * instead of requiring a separate batch sync step.
 *
 * Both the scraper and the gallery app share the same MinIO bucket, so files
 * are already accessible. This function only writes DB rows:
 *   - moc_instructions (text metadata)
 *   - moc_files (s3Key pointer to MinIO)
 *   - moc_parts_lists + moc_parts (parts data)
 */

import { eq, and } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { logger } from '@repo/logger'
import * as gallerySchema from '../../../../../packages/backend/db/src/schema.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GalleryMocData {
  mocNumber: string
  title: string
  author: string | null
  description: string | null
  descriptionHtml: string | null
  dateAdded: Date | null
  authorProfileUrl: string | null
  tags: string[] | null
  partsCount: number | null
  rebrickableUrl: string | null
  /** The MinIO key for the primary instruction file */
  s3Key: string
  fileType: string
  /** Parts to sync (optional — not all scraper modes produce parts) */
  parts?: GalleryPartData[]
}

export interface GalleryPartData {
  partNumber: string
  partName: string
  color: string
  quantity: number
}

export interface GalleryImageData {
  s3Key: string
  fileName: string
}

// ─── Main ─────────────────────────────────────────────────────────────────────

/**
 * Upsert a scraped MOC into the gallery tables.
 *
 * Returns the gallery moc_instructions.id on success, null on failure.
 */
export async function writeToGallery(
  galleryDb: NodePgDatabase<typeof gallerySchema>,
  userId: string,
  data: GalleryMocData,
): Promise<string | null> {
  const mocId = `MOC-${data.mocNumber}`

  try {
    // Build designer JSONB
    const designer = data.author
      ? {
          username: data.author,
          profileUrl: data.authorProfileUrl || null,
        }
      : null

    // 1. Upsert moc_instructions
    const [upsertedMoc] = await galleryDb
      .insert(gallerySchema.mocInstructions)
      .values({
        userId,
        title: data.title,
        type: 'moc',
        mocId,
        author: data.author,
        partsCount: data.partsCount,
        description: data.description,
        descriptionHtml: data.descriptionHtml,
        uploadedDate: data.dateAdded,
        designer,
        tags: data.tags?.length ? data.tags : null,
        status: 'published',
        visibility: 'public',
        sourcePlatform: {
          platform: 'rebrickable',
          sourceUrl: data.rebrickableUrl,
          importedAt: new Date().toISOString(),
        },
      })
      .onConflictDoUpdate({
        target: [gallerySchema.mocInstructions.userId, gallerySchema.mocInstructions.title],
        set: {
          author: data.author,
          partsCount: data.partsCount,
          description: data.description,
          descriptionHtml: data.descriptionHtml,
          uploadedDate: data.dateAdded,
          designer,
          tags: data.tags?.length ? data.tags : null,
          status: 'published',
          visibility: 'public',
          sourcePlatform: {
            platform: 'rebrickable',
            sourceUrl: data.rebrickableUrl,
            importedAt: new Date().toISOString(),
          },
          updatedAt: new Date(),
        },
      })
      .returning()

    const galleryMocId = upsertedMoc.id

    // 2. Upsert moc_files (s3Key pointer — no file copy needed)
    const filename = data.s3Key.split('/').pop() || `${mocId}.${data.fileType || 'pdf'}`
    const mimeType = getMimeType(data.fileType || 'pdf')

    await galleryDb
      .insert(gallerySchema.mocFiles)
      .values({
        mocId: galleryMocId,
        fileType: 'instruction',
        s3Key: data.s3Key,
        originalFilename: filename,
        mimeType,
      })
      .onConflictDoUpdate({
        target: [gallerySchema.mocFiles.mocId, gallerySchema.mocFiles.originalFilename],
        set: {
          s3Key: data.s3Key,
          mimeType,
          updatedAt: new Date(),
        },
      })

    // 3. Sync parts (if provided)
    if (data.parts && data.parts.length > 0) {
      await syncParts(galleryDb, galleryMocId, data.parts)
    }

    // 4. Update total piece count
    const totalPieces = data.parts?.reduce((sum, p) => sum + p.quantity, 0) ?? 0
    if (totalPieces > 0) {
      await galleryDb
        .update(gallerySchema.mocInstructions)
        .set({ totalPieceCount: totalPieces })
        .where(eq(gallerySchema.mocInstructions.id, galleryMocId))
    }

    logger.info(
      `[gallery] Synced ${mocId}: "${data.title}" (${data.parts?.length ?? 0} unique parts)`,
    )
    return galleryMocId
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(`[gallery] Failed to write MOC-${data.mocNumber}: ${message}`)
    return null
  }
}

/**
 * Write gallery image file rows for a MOC.
 * Call after images have been uploaded to MinIO.
 */
export async function writeImagesToGallery(
  galleryDb: NodePgDatabase<typeof gallerySchema>,
  galleryMocId: string,
  images: GalleryImageData[],
): Promise<void> {
  let firstImageKey: string | null = null

  for (const img of images) {
    const existing = await galleryDb
      .select()
      .from(gallerySchema.mocFiles)
      .where(
        and(
          eq(gallerySchema.mocFiles.mocId, galleryMocId),
          eq(gallerySchema.mocFiles.originalFilename, img.fileName),
        ),
      )
      .limit(1)

    if (existing.length === 0) {
      await galleryDb.insert(gallerySchema.mocFiles).values({
        mocId: galleryMocId,
        fileType: 'gallery-image',
        s3Key: img.s3Key,
        originalFilename: img.fileName,
        mimeType: 'image/jpeg',
      })
    }

    if (!firstImageKey) firstImageKey = img.s3Key
  }

  // Set thumbnail from first image if not already set
  if (firstImageKey) {
    const moc = await galleryDb
      .select({ thumbnailUrl: gallerySchema.mocInstructions.thumbnailUrl })
      .from(gallerySchema.mocInstructions)
      .where(eq(gallerySchema.mocInstructions.id, galleryMocId))
      .limit(1)

    if (moc.length > 0 && !moc[0].thumbnailUrl) {
      await galleryDb
        .update(gallerySchema.mocInstructions)
        .set({ thumbnailUrl: firstImageKey })
        .where(eq(gallerySchema.mocInstructions.id, galleryMocId))
    }
  }
}

/**
 * Patch gallery metadata fields that may be stale.
 * Non-destructive: only fills nulls, never overwrites existing values.
 */
export async function patchGalleryMeta(
  galleryDb: NodePgDatabase<typeof gallerySchema>,
  galleryMocId: string,
  data: {
    description?: string | null
    descriptionHtml?: string | null
    tags?: string[] | null
    dateAdded?: Date | null
    authorProfileUrl?: string | null
    author?: string | null
  },
): Promise<void> {
  const moc = await galleryDb
    .select()
    .from(gallerySchema.mocInstructions)
    .where(eq(gallerySchema.mocInstructions.id, galleryMocId))
    .limit(1)

  if (moc.length === 0) return
  const existing = moc[0]

  const patch: Record<string, unknown> = {}

  if (!existing.description && data.description) patch.description = data.description
  if (!existing.descriptionHtml && data.descriptionHtml)
    patch.descriptionHtml = data.descriptionHtml
  if ((!existing.tags || (existing.tags as string[]).length === 0) && data.tags?.length)
    patch.tags = data.tags
  if (!existing.uploadedDate && data.dateAdded) patch.uploadedDate = data.dateAdded

  const existingDesigner = existing.designer as { profileUrl?: string | null } | null
  if (data.author && !existingDesigner?.profileUrl && data.authorProfileUrl) {
    patch.designer = {
      ...(existingDesigner || {}),
      username: data.author,
      profileUrl: data.authorProfileUrl,
    }
  }

  if (Object.keys(patch).length > 0) {
    patch.updatedAt = new Date()
    await galleryDb
      .update(gallerySchema.mocInstructions)
      .set(patch)
      .where(eq(gallerySchema.mocInstructions.id, galleryMocId))
    logger.info(
      `[gallery] Patched MOC ${galleryMocId}: ${Object.keys(patch)
        .filter(k => k !== 'updatedAt')
        .join(', ')}`,
    )
  }
}

/**
 * Look up a gallery moc_instructions row by MOC number.
 */
export async function findGalleryMoc(
  galleryDb: NodePgDatabase<typeof gallerySchema>,
  mocNumber: string,
): Promise<{ id: string; thumbnailUrl: string | null } | null> {
  const mocId = `MOC-${mocNumber}`
  const rows = await galleryDb
    .select({
      id: gallerySchema.mocInstructions.id,
      thumbnailUrl: gallerySchema.mocInstructions.thumbnailUrl,
    })
    .from(gallerySchema.mocInstructions)
    .where(eq(gallerySchema.mocInstructions.mocId, mocId))
    .limit(1)

  return rows.length > 0 ? rows[0] : null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function syncParts(
  galleryDb: NodePgDatabase<typeof gallerySchema>,
  galleryMocId: string,
  parts: GalleryPartData[],
): Promise<void> {
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
    await galleryDb
      .update(gallerySchema.mocPartsLists)
      .set({
        totalPartsCount: String(parts.reduce((sum, p) => sum + p.quantity, 0)),
        updatedAt: new Date(),
      })
      .where(eq(gallerySchema.mocPartsLists.id, partsListId))
  } else {
    const [newList] = await galleryDb
      .insert(gallerySchema.mocPartsLists)
      .values({
        mocId: galleryMocId,
        title: partsListTitle,
        totalPartsCount: String(parts.reduce((sum, p) => sum + p.quantity, 0)),
      })
      .returning()
    partsListId = newList.id
  }

  // Replace parts: delete existing, bulk insert
  await galleryDb
    .delete(gallerySchema.mocParts)
    .where(eq(gallerySchema.mocParts.partsListId, partsListId))

  const CHUNK_SIZE = 500
  for (let i = 0; i < parts.length; i += CHUNK_SIZE) {
    const chunk = parts.slice(i, i + CHUNK_SIZE)
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
