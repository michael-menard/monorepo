#!/usr/bin/env tsx
/**
 * Update story CDBN-3020 in Knowledge Base
 *
 * Performs three operations:
 * 1. Updates story status to "ready"/"planning"
 * 2. Reads current elaboration artifact
 * 3. Updates artifact with resolved verdict and gap-2 decision
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

// Load environment
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

    // Step 1: Update story status
    console.log('\nStep 1: Updating story CDBN-3020 to ready/planning...')
    const updateResult = await client.query(
      `
      UPDATE workflow.stories
      SET
        state = $1,
        phase = $2,
        updated_at = NOW()
      WHERE story_id = $3
      RETURNING id, story_id, state, phase, updated_at
      `,
      ['ready', 'planning', 'CDBN-3020'],
    )
    console.log('Story updated:', updateResult.rows[0])

    // Step 2: Read current elaboration artifact
    console.log('\nStep 2: Reading current elaboration artifact...')
    const readResult = await client.query(
      `
      SELECT id, story_id, artifact_type, phase, iteration, content, updated_at
      FROM workflow.story_artifacts
      WHERE story_id = $1 AND artifact_type = $2
      ORDER BY iteration DESC
      LIMIT 1
      `,
      ['CDBN-3020', 'elaboration'],
    )

    if (readResult.rows.length === 0) {
      console.log('No elaboration artifact found, creating one...')
      const createResult = await client.query(
        `
        INSERT INTO workflow.story_artifacts
          (story_id, artifact_type, phase, iteration, content, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING id, story_id, artifact_type, phase, iteration, content, updated_at
        `,
        [
          'CDBN-3020',
          'elaboration',
          'planning',
          0,
          JSON.stringify({
            verdict: 'PASS',
            gaps: [
              {
                id: 'gap-2',
                title: 'Dependency Conflict',
                description: 'Resolved by CDBN-2013 completion',
                decision: 'resolved: CDBN-2013 confirmed complete',
              },
            ],
          }),
        ],
      )
      console.log('Artifact created:', createResult.rows[0])
    } else {
      const artifact = readResult.rows[0]
      console.log('Current artifact:', artifact)

      // Step 3: Update artifact with resolved verdict
      console.log('\nStep 3: Updating artifact with resolved verdict...')
      const currentContent = artifact.content || {}
      const updatedContent = {
        ...currentContent,
        verdict: 'PASS',
        gaps: Array.isArray(currentContent.gaps)
          ? currentContent.gaps.map((gap: any) => {
              if (gap.id === 'gap-2') {
                return {
                  ...gap,
                  decision: 'resolved: CDBN-2013 confirmed complete',
                }
              }
              return gap
            })
          : currentContent.gaps || [],
      }

      const writeResult = await client.query(
        `
        UPDATE workflow.story_artifacts
        SET
          content = $1,
          updated_at = NOW()
        WHERE id = $2
        RETURNING id, story_id, artifact_type, phase, iteration, content, updated_at
        `,
        [JSON.stringify(updatedContent), artifact.id],
      )
      console.log('Artifact updated:', writeResult.rows[0])
    }

    console.log('\nFinal state:')
    console.log('- Story state: ready')
    console.log('- Story phase: planning')
    console.log('- Verdict: PASS (upgraded from CONDITIONAL PASS)')
    console.log('- Gap-2: resolved - CDBN-2013 confirmed complete')
    console.log('\nUpdate completed successfully!')
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
