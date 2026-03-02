/**
 * Integration Tests: Health Gate (APIP-4010)
 *
 * Tags: [integration, requires-db]
 * Database: postgresql://postgres:postgres@localhost:5432/lego_dev (port 5432, NOT 5433)
 *
 * Covers IT-001 through IT-005:
 * - IT-001: Migration applies cleanly — wint.codebase_health table exists
 * - IT-002: Insert + read-back — all columns round-trip correctly
 * - IT-003: captureHealthSnapshot() with real DB writes row and returns snapshot
 * - IT-004: Index on is_baseline column — baseline query performs correctly
 * - IT-005: CLEANUP story YAML to temp directory passes StoryArtifactSchema.parse()
 *
 * Story: APIP-4010 - Codebase Health Gate
 * AC: AC-12
 *
 * SKIP CONDITION: If DATABASE_URL is not set or DB is not available at port 5432,
 * tests are marked as exempt (skipped with explanation).
 *
 * Usage:
 * DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lego_dev \
 *   pnpm test --filter orchestrator -- --grep "\[integration\]"
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import { StoryArtifactSchema } from '../../../artifacts/story-v2-compatible.js'
import {
  CodebaseHealthSnapshotSchema,
  DEFAULT_HEALTH_GATE_THRESHOLDS,
} from '../schemas/index.js'
import { captureHealthSnapshot } from '../captureHealthSnapshot.js'
import { detectDriftAndGenerateCleanup } from '../detectDriftAndGenerateCleanup.js'
import { writeCleanupStories } from '../writeCleanupStories.js'

// ============================================================================
// DB setup — skip if DATABASE_URL not available
// ============================================================================

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/lego_dev'
const SKIP_INTEGRATION = process.env.SKIP_INTEGRATION_TESTS === 'true'

let pg: typeof import('pg') | null = null
let pool: InstanceType<(typeof import('pg'))['Pool']> | null = null

async function tryConnect(): Promise<boolean> {
  try {
    pg = await import('pg')
    pool = new pg.Pool({ connectionString: DATABASE_URL, connectionTimeoutMillis: 3000 })
    await pool.query('SELECT 1')
    return true
  } catch {
    return false
  }
}

let dbAvailable = false

beforeAll(async () => {
  if (SKIP_INTEGRATION) return
  dbAvailable = await tryConnect()
})

afterAll(async () => {
  if (pool) {
    await pool.end()
  }
})

function skipIfNoDb() {
  if (!dbAvailable || SKIP_INTEGRATION) {
    return true
  }
  return false
}

// ============================================================================
// IT-001: Migration applies cleanly — wint.codebase_health table exists
// ============================================================================

describe('[integration] IT-001: wint.codebase_health table exists', () => {
  it('wint.codebase_health table exists after migration', async () => {
    if (skipIfNoDb()) {
      // AC-12 exempt: DB not available at port 5432
      console.log('SKIP: DB not available — IT-001 exempt (requires lego_dev at port 5432)')
      return
    }

    const result = await pool!.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'wint' AND table_name = 'codebase_health'`,
    )
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].table_name).toBe('codebase_health')
  })

  it('wint.codebase_health has all required columns', async () => {
    if (skipIfNoDb()) {
      console.log('SKIP: DB not available — IT-001 column check exempt')
      return
    }

    const result = await pool!.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'wint' AND table_name = 'codebase_health'
       ORDER BY column_name`,
    )
    const columns = result.rows.map((r: { column_name: string }) => r.column_name)

    expect(columns).toContain('id')
    expect(columns).toContain('merge_number')
    expect(columns).toContain('captured_at')
    expect(columns).toContain('is_baseline')
    expect(columns).toContain('lint_warnings')
    expect(columns).toContain('type_errors')
    expect(columns).toContain('any_count')
    expect(columns).toContain('test_coverage')
    expect(columns).toContain('circular_deps')
    expect(columns).toContain('bundle_size')
    expect(columns).toContain('dead_exports')
    expect(columns).toContain('eslint_disable_count')
  })
})

// ============================================================================
// IT-002: Insert + read-back — all columns round-trip correctly
// ============================================================================

describe('[integration] IT-002: insert + read-back', () => {
  it('inserts a snapshot row and reads it back correctly', async () => {
    if (skipIfNoDb()) {
      console.log('SKIP: DB not available — IT-002 exempt')
      return
    }

    const testId = crypto.randomUUID()
    const mergeNumber = 9999

    await pool!.query(
      `INSERT INTO wint.codebase_health (
        id, merge_number, captured_at, is_baseline,
        lint_warnings, type_errors, any_count, test_coverage,
        circular_deps, bundle_size, dead_exports, eslint_disable_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [testId, mergeNumber, new Date(), false, 10, 0, 5, 80.5, 0, 500000, 3, 2],
    )

    const result = await pool!.query(
      'SELECT * FROM wint.codebase_health WHERE id = $1',
      [testId],
    )

    expect(result.rows).toHaveLength(1)
    const row = result.rows[0]

    expect(row.merge_number).toBe(mergeNumber)
    expect(row.lint_warnings).toBe(10)
    expect(row.type_errors).toBe(0)
    expect(row.any_count).toBe(5)
    expect(parseFloat(row.test_coverage)).toBeCloseTo(80.5, 1)
    expect(row.circular_deps).toBe(0)
    expect(row.bundle_size).toBe(500000)
    expect(row.dead_exports).toBe(3)
    expect(row.eslint_disable_count).toBe(2)

    // Cleanup
    await pool!.query('DELETE FROM wint.codebase_health WHERE id = $1', [testId])
  })

  it('row parses through CodebaseHealthSnapshotSchema', async () => {
    if (skipIfNoDb()) {
      console.log('SKIP: DB not available — IT-002 schema parse exempt')
      return
    }

    const testId = crypto.randomUUID()
    await pool!.query(
      `INSERT INTO wint.codebase_health (
        id, merge_number, is_baseline, lint_warnings, type_errors
      ) VALUES ($1, $2, $3, $4, $5)`,
      [testId, 9998, false, 5, 0],
    )

    const result = await pool!.query(
      'SELECT * FROM wint.codebase_health WHERE id = $1',
      [testId],
    )

    const row = result.rows[0]
    const parsed = CodebaseHealthSnapshotSchema.safeParse({
      id: row.id,
      mergeNumber: row.merge_number,
      capturedAt: row.captured_at,
      isBaseline: row.is_baseline,
      lintWarnings: row.lint_warnings,
      typeErrors: row.type_errors,
      anyCount: row.any_count,
      testCoverage: row.test_coverage ? parseFloat(row.test_coverage) : null,
      circularDeps: row.circular_deps,
      bundleSize: row.bundle_size,
      deadExports: row.dead_exports,
      eslintDisableCount: row.eslint_disable_count,
    })

    expect(parsed.success).toBe(true)

    // Cleanup
    await pool!.query('DELETE FROM wint.codebase_health WHERE id = $1', [testId])
  })
})

// ============================================================================
// IT-003: captureHealthSnapshot() with real DB
// ============================================================================

describe('[integration] IT-003: captureHealthSnapshot with real DB', () => {
  it('inserts a row into wint.codebase_health and returns snapshot', async () => {
    if (skipIfNoDb()) {
      console.log('SKIP: DB not available — IT-003 exempt')
      return
    }

    // Use a mock execFn to avoid running real CLI tools in integration tests
    const execFn = () => Promise.resolve('')

    const snapshot = await captureHealthSnapshot({ mergeNumber: 8888, execFn }, pool!)

    expect(snapshot).toBeDefined()
    expect(snapshot.mergeNumber).toBe(8888)

    // Verify row was inserted
    const result = await pool!.query(
      'SELECT * FROM wint.codebase_health WHERE id = $1',
      [snapshot.id],
    )
    expect(result.rows).toHaveLength(1)

    // Cleanup
    await pool!.query('DELETE FROM wint.codebase_health WHERE id = $1', [snapshot.id])
  })
})

// ============================================================================
// IT-004: Index on is_baseline — baseline query performs correctly
// ============================================================================

describe('[integration] IT-004: is_baseline index — baseline query', () => {
  it('can efficiently query baseline rows via is_baseline index', async () => {
    if (skipIfNoDb()) {
      console.log('SKIP: DB not available — IT-004 exempt')
      return
    }

    const testId = crypto.randomUUID()

    // Insert a baseline row
    await pool!.query(
      `INSERT INTO wint.codebase_health (id, merge_number, is_baseline)
       VALUES ($1, $2, $3)`,
      [testId, 7777, true],
    )

    // Query for baseline rows
    const result = await pool!.query(
      `SELECT id FROM wint.codebase_health
       WHERE is_baseline = true
       ORDER BY captured_at DESC
       LIMIT 1`,
    )

    expect(result.rows.length).toBeGreaterThanOrEqual(1)

    // Cleanup
    await pool!.query('DELETE FROM wint.codebase_health WHERE id = $1', [testId])
  })

  it('idx_codebase_health_is_baseline index exists', async () => {
    if (skipIfNoDb()) {
      console.log('SKIP: DB not available — IT-004 index check exempt')
      return
    }

    const result = await pool!.query(
      `SELECT indexname FROM pg_indexes
       WHERE schemaname = 'wint'
       AND tablename = 'codebase_health'
       AND indexname = 'idx_codebase_health_is_baseline'`,
    )

    expect(result.rows).toHaveLength(1)
  })
})

// ============================================================================
// IT-005: CLEANUP story YAML to temp directory passes StoryArtifactSchema.parse()
// ============================================================================

describe('[integration] IT-005: CLEANUP story file output', () => {
  it('writes CLEANUP story YAML that passes StoryArtifactSchema.parse()', async () => {
    // This test doesn't require DB — but tagged [integration] per story spec
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apip-4010-test-'))

    try {
      // Generate stories
      const baseline = {
        id: 'bbbb-0000-0000-0000-000000000001',
        mergeNumber: 0,
        capturedAt: new Date('2026-02-01T00:00:00Z'),
        isBaseline: true,
        lintWarnings: 5,
        typeErrors: 0,
        anyCount: 3,
        testCoverage: 85.0,
        circularDeps: 0,
        bundleSize: 400_000,
        deadExports: 2,
        eslintDisableCount: 1,
      }

      const snapshot = {
        id: 'aaaa-0000-0000-0000-000000000001',
        mergeNumber: 5,
        capturedAt: new Date('2026-03-01T00:00:00Z'),
        isBaseline: false,
        lintWarnings: 20, // +15, threshold 10 → drifted
        typeErrors: 1, // +1, threshold 0 → drifted
        anyCount: 3,
        testCoverage: 85.0,
        circularDeps: 0,
        bundleSize: 400_000,
        deadExports: 2,
        eslintDisableCount: 1,
      }

      const stories = detectDriftAndGenerateCleanup(snapshot, baseline, DEFAULT_HEALTH_GATE_THRESHOLDS)
      expect(stories.length).toBeGreaterThanOrEqual(2)

      // Write stories to temp dir
      const writtenPaths = writeCleanupStories(stories, tmpDir)
      expect(writtenPaths.length).toBe(stories.length)

      // Verify each written file
      for (const storyPath of writtenPaths) {
        expect(fs.existsSync(storyPath)).toBe(true)
        const content = fs.readFileSync(storyPath, 'utf-8')

        // Parse YAML and validate through StoryArtifactSchema
        const { parse: yamlParse } = await import('yaml')
        const parsed = yamlParse(content)
        expect(() => StoryArtifactSchema.parse(parsed)).not.toThrow()
      }
    } finally {
      // Cleanup temp dir
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })
})
