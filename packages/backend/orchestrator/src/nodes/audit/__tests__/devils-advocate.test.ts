import { describe, expect, it } from 'vitest'

import { runDevilsAdvocate } from '../devils-advocate.js'
import { ChallengeResultSchema } from '../../../artifacts/audit-findings.js'
import type { CodeAuditState } from '../../../graphs/code-audit.js'
import type { AuditFinding, LensResult } from '../../../artifacts/audit-findings.js'

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

describe('runDevilsAdvocate', () => {
  it('ChallengeResultSchema.parse() does not throw on valid result', async () => {
    const lensResults: LensResult[] = [
      {
        lens: 'security',
        total_findings: 1,
        by_severity: { critical: 0, high: 1, medium: 0, low: 0 },
        findings: [makeFinding({ id: 'SEC-001' })],
      },
    ]

    const state = makeState({ lensResults })
    const result = await runDevilsAdvocate(state)

    expect(() => ChallengeResultSchema.parse(result.devilsAdvocateResult)).not.toThrow()
  })

  it('total_reviewed matches input finding count', async () => {
    const findings = [
      makeFinding({ id: 'F-001', severity: 'high' }),
      makeFinding({ id: 'F-002', severity: 'medium' }),
      makeFinding({ id: 'F-003', severity: 'low' }),
    ]

    const lensResults: LensResult[] = [
      {
        lens: 'typescript',
        total_findings: 3,
        by_severity: { critical: 0, high: 1, medium: 1, low: 1 },
        findings,
      },
    ]

    const state = makeState({ lensResults })
    const result = await runDevilsAdvocate(state)

    expect(result.devilsAdvocateResult?.total_reviewed).toBe(3)
  })

  it('low confidence + high severity → decision: downgraded, final_severity: medium', async () => {
    const lensResults: LensResult[] = [
      {
        lens: 'security',
        total_findings: 1,
        by_severity: { critical: 0, high: 1, medium: 0, low: 0 },
        findings: [
          makeFinding({ id: 'LC-001', severity: 'high', confidence: 'low' }),
        ],
      },
    ]

    const state = makeState({ lensResults })
    const result = await runDevilsAdvocate(state)

    const challenge = result.devilsAdvocateResult?.challenges.find(c => c.finding_id === 'LC-001')
    expect(challenge).toBeDefined()
    expect(challenge?.decision).toBe('downgraded')
    expect(challenge?.final_severity).toBe('medium')
  })

  it('low confidence + critical severity → decision: downgraded, final_severity: high', async () => {
    const lensResults: LensResult[] = [
      {
        lens: 'security',
        total_findings: 1,
        by_severity: { critical: 1, high: 0, medium: 0, low: 0 },
        findings: [
          makeFinding({ id: 'LC-002', severity: 'critical', confidence: 'low' }),
        ],
      },
    ]

    const state = makeState({ lensResults })
    const result = await runDevilsAdvocate(state)

    const challenge = result.devilsAdvocateResult?.challenges.find(c => c.finding_id === 'LC-002')
    expect(challenge?.decision).toBe('downgraded')
    expect(challenge?.final_severity).toBe('high')
  })

  it('__tests__/ path + high severity → downgraded to medium', async () => {
    const lensResults: LensResult[] = [
      {
        lens: 'security',
        total_findings: 1,
        by_severity: { critical: 0, high: 1, medium: 0, low: 0 },
        findings: [
          makeFinding({
            id: 'TST-001',
            severity: 'high',
            confidence: 'high',
            file: 'src/__tests__/auth.test.ts',
          }),
        ],
      },
    ]

    const state = makeState({ lensResults })
    const result = await runDevilsAdvocate(state)

    const challenge = result.devilsAdvocateResult?.challenges.find(c => c.finding_id === 'TST-001')
    expect(challenge?.decision).toBe('downgraded')
    expect(challenge?.final_severity).toBe('medium')
  })

  it('.test. path + high severity → downgraded to medium', async () => {
    const lensResults: LensResult[] = [
      {
        lens: 'react',
        total_findings: 1,
        by_severity: { critical: 0, high: 1, medium: 0, low: 0 },
        findings: [
          makeFinding({
            id: 'TST-002',
            severity: 'high',
            confidence: 'high',
            file: 'src/component.test.tsx',
          }),
        ],
      },
    ]

    const state = makeState({ lensResults })
    const result = await runDevilsAdvocate(state)

    const challenge = result.devilsAdvocateResult?.challenges.find(c => c.finding_id === 'TST-002')
    expect(challenge?.decision).toBe('downgraded')
    expect(challenge?.final_severity).toBe('medium')
  })

  it('high confidence + production file → confirmed as-is', async () => {
    const lensResults: LensResult[] = [
      {
        lens: 'security',
        total_findings: 1,
        by_severity: { critical: 0, high: 1, medium: 0, low: 0 },
        findings: [
          makeFinding({
            id: 'PROD-001',
            severity: 'high',
            confidence: 'high',
            file: 'src/auth/handler.ts',
          }),
        ],
      },
    ]

    const state = makeState({ lensResults })
    const result = await runDevilsAdvocate(state)

    const challenge = result.devilsAdvocateResult?.challenges.find(
      c => c.finding_id === 'PROD-001',
    )
    expect(challenge?.decision).toBe('confirmed')
    expect(challenge?.final_severity).toBe('high')
  })

  it('handles empty findings list', async () => {
    const state = makeState({ lensResults: [] })
    const result = await runDevilsAdvocate(state)

    expect(result.devilsAdvocateResult?.total_reviewed).toBe(0)
    expect(result.devilsAdvocateResult?.challenges).toHaveLength(0)
    expect(() => ChallengeResultSchema.parse(result.devilsAdvocateResult)).not.toThrow()
  })
})
