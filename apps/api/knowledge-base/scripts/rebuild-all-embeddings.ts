/**
 * Rebuild all embeddings using the configured provider (Ollama by default).
 *
 * Calls rebuildEmbeddings() directly, bypassing MCP role checks.
 * Used for model migrations (e.g., OpenAI → Ollama) and corruption recovery.
 *
 * Usage:
 *   cd apps/api/knowledge-base
 *   npx tsx scripts/rebuild-all-embeddings.ts [--dry-run] [--batch-size=100]
 */

import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '../src/db/schema.js'
import { createEmbeddingClient } from '../src/embedding-client/index.js'
import { rebuildEmbeddings } from '../src/mcp-server/rebuild-embeddings.js'

const isDryRun = process.argv.includes('--dry-run')
const batchSizeArg = process.argv.find(a => a.startsWith('--batch-size='))
const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1], 10) : 100

async function main() {
  const pool = new Pool({
    host: process.env.KB_DB_HOST ?? '127.0.0.1',
    port: parseInt(process.env.KB_DB_PORT ?? '5435', 10),
    user: process.env.KB_DB_USER ?? 'kbuser',
    password: process.env.KB_DB_PASSWORD ?? 'TestPassword123!',
    database: process.env.KB_DB_NAME ?? 'knowledgebase',
    max: 5,
  })

  const db = drizzle(pool, { schema })
  const embeddingClient = createEmbeddingClient()

  console.log(`Provider: ${process.env.EMBEDDING_PROVIDER ?? 'auto-detect'}`)
  console.log(`Model: ${process.env.EMBEDDING_MODEL ?? 'default'}`)
  console.log(`Batch size: ${batchSize}`)
  console.log(`Dry run: ${isDryRun}`)
  console.log()

  const result = await rebuildEmbeddings(
    { force: true, batch_size: batchSize, dry_run: isDryRun },
    { db, embeddingClient } as any,
  )

  console.log()
  console.log('=== Rebuild Summary ===')
  console.log(`Total entries:      ${result.total_entries}`)
  console.log(`Rebuilt:            ${result.rebuilt}`)
  console.log(`Skipped:            ${result.skipped}`)
  console.log(`Failed:             ${result.failed}`)
  console.log(`Duration:           ${(result.duration_ms / 1000).toFixed(1)}s`)
  console.log(`Rate:               ${result.entries_per_second}/s`)

  if (result.errors.length > 0) {
    console.log(`\nErrors:`)
    for (const err of result.errors.slice(0, 10)) {
      console.log(`  ${err.entry_id}: ${err.reason}`)
    }
    if (result.errors.length > 10) {
      console.log(`  ... and ${result.errors.length - 10} more`)
    }
  }

  await pool.end()
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
