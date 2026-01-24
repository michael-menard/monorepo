import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { sql } from 'drizzle-orm'

type DB = NodePgDatabase

/**
 * Seed data for the sets table
 *
 * Creates deterministic sets data with fixed UUIDs for testing.
 * Idempotent via ON CONFLICT DO NOTHING - only inserts if record doesn't exist.
 */
export async function seedSets(db: DB) {
  console.log('  Seeding sets...')

  // Use the same user ID as AUTH_BYPASS dev user
  const devUserId = 'dev-user-00000000-0000-0000-0000-000000000001'

  // Fixed UUIDs for deterministic seeding
  const sampleSets = [
    {
      id: 'cccccccc-cccc-cccc-cccc-cccccccc0001',
      userId: devUserId,
      title: 'Millennium Falcon',
      setNumber: '75192',
      store: 'LEGO',
      pieceCount: 7541,
      theme: 'Star Wars',
      tags: ['UCS', 'Star Wars', 'Display'],
      isBuilt: true,
      quantity: 1,
    },
    {
      id: 'cccccccc-cccc-cccc-cccc-cccccccc0002',
      userId: devUserId,
      title: 'Hogwarts Castle',
      setNumber: '71043',
      store: 'LEGO',
      pieceCount: 6020,
      theme: 'Harry Potter',
      tags: ['Harry Potter', 'Castle', 'Display'],
      isBuilt: false,
      quantity: 1,
    },
    {
      id: 'cccccccc-cccc-cccc-cccc-cccccccc0003',
      userId: devUserId,
      title: 'Colosseum',
      setNumber: '10276',
      store: 'LEGO',
      pieceCount: 9036,
      theme: 'Creator Expert',
      tags: ['Architecture', 'Display', 'Landmarks'],
      isBuilt: false,
      quantity: 1,
    },
  ]

  for (const set of sampleSets) {
    await db.execute(sql`
      INSERT INTO sets (
        id, user_id, title, set_number, store, piece_count, theme, tags, is_built, quantity,
        created_at, updated_at
      ) VALUES (
        ${set.id},
        ${set.userId},
        ${set.title},
        ${set.setNumber},
        ${set.store},
        ${set.pieceCount},
        ${set.theme},
        ${JSON.stringify(set.tags)}::jsonb,
        ${set.isBuilt},
        ${set.quantity},
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO NOTHING
    `)
  }

  console.log(`  ✓ Seeded ${sampleSets.length} sets (skipped existing)`)
}
