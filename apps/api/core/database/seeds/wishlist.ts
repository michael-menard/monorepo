import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { sql } from 'drizzle-orm'

type DB = NodePgDatabase

/**
 * Seed data for the wishlist_items table
 *
 * Creates deterministic wishlist items with fixed UUIDs for testing.
 * Idempotent via ON CONFLICT DO NOTHING - only inserts if record doesn't exist.
 */
export async function seedWishlist(db: DB) {
  console.log('  Seeding wishlist items...')

  // Use the same user ID as AUTH_BYPASS dev user
  const devUserId = 'dev-user-00000000-0000-0000-0000-000000000001'

  // Fixed UUIDs for deterministic seeding
  const wishlistItems = [
    {
      id: '11111111-1111-1111-1111-111111111001',
      userId: devUserId,
      title: 'Millennium Falcon',
      store: 'LEGO',
      setNumber: '75192',
      sourceUrl: 'https://www.lego.com/en-us/product/millennium-falcon-75192',
      imageUrl: null,
      price: '849.99',
      currency: 'USD',
      pieceCount: 7541,
      releaseDate: new Date('2017-10-01'),
      tags: ['Star Wars', 'UCS', 'Display'],
      priority: 5,
      notes: 'Ultimate dream set!',
      sortOrder: 0,
    },
    {
      id: '11111111-1111-1111-1111-111111111002',
      userId: devUserId,
      title: 'Hogwarts Castle',
      store: 'LEGO',
      setNumber: '71043',
      sourceUrl: 'https://www.lego.com/en-us/product/hogwarts-castle-71043',
      imageUrl: null,
      price: '469.99',
      currency: 'USD',
      pieceCount: 6020,
      releaseDate: new Date('2018-09-01'),
      tags: ['Harry Potter', 'Castle', 'Display'],
      priority: 4,
      notes: 'Wait for sale',
      sortOrder: 1,
    },
    {
      id: '11111111-1111-1111-1111-111111111003',
      userId: devUserId,
      title: 'Tower Bridge',
      store: 'Amazon',
      setNumber: '10214',
      sourceUrl: 'https://www.amazon.com/dp/B00F9Z29FI',
      imageUrl: null,
      price: '299.99',
      currency: 'USD',
      pieceCount: 4287,
      releaseDate: new Date('2010-10-01'),
      tags: ['Creator Expert', 'Architecture', 'London'],
      priority: 2,
      notes: null,
      sortOrder: 2,
    },
    {
      // Item owned by a different user - for 403 forbidden test
      id: '11111111-1111-1111-1111-111111111004',
      userId: 'other-user-00000000-0000-0000-0000-000000000002',
      title: 'Other User Item',
      store: 'LEGO',
      setNumber: '10305',
      sourceUrl: null,
      imageUrl: null,
      price: '349.99',
      currency: 'USD',
      pieceCount: 4514,
      releaseDate: null,
      tags: [],
      priority: 3,
      notes: 'This belongs to another user',
      sortOrder: 0,
    },
  ]

  // Use raw SQL for upsert to handle ON CONFLICT properly
  for (const item of wishlistItems) {
    await db.execute(sql`
      INSERT INTO wishlist_items (
        id, user_id, title, store, set_number, source_url, image_url,
        price, currency, piece_count, release_date, tags, priority, notes, sort_order,
        created_at, updated_at
      ) VALUES (
        ${item.id},
        ${item.userId},
        ${item.title},
        ${item.store},
        ${item.setNumber},
        ${item.sourceUrl},
        ${item.imageUrl},
        ${item.price},
        ${item.currency},
        ${item.pieceCount},
        ${item.releaseDate},
        ${JSON.stringify(item.tags)}::jsonb,
        ${item.priority},
        ${item.notes},
        ${item.sortOrder},
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO NOTHING
    `)
  }

  console.log(`  ✓ Seeded ${wishlistItems.length} wishlist items (skipped existing)`)
}
