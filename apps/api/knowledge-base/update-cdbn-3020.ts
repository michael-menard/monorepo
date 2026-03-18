import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import {
  kb_update_story_status,
  kb_read_artifact,
  kb_write_artifact,
} from './src/crud-operations/index.js'

const { Client } = pg

async function main() {
  try {
    const dbUrl = process.env.DATABASE_URL || ''
    if (!dbUrl) {
      throw new Error('DATABASE_URL not set')
    }

    const client = new Client({ connectionString: dbUrl })
    await client.connect()
    const db = drizzle(client)

    console.log('Step 1: Updating story CDBN-3020 to ready/planning...')
    const updateResult = await kb_update_story_status(
      { db },
      { story_id: 'CDBN-3020', state: 'ready', phase: 'planning' },
    )
    console.log('Story status updated:', JSON.stringify(updateResult, null, 2))

    console.log('\nStep 2: Reading current elaboration artifact...')
    const readResult = await kb_read_artifact(
      { db },
      { story_id: 'CDBN-3020', artifact_type: 'elaboration' },
    )
    console.log('Current elaboration artifact:', JSON.stringify(readResult, null, 2))

    if (readResult?.content) {
      console.log('\nStep 3: Updating artifact with resolved verdict...')
      const updatedContent = {
        ...readResult.content,
        verdict: 'PASS',
        gaps: Array.isArray(readResult.content.gaps)
          ? readResult.content.gaps.map((gap: any) => {
              if (gap.id === 'gap-2') {
                return {
                  ...gap,
                  decision: 'resolved: CDBN-2013 confirmed complete',
                }
              }
              return gap
            })
          : readResult.content.gaps,
      }

      const writeResult = await kb_write_artifact(
        { db },
        {
          story_id: 'CDBN-3020',
          artifact_type: 'elaboration',
          phase: 'planning',
          content: updatedContent,
        },
      )
      console.log('Artifact updated:', JSON.stringify(writeResult, null, 2))
      console.log('\nFinal state:')
      console.log('- Verdict: PASS (upgraded from CONDITIONAL PASS)')
      console.log('- Gap-2: resolved - CDBN-2013 confirmed complete')
    }

    await client.end()
    console.log('\nUpdate completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error))
    if (error instanceof Error) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

main()
