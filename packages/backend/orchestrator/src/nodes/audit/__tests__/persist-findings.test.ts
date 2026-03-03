import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { tmpdir } from 'os'
import { join } from 'path'
import { mkdir, readdir, readFile, rm } from 'fs/promises'
import { parse } from 'yaml'

import { persistFindings } from '../persist-findings.js'
import { AuditFindingsSchema } from '../../../artifacts/audit-findings.js'
import type { AuditFinding } from '../../../artifacts/audit-findings.js'
import type { CodeAuditState } from '../../../graphs/code-audit.js'

// --- Test Helpers ---

function makeFinding(overrides: Partial<AuditFinding> = {}): AuditFinding {
  return {
    id: '',
    lens: 'security',
    severity: 'medium',
    confidence: 'high',
    title: 'Test finding',
    file: 'src/test.ts',
    evidence: 'test evidence',
    remediation: 'fix it',
    status: 'new',
    ...overrides,
  }
}

function makeState(overrides: Partial<CodeAuditState> = {}): CodeAuditState {
  return {
    findings: [],
    scope: 'full',
    mode: 'pipeline',
    lenses: ['security'],
    target: 'apps/',
    storyId: '',
    targetFiles: [],
    fileCategories: {},
    previousAudit: null,
    lensResults: [],
    devilsAdvocateResult: null,
    roundtableResult: null,
    deduplicationResult: null,
    auditFindings: null,
    trendData: null,
    errors: [],
    completed: false,
    ...overrides,
  }
}

async function readFindingsFile(dir: string): Promise<unknown> {
  const entries = await readdir(dir)
  const findingsFile = entries.find(f => f.startsWith('FINDINGS-') && f.endsWith('.yaml'))
  if (!findingsFile) throw new Error(`No FINDINGS-*.yaml file found in ${dir}`)
  const content = await readFile(join(dir, findingsFile), 'utf-8')
  return parse(content)
}

describe('persistFindings', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = join(tmpdir(), `audit-test-${Date.now()}`)
    await mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  it('AC-3: writes FINDINGS-{date}.yaml that passes AuditFindingsSchema.parse without throwing', async () => {
    const state = makeState({
      findings: [makeFinding({ title: 'SQL injection vulnerability', severity: 'high' })],
      lenses: ['security'],
      mode: 'pipeline',
      scope: 'full',
      target: 'apps/',
    })

    await persistFindings(state, testDir)

    const parsed = await readFindingsFile(testDir)
    expect(() => AuditFindingsSchema.parse(parsed)).not.toThrow()
  })

  it('AC-3: FINDINGS file contains required top-level fields', async () => {
    const state = makeState({
      findings: [makeFinding()],
      lenses: ['security', 'typescript'],
      mode: 'pipeline',
      scope: 'full',
      target: 'apps/web',
      targetFiles: ['src/a.ts', 'src/b.ts'],
    })

    await persistFindings(state, testDir)

    const parsed = await readFindingsFile(testDir)
    const validated = AuditFindingsSchema.parse(parsed)

    expect(validated.schema).toBe(1)
    expect(validated.timestamp).toBeDefined()
    expect(validated.mode).toBe('pipeline')
    expect(validated.scope).toBe('full')
    expect(validated.target).toBe('apps/web')
    expect(validated.lenses_run).toEqual(['security', 'typescript'])
    expect(validated.summary).toBeDefined()
    expect(validated.findings).toBeDefined()
    expect(validated.metrics).toBeDefined()
  })

  it('AC-3: summary fields are correctly populated', async () => {
    const findings = [
      makeFinding({ severity: 'high', lens: 'security' }),
      makeFinding({ severity: 'medium', lens: 'security' }),
      makeFinding({ severity: 'low', lens: 'typescript' }),
    ]
    const state = makeState({ findings, lenses: ['security', 'typescript'] })

    await persistFindings(state, testDir)

    const parsed = await readFindingsFile(testDir)
    const validated = AuditFindingsSchema.parse(parsed)

    expect(validated.summary.total_findings).toBe(3)
    expect(validated.summary.by_severity.high).toBe(1)
    expect(validated.summary.by_severity.medium).toBe(1)
    expect(validated.summary.by_severity.low).toBe(1)
    expect(validated.summary.by_lens['security']).toBe(2)
    expect(validated.summary.by_lens['typescript']).toBe(1)
  })

  it('AC-3: metrics.files_scanned reflects targetFiles count', async () => {
    const state = makeState({
      findings: [],
      targetFiles: ['src/a.ts', 'src/b.ts', 'src/c.ts'],
    })

    await persistFindings(state, testDir)

    const parsed = await readFindingsFile(testDir)
    const validated = AuditFindingsSchema.parse(parsed)

    expect(validated.metrics.files_scanned).toBe(3)
  })

  it('creates the auditDir if it does not exist', async () => {
    const nestedDir = join(testDir, 'nested', 'audit')
    const state = makeState({ findings: [] })

    await persistFindings(state, nestedDir)

    const entries = await readdir(nestedDir)
    const findingsFile = entries.find(f => f.startsWith('FINDINGS-') && f.endsWith('.yaml'))
    expect(findingsFile).toBeDefined()
  })

  it('returns auditFindings in the result', async () => {
    const state = makeState({ findings: [makeFinding()] })

    const result = await persistFindings(state, testDir)

    expect(result.auditFindings).toBeDefined()
    expect(result.auditFindings?.schema).toBe(1)
  })

  it('handles empty findings list', async () => {
    const state = makeState({ findings: [], lenses: [], targetFiles: [] })

    await persistFindings(state, testDir)

    const parsed = await readFindingsFile(testDir)
    expect(() => AuditFindingsSchema.parse(parsed)).not.toThrow()

    const validated = AuditFindingsSchema.parse(parsed)
    expect(validated.summary.total_findings).toBe(0)
    expect(validated.findings).toHaveLength(0)
    expect(validated.metrics.files_scanned).toBe(0)
  })

  it('roundtable mode is preserved in the FINDINGS file', async () => {
    const state = makeState({ mode: 'roundtable', scope: 'delta' })

    await persistFindings(state, testDir)

    const parsed = await readFindingsFile(testDir)
    const validated = AuditFindingsSchema.parse(parsed)
    expect(validated.mode).toBe('roundtable')
    expect(validated.scope).toBe('delta')
  })
})
