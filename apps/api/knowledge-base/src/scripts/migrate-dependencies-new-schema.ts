/**
 * Story Dependencies Migration Script - New Schema
 *
 * Migrates story dependencies from filesystem to workflow.story_dependencies table.
 * This script scans story.yaml files for dependencies and creates the dependency records.
 *
 * Usage:
 *   pnpm tsx src/scripts/migrate-dependencies-new-schema.ts --dry-run
 *   pnpm tsx src/scripts/migrate-dependencies-new-schema.ts
 *   pnpm tsx src/scripts/migrate-dependencies-new-schema.ts --stories-dir /path/to/stories
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import * as yaml from 'yaml'
import { Pool } from 'pg'
import { config } from 'dotenv'

config({ path: path.resolve(process.cwd(), '.env') })

// ============================================================================
// Types
// ============================================================================

interface Dependency {
  storyId: string
  dependsOnId: string
  dependencyType: string
}

interface MigrationStats {
  created: number
  skipped: number
  errors: string[]
}

// ============================================================================
// Database
// ============================================================================

function createPool(): Pool {
  return new Pool({
    host: process.env.KB_DB_HOST || 'localhost',
    port: parseInt(process.env.KB_DB_PORT || '5433', 10),
    database: process.env.KB_DB_NAME || 'knowledgebase',
    user: process.env.KB_DB_USER || 'kbuser',
    password: process.env.KB_DB_PASSWORD,
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
  })
}

// ============================================================================
// Parsing
// ============================================================================

function extractStoryId(filePath: string): string | null {
  const parts = filePath.split('/')
  for (const part of parts) {
    if (/^[A-Z]{2,6}-\d{4,5}$/.test(part)) {
      return part
    }
  }
  return null
}

function parseDependencies(storyId: string, content: string): Dependency[] {
  const dependencies: Dependency[] = []
  const parsed = yaml.parse(content) || {}

  // Check blocked_by
  const blockedBy = parsed.blocked_by
  if (Array.isArray(blockedBy)) {
    for (const dep of blockedBy) {
      if (typeof dep === 'string' && dep.match(/^[A-Z]{2,6}-\d{4,5}$/)) {
        dependencies.push({ storyId, dependsOnId: dep, dependencyType: 'blocks' })
      }
    }
  } else if (typeof blockedBy === 'string' && blockedBy.match(/^[A-Z]{2,6}-\d{4,5}$/)) {
    dependencies.push({ storyId, dependsOnId: blockedBy, dependencyType: 'blocks' })
  }

  // Check dependencies array
  const deps = parsed.dependencies
  if (Array.isArray(deps)) {
    for (const dep of deps) {
      let depId: string | null = null
      let depType = 'requires'

      if (typeof dep === 'string') {
        if (dep.match(/^[A-Z]{2,6}-\d{4,5}$/)) {
          depId = dep
        }
      } else if (dep && typeof dep === 'object') {
        if ('story_id' in dep && typeof dep.story_id === 'string') {
          depId = dep.story_id
        }
        if ('type' in dep && typeof dep.type === 'string') {
          depType = dep.type
        } else if ('dependency_type' in dep && typeof dep.dependency_type === 'string') {
          depType = dep.dependency_type
        }
      }

      if (depId && depId.match(/^[A-Z]{2,6}-\d{4,5}$/)) {
        dependencies.push({ storyId, dependsOnId: depId, dependencyType: depType })
      }
    }
  }

  // Check related_to
  const relatedTo = parsed.related_to
  if (Array.isArray(relatedTo)) {
    for (const rel of relatedTo) {
      if (typeof rel === 'string' && rel.match(/^[A-Z]{2,6}-\d{4,5}$/)) {
        dependencies.push({ storyId, dependsOnId: rel, dependencyType: 'related_to' })
      }
    }
  }

  // Check blocks
  const blocks = parsed.blocks
  if (Array.isArray(blocks)) {
    for (const block of blocks) {
      if (typeof block === 'string' && block.match(/^[A-Z]{2,6}-\d{4,5}$/)) {
        dependencies.push({ storyId, dependsOnId: block, dependencyType: 'blocks' })
      }
    }
  }

  return dependencies
}

// ============================================================================
// Migration
// ============================================================================

async function migrateDependency(
  db: Pool,
  dependency: Dependency,
  dryRun: boolean,
): Promise<{ created: boolean; error?: string }> {
  try {
    // Check if dependency already exists
    const existing = await db.query(
      `SELECT id FROM workflow.story_dependencies 
       WHERE story_id = $1 AND depends_on_id = $2 AND dependency_type = $3`,
      [dependency.storyId, dependency.dependsOnId, dependency.dependencyType],
    )

    if (existing.rows.length > 0) {
      return { created: false }
    }

    // Verify both stories exist
    const storyExists = await db.query(
      'SELECT story_id FROM workflow.stories WHERE story_id = $1',
      [dependency.storyId],
    )
    const depExists = await db.query('SELECT story_id FROM workflow.stories WHERE story_id = $1', [
      dependency.dependsOnId,
    ])

    if (storyExists.rows.length === 0 || depExists.rows.length === 0) {
      return { created: false, error: 'Story not found' }
    }

    if (!dryRun) {
      await db.query(
        `INSERT INTO workflow.story_dependencies (
          story_id, depends_on_id, dependency_type, created_at
        ) VALUES ($1, $2, $3, $4)`,
        [dependency.storyId, dependency.dependsOnId, dependency.dependencyType, new Date()],
      )
    }

    return { created: true }
  } catch (error) {
    return { created: false, error: String(error) }
  }
}

// ============================================================================
// Main
// ============================================================================

async function findStoryFiles(storiesDir: string): Promise<string[]> {
  const files: string[] = []
  const visited = new Set<string>()

  async function walk(dir: string, depth: number = 0) {
    if (depth > 5 || visited.has(dir)) return
    visited.add(dir)

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
          if (
            entry.name.startsWith('.') ||
            entry.name === 'node_modules' ||
            entry.name === '_implementation'
          ) {
            continue
          }
          await walk(fullPath, depth + 1)
        } else if (entry.name === 'story.yaml') {
          files.push(fullPath)
        }
      }
    } catch {
      // Ignore permission errors
    }
  }

  await walk(storiesDir)
  return files
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const verbose = args.includes('--verbose')

  let storiesDir = path.resolve(process.cwd(), 'plans')
  const dirArg = args.find(a => a.startsWith('--stories-dir='))
  if (dirArg) {
    storiesDir = dirArg.replace('--stories-dir=', '')
  }

  console.log(`Story Dependencies Migration Script`)
  console.log(`====================================`)
  console.log(`Stories directory: ${storiesDir}`)
  console.log(`Dry run: ${dryRun}`)
  console.log()

  const db = createPool()

  try {
    await db.query('SELECT 1')
    console.log('Database connection: OK')
    console.log()

    // Find all story files
    const storyFiles = await findStoryFiles(storiesDir)
    console.log(`Found ${storyFiles.length} story files`)

    // Extract all dependencies
    const allDependencies: Dependency[] = []
    for (const file of storyFiles) {
      const storyId = extractStoryId(file)
      if (!storyId) continue

      try {
        const content = await fs.readFile(file, 'utf-8')
        const deps = parseDependencies(storyId, content)
        allDependencies.push(...deps)
      } catch (error) {
        console.error(`Error reading ${file}:`, error)
      }
    }

    console.log(`Found ${allDependencies.length} dependencies`)
    if (verbose) {
      allDependencies.forEach(d =>
        console.log(`  ${d.storyId} --[${d.dependencyType}]--> ${d.dependsOnId}`),
      )
    }
    console.log()

    // Migrate each dependency
    const stats: MigrationStats = {
      created: 0,
      skipped: 0,
      errors: [],
    }

    for (const dep of allDependencies) {
      const result = await migrateDependency(db, dep, dryRun)
      if (result.created) {
        stats.created++
      } else if (result.error) {
        stats.errors.push(`${dep.storyId} -> ${dep.dependsOnId}: ${result.error}`)
      } else {
        stats.skipped++
      }

      if (verbose) {
        console.log(
          `${result.created ? 'CREATED' : result.error ? 'ERROR' : 'SKIPPED'}: ${dep.storyId} --[${dep.dependencyType}]--> ${dep.dependsOnId}`,
        )
      }
    }

    console.log()
    console.log(`Migration Summary`)
    console.log(`=================`)
    console.log(`Created: ${stats.created}`)
    console.log(`Skipped (already exists or missing stories): ${stats.skipped}`)
    if (stats.errors.length > 0) {
      console.log(`Errors: ${stats.errors.length}`)
      stats.errors.forEach(e => console.log(`  - ${e}`))
    }
  } finally {
    await db.end()
  }
}

main().catch(console.error)
