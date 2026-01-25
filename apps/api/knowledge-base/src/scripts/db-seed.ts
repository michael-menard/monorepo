/**
 * Database Seed Script
 *
 * Populates the database with sample knowledge entries for development and testing.
 * Uses placeholder embeddings (zeros) - real embeddings will be generated in KNOW-002.
 *
 * This script is idempotent - running it multiple times will not create duplicates.
 *
 * Usage: pnpm db:seed
 *
 * @see README.md for usage instructions
 * @see KNOW-002 for embedding client that will generate real embeddings
 */

import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { eq } from 'drizzle-orm'
import { knowledgeEntries, embeddingCache } from '../db/schema.js'

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

/**
 * Generate a placeholder embedding (1536 zeros).
 *
 * In KNOW-002, this will be replaced with actual OpenAI embeddings.
 */
function placeholderEmbedding(): number[] {
  return new Array(1536).fill(0)
}

/**
 * Sample knowledge entries for seeding.
 *
 * These represent realistic knowledge that would be stored in the system.
 */
const SEED_DATA = [
  {
    content: `
# Story Workflow Overview

The development workflow follows these phases:
1. **Elaboration**: PM creates stories with acceptance criteria
2. **Planning**: Architect creates implementation plan
3. **Implementation**: Developers implement the story
4. **Verification**: QA verifies against acceptance criteria
5. **Completion**: Story is marked complete and merged

Each phase has specific entry and exit criteria documented in FEATURE-DEVELOPMENT-WORKFLOW.md.
    `.trim(),
    role: 'all',
    tags: ['workflow', 'process', 'overview'],
  },
  {
    content: `
# Creating a New Story

To create a new story:

1. Use the /pm-story command with the 'create' action
2. Provide a descriptive title and context
3. Define clear acceptance criteria
4. Specify dependencies (if any)
5. Assign priority (P0-P3)

Example:
\`\`\`
/pm-story create --title "Add user authentication" --priority P1
\`\`\`

Stories should be small enough to complete in 1-2 days.
    `.trim(),
    role: 'pm',
    tags: ['story', 'creation', 'pm-workflow'],
  },
  {
    content: `
# Implementing Backend Code

When implementing backend code:

1. **Follow existing patterns** - Check apps/api/ for similar implementations
2. **Use Drizzle ORM** - All database operations use Drizzle
3. **Validate with Zod** - All inputs must be validated with Zod schemas
4. **Write tests first** - Use Vitest for unit tests
5. **Handle errors** - Return meaningful error messages

Key files:
- Schema: apps/api/core/database/schema/
- Handlers: apps/api/core/functions/
- Types: packages/shared/*/

Always run \`pnpm check-types\` after changes.
    `.trim(),
    role: 'dev',
    tags: ['backend', 'implementation', 'best-practice'],
  },
  {
    content: `
# Testing Requirements

All code changes must include tests:

1. **Unit tests** - Test individual functions in isolation
2. **Integration tests** - Test database operations
3. **E2E tests** - Test user flows (for frontend changes)

Minimum coverage: 45% global

Test commands:
- \`pnpm test\` - Run all tests
- \`pnpm test:coverage\` - Run with coverage report
- \`pnpm test:watch\` - Watch mode for development

Use semantic queries in React tests: getByRole, getByLabelText.
    `.trim(),
    role: 'qa',
    tags: ['testing', 'coverage', 'quality'],
  },
  {
    content: `
# Using the Logger

Never use console.log in production code. Always use the logger:

\`\`\`typescript
import { logger } from '@repo/logger'

// Different log levels
logger.info('Operation completed', { userId, action })
logger.warn('Deprecated feature used', { feature })
logger.error('Operation failed', { error, context })
logger.debug('Debug info', { data })
\`\`\`

The logger is configured for:
- Structured JSON output in production
- Pretty printing in development
- Automatic context enrichment
    `.trim(),
    role: 'dev',
    tags: ['logging', 'best-practice', 'debugging'],
  },
]

/**
 * Generate SHA-256 hash of content for cache deduplication
 */
function hashContent(content: string): string {
  const crypto = require('crypto')
  return crypto.createHash('sha256').update(content, 'utf-8').digest('hex')
}

async function main(): Promise<void> {
  log('\n========================================', 'cyan')
  log('  Knowledge Base Database Seeding', 'cyan')
  log('========================================\n', 'cyan')

  const password = process.env.KB_DB_PASSWORD

  if (!password) {
    log('\n[ERROR] KB_DB_PASSWORD environment variable is required', 'red')
    log('Set it in your .env file or environment. See .env.example for guidance.\n', 'yellow')
    process.exit(1)
  }

  // Create database connection
  const pool = new Pool({
    host: process.env.KB_DB_HOST || 'localhost',
    port: parseInt(process.env.KB_DB_PORT || '5433', 10),
    database: process.env.KB_DB_NAME || 'knowledgebase',
    user: process.env.KB_DB_USER || 'kbuser',
    password,
  })

  const db = drizzle(pool)

  try {
    log('Seeding knowledge entries...\n')

    let insertedCount = 0
    let skippedCount = 0

    for (const entry of SEED_DATA) {
      // Check if entry with same content already exists (simple dedup)
      const existing = await db
        .select()
        .from(knowledgeEntries)
        .where(eq(knowledgeEntries.content, entry.content))
        .limit(1)

      if (existing.length > 0) {
        log(`  [SKIP] Entry exists: ${entry.tags.join(', ')}`, 'yellow')
        skippedCount++
        continue
      }

      // Insert new entry
      await db.insert(knowledgeEntries).values({
        content: entry.content,
        embedding: placeholderEmbedding(),
        role: entry.role,
        tags: entry.tags,
      })

      log(`  [ADD] ${entry.role}: ${entry.tags.join(', ')}`, 'green')
      insertedCount++

      // Also cache the embedding with model field
      const contentHash = hashContent(entry.content)
      await db
        .insert(embeddingCache)
        .values({
          contentHash,
          model: 'text-embedding-3-small', // Default model for KNOW-002
          embedding: placeholderEmbedding(),
        })
        .onConflictDoNothing()
    }

    log('')
    log('========================================', 'green')
    log(`  Seeding complete!`, 'green')
    log(`  Inserted: ${insertedCount}`, 'green')
    log(`  Skipped:  ${skippedCount}`, 'green')
    log('========================================\n', 'green')

    log('Note: Entries have placeholder embeddings (zeros).', 'yellow')
    log('Real embeddings will be generated when KNOW-002 is implemented.\n', 'yellow')
  } catch (error) {
    log('\n[ERROR] Seeding failed', 'red')
    console.error(error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
