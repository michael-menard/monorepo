#!/usr/bin/env tsx
/**
 * Upsert plan: database-audit-schema-consolidation
 *
 * Uses raw SQL against the live DB since plan-operations.ts has import
 * errors (planDetails missing from schema) — the very drift this plan addresses.
 *
 * Usage:
 *   cd apps/api/knowledge-base
 *   npx tsx scripts/upsert-plan-database-audit-raw.ts
 */

import { readFileSync } from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import * as dotenv from 'dotenv'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const PLAN_SLUG = 'database-audit-schema-consolidation'
const TITLE = 'Database Audit & Schema Consolidation'
const SUMMARY =
  "Audit all three databases in the monorepo, verify migrations match what is actually in the DB, reconcile Drizzle schema files with reality, and fix all broken code that references columns/tables that don't exist."
const PLAN_TYPE = 'audit'
const STATUS = 'draft'
const PRIORITY = 'P2'
const TAGS = ['database', 'drizzle', 'schema', 'audit', 'migrations', 'kb', 'pipeline']
const SOURCE_FILE = '~/.claude/plans/database-audit-schema-consolidation.md'

const RAW_CONTENT = readFileSync(
  '/Users/michaelmenard/.claude/plans/database-audit-schema-consolidation.md',
  'utf-8',
)

const { Client } = pg

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  try {
    // Check slug uniqueness
    console.log(`Checking if slug "${PLAN_SLUG}" already exists...`)
    const existing = await client.query(
      `SELECT id, plan_slug, title, status, priority FROM workflow.plans WHERE plan_slug = $1`,
      [PLAN_SLUG],
    )

    if (existing.rows.length > 0) {
      const row = existing.rows[0]
      console.log(`Slug "${PLAN_SLUG}" exists — will UPDATE.`)
      console.log(`  Current title:  ${row.title}`)
      console.log(`  Current status: ${row.status}`)
      console.log(`  Current priority: ${row.priority}`)
    } else {
      console.log(`Slug "${PLAN_SLUG}" not found — will INSERT.`)
    }

    // Check what enum values are valid for status and priority
    const statusEnumCheck = await client.query(`
      SELECT e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname ILIKE '%status%' OR t.typname ILIKE '%plan_status%'
      ORDER BY e.enumsortorder
    `)
    const priorityEnumCheck = await client.query(`
      SELECT e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname ILIKE '%priority%'
      ORDER BY e.enumsortorder
    `)

    if (statusEnumCheck.rows.length > 0) {
      console.log(`\nStatus enum values: ${statusEnumCheck.rows.map(r => r.enumlabel).join(', ')}`)
    }
    if (priorityEnumCheck.rows.length > 0) {
      console.log(
        `Priority enum values: ${priorityEnumCheck.rows.map(r => r.enumlabel).join(', ')}`,
      )
    }

    // Upsert using ON CONFLICT on plan_slug
    console.log('\nUpserting plan...')
    const result = await client.query(
      `
      INSERT INTO workflow.plans (
        plan_slug,
        title,
        summary,
        plan_type,
        status,
        priority,
        tags,
        raw_content,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5::public.plan_status_enum, $6::public.priority_enum,
        $7::text[], $8, NOW(), NOW()
      )
      ON CONFLICT (plan_slug) DO UPDATE SET
        title       = EXCLUDED.title,
        summary     = EXCLUDED.summary,
        plan_type   = EXCLUDED.plan_type,
        status      = EXCLUDED.status,
        priority    = EXCLUDED.priority,
        tags        = EXCLUDED.tags,
        raw_content = EXCLUDED.raw_content,
        updated_at  = NOW()
      RETURNING id, plan_slug, title, status, priority, tags, created_at, updated_at
      `,
      [PLAN_SLUG, TITLE, SUMMARY, PLAN_TYPE, STATUS, PRIORITY, TAGS, RAW_CONTENT],
    )

    const row = result.rows[0]
    const wasCreated = new Date(row.created_at).getTime() >= Date.now() - 5000

    console.log('\nUpsert succeeded!')
    console.log(`  Action:   ${wasCreated ? 'CREATED' : 'UPDATED'}`)
    console.log(`  Plan ID:  ${row.id}`)
    console.log(`  Slug:     ${row.plan_slug}`)
    console.log(`  Title:    ${row.title}`)
    console.log(`  Status:   ${row.status}`)
    console.log(`  Priority: ${row.priority}`)
    console.log(`  Tags:     ${Array.isArray(row.tags) ? row.tags.join(', ') : row.tags}`)
    console.log(`  Source:   ${SOURCE_FILE}`)
  } catch (err) {
    console.error('\nUpsert failed:', err instanceof Error ? err.message : String(err))
    if (err instanceof Error && err.stack) {
      console.error(err.stack)
    }
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
