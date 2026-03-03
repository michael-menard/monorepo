import { describe, expect, it } from 'vitest'

import { runRoundtable } from '../roundtable.js'
import { RoundtableResultSchema } from '../../../artifacts/audit-findings.js'
import type { CodeAuditState } from '../../../graphs/code-audit.js'
import type { AuditFinding, LensResult, ChallengeResult } from '../../../artifacts/audit-findings.js'

function makeFinding(overrides: Partial<AuditFinding>): AuditFinding {
  return {
    id: 'FIND-001',
    lens: 'security',
    severity: 'high',
    confidence: 'high',
    title: 'Test Finding',
    file: 'src/index.ts',
    evidence: 'evidence',
    remediation: 'fix it',
    status: 'new',
    ...overrides,
  }
}

function makeState(overrides: Partial<CodeAuditState>): CodeAuditState {
  return {
    scope: 'full',
    mode: 'roundtable',
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

describe('runRoundtable', () => {
  it('RoundtableResultSchema.parse() does not throw on valid result', async () => {
    const findings = [makeFinding({ id: 'F-001' })]
    const lensResults: LensResult[] = [
      {
        lens: 'security',
        total_findings: 1,
        by_severity: { critical: 0, high: 1, medium: 0, low: 0 },
        findings,
      },
    ]

    const daResult: ChallengeResult = {
      total_reviewed: 1,
      confirmed: 1,
      downgraded: 0,
      upgraded: 0,
      false_positives: 0,
      duplicates: 0,
      challenges: [
        {
          finding_id: 'F-001',
          original_severity: 'high',
          decision: 'confirmed',
          final_severity: 'high',
          reasoning: 'Confirmed high severity',
        },
      ],
    }

    const state = makeState({ lensResults, devilsAdvocateResult: daResult })
    const result = await runRoundtable(state)

    expect(() => RoundtableResultSchema.parse(result.roundtableResult)).not.toThrow()
  })

  it('false_positive decision → finding excluded from vetted_findings', async () => {
    const findings = [
      makeFinding({ id: 'KEEP-001', severity: 'medium', title: 'Real Issue' }),
      makeFinding({ id: 'FP-001', severity: 'high', title: 'False Positive' }),
    ]

    const lensResults: LensResult[] = [
      {
        lens: 'react',
        total_findings: 2,
        by_severity: { critical: 0, high: 1, medium: 1, low: 0 },
        findings,
      },
    ]

    const daResult: ChallengeResult = {
      total_reviewed: 2,
      confirmed: 1,
      downgraded: 0,
      upgraded: 0,
      false_positives: 1,
      duplicates: 0,
      challenges: [
        {
          finding_id: 'KEEP-001',
          original_severity: 'medium',
          decision: 'confirmed',
          final_severity: 'medium',
          reasoning: 'Confirmed',
        },
        {
          finding_id: 'FP-001',
          original_severity: 'high',
          decision: 'false_positive',
          final_severity: null,
          reasoning: 'Not actually a problem',
        },
      ],
    }

    const state = makeState({ lensResults, devilsAdvocateResult: daResult })
    const result = await runRoundtable(state)

    const vettedIds = result.roundtableResult?.vetted_findings.map(f => f.id)
    expect(vettedIds).toContain('KEEP-001')
    expect(vettedIds).not.toContain('FP-001')
    expect(result.roundtableResult?.removed.false_positives).toBe(1)
  })

  it('duplicate decision → finding excluded from vetted_findings', async () => {
    const lensResults: LensResult[] = [
      {
        lens: 'typescript',
        total_findings: 2,
        by_severity: { critical: 0, high: 2, medium: 0, low: 0 },
        findings: [
          makeFinding({ id: 'ORIG-001', title: 'Original Issue' }),
          makeFinding({ id: 'DUP-001', title: 'Duplicate Issue' }),
        ],
      },
    ]

    const daResult: ChallengeResult = {
      total_reviewed: 2,
      confirmed: 1,
      downgraded: 0,
      upgraded: 0,
      false_positives: 0,
      duplicates: 1,
      challenges: [
        {
          finding_id: 'ORIG-001',
          original_severity: 'high',
          decision: 'confirmed',
          final_severity: 'high',
          reasoning: 'Confirmed',
        },
        {
          finding_id: 'DUP-001',
          original_severity: 'high',
          decision: 'duplicate',
          final_severity: null,
          reasoning: 'Duplicate of existing story',
        },
      ],
    }

    const state = makeState({ lensResults, devilsAdvocateResult: daResult })
    const result = await runRoundtable(state)

    const vettedIds = result.roundtableResult?.vetted_findings.map(f => f.id)
    expect(vettedIds).toContain('ORIG-001')
    expect(vettedIds).not.toContain('DUP-001')
    expect(result.roundtableResult?.removed.duplicates).toBe(1)
  })

  it('downgraded decision → finding included with updated severity', async () => {
    const lensResults: LensResult[] = [
      {
        lens: 'security',
        total_findings: 1,
        by_severity: { critical: 0, high: 1, medium: 0, low: 0 },
        findings: [makeFinding({ id: 'DG-001', severity: 'high' })],
      },
    ]

    const daResult: ChallengeResult = {
      total_reviewed: 1,
      confirmed: 0,
      downgraded: 1,
      upgraded: 0,
      false_positives: 0,
      duplicates: 0,
      challenges: [
        {
          finding_id: 'DG-001',
          original_severity: 'high',
          decision: 'downgraded',
          final_severity: 'medium',
          reasoning: 'Test file, reduced severity',
        },
      ],
    }

    const state = makeState({ lensResults, devilsAdvocateResult: daResult })
    const result = await runRoundtable(state)

    const vetted = result.roundtableResult?.vetted_findings.find(f => f.id === 'DG-001')
    expect(vetted).toBeDefined()
    expect(vetted?.severity).toBe('medium')
    expect(vetted?.devils_advocate?.decision).toBe('downgraded')
    expect(result.roundtableResult?.severity_changes.downgraded).toBe(1)
  })

  it('passes all findings through when no devil\'s advocate result', async () => {
    const findings = [
      makeFinding({ id: 'A-001', severity: 'high' }),
      makeFinding({ id: 'A-002', severity: 'low' }),
    ]
    const lensResults: LensResult[] = [
      {
        lens: 'react',
        total_findings: 2,
        by_severity: { critical: 0, high: 1, medium: 0, low: 1 },
        findings,
      },
    ]

    const state = makeState({ lensResults, devilsAdvocateResult: null })
    const result = await runRoundtable(state)

    expect(result.roundtableResult?.vetted_count).toBe(2)
    expect(result.roundtableResult?.original_count).toBe(2)
  })

  it('detects cross-references for findings on same file from different lenses', async () => {
    const lensResults: LensResult[] = [
      {
        lens: 'security',
        total_findings: 1,
        by_severity: { critical: 0, high: 1, medium: 0, low: 0 },
        findings: [makeFinding({ id: 'S-001', lens: 'security', file: 'auth.ts' })],
      },
      {
        lens: 'typescript',
        total_findings: 1,
        by_severity: { critical: 0, high: 1, medium: 0, low: 0 },
        findings: [makeFinding({ id: 'T-001', lens: 'typescript', file: 'auth.ts' })],
      },
    ]

    const daResult: ChallengeResult = {
      total_reviewed: 2,
      confirmed: 2,
      downgraded: 0,
      upgraded: 0,
      false_positives: 0,
      duplicates: 0,
      challenges: [
        {
          finding_id: 'S-001',
          original_severity: 'high',
          decision: 'confirmed',
          final_severity: 'high',
          reasoning: 'Confirmed',
        },
        {
          finding_id: 'T-001',
          original_severity: 'high',
          decision: 'confirmed',
          final_severity: 'high',
          reasoning: 'Confirmed',
        },
      ],
    }

    const state = makeState({ lensResults, devilsAdvocateResult: daResult })
    const result = await runRoundtable(state)

    expect(result.roundtableResult?.cross_references.length).toBeGreaterThan(0)
    const ref = result.roundtableResult?.cross_references[0]
    expect(ref?.relationship).toContain('auth.ts')
  })
})
