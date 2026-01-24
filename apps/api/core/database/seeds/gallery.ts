import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { sql } from 'drizzle-orm'

type DB = NodePgDatabase

/**
 * Seed data for gallery_albums, gallery_images, and gallery_flags tables
 *
 * Creates deterministic gallery data with fixed UUIDs for testing.
 * Idempotent via ON CONFLICT DO NOTHING - only inserts if record doesn't exist.
 *
 * Test scenarios supported (STORY-006 + STORY-007 + STORY-008):
 * - Happy path CRUD tests (albums 001, 002)
 * - Forbidden tests - 403 (album 003, image 003)
 * - Cover image tests (image 001, 002)
 * - STORY-007: Get image, list images, search images, flag images
 * - STORY-007: Standalone images (albumId=null), album-linked images
 * - STORY-007: Flag conflict test (image already flagged)
 * - STORY-008: Update image test (66666666-...)
 * - STORY-008: Delete image test (77777777-...)
 * - STORY-008: Album cover cascade test (88888888-... + bbbbbbbb-...)
 * - STORY-008: Flag cascade delete test (99999999-...-998 + eeeeeeee-...)
 */
export async function seedGallery(db: DB) {
  console.log('  Seeding gallery albums, images, and flags...')

  // Use the same user ID as AUTH_BYPASS dev user
  const devUserId = 'dev-user-00000000-0000-0000-0000-000000000001'
  const otherUserId = 'other-user-00000000-0000-0000-0000-000000000002'

  // Fixed UUIDs for deterministic seeding - Gallery Images
  // STORY-007 requires specific IDs for test scenarios:
  // 11111111-... = Castle Tower Photo (standalone, dev-user) - happy path get/list
  // 22222222-... = Space Station Build (in Album A, dev-user) - album filter test
  // 33333333-... = Medieval Knight (standalone, dev-user) - search test
  // 44444444-... = Already Flagged Image (standalone, dev-user) - flag conflict test
  // 55555555-... = Private Image (standalone, other-user) - 403 test
  // STORY-008:
  // 66666666-... = Update Test Image (standalone, dev-user) - PATCH happy path
  // 77777777-... = Delete Test Image (standalone, dev-user) - DELETE happy path
  // 88888888-... = Album Cover Image (cover of bbbbbbbb album) - DELETE cascade test
  // 99999999-...-998 = Flagged Delete Test Image - DELETE flag cascade test
  const galleryImages = [
    // STORY-007: Happy path get/list test - standalone image
    {
      id: '11111111-1111-1111-1111-111111111111',
      userId: devUserId,
      title: 'Castle Tower Photo',
      description: 'A beautiful medieval tower reference photo',
      tags: ['castle', 'tower', 'medieval', 'architecture'],
      imageUrl: 'https://example.com/images/castle-tower.jpg',
      thumbnailUrl: 'https://example.com/thumbs/castle-tower.jpg',
      albumId: null, // Standalone
      flagged: false,
    },
    // STORY-007: Album filter test - linked to Space Collection album
    {
      id: '22222222-2222-2222-2222-222222222222',
      userId: devUserId,
      title: 'Space Station Build',
      description: 'Inspiration for modular space station',
      tags: ['space', 'station', 'modular', 'sci-fi'],
      imageUrl: 'https://example.com/images/space-station.jpg',
      thumbnailUrl: 'https://example.com/thumbs/space-station.jpg',
      albumId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', // Space Collection
      flagged: false,
    },
    // STORY-007: Search test (search for "medieval")
    {
      id: '33333333-3333-3333-3333-333333333333',
      userId: devUserId,
      title: 'Medieval Knight',
      description: 'Knight minifigure reference for castle MOC',
      tags: ['medieval', 'knight', 'minifigure', 'castle'],
      imageUrl: 'https://example.com/images/medieval-knight.jpg',
      thumbnailUrl: 'https://example.com/thumbs/medieval-knight.jpg',
      albumId: null, // Standalone
      flagged: false,
    },
    // STORY-007: Flag conflict test - already flagged by dev user
    {
      id: '44444444-4444-4444-4444-444444444444',
      userId: devUserId,
      title: 'Already Flagged Image',
      description: 'This image has been flagged for testing 409 conflict',
      tags: ['test', 'flagged'],
      imageUrl: 'https://example.com/images/flagged.jpg',
      thumbnailUrl: 'https://example.com/thumbs/flagged.jpg',
      albumId: null, // Standalone
      flagged: true,
    },
    // STORY-007: 403 forbidden test - belongs to other user
    {
      id: '55555555-5555-5555-5555-555555555555',
      userId: otherUserId,
      title: 'Private Image',
      description: 'This image belongs to another user',
      tags: ['private', 'other'],
      imageUrl: 'https://example.com/images/private.jpg',
      thumbnailUrl: 'https://example.com/thumbs/private.jpg',
      albumId: null, // Standalone
      flagged: false,
    },
    // STORY-006: Keep existing images for album tests (linked to Castle Builds)
    {
      id: '33333333-3333-3333-3333-333333333001',
      userId: devUserId,
      title: 'Castle Inspiration',
      description: 'Medieval castle design inspiration',
      tags: ['castle', 'medieval'],
      imageUrl: 'https://example.com/images/castle.jpg',
      thumbnailUrl: 'https://example.com/thumbs/castle.jpg',
      albumId: '22222222-2222-2222-2222-222222222001', // Linked to Castle Builds album
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
      albumId: '22222222-2222-2222-2222-222222222001', // Linked to Castle Builds album
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
    // STORY-008: Update Test Image - happy path PATCH tests
    {
      id: '66666666-6666-6666-6666-666666666666',
      userId: devUserId,
      title: 'Update Test Image',
      description: 'Image for testing PATCH endpoint',
      tags: ['update', 'test'],
      imageUrl: 'https://example.com/images/update-test.jpg',
      thumbnailUrl: 'https://example.com/thumbs/update-test.jpg',
      albumId: null, // Standalone
      flagged: false,
    },
    // STORY-008: Delete Test Image - happy path DELETE tests
    {
      id: '77777777-7777-7777-7777-777777777777',
      userId: devUserId,
      title: 'Delete Test Image',
      description: 'Image for testing DELETE endpoint',
      tags: ['delete', 'test'],
      imageUrl: 'https://example.com/images/delete-test.jpg',
      thumbnailUrl: 'https://example.com/thumbs/delete-test.jpg',
      albumId: null, // Standalone
      flagged: false,
    },
    // STORY-008: Album Cover Image - DELETE cascade test (clears coverImageId)
    {
      id: '88888888-8888-8888-8888-888888888888',
      userId: devUserId,
      title: 'Album Cover Image',
      description: 'Image used as album cover for cascade delete test',
      tags: ['cover', 'cascade', 'test'],
      imageUrl: 'https://example.com/images/album-cover.jpg',
      thumbnailUrl: 'https://example.com/thumbs/album-cover.jpg',
      albumId: null, // Not in album, but IS the cover of album bbbbbbbb
      flagged: false,
    },
    // STORY-008: Flagged Delete Test Image - DELETE flag cascade test
    {
      id: '99999999-9999-9999-9999-999999999998',
      userId: devUserId,
      title: 'Flagged Delete Test Image',
      description: 'Image with flag for cascade delete test',
      tags: ['flag', 'cascade', 'delete', 'test'],
      imageUrl: 'https://example.com/images/flagged-delete.jpg',
      thumbnailUrl: 'https://example.com/thumbs/flagged-delete.jpg',
      albumId: null, // Standalone
      flagged: true, // Has associated flag record
    },
  ]

  // Fixed UUIDs for deterministic seeding - Gallery Albums
  // STORY-007 requires:
  // aaaaaaaa-... = Space Collection (dev-user) - for album filter test
  // STORY-008 requires:
  // bbbbbbbb-... = Cover Test Album (dev-user) - for DELETE cascade test (cover is 88888888)
  const galleryAlbums = [
    // STORY-007: Album for filter test
    {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      userId: devUserId,
      title: 'Space Collection',
      description: 'Collection of space-themed MOC inspiration',
      coverImageId: '22222222-2222-2222-2222-222222222222',
    },
    // STORY-006: Keep existing albums
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
    // STORY-008: Cover Test Album - for DELETE cascade test
    {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      userId: devUserId,
      title: 'Cover Test Album',
      description: 'Album with cover image for cascade delete test',
      coverImageId: '88888888-8888-8888-8888-888888888888',
    },
  ]

  // STORY-007 + STORY-008: Gallery Flags
  const galleryFlags = [
    // STORY-007: Flag conflict test
    {
      id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
      imageId: '44444444-4444-4444-4444-444444444444', // Already Flagged Image
      userId: devUserId,
      reason: 'Test flag for 409 conflict scenario',
    },
    // STORY-008: Flag cascade delete test
    {
      id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      imageId: '99999999-9999-9999-9999-999999999998', // Flagged Delete Test Image
      userId: devUserId,
      reason: 'Test flag for cascade delete scenario',
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
      ON CONFLICT (id) DO NOTHING
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
      ON CONFLICT (id) DO NOTHING
    `)
  }

  // Update images with their album associations
  for (const image of galleryImages) {
    if (image.albumId) {
      await db.execute(sql`
        UPDATE gallery_images
        SET album_id = ${image.albumId}, last_updated_at = NOW()
        WHERE id = ${image.id}
      `)
    }
  }

  // Insert flag records (STORY-007)
  for (const flag of galleryFlags) {
    await db.execute(sql`
      INSERT INTO gallery_flags (
        id, image_id, user_id, reason,
        created_at, last_updated_at
      ) VALUES (
        ${flag.id},
        ${flag.imageId},
        ${flag.userId},
        ${flag.reason},
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO NOTHING
    `)
  }

  console.log(`  ✓ Seeded ${galleryImages.length} gallery images (skipped existing)`)
  console.log(`  ✓ Seeded ${galleryAlbums.length} gallery albums (skipped existing)`)
  console.log(`  ✓ Seeded ${galleryFlags.length} gallery flags (skipped existing)`)
}
