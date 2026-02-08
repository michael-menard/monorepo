import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { sql } from 'drizzle-orm'

type DB = NodePgDatabase

/**
 * Seed data for STORY-009: Image Uploads - Phase 1
 *
 * Creates deterministic test entities with fixed UUIDs for testing.
 * Idempotent via ON CONFLICT DO NOTHING - only inserts if record doesn't exist.
 *
 * Test Users:
 * - User A (dev-user-00000000-0000-0000-0000-000000000001): Test user for authenticated requests
 * - User B (dev-user-00000000-0000-0000-0000-000000000002): Other user for permission tests
 *
 * Test Entities:
 * - Set for User A with images (position testing)
 * - Set for User B (permission testing)
 * - Wishlist item for User A (upload testing)
 * - Wishlist item for User B (permission testing)
 * - Gallery album for User A (upload testing)
 */
export async function seedStory009(db: DB) {
  console.log('  Seeding STORY-009 test data...')

  // Fixed user IDs matching AUTH_BYPASS dev users
  const userAId = 'dev-user-00000000-0000-0000-0000-000000000001'
  const userBId = 'dev-user-00000000-0000-0000-0000-000000000002'

  // Fixed UUIDs for deterministic testing (STORY-009 prefix: 00000009)
  const setIdUserA = '00000009-0000-0000-0000-000000000001'
  const setIdUserB = '00000009-0000-0000-0000-000000000002'
  const setImageId1 = '00000009-0000-0000-0000-000000000011'
  const setImageId2 = '00000009-0000-0000-0000-000000000012'
  const wishlistIdUserA = '00000009-0000-0000-0000-000000000021'
  const wishlistIdUserB = '00000009-0000-0000-0000-000000000022'
  const galleryAlbumIdUserA = '00000009-0000-0000-0000-000000000031'

  // 1. Create Set for User A (with images for position testing)
  await db.execute(sql`
    INSERT INTO sets (
      id, user_id, title, set_number, store, piece_count, theme, tags, is_built, quantity,
      created_at, updated_at
    ) VALUES (
      ${setIdUserA},
      ${userAId},
      'STORY-009 Test Set (User A)',
      '99901',
      'LEGO',
      500,
      'Test Theme',
      '{test,story-009}'::text[],
      false,
      1,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING
  `)

  // 2. Create Set for User B (permission testing)
  await db.execute(sql`
    INSERT INTO sets (
      id, user_id, title, set_number, store, piece_count, theme, tags, is_built, quantity,
      created_at, updated_at
    ) VALUES (
      ${setIdUserB},
      ${userBId},
      'STORY-009 Test Set (User B)',
      '99902',
      'LEGO',
      300,
      'Test Theme',
      '{test,story-009}'::text[],
      false,
      1,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING
  `)

  // 3. Create Set Images for User A's set (position testing)
  const imageUrl1 = `https://example-bucket.s3.us-east-1.amazonaws.com/sets/${setIdUserA}/image1.webp`
  const imageUrl2 = `https://example-bucket.s3.us-east-1.amazonaws.com/sets/${setIdUserA}/image2.webp`

  await db.execute(sql`
    INSERT INTO set_images (
      id, set_id, image_url, thumbnail_url, position, created_at
    ) VALUES (
      ${setImageId1},
      ${setIdUserA},
      ${imageUrl1},
      NULL,
      0,
      NOW()
    )
    ON CONFLICT (id) DO NOTHING
  `)

  await db.execute(sql`
    INSERT INTO set_images (
      id, set_id, image_url, thumbnail_url, position, created_at
    ) VALUES (
      ${setImageId2},
      ${setIdUserA},
      ${imageUrl2},
      NULL,
      1,
      NOW()
    )
    ON CONFLICT (id) DO NOTHING
  `)

  // 4. Create Wishlist item for User A (upload testing)
  await db.execute(sql`
    INSERT INTO wishlist_items (
      id, user_id, title, store, price, currency, tags, priority, sort_order,
      created_at, updated_at
    ) VALUES (
      ${wishlistIdUserA},
      ${userAId},
      'STORY-009 Test Wishlist Item (User A)',
      'LEGO',
      '99.99',
      'USD',
      ${JSON.stringify(['test', 'story-009'])}::jsonb,
      3,
      0,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING
  `)

  // 5. Create Wishlist item for User B (permission testing)
  await db.execute(sql`
    INSERT INTO wishlist_items (
      id, user_id, title, store, price, currency, tags, priority, sort_order,
      created_at, updated_at
    ) VALUES (
      ${wishlistIdUserB},
      ${userBId},
      'STORY-009 Test Wishlist Item (User B)',
      'LEGO',
      '149.99',
      'USD',
      ${JSON.stringify(['test', 'story-009'])}::jsonb,
      2,
      0,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING
  `)

  // 6. Create Gallery album for User A (upload testing)
  await db.execute(sql`
    INSERT INTO gallery_albums (
      id, user_id, title, description, created_at, last_updated_at
    ) VALUES (
      ${galleryAlbumIdUserA},
      ${userAId},
      'STORY-009 Test Album (User A)',
      'Album for testing gallery image uploads',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING
  `)

  console.log('  ✓ Seeded STORY-009 test data:')
  console.log(`    - Set (User A): ${setIdUserA}`)
  console.log(`    - Set (User B): ${setIdUserB}`)
  console.log(`    - Set Images: ${setImageId1}, ${setImageId2}`)
  console.log(`    - Wishlist (User A): ${wishlistIdUserA}`)
  console.log(`    - Wishlist (User B): ${wishlistIdUserB}`)
  console.log(`    - Gallery Album (User A): ${galleryAlbumIdUserA}`)
}
