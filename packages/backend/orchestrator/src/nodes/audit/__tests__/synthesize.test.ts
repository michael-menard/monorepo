import { describe, expect, it } from 'vitest'

import { synthesize } from '../synthesize.js'
import type { CodeAuditState } from '../../../graphs/code-audit.js'
import type { AuditFinding, LensResult } from '../../../artifacts/audit-findings.js'

function makeFinding(overrides: Partial<AuditFinding>): AuditFinding {
  return {
    id: '',
    lens: 'security',
    severity: 'medium',
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

describe('synthesize', () => {
  it('assigns sequential AUDIT-001 ... AUDIT-00N IDs in severity order', async () => {
    const lensResults: LensResult[] = [
      {
        lens: 'security',
        total_findings: 3,
        by_severity: { critical: 0, high: 0, medium: 2, low: 1 },
        findings: [
          makeFinding({ id: 'tmp1', severity: 'low', title: 'Low Finding', file: 'a.ts' }),
          makeFinding({ id: 'tmp2', severity: 'medium', title: 'Medium Finding', file: 'b.ts' }),
          makeFinding({ id: 'tmp3', severity: 'medium', title: 'Another Medium', file: 'c.ts' }),
        ],
      },
    ]

    const state = makeState({ lensResults })
    const result = await synthesize(state)

    expect(result.findings).toBeDefined()
    const findings = result.findings!
    expect(findings[0].id).toBe('AUDIT-001')
    expect(findings[0].severity).toBe('medium')
    expect(findings[findings.length - 1].id).toBe(`AUDIT-00${findings.length}`)
    // All IDs should be sequential
    findings.forEach((f, i) => {
      expect(f.id).toBe(`AUDIT-${String(i + 1).padStart(3, '0')}`)
    })
  })

  it('sorts findings by severity: critical before high before medium before low', async () => {
    const lensResults: LensResult[] = [
      {
        lens: 'typescript',
        total_findings: 4,
        by_severity: { critical: 1, high: 1, medium: 1, low: 1 },
        findings: [
          makeFinding({ id: 'l1', severity: 'low', title: 'Low', file: 'a.ts' }),
          makeFinding({ id: 'c1', severity: 'critical', title: 'Critical', file: 'b.ts' }),
          makeFinding({ id: 'm1', severity: 'medium', title: 'Medium', file: 'c.ts' }),
          makeFinding({ id: 'h1', severity: 'high', title: 'High', file: 'd.ts' }),
        ],
      },
    ]

    const state = makeState({ lensResults })
    const result = await synthesize(state)

    const severities = result.findings!.map(f => f.severity)
    expect(severities[0]).toBe('critical')
    expect(severities[1]).toBe('high')
    expect(severities[2]).toBe('medium')
    expect(severities[3]).toBe('low')
  })

  it('merges findings with identical file+title to one (keeps higher severity)', async () => {
    const lensResults: LensResult[] = [
      {
        lens: 'security',
        total_findings: 1,
        by_severity: { critical: 0, high: 0, medium: 1, low: 0 },
        findings: [
          makeFinding({ id: 'a1', severity: 'medium', title: 'SQL Injection Risk', file: 'db.ts' }),
        ],
      },
      {
        lens: 'typescript',
        total_findings: 1,
        by_severity: { critical: 0, high: 1, medium: 0, low: 0 },
        findings: [
          makeFinding({ id: 'b1', severity: 'high', title: 'SQL Injection Risk', file: 'db.ts' }),
        ],
      },
    ]

    const state = makeState({ lensResults })
    const result = await synthesize(state)

    // Duplicate file+title should collapse to one finding
    const sqlFindings = result.findings!.filter(
      f => f.title === 'SQL Injection Risk' && f.file === 'db.ts',
    )
    expect(sqlFindings).toHaveLength(1)
    // Higher severity (high) should be kept
    expect(sqlFindings[0].severity).toBe('high')
  })

  it('caps output at 100 findings when given 101 inputs', async () => {
    const findings101: AuditFinding[] = Array.from({ length: 101 }, (_, i) =>
      makeFinding({
        id: `f${i}`,
        title: `Finding ${i}`,
        file: `file${i}.ts`,
        severity: 'low',
      }),
    )

    const lensResults: LensResult[] = [
      {
        lens: 'security',
        total_findings: 101,
        by_severity: { critical: 0, high: 0, medium: 0, low: 101 },
        findings: findings101,
      },
    ]

    const state = makeState({ lensResults })
    const result = await synthesize(state)

    expect(result.findings!.length).toBe(100)
  })

  it('uses vetted_findings from roundtableResult when available', async () => {
    const vettedFindings: AuditFinding[] = [
      makeFinding({ id: 'v1', severity: 'high', title: 'Vetted Finding', file: 'app.ts' }),
    ]

    const state = makeState({
      roundtableResult: {
        original_count: 3,
        vetted_count: 1,
        removed: { false_positives: 2, duplicates: 0 },
        severity_changes: { downgraded: 0, upgraded: 0 },
        cross_references: [],
        vetted_findings: vettedFindings,
      },
      lensResults: [
        {
          lens: 'react',
          total_findings: 3,
          by_severity: { critical: 0, high: 1, medium: 1, low: 1 },
          findings: [
            makeFinding({ id: 'lr1', severity: 'high', title: 'Raw Lens 1', file: 'x.ts' }),
            makeFinding({ id: 'lr2', severity: 'medium', title: 'Raw Lens 2', file: 'y.ts' }),
            makeFinding({ id: 'lr3', severity: 'low', title: 'Raw Lens 3', file: 'z.ts' }),
          ],
        },
      ],
    })

    const result = await synthesize(state)

    // Should use vetted findings, not raw lens results
    const titles = result.findings!.map(f => f.title)
    expect(titles).toContain('Vetted Finding')
    expect(titles).not.toContain('Raw Lens 1')
  })

  it('returns empty findings array when no inputs', async () => {
    const state = makeState({ lensResults: [] })
    const result = await synthesize(state)
    expect(result.findings).toEqual([])
  })
})
