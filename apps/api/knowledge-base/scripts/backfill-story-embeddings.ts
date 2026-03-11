/**
 * Backfill embeddings for all stories that don't have one yet.
 *
 * Usage:
 *   cd apps/api/knowledge-base
 *   npx tsx scripts/backfill-story-embeddings.ts [--dry-run] [--batch-size=50]
 *
 * Requires OPENAI_API_KEY in environment.
 */

import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { eq, isNull, sql } from 'drizzle-orm'
import * as schema from '../src/db/schema.js'
import { stories } from '../src/db/schema.js'
import { EmbeddingClient } from '../src/embedding-client/index.js'
import { buildStoryEmbeddingText } from '../src/search/story-similarity.js'

const isDryRun = process.argv.includes('--dry-run')
const batchSizeArg = process.argv.find(a => a.startsWith('--batch-size='))
const BATCH_SIZE = batchSizeArg ? parseInt(batchSizeArg.split('=')[1], 10) : 50

async function main() {
  const pool = new Pool({
    host: process.env.PGHOST ?? '127.0.0.1',
    port: parseInt(process.env.PGPORT ?? '5433', 10),
    user: process.env.PGUSER ?? 'kbuser',
    password: process.env.PGPASSWORD ?? 'TestPassword123!',
    database: process.env.PGDATABASE ?? 'knowledgebase',
    max: 5,
  })

  const db = drizzle(pool, { schema })

  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY environment variable is required')
    process.exit(1)
  }

  const embeddingClient = new EmbeddingClient({
    apiKey: process.env.OPENAI_API_KEY,
    cacheEnabled: false, // skip DB cache for backfill
  })

  // Find stories without embeddings
  const needsEmbedding = await db
    .select({
      storyId: stories.storyId,
      title: stories.title,
      feature: stories.feature,
      acceptanceCriteria: stories.acceptanceCriteria,
    })
    .from(stories)
    .where(isNull(stories.embedding))
    .orderBy(stories.createdAt)

  console.log(`Found ${needsEmbedding.length} stories without embeddings`)
  if (isDryRun) {
    console.log('DRY RUN — no changes will be made')
    await pool.end()
    return
  }

  let processed = 0
  let failed = 0
  const startTime = Date.now()

  for (let i = 0; i < needsEmbedding.length; i += BATCH_SIZE) {
    const batch = needsEmbedding.slice(i, i + BATCH_SIZE)

    // Generate embeddings for the batch
    const texts = batch.map(s =>
      buildStoryEmbeddingText(s.title, s.feature, s.acceptanceCriteria),
    )

    try {
      const embeddings = await embeddingClient.generateEmbeddingsBatch(texts)

      // Update each story with its embedding
      for (let j = 0; j < batch.length; j++) {
        const story = batch[j]
        const embedding = embeddings[j]

        if (embedding) {
          await db
            .update(stories)
            .set({ embedding })
            .where(eq(stories.storyId, story.storyId))
          processed++
        } else {
          failed++
          console.error(`  Failed to generate embedding for ${story.storyId}`)
        }
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      const rate = (processed / parseFloat(elapsed)).toFixed(1)
      console.log(
        `  Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${processed}/${needsEmbedding.length} done (${rate}/s, ${elapsed}s elapsed)`,
      )
    } catch (error) {
      console.error(`  Batch failed:`, error instanceof Error ? error.message : error)
      failed += batch.length
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\nDone: ${processed} embedded, ${failed} failed, ${totalTime}s total`)

  await pool.end()
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
