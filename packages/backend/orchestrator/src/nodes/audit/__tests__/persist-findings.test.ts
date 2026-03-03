import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { tmpdir } from 'os'
import { join } from 'path'
import { mkdir, readFile, rm } from 'fs/promises'
import { parse } from 'yaml'

import { persistFindings } from '../persist-findings.js'
import { AuditFindingsSchema } from '../../../artifacts/audit-findings.js'
import type { CodeAuditState } from '../../../graphs/code-audit.js'
import type { AuditFinding } from '../../../artifacts/audit-findings.js'

function makeFinding(overrides: Partial<AuditFinding>): AuditFinding {
  return {
    id: 'AUDIT-001',
    lens: 'security',
    severity: 'high',
    confidence: 'high',
    title: 'Test Finding',
    file: 'src/index.ts',
    evidence: 'evidence text',
    remediation: 'fix it',
    status: 'new',
    ...overrides,
  }
}

function makeState(overrides: Partial<CodeAuditState>): CodeAuditState {
  return {
    scope: 'full',
    mode: 'pipeline',
    lenses: ['security'],
    target: 'apps/',
    storyId: '',
    targetFiles: ['src/index.ts'],
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

describe('persistFindings', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = join(tmpdir(), `persist-findings-test-${Date.now()}`)
    await mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  it('writes FINDINGS-{date}.yaml to the auditDir', async () => {
    const state = makeState({
      findings: [makeFinding({ id: 'AUDIT-001' })],
    })

    const result = await persistFindings(state, testDir)

    expect(result.auditFindings).toBeDefined()

    // Find the written file
    const { readdir } = await import('fs/promises')
    const files = await readdir(testDir)
    const findingsFile = files.find(f => f.startsWith('FINDINGS-') && f.endsWith('.yaml'))
    expect(findingsFile).toBeDefined()
  })

  it('AuditFindingsSchema.parse() does not throw on written output', async () => {
    const state = makeState({
      findings: [
        makeFinding({ id: 'AUDIT-001', severity: 'critical' }),
        makeFinding({ id: 'AUDIT-002', severity: 'medium', title: 'Medium Issue', file: 'b.ts' }),
      ],
    })

    await persistFindings(state, testDir)

    const { readdir } = await import('fs/promises')
    const files = await readdir(testDir)
    const findingsFile = files.find(f => f.startsWith('FINDINGS-') && f.endsWith('.yaml'))
    expect(findingsFile).toBeDefined()

    const content = await readFile(join(testDir, findingsFile!), 'utf-8')
    const parsed = parse(content)

    expect(() => AuditFindingsSchema.parse(parsed)).not.toThrow()
  })

  it('summary counts match findings', async () => {
    const findings: AuditFinding[] = [
      makeFinding({ id: 'A1', severity: 'critical', lens: 'security' }),
      makeFinding({ id: 'A2', severity: 'high', lens: 'security', file: 'b.ts', title: 'H' }),
      makeFinding({ id: 'A3', severity: 'medium', lens: 'react', file: 'c.ts', title: 'M' }),
      makeFinding({ id: 'A4', severity: 'low', lens: 'react', file: 'd.ts', title: 'L' }),
    ]

    const state = makeState({ findings })
    const result = await persistFindings(state, testDir)

    expect(result.auditFindings?.summary.total_findings).toBe(4)
    expect(result.auditFindings?.summary.by_severity.critical).toBe(1)
    expect(result.auditFindings?.summary.by_severity.high).toBe(1)
    expect(result.auditFindings?.summary.by_severity.medium).toBe(1)
    expect(result.auditFindings?.summary.by_severity.low).toBe(1)
    expect(result.auditFindings?.summary.by_lens.security).toBe(2)
    expect(result.auditFindings?.summary.by_lens.react).toBe(2)
  })

  it('uses deduplication result for new_since_last count when available', async () => {
    const state = makeState({
      findings: [makeFinding({ id: 'A1' }), makeFinding({ id: 'A2', file: 'b.ts', title: 'B' })],
      deduplicationResult: {
        total_checked: 2,
        duplicates_found: 0,
        related_found: 0,
        new_findings: 2,
      },
    })

    const result = await persistFindings(state, testDir)

    expect(result.auditFindings?.summary.new_since_last).toBe(2)
  })

  it('creates auditDir if it does not exist', async () => {
    const nestedDir = join(testDir, 'new-audit-dir')
    const state = makeState({ findings: [] })

    await persistFindings(state, nestedDir)

    const { readdir } = await import('fs/promises')
    const files = await readdir(nestedDir)
    expect(files.some(f => f.startsWith('FINDINGS-'))).toBe(true)
  })

  it('handles empty findings list without error', async () => {
    const state = makeState({ findings: [] })
    const result = await persistFindings(state, testDir)

    expect(result.auditFindings).toBeDefined()
    expect(result.auditFindings?.summary.total_findings).toBe(0)
    expect(result.errors).toBeUndefined()
  })
})
