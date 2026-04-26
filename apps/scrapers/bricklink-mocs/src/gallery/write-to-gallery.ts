/**
 * Write scraped BrickLink MOC data to the shared gallery tables.
 *
 * Follows the same pattern as the rebrickable scraper's gallery sync:
 *   - moc_instructions (metadata)
 *   - moc_files (gallery-image S3 pointers)
 *   - moc_parts_lists + moc_parts (parts data)
 */

import { eq, and } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { logger } from '@repo/logger'
import * as gallerySchema from '../../../../../packages/backend/db/src/schema.js'
import type { ScrapedMocDetail } from '../__types__/index.js'

export async function writeToGallery(
  galleryDb: NodePgDatabase<typeof gallerySchema>,
  userId: string,
  data: ScrapedMocDetail,
  imageS3Keys: string[],
): Promise<string | null> {
  const mocId = `BL-${data.idModel}`

  try {
    const designer = data.author
      ? {
          username: data.author,
          profileUrl: data.authorUrl || null,
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
        partsCount: data.itemCount,
        description: data.description,
        tags: data.tags.length > 0 ? data.tags : null,
        status: 'published',
        visibility: 'public',
        designer,
        sourcePlatform: {
          platform: 'bricklink',
          externalId: String(data.idModel),
          sourceUrl: data.sourceUrl,
          importedAt: new Date().toISOString(),
        },
        source: 'bricklink',
        platformCategoryId: null,
      })
      .onConflictDoUpdate({
        target: [gallerySchema.mocInstructions.userId, gallerySchema.mocInstructions.title],
        set: {
          author: data.author,
          partsCount: data.itemCount,
          description: data.description,
          tags: data.tags.length > 0 ? data.tags : null,
          designer,
          sourcePlatform: {
            platform: 'bricklink',
            externalId: String(data.idModel),
            sourceUrl: data.sourceUrl,
            importedAt: new Date().toISOString(),
          },
          source: 'bricklink',
          updatedAt: new Date(),
        },
      })
      .returning()

    const galleryMocId = upsertedMoc.id

    // 2. Write gallery image file rows
    for (let i = 0; i < imageS3Keys.length; i++) {
      const s3Key = imageS3Keys[i]
      const fileName = s3Key.split('/').pop() || `${i + 1}.png`

      const existing = await galleryDb
        .select()
        .from(gallerySchema.mocFiles)
        .where(
          and(
            eq(gallerySchema.mocFiles.mocId, galleryMocId),
            eq(gallerySchema.mocFiles.originalFilename, fileName),
          ),
        )
        .limit(1)

      if (existing.length === 0) {
        await galleryDb.insert(gallerySchema.mocFiles).values({
          mocId: galleryMocId,
          fileType: 'gallery-image',
          s3Key,
          originalFilename: fileName,
          mimeType: 'image/png',
        })
      }
    }

    // Set thumbnail from first image if not already set
    if (imageS3Keys.length > 0) {
      const moc = await galleryDb
        .select({ thumbnailUrl: gallerySchema.mocInstructions.thumbnailUrl })
        .from(gallerySchema.mocInstructions)
        .where(eq(gallerySchema.mocInstructions.id, galleryMocId))
        .limit(1)

      if (moc.length > 0 && !moc[0].thumbnailUrl) {
        await galleryDb
          .update(gallerySchema.mocInstructions)
          .set({ thumbnailUrl: imageS3Keys[0] })
          .where(eq(gallerySchema.mocInstructions.id, galleryMocId))
      }
    }

    // 3. Sync parts
    if (data.parts.length > 0) {
      await syncParts(galleryDb, galleryMocId, data.parts)

      // Create a parts-list file entry so the UI counts it.
      // The actual parts data lives in moc_parts_lists + moc_parts,
      // but the detail page counter checks moc_files with fileType 'parts-list'.
      const partsListFilename = `bricklink-parts-${data.idModel}.json`
      const existingPartsFile = await galleryDb
        .select()
        .from(gallerySchema.mocFiles)
        .where(
          and(
            eq(gallerySchema.mocFiles.mocId, galleryMocId),
            eq(gallerySchema.mocFiles.originalFilename, partsListFilename),
          ),
        )
        .limit(1)

      if (existingPartsFile.length === 0) {
        await galleryDb.insert(gallerySchema.mocFiles).values({
          mocId: galleryMocId,
          fileType: 'parts-list',
          s3Key: `bricklink-mocs/${data.idModel}/parts/${partsListFilename}`,
          originalFilename: partsListFilename,
          mimeType: 'application/json',
        })
      }
    }

    // 4. Update total piece count
    const totalPieces = data.parts.reduce((sum, p) => sum + p.quantity, 0)
    if (totalPieces > 0) {
      await galleryDb
        .update(gallerySchema.mocInstructions)
        .set({ totalPieceCount: totalPieces })
        .where(eq(gallerySchema.mocInstructions.id, galleryMocId))
    }

    logger.info(
      `[gallery] Synced BL-${data.idModel}: "${data.title}" (${data.parts.length} unique parts)`,
    )
    return galleryMocId
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(`[gallery] Failed to write BL-${data.idModel}: ${message}`)
    return null
  }
}

// ─── Parts Sync ──────────────────────────────────────────────────────────

async function syncParts(
  galleryDb: NodePgDatabase<typeof gallerySchema>,
  galleryMocId: string,
  parts: ScrapedMocDetail['parts'],
): Promise<void> {
  const partsListTitle = 'BrickLink Parts List'

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
        partName: p.name || 'Unknown',
        quantity: p.quantity,
        color: p.color || 'Unknown',
      })),
    )
  }
}
