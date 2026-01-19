import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { sets } from '../schema/sets'

type DB = NodePgDatabase

/**
 * Seed data for the sets table
 */
export async function seedSets(db: DB) {
  console.log('  Seeding sets...')

  // Use the same user ID as AUTH_BYPASS dev user
  const devUserId = 'dev-user-00000000-0000-0000-0000-000000000001'

  const sampleSets = [
    {
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

  await db.insert(sets).values(sampleSets).onConflictDoNothing()

  console.log(`  ✓ Inserted ${sampleSets.length} sets`)
}
