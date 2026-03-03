import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { tmpdir } from 'os'
import { join } from 'path'
import { mkdir, writeFile, rm } from 'fs/promises'
import { stringify } from 'yaml'

import { persistTrends } from '../persist-trends.js'
import { TrendSnapshotSchema } from '../../../artifacts/audit-findings.js'
import type { CodeAuditState } from '../../../graphs/code-audit.js'

function makeState(overrides: Partial<CodeAuditState>): CodeAuditState {
  return {
    scope: 'full',
    mode: 'pipeline',
    lenses: [],
    target: 'apps/',
    storyId: '',
    targetFiles: [],
    fileCategories: {},
    previousAudit: null,
    lensResults: [],
    devilsAdvocateResult: null,
    roundtableResult: null,
    findings: [],
    deduplicationResult: null,
    auditFindings: null,
    trendData: null,
    errors: [],
    completed: false,
    ...overrides,
  }
}

function makeFindingsYaml(params: {
  date: string
  total: number
  critical?: number
  high?: number
  medium?: number
  low?: number
  byLens?: Record<string, number>
}) {
  const bySeverity = {
    critical: params.critical ?? 0,
    high: params.high ?? 0,
    medium: params.medium ?? 0,
    low: params.low ?? 0,
  }
  return stringify({
    schema: 1,
    timestamp: `${params.date}T10:00:00.000Z`,
    mode: 'pipeline',
    scope: 'full',
    target: 'apps/',
    lenses_run: ['security'],
    summary: {
      total_findings: params.total,
      by_severity: bySeverity,
      by_lens: params.byLens ?? { security: params.total },
      new_since_last: params.total,
      recurring: 0,
      fixed_since_last: 0,
    },
    findings: [],
    metrics: { files_scanned: 10 },
  })
}

describe('persistTrends', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = join(tmpdir(), `persist-trends-test-${Date.now()}`)
    await mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  it('returns { completed: true } without throwing for empty audit directory', async () => {
    const state = makeState()
    // testDir has no FINDINGS- files

    const result = await persistTrends(state, testDir)

    expect(result.completed).toBe(true)
    expect(result.trendData).toBeUndefined()
  })

  it('TrendSnapshotSchema.parse() does not throw with 2+ FINDINGS files', async () => {
    // Write 2 findings files
    await writeFile(
      join(testDir, 'FINDINGS-2026-01-01.yaml'),
      makeFindingsYaml({ date: '2026-01-01', total: 10, high: 5, medium: 5 }),
    )
    await writeFile(
      join(testDir, 'FINDINGS-2026-02-01.yaml'),
      makeFindingsYaml({ date: '2026-02-01', total: 8, high: 3, medium: 5 }),
    )

    const state = makeState()
    const result = await persistTrends(state, testDir)

    expect(() => TrendSnapshotSchema.parse(result.trendData)).not.toThrow()
  })

  it('audits_analyzed >= 2 when 2 FINDINGS files are present', async () => {
    await writeFile(
      join(testDir, 'FINDINGS-2026-01-01.yaml'),
      makeFindingsYaml({ date: '2026-01-01', total: 15 }),
    )
    await writeFile(
      join(testDir, 'FINDINGS-2026-02-01.yaml'),
      makeFindingsYaml({ date: '2026-02-01', total: 12 }),
    )

    const state = makeState()
    const result = await persistTrends(state, testDir)

    expect(result.trendData?.audits_analyzed).toBeGreaterThanOrEqual(2)
  })

  it('writes TRENDS.yaml to the auditDir', async () => {
    await writeFile(
      join(testDir, 'FINDINGS-2026-01-01.yaml'),
      makeFindingsYaml({ date: '2026-01-01', total: 10 }),
    )
    await writeFile(
      join(testDir, 'FINDINGS-2026-02-01.yaml'),
      makeFindingsYaml({ date: '2026-02-01', total: 8 }),
    )

    const state = makeState()
    await persistTrends(state, testDir)

    const { readdir } = await import('fs/promises')
    const files = await readdir(testDir)
    expect(files).toContain('TRENDS.yaml')
  })

  it('calculates improving trend when total decreases by > 10%', async () => {
    await writeFile(
      join(testDir, 'FINDINGS-2026-01-01.yaml'),
      makeFindingsYaml({ date: '2026-01-01', total: 20 }),
    )
    await writeFile(
      join(testDir, 'FINDINGS-2026-02-01.yaml'),
      makeFindingsYaml({ date: '2026-02-01', total: 10 }),
    )

    const state = makeState()
    const result = await persistTrends(state, testDir)

    expect(result.trendData?.overall.trend).toBe('improving')
  })

  it('calculates regressing trend when total increases by > 10%', async () => {
    await writeFile(
      join(testDir, 'FINDINGS-2026-01-01.yaml'),
      makeFindingsYaml({ date: '2026-01-01', total: 10 }),
    )
    await writeFile(
      join(testDir, 'FINDINGS-2026-02-01.yaml'),
      makeFindingsYaml({ date: '2026-02-01', total: 20 }),
    )

    const state = makeState()
    const result = await persistTrends(state, testDir)

    expect(result.trendData?.overall.trend).toBe('regressing')
  })

  it('handles single FINDINGS file (no previous comparison)', async () => {
    await writeFile(
      join(testDir, 'FINDINGS-2026-01-01.yaml'),
      makeFindingsYaml({ date: '2026-01-01', total: 5 }),
    )

    const state = makeState()
    const result = await persistTrends(state, testDir)

    // Should have trendData with single entry
    expect(result.trendData).toBeDefined()
    expect(result.trendData?.audits_analyzed).toBe(1)
    expect(result.trendData?.overall.trend).toBe('stable')
  })
})
