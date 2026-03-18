/**
 * Stories Migration Script - New Schema
 *
 * Migrates story.yaml files to workflow.stories and workflow.story_details tables.
 *
 * Usage:
 *   pnpm tsx src/scripts/migrate-stories-new-schema.ts --dry-run
 *   pnpm tsx src/scripts/migrate-stories-new-schema.ts
 *   pnpm tsx src/scripts/migrate-stories-new-schema.ts --stories-dir /path/to/stories
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

interface ParsedStory {
  storyId: string
  title: string | null
  description: string | null
  state: string
  priority: string | null
  feature: string | null
  storyType: string | null
  storyDir: string | null
  blockedReason: string | null
  blockedByStory: string | null
  touchesBackend: boolean
  touchesFrontend: boolean
  touchesDatabase: boolean
  touchesInfra: boolean
  sourceFile: string
  dependsOn: string[]
}

interface MigrationStats {
  imported: number
  updated: number
  skipped: number
  duplicates: string[]
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

function extractFeature(filePath: string): string | null {
  const parts = filePath.split('/')
  const plansIdx = parts.indexOf('plans')
  if (plansIdx >= 0 && parts[plansIdx + 1]) {
    const feature = parts[plansIdx + 1]
    // Skip special directories
    if (feature === 'future' || feature === '_complete' || feature === 'stories') {
      return parts[plansIdx + 2] || null
    }
    return feature
  }
  return null
}

function extractState(filePath: string, yamlContent: Record<string, unknown>): string {
  // Check path first
  if (filePath.includes('/completed/') || filePath.includes('/_complete/')) return 'completed'
  if (filePath.includes('/in-progress/')) return 'in_progress'
  if (filePath.includes('/UAT/')) return 'in_qa'
  if (filePath.includes('/ready-for-qa/')) return 'ready_for_qa'
  if (filePath.includes('/ready-to-work/') || filePath.includes('/ready-for-code-review/')) {
    return 'ready'
  }
  if (filePath.includes('/backlog/')) return 'backlog'
  if (filePath.includes('/failed-qa/')) return 'failed_qa'
  if (filePath.includes('/failed-code-review/')) return 'failed_code_review'

  // Check YAML content
  if (yamlContent.state) return yamlContent.state as string
  if (yamlContent.status) return yamlContent.status as string

  return 'backlog'
}

function parseStoryYaml(content: string): Record<string, unknown> {
  try {
    return yaml.parse(content) || {}
  } catch {
    return {}
  }
}

async function parseStoryFile(filePath: string): Promise<ParsedStory | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const yamlContent = parseStoryYaml(content)
    const storyId = extractStoryId(filePath)

    if (!storyId) {
      return null
    }

    const state = extractState(filePath, yamlContent)

    // Extract dependencies
    const dependsOn: string[] = []
    const blockedBy = yamlContent.blocked_by
    if (Array.isArray(blockedBy)) {
      dependsOn.push(...blockedBy.filter((d): d is string => typeof d === 'string'))
    } else if (typeof blockedBy === 'string') {
      dependsOn.push(blockedBy)
    }

    const dependencies = yamlContent.dependencies
    if (Array.isArray(dependencies)) {
      for (const dep of dependencies) {
        if (typeof dep === 'string') {
          dependsOn.push(dep)
        } else if (dep && typeof dep === 'object' && 'story_id' in dep) {
          dependsOn.push(dep.story_id as string)
        }
      }
    }

    // Extract surfaces/touches
    const metadata = yamlContent.metadata as Record<string, unknown> | undefined
    const surfaces = metadata?.surfaces as Record<string, boolean> | undefined

    return {
      storyId,
      title: (yamlContent.title as string) || null,
      description: (yamlContent.description as string) || null,
      state,
      priority: (yamlContent.priority as string) || null,
      feature: extractFeature(filePath),
      storyType: (yamlContent.story_type as string) || 'feature',
      storyDir: path.dirname(filePath),
      blockedReason: (yamlContent.blocked_reason as string) || null,
      blockedByStory: (yamlContent.blocked_by_story as string) || null,
      touchesBackend: surfaces?.backend || (yamlContent.touches_backend as boolean) || false,
      touchesFrontend: surfaces?.frontend || (yamlContent.touches_frontend as boolean) || false,
      touchesDatabase: surfaces?.database || (yamlContent.touches_database as boolean) || false,
      touchesInfra: surfaces?.infra || (yamlContent.touches_infra as boolean) || false,
      sourceFile: filePath,
      dependsOn: [...new Set(dependsOn)], // Dedupe
    }
  } catch (error) {
    console.error(`Error parsing story file ${filePath}:`, error)
    return null
  }
}

// ============================================================================
// Migration
// ============================================================================

async function migrateStory(
  db: Pool,
  story: ParsedStory,
  dryRun: boolean,
): Promise<{ imported: boolean; updated: boolean; error?: string }> {
  try {
    const existing = await db.query('SELECT story_id FROM workflow.stories WHERE story_id = $1', [
      story.storyId,
    ])

    const now = new Date()

    if (existing.rows.length > 0) {
      if (!dryRun) {
        await db.query(
          `UPDATE workflow.stories SET
            title = COALESCE($1, title),
            description = COALESCE($2, description),
            state = $3,
            priority = COALESCE($4, priority),
            feature = COALESCE($5, feature),
            updated_at = $6
          WHERE story_id = $7`,
          [
            story.title,
            story.description,
            story.state,
            story.priority,
            story.feature,
            now,
            story.storyId,
          ],
        )
      }
      return { imported: false, updated: true }
    } else {
      if (!dryRun) {
        await db.query(
          `INSERT INTO workflow.stories (
            story_id, title, description, state, priority, feature, story_type,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            story.storyId,
            story.title,
            story.description,
            story.state,
            story.priority,
            story.feature,
            story.storyType,
            now,
            now,
          ],
        )
      }
      return { imported: true, updated: false }
    }
  } catch (error) {
    return { imported: false, updated: false, error: String(error) }
  }
}

async function migrateStoryDetails(
  db: Pool,
  story: ParsedStory,
  dryRun: boolean,
): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await db.query('SELECT id FROM workflow.story_details WHERE story_id = $1', [
      story.storyId,
    ])

    const now = new Date()

    if (existing.rows.length > 0) {
      if (!dryRun) {
        await db.query(
          `UPDATE workflow.story_details SET
            story_dir = $1,
            blocked_reason = $2,
            blocked_by_story = $3,
            touches_backend = $4,
            touches_frontend = $5,
            touches_database = $6,
            touches_infra = $7,
            updated_at = $8
          WHERE story_id = $9`,
          [
            story.storyDir,
            story.blockedReason,
            story.blockedByStory,
            story.touchesBackend,
            story.touchesFrontend,
            story.touchesDatabase,
            story.touchesInfra,
            now,
            story.storyId,
          ],
        )
      }
    } else {
      if (!dryRun) {
        await db.query(
          `INSERT INTO workflow.story_details (
            story_id, story_dir, blocked_reason, blocked_by_story,
            touches_backend, touches_frontend, touches_database, touches_infra,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            story.storyId,
            story.storyDir,
            story.blockedReason,
            story.blockedByStory,
            story.touchesBackend,
            story.touchesFrontend,
            story.touchesDatabase,
            story.touchesInfra,
            now,
            now,
          ],
        )
      }
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// ============================================================================
// Main
// ============================================================================

async function findStoryFiles(storiesDir: string): Promise<string[]> {
  const files: string[] = []
  const visited = new Set<string>()

  async function walk(dir: string, depth: number = 0) {
    if (visited.has(dir)) return
    visited.add(dir)

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
          // Skip certain directories
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

  console.log(`Stories Migration Script`)
  console.log(`=======================`)
  console.log(`Stories directory: ${storiesDir}`)
  console.log(`Dry run: ${dryRun}`)
  console.log()

  const db = createPool()

  try {
    await db.query('SELECT 1')
    console.log('Database connection: OK')
    console.log()

    const storyFiles = await findStoryFiles(storiesDir)
    console.log(`Found ${storyFiles.length} story files`)
    if (verbose) {
      storyFiles.forEach(f => console.log(`  - ${f}`))
    }
    console.log()

    const stats: MigrationStats = {
      imported: 0,
      updated: 0,
      skipped: 0,
      duplicates: [],
      errors: [],
    }

    // Track storyIds to detect duplicates
    const seenStoryIds = new Map<string, string>()

    // Collect all dependencies for later
    const allDependencies: { storyId: string; dependsOn: string }[] = []

    for (const file of storyFiles) {
      const story = await parseStoryFile(file)
      if (!story) {
        stats.skipped++
        continue
      }

      // Check for duplicate storyId
      if (seenStoryIds.has(story.storyId)) {
        const existingFile = seenStoryIds.get(story.storyId)!
        stats.duplicates.push(`${story.storyId}: ${existingFile} <--> ${file}`)
      } else {
        seenStoryIds.set(story.storyId, file)
      }

      const result = await migrateStory(db, story, dryRun)
      if (result.error) {
        stats.errors.push(`${story.storyId}: ${result.error}`)
      } else if (result.imported) {
        stats.imported++
      } else if (result.updated) {
        stats.updated++
      }

      await migrateStoryDetails(db, story, dryRun)

      // Collect dependencies
      for (const dep of story.dependsOn) {
        allDependencies.push({ storyId: story.storyId, dependsOn: dep })
      }

      if (verbose || result.error) {
        console.log(
          `${result.imported ? 'IMPORTED' : result.updated ? 'UPDATED' : 'ERROR'}: ${story.storyId}`,
        )
        if (result.error) console.log(`  Error: ${result.error}`)
      }
    }

    console.log()
    console.log(`Migration Summary`)
    console.log(`=================`)
    console.log(`Imported: ${stats.imported}`)
    console.log(`Updated: ${stats.updated}`)
    console.log(`Skipped: ${stats.skipped}`)
    console.log(`Dependencies found: ${allDependencies.length}`)

    if (stats.duplicates.length > 0) {
      console.log()
      console.log(`Duplicates Found: ${stats.duplicates.length}`)
      console.log(`(Same storyId in multiple locations - discuss which to keep)`)
      stats.duplicates.forEach(d => console.log(`  - ${d}`))
    }

    if (stats.errors.length > 0) {
      console.log()
      console.log(`Errors: ${stats.errors.length}`)
      stats.errors.forEach(e => console.log(`  - ${e}`))
    }

    if (allDependencies.length > 0 && !dryRun) {
      console.log()
      console.log(`Note: ${allDependencies.length} dependencies found.`)
      console.log(`Run migrate-dependencies-new-schema.ts to migrate them.`)
    }
  } finally {
    await db.end()
  }
}

main().catch(console.error)
