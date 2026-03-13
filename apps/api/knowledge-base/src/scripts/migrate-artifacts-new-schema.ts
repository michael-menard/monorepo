/**
 * Artifacts Migration Script - New Schema
 *
 * Migrates _implementation/ YAML files to artifacts.* tables.
 * Maps each artifact type to the appropriate table.
 *
 * Usage:
 *   pnpm tsx src/scripts/migrate-artifacts-new-schema.ts --dry-run
 *   pnpm tsx src/scripts/migrate-artifacts-new-schema.ts
 *   pnpm tsx src/scripts/migrate-artifacts-new-schema.ts --stories-dir /path/to/plans
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

type ArtifactTable =
  | 'artifact_checkpoints'
  | 'artifact_scopes'
  | 'artifact_plans'
  | 'artifact_evidence'
  | 'artifact_reviews'
  | 'artifact_verifications'
  | 'artifact_elaborations'
  | 'artifact_fix_summaries'
  | 'artifact_analyses'
  | 'artifact_contexts'
  | 'artifact_completion_reports'
  | 'artifact_proofs'
  | 'artifact_qa_gates'
  | 'artifact_test_plans'
  | 'artifact_dev_feasibility'
  | 'artifact_uiux_notes'
  | 'artifact_story_seeds'

interface ArtifactCandidate {
  storyId: string
  artifactTable: ArtifactTable
  artifactType: string
  artifactName: string | null
  phase: string | null
  iteration: number
  data: Record<string, unknown>
  sourceFile: string
}

interface MigrationStats {
  imported: number
  updated: number
  skipped: number
  storiesNotFound: number
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
// Artifact Type Mapping
// ============================================================================

const ARTIFACT_TYPE_MAP: Record<string, { table: ArtifactTable; type: string }> = {
  'CHECKPOINT.yaml': { table: 'artifact_checkpoints', type: 'checkpoint' },
  'SCOPE.yaml': { table: 'artifact_scopes', type: 'scope' },
  'PLAN.yaml': { table: 'artifact_plans', type: 'plan' },
  'plan.yaml': { table: 'artifact_plans', type: 'plan' },
  'EVIDENCE.yaml': { table: 'artifact_evidence', type: 'evidence' },
  'REVIEW.yaml': { table: 'artifact_reviews', type: 'review' },
  'QA-VERIFY.yaml': { table: 'artifact_verifications', type: 'verification' },
  'VERIFICATION.yaml': { table: 'artifact_verifications', type: 'verification' },
  'verification.yaml': { table: 'artifact_verifications', type: 'verification' },
  'DECISIONS.yaml': { table: 'artifact_elaborations', type: 'elaboration' },
  'ELAB.yaml': { table: 'artifact_elaborations', type: 'elaboration' },
  'FIX-CONTEXT.yaml': { table: 'artifact_fix_summaries', type: 'fix_summary' },
  'FIX-SUMMARY.yaml': { table: 'artifact_fix_summaries', type: 'fix_summary' },
  'ANALYSIS.yaml': { table: 'artifact_analyses', type: 'analysis' },
  'KNOWLEDGE-CONTEXT.yaml': { table: 'artifact_contexts', type: 'context' },
  'COMPLETION-REPORT.yaml': { table: 'artifact_completion_reports', type: 'completion_report' },
  'PROOF.yaml': { table: 'artifact_proofs', type: 'proof' },
  'QA-GATE.yaml': { table: 'artifact_qa_gates', type: 'qa_gate' },
  'GATE-DECISION.yaml': { table: 'artifact_qa_gates', type: 'qa_gate' },
  'test-plan.yaml': { table: 'artifact_test_plans', type: 'test_plan' },
  'test-plan.md': { table: 'artifact_test_plans', type: 'test_plan' },
  'dev-feasibility.yaml': { table: 'artifact_dev_feasibility', type: 'dev_feasibility' },
  'uiux-notes.yaml': { table: 'artifact_uiux_notes', type: 'uiux_notes' },
  'STORY-SEED.yaml': { table: 'artifact_story_seeds', type: 'story_seed' },
  'STORY-SEED.md': { table: 'artifact_story_seeds', type: 'story_seed' },
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

function extractIteration(content: string): number {
  const parsed = yaml.parse(content) || {}
  return typeof parsed.iteration === 'number' ? parsed.iteration : 0
}

function extractPhase(content: string): string | null {
  const parsed = yaml.parse(content) || {}
  return parsed.current_phase || parsed.phase || null
}

async function parseArtifactFile(filePath: string): Promise<ArtifactCandidate | null> {
  const storyId = extractStoryId(filePath)
  if (!storyId) return null

  const filename = path.basename(filePath)
  const mapping = ARTIFACT_TYPE_MAP[filename]
  if (!mapping) return null

  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const parsed = yaml.parse(content) || {}

    return {
      storyId,
      artifactTable: mapping.table,
      artifactType: mapping.type,
      artifactName: filename.replace(/\.(yaml|md)$/, ''),
      phase: extractPhase(content),
      iteration: extractIteration(content),
      data: parsed,
      sourceFile: filePath,
    }
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error)
    return null
  }
}

// ============================================================================
// Migration
// ============================================================================

async function migrateArtifact(
  db: Pool,
  artifact: ArtifactCandidate,
  dryRun: boolean,
): Promise<{ imported: boolean; updated: boolean; error?: string }> {
  try {
    // Check if story exists
    const storyExists = await db.query(
      'SELECT story_id FROM workflow.stories WHERE story_id = $1',
      [artifact.storyId],
    )

    if (storyExists.rows.length === 0) {
      return { imported: false, updated: false, error: 'Story not found' }
    }

    // Check if artifact already exists (by type + story)
    const existing = await db.query(
      `SELECT id FROM artifacts.${artifact.artifactTable} 
       WHERE target_id = $1 AND scope = 'story'`,
      [artifact.storyId],
    )

    const now = new Date()
    const dataJson = JSON.stringify(artifact.data)

    if (existing.rows.length > 0) {
      if (!dryRun) {
        await db.query(
          `UPDATE artifacts.${artifact.artifactTable} SET
            data = $1,
            updated_at = $2
          WHERE target_id = $3 AND scope = 'story'`,
          [dataJson, now, artifact.storyId],
        )
      }
      return { imported: false, updated: true }
    } else {
      if (!dryRun) {
        // Insert based on table structure
        if (artifact.artifactTable === 'artifact_checkpoints') {
          await db.query(
            `INSERT INTO artifacts.${artifact.artifactTable} (
              scope, target_id, phase_status, resume_from, data, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              'story',
              artifact.storyId,
              JSON.stringify({ phase: artifact.phase }),
              artifact.iteration,
              dataJson,
              now,
              now,
            ],
          )
        } else if (artifact.artifactTable === 'artifact_completion_reports') {
          await db.query(
            `INSERT INTO artifacts.${artifact.artifactTable} (
              target_id, status, iterations_used, data, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              artifact.storyId,
              artifact.data.status || 'unknown',
              artifact.iteration,
              dataJson,
              now,
              now,
            ],
          )
        } else if (artifact.artifactTable === 'artifact_qa_gates') {
          await db.query(
            `INSERT INTO artifacts.${artifact.artifactTable} (
              target_id, status, verdict, data, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              artifact.storyId,
              artifact.data.status || 'unknown',
              artifact.data.verdict || null,
              dataJson,
              now,
              now,
            ],
          )
        } else if (artifact.artifactTable === 'artifact_verifications') {
          await db.query(
            `INSERT INTO artifacts.${artifact.artifactTable} (
              target_id, status, verdict, data, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              artifact.storyId,
              artifact.data.status || 'unknown',
              artifact.data.verdict || null,
              dataJson,
              now,
              now,
            ],
          )
        } else {
          // Generic insert for most tables
          await db.query(
            `INSERT INTO artifacts.${artifact.artifactTable} (
              target_id, scope, data, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5)`,
            [artifact.storyId, 'story', dataJson, now, now],
          )
        }
      }
      return { imported: true, updated: false }
    }
  } catch (error) {
    return { imported: false, updated: false, error: String(error) }
  }
}

// ============================================================================
// Main
// ============================================================================

async function findArtifactFiles(storiesDir: string): Promise<string[]> {
  const files: string[] = []
  const visited = new Set<string>()

  async function walk(dir: string, depth: number = 0) {
    if (depth > 8 || visited.has(dir)) return
    visited.add(dir)

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules') {
            continue
          }
          // Look in _implementation directories
          if (entry.name === '_implementation') {
            try {
              const implEntries = await fs.readdir(fullPath)
              for (const implFile of implEntries) {
                if (implFile.endsWith('.yaml') || implFile.endsWith('.md')) {
                  files.push(path.join(fullPath, implFile))
                }
              }
            } catch {
              // Ignore
            }
          } else {
            await walk(fullPath, depth + 1)
          }
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

  console.log(`Artifacts Migration Script`)
  console.log(`========================`)
  console.log(`Stories directory: ${storiesDir}`)
  console.log(`Dry run: ${dryRun}`)
  console.log()

  const db = createPool()

  try {
    await db.query('SELECT 1')
    console.log('Database connection: OK')
    console.log()

    // Find all artifact files
    const artifactFiles = await findArtifactFiles(storiesDir)
    console.log(`Found ${artifactFiles.length} artifact files`)

    // Parse artifacts
    const artifacts: ArtifactCandidate[] = []
    for (const file of artifactFiles) {
      const artifact = await parseArtifactFile(file)
      if (artifact) {
        artifacts.push(artifact)
      }
    }

    console.log(`Parsed ${artifacts.length} valid artifacts`)

    // Group by table for stats
    const byTable: Record<string, number> = {}
    for (const a of artifacts) {
      byTable[a.artifactTable] = (byTable[a.artifactTable] || 0) + 1
    }
    console.log('By table:')
    Object.entries(byTable).forEach(([table, count]) => {
      console.log(`  ${table}: ${count}`)
    })
    console.log()

    // Migrate each artifact
    const stats: MigrationStats = {
      imported: 0,
      updated: 0,
      skipped: 0,
      storiesNotFound: 0,
      errors: [],
    }

    for (const artifact of artifacts) {
      const result = await migrateArtifact(db, artifact, dryRun)

      if (result.error === 'Story not found') {
        stats.storiesNotFound++
      } else if (result.error) {
        stats.errors.push(`${artifact.storyId}/${artifact.artifactType}: ${result.error}`)
      } else if (result.imported) {
        stats.imported++
      } else if (result.updated) {
        stats.updated++
      } else {
        stats.skipped++
      }

      if (verbose) {
        console.log(
          `${result.imported ? 'IMPORTED' : result.updated ? 'UPDATED' : result.error ? 'ERROR' : 'SKIPPED'}: ${artifact.storyId}/${artifact.artifactType}`,
        )
      }
    }

    console.log()
    console.log(`Migration Summary`)
    console.log(`=================`)
    console.log(`Imported: ${stats.imported}`)
    console.log(`Updated: ${stats.updated}`)
    console.log(`Skipped: ${stats.skipped}`)
    console.log(`Stories not found: ${stats.storiesNotFound}`)
    if (stats.errors.length > 0) {
      console.log(`Errors: ${stats.errors.length}`)
      stats.errors.slice(0, 10).forEach(e => console.log(`  - ${e}`))
      if (stats.errors.length > 10) {
        console.log(`  ... and ${stats.errors.length - 10} more`)
      }
    }
  } finally {
    await db.end()
  }
}

main().catch(console.error)
