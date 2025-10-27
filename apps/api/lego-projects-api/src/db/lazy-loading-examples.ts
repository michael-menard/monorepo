import { eq, desc, and, sql } from 'drizzle-orm'
import { db } from './client'
import {
  galleryImages,
  galleryAlbums,
  mocInstructions,
  mocFiles,
  mocGalleryImages,
  mocGalleryAlbums,
} from './schema'

/**
 * Lazy Loading Examples for the MOC Instructions API
 *
 * This file demonstrates how to use the new schema relationships
 * for efficient lazy loading and cascading deletes.
 */

// Note: User-related examples removed - users are managed in auth service, not in this PostgreSQL database

// Example 2: Get MOC instructions with lazy-loaded files and gallery links
export async function getMocWithDetails(mocId: string) {
  const moc = await db.query.mocInstructions.findFirst({
    where: eq(mocInstructions.id, mocId),
    with: {
      files: {
        orderBy: [desc(mocFiles.createdAt)],
      },
      galleryImages: {
        with: {
          galleryImage: true,
        },
      },
      galleryAlbums: {
        with: {
          galleryAlbum: {
            with: {
              images: {
                limit: 5, // Only load first 5 images from each album
              },
            },
          },
        },
      },
    },
  })

  return moc
}

// Example 3: Get user's MOCs with pagination and lazy loading
export async function getUserMocs(userId: string, page: number = 1, limit: number = 10) {
  const offset = (page - 1) * limit

  const mocs = await db.query.mocInstructions.findMany({
    where: eq(mocInstructions.userId, userId),
    orderBy: [desc(mocInstructions.createdAt)],
    limit,
    offset,
    with: {
      files: {
        where: eq(mocFiles.fileType, 'thumbnail'), // Only load thumbnails initially
        limit: 1,
      },
      galleryImages: {
        limit: 3, // Only load first 3 gallery images
        with: {
          galleryImage: {
            columns: {
              id: true,
              title: true,
              imageUrl: true,
            },
          },
        },
      },
    },
  })

  return mocs
}

// Example 4: Get album with lazy-loaded images (cascading delete will work automatically)
export async function getAlbumWithImages(albumId: string) {
  const album = await db.query.galleryAlbums.findFirst({
    where: eq(galleryAlbums.id, albumId),
    with: {
      images: {
        orderBy: [desc(galleryImages.createdAt)],
        with: {
          flags: {
            limit: 5, // Only load recent flags
          },
        },
      },
      coverImage: {
        columns: {
          id: true,
          title: true,
          imageUrl: true,
        },
      },
    },
  })

  return album
}

// Example 5: Search MOCs with lazy-loaded related data
export async function searchMocs(searchTerm: string, userId?: string) {
  const whereConditions = [
    // Search in title and description
    // Note: This is a simple text search - for production, consider using full-text search
  ]

  if (userId) {
    whereConditions.push(eq(mocInstructions.userId, userId))
  }

  const mocs = await db.query.mocInstructions.findMany({
    where: whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0],
    orderBy: [desc(mocInstructions.createdAt)],
    limit: 20,
    with: {
      files: {
        where: eq(mocFiles.fileType, 'thumbnail'),
        limit: 1,
      },
    },
  })

  return mocs
}

// Example 6: Get gallery images with lazy-loaded MOC associations
export async function getGalleryImageWithMocs(imageId: string) {
  const image = await db.query.galleryImages.findFirst({
    where: eq(galleryImages.id, imageId),
    with: {
      album: {
        columns: {
          id: true,
          title: true,
        },
      },
      mocGalleryImages: {
        with: {
          moc: {
            columns: {
              id: true,
              title: true,
              description: true,
            },
          },
        },
      },
    },
  })

  return image
}

// Note: User deletion examples removed - users are managed in auth service

// Example 8: Delete album (cascading delete will automatically delete all images in the album)
export async function deleteAlbum(albumId: string) {
  // This will automatically cascade delete all images in the album
  const result = await db.delete(galleryAlbums).where(eq(galleryAlbums.id, albumId))
  return result
}

// Example 9: Delete MOC instructions (uses the safe delete function from migration)
export async function deleteMocInstructions(mocId: string) {
  // This will use the safe delete function that preserves images/albums
  // used by other MOCs or albums
  const result = await db.delete(mocInstructions).where(eq(mocInstructions.id, mocId))
  return result
}

// Example 10: Get user statistics with lazy loading
export async function getUserStats(userId: string) {
  // Load counts without loading full data
  const [mocCount, imageCount, albumCount] = await Promise.all([
    db
      .select({ count: sql`count(*)` })
      .from(mocInstructions)
      .where(eq(mocInstructions.userId, userId)),
    db
      .select({ count: sql`count(*)` })
      .from(galleryImages)
      .where(eq(galleryImages.userId, userId)),
    db
      .select({ count: sql`count(*)` })
      .from(galleryAlbums)
      .where(eq(galleryAlbums.userId, userId)),
  ])

  return {
    mocs: mocCount[0]?.count || 0,
    images: imageCount[0]?.count || 0,
    albums: albumCount[0]?.count || 0,
  }
}
