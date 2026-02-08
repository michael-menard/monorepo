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
import { createHash } from 'crypto'
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
  // ========================================================================
  // Workflow Commands - Added 2026-02-06
  // ========================================================================
  {
    content: `
# Workflow Phases and Next Steps

The development workflow has these phases in order:

| Phase | Command | Purpose | Next Step |
|-------|---------|---------|-----------|
| 1 | \`/pm-bootstrap-workflow\` | Create epic artifacts (one-time) | \`/pm-generate-story-000-harness\` |
| 2 | \`/pm-story generate\` | Generate story specification | \`/elab-story\` |
| 3 | \`/elab-story\` | QA audit - approve or reject story | \`/dev-implement-story\` |
| 4 | \`/dev-implement-story\` | Build feature + code review + fix loop | \`/qa-verify-story\` |
| 5 | \`/qa-verify-story\` | Verify acceptance criteria met | \`/qa-gate\` |
| 6 | \`/qa-gate\` | Final ship decision | \`/wt-finish\` |
| 7 | \`/wt-finish\` | Merge and cleanup | Done |

**Quick reference for next steps:**
- After generating a story → run elaboration
- After elaboration PASS → run implementation
- After implementation → run QA verification
- After QA verification → run QA gate
- After QA gate PASS → merge and finish
    `.trim(),
    role: 'all',
    tags: ['workflow', 'next-step', 'phases', 'commands'],
  },
  {
    content: `
# Story Generation Commands

Use \`/pm-story\` to generate stories. Here are all available options:

## Basic Generation
\`\`\`bash
# Generate story from index (auto-finds next available)
/pm-story generate plans/future/wishlist

# Generate specific story
/pm-story generate plans/future/wishlist WISH-001
\`\`\`

## Pipeline Mode (Generate + Elaborate)
\`\`\`bash
# Generate and elaborate (interactive mode)
/pm-story generate plans/future/wishlist WISH-001 --elab

# Generate and elaborate (autonomous mode - no prompts)
/pm-story generate plans/future/wishlist WISH-001 --elab --autonomous
\`\`\`

## Other Actions
\`\`\`bash
# Ad-hoc story (emergent/one-off)
/pm-story generate --ad-hoc plans/future/wishlist

# Follow-up story from QA findings
/pm-story followup plans/future/wishlist WISH-001

# Split oversized story
/pm-story split plans/future/wishlist WISH-001

# Bug/defect story
/pm-story bug plans/future/wishlist BUG-001
\`\`\`

**Recommended for fastest workflow:**
\`/pm-story generate {path} {id} --elab --autonomous\`
This generates the story AND elaborates it automatically, setting status to ready-to-work.
    `.trim(),
    role: 'pm',
    tags: ['story', 'creation', 'pm-story', 'generate', 'commands'],
  },
  {
    content: `
# Story Elaboration Commands

Use \`/elab-story\` to audit and elaborate stories before implementation.

## Interactive Mode (default)
\`\`\`bash
# Elaborate with interactive discussion
/elab-story plans/future/wishlist WISH-001
\`\`\`
- Presents each finding to user
- User chooses: Add as AC, Follow-up story, Out-of-scope, or Skip
- Requires user input for decisions

## Autonomous Mode (recommended for speed)
\`\`\`bash
# Elaborate with auto-decisions
/elab-story plans/future/wishlist WISH-001 --autonomous
\`\`\`
- MVP-blocking gaps → Automatically added as new ACs
- Non-blocking items → Logged to Knowledge Base
- No user prompts required
- Story goes directly to ready-to-work

## What happens in elaboration:
1. **Phase 0**: Setup - validates story exists
2. **Phase 1**: Analysis - runs 8-point audit checklist
3. **Phase 1.5**: (autonomous only) Auto-decisions
4. **Phase 2**: Completion - writes report, updates status

## Verdicts:
- **PASS** → Story moves to ready-to-work
- **CONDITIONAL PASS** → Minor fixes, then ready-to-work
- **FAIL** → Needs PM revision
- **SPLIT REQUIRED** → Story too large, needs splitting
    `.trim(),
    role: 'pm',
    tags: ['elaboration', 'elab-story', 'autonomous', 'commands', 'qa'],
  },
  {
    content: `
# Fastest Path to Ready-to-Work

To get a story from nothing to ready-to-work in one command:

\`\`\`bash
/pm-story generate plans/future/wishlist WISH-001 --elab --autonomous
\`\`\`

This command:
1. Generates the story with all required sections
2. Runs elaboration analysis
3. Auto-resolves MVP-blocking gaps (adds as ACs)
4. Logs non-blocking items to Knowledge Base
5. Sets status to ready-to-work

**Next step after this command:**
\`\`\`bash
/dev-implement-story plans/future/wishlist WISH-001
\`\`\`

## Alternative: Two-step process
\`\`\`bash
# Step 1: Generate story
/pm-story generate plans/future/wishlist WISH-001

# Step 2: Elaborate (with or without autonomous)
/elab-story plans/future/wishlist WISH-001 --autonomous
\`\`\`
    `.trim(),
    role: 'all',
    tags: ['workflow', 'quick-start', 'pipeline', 'autonomous', 'ready-to-work'],
  },
  {
    content: `
# Implementation Commands

After a story is in ready-to-work status, implement it:

\`\`\`bash
# Standard implementation with integrated code review
/dev-implement-story plans/future/wishlist WISH-001

# With custom max review iterations
/dev-implement-story plans/future/wishlist WISH-001 --max-iterations=5

# Force continue after max iterations (proceed with warnings)
/dev-implement-story plans/future/wishlist WISH-001 --force-continue

# Autonomous mode (moderate autonomy)
/dev-implement-story plans/future/wishlist WISH-001 --autonomous=moderate
\`\`\`

## What happens:
1. **Setup**: Prepares implementation context
2. **Planning**: Creates implementation plan
3. **Implementation**: Backend and frontend coders work
4. **Review**: Integrated code review with fix loop
5. **Learnings**: Captures lessons to Knowledge Base

## Next step after implementation:
\`\`\`bash
/qa-verify-story plans/future/wishlist WISH-001
\`\`\`
    `.trim(),
    role: 'dev',
    tags: ['implementation', 'dev-implement-story', 'commands', 'development'],
  },
  {
    content: `
# QA Verification and Gate Commands

After implementation, verify and gate the story:

## QA Verification
\`\`\`bash
# Verify acceptance criteria are met
/qa-verify-story plans/future/wishlist WISH-001
\`\`\`

## QA Gate (Final Ship Decision)
\`\`\`bash
# Create quality gate decision
/qa-gate plans/future/wishlist WISH-001
\`\`\`

Gate verdicts:
- **PASS** → Ready to merge
- **CONCERNS** → Merge with advisory notes
- **WAIVED** → Merge with accepted risk
- **FAIL** → Back to development

## Merge and Cleanup
\`\`\`bash
# After QA gate PASS
/wt-finish
\`\`\`

This merges the feature branch and cleans up the worktree.
    `.trim(),
    role: 'qa',
    tags: ['qa', 'verification', 'gate', 'commands', 'qa-verify', 'qa-gate'],
  },
]

/**
 * Generate SHA-256 hash of content for cache deduplication
 */
function hashContent(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex')
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
