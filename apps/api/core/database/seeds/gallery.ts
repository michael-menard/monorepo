import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { sql } from 'drizzle-orm'

type DB = NodePgDatabase

/**
 * Seed data for gallery_albums and gallery_images tables
 *
 * Creates deterministic gallery data with fixed UUIDs for testing.
 * Idempotent via ON CONFLICT DO UPDATE.
 *
 * Test scenarios supported:
 * - Happy path CRUD tests (albums 001, 002)
 * - Forbidden tests - 403 (album 003, image 003)
 * - Cover image tests (image 001, 002)
 */
export async function seedGallery(db: DB) {
  console.log('  Seeding gallery albums and images...')

  // Use the same user ID as AUTH_BYPASS dev user
  const devUserId = 'dev-user-00000000-0000-0000-0000-000000000001'
  const otherUserId = 'other-user-00000000-0000-0000-0000-000000000002'

  // Fixed UUIDs for deterministic seeding - Gallery Images
  const galleryImages = [
    {
      id: '33333333-3333-3333-3333-333333333001',
      userId: devUserId,
      title: 'Castle Inspiration',
      description: 'Medieval castle design inspiration',
      tags: ['castle', 'medieval'],
      imageUrl: 'https://example.com/images/castle.jpg',
      thumbnailUrl: 'https://example.com/thumbs/castle.jpg',
      albumId: '22222222-2222-2222-2222-222222222001', // Linked to dev-user album 1
      flagged: false,
    },
    {
      id: '33333333-3333-3333-3333-333333333002',
      userId: devUserId,
      title: 'Space Station Ideas',
      description: 'Futuristic space station concepts',
      tags: ['space', 'sci-fi'],
      imageUrl: 'https://example.com/images/space.jpg',
      thumbnailUrl: 'https://example.com/thumbs/space.jpg',
      albumId: '22222222-2222-2222-2222-222222222001', // Linked to dev-user album 1
      flagged: false,
    },
    {
      // Image owned by another user - for 403 forbidden cover image test
      id: '33333333-3333-3333-3333-333333333003',
      userId: otherUserId,
      title: 'Other User Image',
      description: 'Image belonging to another user',
      tags: ['other'],
      imageUrl: 'https://example.com/images/other.jpg',
      thumbnailUrl: 'https://example.com/thumbs/other.jpg',
      albumId: '22222222-2222-2222-2222-222222222003', // Linked to other-user album
      flagged: false,
    },
  ]

  // Fixed UUIDs for deterministic seeding - Gallery Albums
  const galleryAlbums = [
    {
      id: '22222222-2222-2222-2222-222222222001',
      userId: devUserId,
      title: 'Castle Builds',
      description: 'Collection of castle inspiration images',
      coverImageId: '33333333-3333-3333-3333-333333333001',
    },
    {
      id: '22222222-2222-2222-2222-222222222002',
      userId: devUserId,
      title: 'Space Themes',
      description: 'Space and sci-fi MOC ideas',
      coverImageId: null,
    },
    {
      // Album owned by another user - for 403 forbidden test
      id: '22222222-2222-2222-2222-222222222003',
      userId: otherUserId,
      title: 'Other User Album',
      description: 'Album belonging to another user',
      coverImageId: '33333333-3333-3333-3333-333333333003',
    },
  ]

  // First, insert images (without albumId to avoid FK constraint)
  for (const image of galleryImages) {
    await db.execute(sql`
      INSERT INTO gallery_images (
        id, user_id, title, description, tags, image_url, thumbnail_url, album_id, flagged,
        created_at, last_updated_at
      ) VALUES (
        ${image.id},
        ${image.userId},
        ${image.title},
        ${image.description},
        ${JSON.stringify(image.tags)}::jsonb,
        ${image.imageUrl},
        ${image.thumbnailUrl},
        NULL,
        ${image.flagged},
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        tags = EXCLUDED.tags,
        image_url = EXCLUDED.image_url,
        thumbnail_url = EXCLUDED.thumbnail_url,
        flagged = EXCLUDED.flagged,
        last_updated_at = NOW()
    `)
  }

  // Then insert albums
  for (const album of galleryAlbums) {
    await db.execute(sql`
      INSERT INTO gallery_albums (
        id, user_id, title, description, cover_image_id,
        created_at, last_updated_at
      ) VALUES (
        ${album.id},
        ${album.userId},
        ${album.title},
        ${album.description},
        ${album.coverImageId},
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        cover_image_id = EXCLUDED.cover_image_id,
        last_updated_at = NOW()
    `)
  }

  // Finally, update images with their album associations
  for (const image of galleryImages) {
    if (image.albumId) {
      await db.execute(sql`
        UPDATE gallery_images
        SET album_id = ${image.albumId}, last_updated_at = NOW()
        WHERE id = ${image.id}
      `)
    }
  }

  console.log(`  ✓ Upserted ${galleryImages.length} gallery images`)
  console.log(`  ✓ Upserted ${galleryAlbums.length} gallery albums`)
}
