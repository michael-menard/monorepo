/**
 * Integration tests for APIP-4030 Dependency Auditor
 *
 * These tests require:
 * - APIP-5001 test database (wint schema, port 5432)
 * - Real pnpm CLI available in PATH
 *
 * Tagged as .integration.test.ts to allow CI exclusion from unit-only runs.
 * Run with: pnpm test --filter @repo/orchestrator -- --reporter=verbose
 *
 * Story: APIP-4030 - Dependency Auditor
 * Covers: HP-7, HP-8, HP-9, ED-4
 */

import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { runPnpmAudit, PnpmAuditOutputSchema } from '../run-pnpm-audit.js'

// ── Helper to check if DB is available ───────────────────────────────────────

async function isDbAvailable(): Promise<boolean> {
  try {
    const { createPool } = await import('pg') as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pg = await import('pg') as any
    const pool = new pg.Pool({
      host: 'localhost',
      port: 5432,
      database: 'lego_dev',
      user: process.env['DB_USER'] ?? 'postgres',
      password: process.env['DB_PASSWORD'] ?? 'postgres',
      connectionTimeoutMillis: 2000,
    })
    await pool.query('SELECT 1')
    await pool.end()
    return true
  } catch {
    return false
  }
}

// ── Real pnpm audit integration test (ED-4) ──────────────────────────────────

describe('runPnpmAudit integration', () => {
  it('ED-4: real pnpm audit --json output parses via PnpmAuditOutputSchema', async () => {
    // Find workspace root by walking up from this file
    const { resolve, dirname } = await import('path')
    const { fileURLToPath } = await import('url')
    const thisDir = dirname(fileURLToPath(import.meta.url))
    // Walk up to find package.json at orchestrator root or monorepo root
    const workspaceRoot = resolve(thisDir, '../../../../../../../..')

    const findings = await runPnpmAudit(workspaceRoot)

    // Should not throw — output must parse
    // findings is an array (possibly empty if no vulns)
    expect(Array.isArray(findings)).toBe(true)

    // Validate schema parsing doesn't throw on real output
    // This is the core integration assertion: real pnpm output conforms to our schema
    if (findings.length > 0) {
      for (const finding of findings) {
        expect(finding).toHaveProperty('package')
        expect(finding).toHaveProperty('severity')
        expect(finding).toHaveProperty('fixAvailable')
      }
    }
  }, 120_000) // 120s timeout for real pnpm execution
})

// ── Database round-trip tests (HP-7, HP-8, HP-9) ────────────────────────────

describe.skipIf(!(await isDbAvailable()))('dep_audit DB round-trip', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pool: any

  beforeAll(async () => {
    const pg = await import('pg') as any
    pool = new pg.Pool({
      host: 'localhost',
      port: 5432,
      database: 'lego_dev',
      user: process.env['DB_USER'] ?? 'postgres',
      password: process.env['DB_PASSWORD'] ?? 'postgres',
    })
  })

  afterAll(async () => {
    await pool?.end()
  })

  it('HP-7: wint.dep_audit_runs table exists after migration', async () => {
    const result = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'wint' AND table_name = 'dep_audit_runs'`,
    )
    expect(result.rows).toHaveLength(1)
  })

  it('HP-7: wint.dep_audit_findings table exists after migration', async () => {
    const result = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'wint' AND table_name = 'dep_audit_findings'`,
    )
    expect(result.rows).toHaveLength(1)
  })

  it('HP-8: round-trip insert and read of dep_audit_runs row', async () => {
    const { DepAuditRunInsertSchema, DepAuditRunSelectSchema } = await import(
      '../../../../../database-schema/src/schema/wint.ts'
    ) as any

    const insertData = DepAuditRunInsertSchema.parse({
      storyId: 'APIP-4030-test',
      packagesAdded: ['dayjs@1.11.0'],
      packagesUpdated: [],
      packagesRemoved: [],
      overallRisk: 'high',
      findingsCount: 1,
      blockedQueueItemsCreated: 1,
    })

    const insertResult = await pool.query(
      `INSERT INTO wint.dep_audit_runs
       (story_id, packages_added, packages_updated, packages_removed,
        overall_risk, findings_count, blocked_queue_items_created)
       VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb, $5, $6, $7)
       RETURNING *`,
      [
        insertData.storyId,
        JSON.stringify(insertData.packagesAdded),
        JSON.stringify(insertData.packagesUpdated),
        JSON.stringify(insertData.packagesRemoved),
        insertData.overallRisk,
        insertData.findingsCount,
        insertData.blockedQueueItemsCreated,
      ],
    )

    expect(insertResult.rows).toHaveLength(1)
    const row = insertResult.rows[0]
    expect(row.story_id).toBe('APIP-4030-test')
    expect(row.overall_risk).toBe('high')

    // Parse with select schema — should not throw
    const parsed = DepAuditRunSelectSchema.safeParse({
      id: row.id,
      storyId: row.story_id,
      commitSha: row.commit_sha,
      triggeredAt: row.triggered_at,
      packagesAdded: row.packages_added,
      packagesUpdated: row.packages_updated,
      packagesRemoved: row.packages_removed,
      overallRisk: row.overall_risk,
      findingsCount: row.findings_count,
      blockedQueueItemsCreated: row.blocked_queue_items_created,
      createdAt: row.created_at,
    })
    expect(parsed.success).toBe(true)

    // Clean up
    await pool.query('DELETE FROM wint.dep_audit_runs WHERE story_id = $1', ['APIP-4030-test'])
  })

  it('HP-9: round-trip insert and read of dep_audit_findings row', async () => {
    // First create a parent run
    const runResult = await pool.query(
      `INSERT INTO wint.dep_audit_runs
       (story_id, packages_added, packages_updated, packages_removed,
        overall_risk, findings_count, blocked_queue_items_created)
       VALUES ('APIP-4030-finding-test', '[]', '[]', '[]', 'high', 1, 0)
       RETURNING id`,
    )
    const runId = runResult.rows[0].id

    // Insert a finding
    const findingResult = await pool.query(
      `INSERT INTO wint.dep_audit_findings
       (run_id, package_name, finding_type, severity, details)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING *`,
      [runId, 'lodash', 'vulnerability', 'high', JSON.stringify({ cve: 'CVE-2021-12345' })],
    )

    expect(findingResult.rows).toHaveLength(1)
    const finding = findingResult.rows[0]
    expect(finding.run_id).toBe(runId)
    expect(finding.package_name).toBe('lodash')
    expect(finding.finding_type).toBe('vulnerability')
    expect(finding.severity).toBe('high')

    const { DepAuditFindingSelectSchema } = await import(
      '../../../../../database-schema/src/schema/wint.ts'
    ) as any

    const parsed = DepAuditFindingSelectSchema.safeParse({
      id: finding.id,
      runId: finding.run_id,
      packageName: finding.package_name,
      findingType: finding.finding_type,
      severity: finding.severity,
      details: finding.details,
      createdAt: finding.created_at,
    })
    expect(parsed.success).toBe(true)

    // Clean up
    await pool.query('DELETE FROM wint.dep_audit_runs WHERE id = $1', [runId])
  })
})
