#!/usr/bin/env tsx
/**
 * AC-5 fix: Add CDBE-1020 and CDBE-1030 as explicit KB dependency declarations
 * for story CDBE-0020 (Cascade Integration Test Suite for Phase 1 Triggers).
 *
 * CDBE-0020 tests the trigger functions defined in CDBE-1020 and CDBE-1030,
 * so it must declare explicit dependencies on both so CI pipeline orders them correctly.
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const { Client } = pg

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  })

  try {
    console.log('Connecting to database...')
    await client.connect()

    // Verify all three stories exist before inserting dependencies
    const storiesResult = await client.query(
      `SELECT story_id FROM workflow.stories WHERE story_id = ANY($1)`,
      [['CDBE-0020', 'CDBE-1020', 'CDBE-1030']],
    )
    const found = storiesResult.rows.map((r: { story_id: string }) => r.story_id)
    const missing = ['CDBE-0020', 'CDBE-1020', 'CDBE-1030'].filter(id => !found.includes(id))
    if (missing.length > 0) {
      throw new Error(`Stories not found in KB: ${missing.join(', ')}`)
    }
    console.log('All three stories confirmed in KB:', found.join(', '))

    // Check current dependencies for CDBE-0020
    const existingResult = await client.query(
      `SELECT story_id, depends_on_id, dependency_type FROM workflow.story_dependencies WHERE story_id = $1`,
      ['CDBE-0020'],
    )
    console.log(
      '\nCurrent dependencies for CDBE-0020:',
      existingResult.rows.length > 0 ? existingResult.rows : 'none',
    )

    // Insert CDBE-0020 -> CDBE-1020 dependency (requires)
    const dep1020 = await client.query(
      `
      INSERT INTO workflow.story_dependencies (story_id, depends_on_id, dependency_type)
      VALUES ($1, $2, $3)
      ON CONFLICT DO NOTHING
      RETURNING id, story_id, depends_on_id, dependency_type
      `,
      ['CDBE-0020', 'CDBE-1020', 'requires'],
    )
    if (dep1020.rows.length > 0) {
      console.log('\nInserted dependency CDBE-0020 -> CDBE-1020:', dep1020.rows[0])
    } else {
      console.log('\nDependency CDBE-0020 -> CDBE-1020 already exists (no-op)')
    }

    // Insert CDBE-0020 -> CDBE-1030 dependency (requires)
    const dep1030 = await client.query(
      `
      INSERT INTO workflow.story_dependencies (story_id, depends_on_id, dependency_type)
      VALUES ($1, $2, $3)
      ON CONFLICT DO NOTHING
      RETURNING id, story_id, depends_on_id, dependency_type
      `,
      ['CDBE-0020', 'CDBE-1030', 'requires'],
    )
    if (dep1030.rows.length > 0) {
      console.log('Inserted dependency CDBE-0020 -> CDBE-1030:', dep1030.rows[0])
    } else {
      console.log('Dependency CDBE-0020 -> CDBE-1030 already exists (no-op)')
    }

    // Verify final state
    const finalResult = await client.query(
      `SELECT story_id, depends_on_id, dependency_type FROM workflow.story_dependencies WHERE story_id = $1 ORDER BY depends_on_id`,
      ['CDBE-0020'],
    )
    console.log('\nFinal dependencies for CDBE-0020:')
    finalResult.rows.forEach(
      (r: { story_id: string; depends_on_id: string; dependency_type: string }) => {
        console.log(`  ${r.story_id} -> ${r.depends_on_id} (${r.dependency_type})`)
      },
    )

    console.log(
      '\nAC-5 fix complete — CDBE-0020 now declares dependencies on CDBE-1020 and CDBE-1030.',
    )
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error))
    if (error instanceof Error) {
      console.error(error.stack)
    }
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
