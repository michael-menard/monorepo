/**
 * Database ANALYZE Script
 *
 * Runs PostgreSQL ANALYZE on knowledge base tables to update query planner statistics.
 *
 * When to run:
 * - After bulk imports (KNOW-006)
 * - After significant data changes
 * - When query performance degrades
 *
 * Usage: pnpm db:analyze
 *
 * @see README.md for more information on query optimization
 */

import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { Pool } from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env from package root
config({ path: resolve(__dirname, '../../.env') })

// ANSI colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
}

function log(message: string, color: keyof typeof colors = 'reset'): void {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function main(): Promise<void> {
  log('\n========================================', 'cyan')
  log('  Knowledge Base Database ANALYZE', 'cyan')
  log('========================================\n', 'cyan')

  const password = process.env.KB_DB_PASSWORD

  if (!password) {
    log('\n[ERROR] KB_DB_PASSWORD environment variable is required', 'red')
    log('Set it in your .env file or environment. See .env.example for guidance.\n', 'yellow')
    process.exit(1)
  }

  const pool = new Pool({
    host: process.env.KB_DB_HOST || 'localhost',
    port: parseInt(process.env.KB_DB_PORT || '5433', 10),
    database: process.env.KB_DB_NAME || 'knowledgebase',
    user: process.env.KB_DB_USER || 'kbuser',
    password,
  })

  const client = await pool.connect()

  try {
    // Analyze knowledge_entries
    log('Analyzing knowledge_entries table...', 'cyan')
    await client.query('ANALYZE knowledge_entries')
    log('  [OK] knowledge_entries analyzed', 'green')

    // Analyze embedding_cache
    log('Analyzing embedding_cache table...', 'cyan')
    await client.query('ANALYZE embedding_cache')
    log('  [OK] embedding_cache analyzed', 'green')

    // Get table statistics
    log('\nTable Statistics:', 'cyan')

    const knowledgeStats = await client.query(`
      SELECT
        reltuples::bigint AS row_count,
        pg_size_pretty(pg_total_relation_size('knowledge_entries')) AS total_size,
        pg_size_pretty(pg_relation_size('knowledge_entries')) AS table_size,
        pg_size_pretty(pg_indexes_size('knowledge_entries')) AS index_size
      FROM pg_class
      WHERE relname = 'knowledge_entries'
    `)

    if (knowledgeStats.rows.length > 0) {
      const stats = knowledgeStats.rows[0]
      log(`\n  knowledge_entries:`, 'green')
      log(`    Rows:       ${stats.row_count}`)
      log(`    Total size: ${stats.total_size}`)
      log(`    Table size: ${stats.table_size}`)
      log(`    Index size: ${stats.index_size}`)
    }

    const cacheStats = await client.query(`
      SELECT
        reltuples::bigint AS row_count,
        pg_size_pretty(pg_total_relation_size('embedding_cache')) AS total_size
      FROM pg_class
      WHERE relname = 'embedding_cache'
    `)

    if (cacheStats.rows.length > 0) {
      const stats = cacheStats.rows[0]
      log(`\n  embedding_cache:`, 'green')
      log(`    Rows:       ${stats.row_count}`)
      log(`    Total size: ${stats.total_size}`)
    }

    // Check index usage
    log('\nIndex Statistics:', 'cyan')

    const indexStats = await client.query(`
      SELECT
        indexrelname AS index_name,
        idx_scan AS index_scans,
        idx_tup_read AS tuples_read,
        idx_tup_fetch AS tuples_fetched
      FROM pg_stat_user_indexes
      WHERE relname = 'knowledge_entries'
      ORDER BY indexrelname
    `)

    for (const idx of indexStats.rows) {
      log(`\n  ${idx.index_name}:`)
      log(`    Scans:   ${idx.index_scans}`)
      log(`    Reads:   ${idx.tuples_read}`)
      log(`    Fetches: ${idx.tuples_fetched}`)
    }

    log('\n========================================', 'green')
    log('  ANALYZE complete!', 'green')
    log('========================================\n', 'green')

    log('Tip: Run this after bulk imports to optimize query planning.', 'yellow')
    log('See README.md for more information on query optimization.\n', 'yellow')
  } catch (error) {
    log('\n[ERROR] ANALYZE failed', 'red')
    console.error(error)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

main()
