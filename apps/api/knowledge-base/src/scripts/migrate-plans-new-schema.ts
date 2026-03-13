/**
 * Plans Migration Script - New Schema
 *
 * Migrates PLAN.exec.md files to workflow.plans and workflow.plan_details tables.
 *
 * Usage:
 *   pnpm tsx src/scripts/migrate-plans-new-schema.ts --dry-run
 *   pnpm tsx src/scripts/migrate-plans-new-schema.ts
 *   pnpm tsx src/scripts/migrate-plans-new-schema.ts --plans-dir /path/to/plans
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { Pool } from 'pg'
import { config } from 'dotenv'

config({ path: path.resolve(process.cwd(), '.env') })

// ============================================================================
// Types
// ============================================================================

interface ParsedPlan {
  planSlug: string
  title: string
  summary: string | null
  planType: string | null
  featureDir: string | null
  storyPrefix: string | null
  estimatedStories: number | null
  status: string
  priority: string | null
  tags: string[]
  rawContent: string
  sourceFile: string
  mentionedStoryIds: string[]
  phases: { number: number; name: string }[]
}

interface MigrationStats {
  imported: number
  updated: number
  skipped: number
  linksCreated: number
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

const PLAN_TYPE_KEYWORDS: Record<string, string[]> = {
  feature: ['new feature', 'product feature', 'user-facing', 'ui component'],
  refactor: ['refactor', 'restructur', 'clean up', 'rename', 'consolidat'],
  migration: ['migrat', 'import', 'move to', 'port to', 'convert'],
  infra: ['infrastructure', 'deployment', 'docker', 'aws', 'lambda'],
  tooling: ['tooling', 'developer experience', 'dx', 'cli', 'script'],
  workflow: ['workflow', 'agent', 'orchestrat', 'pipeline', 'scrum'],
}

function inferPlanType(content: string): string | null {
  const lower = content.toLowerCase()
  for (const [type, keywords] of Object.entries(PLAN_TYPE_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return type
  }
  return null
}

function inferTags(content: string): string[] {
  const lower = content.toLowerCase()
  const tags: string[] = []
  if (lower.includes('database') || lower.includes('schema')) tags.push('database')
  if (lower.includes('react') || lower.includes('ui')) tags.push('frontend')
  if (lower.includes('lambda') || lower.includes('api')) tags.push('backend')
  return tags
}

function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : 'Untitled Plan'
}

function extractSummary(content: string): string | null {
  const lines = content.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#') && trimmed.length > 20) {
      return trimmed.substring(0, 500)
    }
  }
  return null
}

function extractStoryPrefix(content: string): string | null {
  const match = content.match(/Story Prefix[:\s]+(\w+)/i)
  return match ? match[1] : null
}

function extractEstimatedStories(content: string): number | null {
  const match = content.match(/(\d+)\s*stories?/i)
  return match ? parseInt(match[1], 10) : null
}

function extractStoryIds(content: string): string[] {
  const matches = content.matchAll(/\b([A-Z]{2,6}-\d{4,5})\b/g)
  const storyIds = new Set<string>()
  for (const match of matches) {
    storyIds.add(match[1])
  }
  return Array.from(storyIds)
}

function extractPhases(content: string): { number: number; name: string }[] {
  const phases: { number: number; name: string }[] = []
  const matches = content.matchAll(/##\s+Phase\s+(\d+)[:\-]?\s*(.+)/gi)
  for (const match of matches) {
    phases.push({ number: parseInt(match[1], 10), name: match[2].trim() })
  }
  return phases
}

function extractFeatureDir(sourceFile: string): string | null {
  const parts = sourceFile.split('/')
  const idx = parts.indexOf('plans')
  if (idx >= 0 && parts[idx + 1]) {
    return `plans/${parts[idx + 1]}`
  }
  return null
}

function extractStatus(sourceFile: string): string {
  if (sourceFile.includes('/_complete/') || sourceFile.includes('/completed/')) {
    return 'implemented'
  }
  if (sourceFile.includes('/in-progress/') || sourceFile.includes('/UAT/')) {
    return 'in-progress'
  }
  if (sourceFile.includes('/ready-for-qa/')) return 'ready-for-qa'
  if (sourceFile.includes('/ready-to-work/')) return 'ready'
  if (sourceFile.includes('/backlog/')) return 'backlog'
  return 'draft'
}

async function parsePlanFile(filePath: string): Promise<ParsedPlan | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const basename = path.basename(path.dirname(filePath))
    const planSlug = basename.toLowerCase().replace(/\s+/g, '-')

    return {
      planSlug,
      title: extractTitle(content),
      summary: extractSummary(content),
      planType: inferPlanType(content),
      featureDir: extractFeatureDir(filePath),
      storyPrefix: extractStoryPrefix(content),
      estimatedStories: extractEstimatedStories(content),
      status: extractStatus(filePath),
      priority: null,
      tags: inferTags(content),
      rawContent: content,
      sourceFile: filePath,
      mentionedStoryIds: extractStoryIds(content),
      phases: extractPhases(content),
    }
  } catch (error) {
    console.error(`Error parsing plan file ${filePath}:`, error)
    return null
  }
}

// ============================================================================
// Migration
// ============================================================================

async function migratePlan(
  db: Pool,
  plan: ParsedPlan,
  dryRun: boolean,
): Promise<{ imported: boolean; updated: boolean; error?: string }> {
  try {
    // Check if plan exists
    const existing = await db.query('SELECT id FROM workflow.plans WHERE plan_slug = $1', [
      plan.planSlug,
    ])

    const now = new Date()

    if (existing.rows.length > 0) {
      // Update existing
      if (!dryRun) {
        await db.query(
          `UPDATE workflow.plans SET
            title = $1,
            summary = $2,
            plan_type = $3,
            status = $4,
            priority = $5,
            tags = $6,
            feature_dir = $7,
            story_prefix = $8,
            estimated_stories = $9,
            updated_at = $10
          WHERE plan_slug = $11`,
          [
            plan.title,
            plan.summary,
            plan.planType,
            plan.status,
            plan.priority,
            plan.tags,
            plan.featureDir,
            plan.storyPrefix,
            plan.estimatedStories,
            now,
            plan.planSlug,
          ],
        )
      }
      return { imported: false, updated: true }
    } else {
      // Insert new
      if (!dryRun) {
        await db.query(
          `INSERT INTO workflow.plans (
            plan_slug, title, summary, plan_type, status, priority, tags,
            feature_dir, story_prefix, estimated_stories, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            plan.planSlug,
            plan.title,
            plan.summary,
            plan.planType,
            plan.status,
            plan.priority,
            plan.tags,
            plan.featureDir,
            plan.storyPrefix,
            plan.estimatedStories,
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

async function migratePlanDetails(
  db: Pool,
  plan: ParsedPlan,
  dryRun: boolean,
): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await db.query(
      'SELECT id FROM workflow.plan_details WHERE plan_id = (SELECT id FROM workflow.plans WHERE plan_slug = $1)',
      [plan.planSlug],
    )

    const now = new Date()

    if (existing.rows.length > 0) {
      if (!dryRun) {
        await db.query(
          `UPDATE workflow.plan_details SET
            raw_content = $1,
            phases = $2,
            updated_at = $3
          WHERE plan_id = (SELECT id FROM workflow.plans WHERE plan_slug = $4)`,
          [plan.rawContent, JSON.stringify(plan.phases), now, plan.planSlug],
        )
      }
    } else {
      const planRow = await db.query('SELECT id FROM workflow.plans WHERE plan_slug = $1', [
        plan.planSlug,
      ])
      if (planRow.rows.length > 0) {
        if (!dryRun) {
          await db.query(
            `INSERT INTO workflow.plan_details (
              plan_id, raw_content, phases, source_file, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              planRow.rows[0].id,
              plan.rawContent,
              JSON.stringify(plan.phases),
              plan.sourceFile,
              now,
              now,
            ],
          )
        }
      }
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

async function migratePlanStoryLinks(
  db: Pool,
  plan: ParsedPlan,
  dryRun: boolean,
): Promise<{ created: number; error?: string }> {
  let created = 0
  for (const storyId of plan.mentionedStoryIds) {
    try {
      const existing = await db.query(
        'SELECT id FROM workflow.plan_story_links WHERE plan_slug = $1 AND story_id = $2',
        [plan.planSlug, storyId],
      )
      if (existing.rows.length === 0) {
        if (!dryRun) {
          await db.query(
            'INSERT INTO workflow.plan_story_links (plan_slug, story_id, link_type, created_at) VALUES ($1, $2, $3, $4)',
            [plan.planSlug, storyId, 'mentioned', new Date()],
          )
        }
        created++
      }
    } catch (error) {
      console.error(`Error creating link for ${storyId}:`, error)
    }
  }
  return { created }
}

// ============================================================================
// Main
// ============================================================================

async function findPlanFiles(plansDir: string): Promise<string[]> {
  const files: string[] = []

  async function searchDir(dir: string): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)

        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          // Check if this directory contains a PLAN.exec.md or PLAN.md file
          const planExecFile = path.join(fullPath, 'PLAN.exec.md')
          const planMdFile = path.join(fullPath, 'PLAN.md')

          try {
            await fs.access(planExecFile)
            files.push(planExecFile)
          } catch {
            try {
              await fs.access(planMdFile)
              files.push(planMdFile)
            } catch {
              // No plan file in this directory, continue searching recursively
              await searchDir(fullPath)
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error)
    }
  }

  await searchDir(plansDir)
  return files
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const verbose = args.includes('--verbose')

  let plansDir = path.resolve(process.cwd(), 'plans')
  const dirArg = args.find(a => a.startsWith('--plans-dir='))
  if (dirArg) {
    plansDir = dirArg.replace('--plans-dir=', '')
  }

  console.log(`Plans Migration Script`)
  console.log(`=====================`)
  console.log(`Plans directory: ${plansDir}`)
  console.log(`Dry run: ${dryRun}`)
  console.log()

  const db = createPool()

  try {
    // Test connection
    await db.query('SELECT 1')
    console.log('Database connection: OK')
    console.log()

    // Find plan files
    const planFiles = await findPlanFiles(plansDir)
    console.log(`Found ${planFiles.length} plan files`)
    if (verbose) {
      planFiles.forEach(f => console.log(`  - ${f}`))
    }
    console.log()

    // Migrate each plan
    const stats: MigrationStats = {
      imported: 0,
      updated: 0,
      skipped: 0,
      linksCreated: 0,
      errors: [],
    }

    for (const file of planFiles) {
      const plan = await parsePlanFile(file)
      if (!plan) {
        stats.skipped++
        continue
      }

      const result = await migratePlan(db, plan, dryRun)
      if (result.error) {
        stats.errors.push(`${plan.planSlug}: ${result.error}`)
      } else if (result.imported) {
        stats.imported++
      } else if (result.updated) {
        stats.updated++
      }

      // Migrate details
      await migratePlanDetails(db, plan, dryRun)

      // Migrate story links
      const linksResult = await migratePlanStoryLinks(db, plan, dryRun)
      stats.linksCreated += linksResult.created

      if (verbose || result.error) {
        console.log(
          `${result.imported ? 'IMPORTED' : result.updated ? 'UPDATED' : 'ERROR'}: ${plan.planSlug}`,
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
    console.log(`Links created: ${stats.linksCreated}`)
    if (stats.errors.length > 0) {
      console.log(`Errors: ${stats.errors.length}`)
      stats.errors.forEach(e => console.log(`  - ${e}`))
    }
  } finally {
    await db.end()
  }
}

main().catch(console.error)
