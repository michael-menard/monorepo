import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { sql } from 'drizzle-orm'

type DB = NodePgDatabase

/**
 * Seed data for moc_instructions, moc_parts_lists, and moc_parts tables
 *
 * Creates deterministic MOC parts list data with fixed UUIDs for testing.
 * Idempotent via ON CONFLICT DO NOTHING - only inserts if record doesn't exist.
 *
 * Test scenarios supported (STORY-010):
 * - Happy path CRUD tests (MOC 001 with parts list 001)
 * - GET all parts lists for MOC
 * - Update metadata and status tests
 * - CSV parse tests
 * - User summary aggregation tests
 * - 404 not found tests (non-existent MOC/parts list)
 */
export async function seedMocPartsLists(db: DB) {
  console.log('  Seeding MOC instructions and parts lists...')

  // Use the same user ID as AUTH_BYPASS dev user
  const devUserId = 'dev-user-00000000-0000-0000-0000-000000000001'
  const otherUserId = 'other-user-00000000-0000-0000-0000-000000000002'

  // Fixed UUIDs for deterministic seeding - MOC Instructions
  // 88888888-... = Test MOC for parts list operations (dev-user)
  // 88888888-...-002 = Second MOC for multi-MOC user summary test
  // 88888888-...-003 = Other user's MOC for 403/404 test
  const mocInstructions = [
    {
      id: '88888888-8888-8888-8888-888888888001',
      userId: devUserId,
      title: 'Medieval Castle MOC',
      description: 'A classic medieval castle build',
      type: 'moc',
    },
    {
      id: '88888888-8888-8888-8888-888888888002',
      userId: devUserId,
      title: 'Space Station MOC',
      description: 'Modular space station with docking bays',
      type: 'moc',
    },
    {
      id: '88888888-8888-8888-8888-888888888003',
      userId: otherUserId,
      title: 'Other User MOC',
      description: 'MOC belonging to another user',
      type: 'moc',
    },
  ]

  // Fixed UUIDs for deterministic seeding - Parts Lists
  // 99999999-...-001 = Main parts list for CRUD tests
  // 99999999-...-002 = Second parts list (built=true) for summary test
  // 99999999-...-003 = Parts list for second MOC
  const mocPartsLists = [
    {
      id: '99999999-9999-9999-9999-999999999001',
      mocId: '88888888-8888-8888-8888-888888888001',
      title: 'Castle Tower Parts',
      description: 'Parts for the main tower section',
      built: false,
      purchased: false,
      notes: 'Need to check BrickLink for prices',
      costEstimate: '125.00',
      actualCost: null,
      totalPartsCount: '75',
      acquiredPartsCount: '0',
    },
    {
      id: '99999999-9999-9999-9999-999999999002',
      mocId: '88888888-8888-8888-8888-888888888001',
      title: 'Castle Wall Parts',
      description: 'Parts for the outer walls',
      built: true,
      purchased: true,
      notes: 'Completed and built',
      costEstimate: '85.00',
      actualCost: '78.50',
      totalPartsCount: '120',
      acquiredPartsCount: '120',
    },
    {
      id: '99999999-9999-9999-9999-999999999003',
      mocId: '88888888-8888-8888-8888-888888888002',
      title: 'Space Station Core',
      description: 'Central hub module parts',
      built: false,
      purchased: true,
      notes: null,
      costEstimate: '200.00',
      actualCost: '195.00',
      totalPartsCount: '250',
      acquiredPartsCount: '50',
    },
  ]

  // Fixed UUIDs for deterministic seeding - Parts
  // Initial parts for the first parts list
  const mocParts = [
    {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001',
      partsListId: '99999999-9999-9999-9999-999999999001',
      partId: '3001',
      partName: 'Brick 2 x 4',
      quantity: 25,
      color: 'Dark Bluish Gray',
    },
    {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002',
      partsListId: '99999999-9999-9999-9999-999999999001',
      partId: '3002',
      partName: 'Brick 2 x 3',
      quantity: 15,
      color: 'Dark Bluish Gray',
    },
    {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa003',
      partsListId: '99999999-9999-9999-9999-999999999001',
      partId: '3005',
      partName: 'Brick 1 x 1',
      quantity: 35,
      color: 'Dark Tan',
    },
    {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa004',
      partsListId: '99999999-9999-9999-9999-999999999002',
      partId: '3010',
      partName: 'Brick 1 x 4',
      quantity: 60,
      color: 'Dark Bluish Gray',
    },
    {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa005',
      partsListId: '99999999-9999-9999-9999-999999999002',
      partId: '3009',
      partName: 'Brick 1 x 6',
      quantity: 60,
      color: 'Dark Bluish Gray',
    },
  ]

  // Insert MOC Instructions first
  for (const moc of mocInstructions) {
    await db.execute(sql`
      INSERT INTO moc_instructions (
        id, user_id, title, description, type,
        created_at, updated_at
      ) VALUES (
        ${moc.id},
        ${moc.userId},
        ${moc.title},
        ${moc.description},
        ${moc.type},
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO NOTHING
    `)
  }

  // Insert Parts Lists
  for (const partsList of mocPartsLists) {
    await db.execute(sql`
      INSERT INTO moc_parts_lists (
        id, moc_id, title, description, built, purchased,
        notes, cost_estimate, actual_cost, total_parts_count, acquired_parts_count,
        created_at, updated_at
      ) VALUES (
        ${partsList.id},
        ${partsList.mocId},
        ${partsList.title},
        ${partsList.description},
        ${partsList.built},
        ${partsList.purchased},
        ${partsList.notes},
        ${partsList.costEstimate},
        ${partsList.actualCost},
        ${partsList.totalPartsCount},
        ${partsList.acquiredPartsCount},
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO NOTHING
    `)
  }

  // Insert Parts
  for (const part of mocParts) {
    await db.execute(sql`
      INSERT INTO moc_parts (
        id, parts_list_id, part_id, part_name, quantity, color,
        created_at
      ) VALUES (
        ${part.id},
        ${part.partsListId},
        ${part.partId},
        ${part.partName},
        ${part.quantity},
        ${part.color},
        NOW()
      )
      ON CONFLICT (id) DO NOTHING
    `)
  }

  console.log(`  ✓ Seeded ${mocInstructions.length} MOC instructions (skipped existing)`)
  console.log(`  ✓ Seeded ${mocPartsLists.length} parts lists (skipped existing)`)
  console.log(`  ✓ Seeded ${mocParts.length} parts (skipped existing)`)
}
