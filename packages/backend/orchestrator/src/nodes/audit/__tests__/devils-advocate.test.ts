import { describe, expect, it } from 'vitest'

import { runDevilsAdvocate } from '../devils-advocate.js'
import { ChallengeResultSchema } from '../../../artifacts/audit-findings.js'
import type { AuditFinding, LensResult } from '../../../artifacts/audit-findings.js'
import type { CodeAuditState } from '../../../graphs/code-audit.js'

// --- Helpers ---

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

function makeLensResult(findings: AuditFinding[], lens: AuditFinding['lens'] = 'security'): LensResult {
  return {
    lens,
    total_findings: findings.length,
    by_severity: { critical: 0, high: 0, medium: 0, low: 0 },
    findings,
  }
}

function makeState(overrides: Partial<CodeAuditState> = {}): CodeAuditState {
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
  } as CodeAuditState
}

// --- Tests ---

describe('runDevilsAdvocate', () => {
  describe('AC-9: ChallengeResultSchema validates and total_reviewed matches input count', () => {
    it('produces a result that parses against ChallengeResultSchema without throwing', async () => {
      const findings = [
        makeFinding({ id: 'F-001', severity: 'high', confidence: 'high', title: 'Issue A' }),
        makeFinding({ id: 'F-002', severity: 'medium', confidence: 'high', title: 'Issue B' }),
        makeFinding({ id: 'F-003', severity: 'low', confidence: 'high', title: 'Issue C' }),
      ]
      const state = makeState({ lensResults: [makeLensResult(findings)] })
      const result = await runDevilsAdvocate(state)

      expect(result.devilsAdvocateResult).toBeDefined()
      expect(() => ChallengeResultSchema.parse(result.devilsAdvocateResult)).not.toThrow()
    })

    it('sets total_reviewed equal to the number of input findings', async () => {
      const findings = [
        makeFinding({ id: 'F-001', title: 'Issue 1' }),
        makeFinding({ id: 'F-002', title: 'Issue 2' }),
        makeFinding({ id: 'F-003', title: 'Issue 3' }),
        makeFinding({ id: 'F-004', title: 'Issue 4' }),
      ]
      const state = makeState({ lensResults: [makeLensResult(findings)] })
      const result = await runDevilsAdvocate(state)

      expect(result.devilsAdvocateResult!.total_reviewed).toBe(4)
    })

    it('sets total_reviewed to 0 when no findings', async () => {
      const state = makeState({ lensResults: [] })
      const result = await runDevilsAdvocate(state)

      expect(() => ChallengeResultSchema.parse(result.devilsAdvocateResult)).not.toThrow()
      expect(result.devilsAdvocateResult!.total_reviewed).toBe(0)
    })

    it('counts across multiple lens results', async () => {
      const lensResult1 = makeLensResult(
        [makeFinding({ id: 'F-001', title: 'A' }), makeFinding({ id: 'F-002', title: 'B' })],
        'security',
      )
      const lensResult2 = makeLensResult(
        [makeFinding({ id: 'F-003', title: 'C' })],
        'react',
      )
      const state = makeState({ lensResults: [lensResult1, lensResult2] })
      const result = await runDevilsAdvocate(state)

      expect(result.devilsAdvocateResult!.total_reviewed).toBe(3)
    })

    it('challenge count fields sum to total_reviewed', async () => {
      const findings = [
        makeFinding({ id: 'F-001', severity: 'high', confidence: 'high', file: 'src/app.ts', title: 'Normal' }),
        makeFinding({ id: 'F-002', severity: 'high', confidence: 'low', file: 'src/app.ts', title: 'Low conf' }),
      ]
      const state = makeState({ lensResults: [makeLensResult(findings)] })
      const result = await runDevilsAdvocate(state)

      const r = result.devilsAdvocateResult!
      const challengeSum =
        r.confirmed + r.downgraded + r.upgraded + r.false_positives + r.duplicates
      expect(challengeSum).toBe(r.total_reviewed)
    })
  })

  describe('AC-10: low confidence + high severity → downgraded, final_severity: medium', () => {
    it('downgrades a high severity low confidence finding to medium', async () => {
      const finding = makeFinding({ id: 'F-001', severity: 'high', confidence: 'low', title: 'Low conf high sev' })
      const state = makeState({ lensResults: [makeLensResult([finding])] })
      const result = await runDevilsAdvocate(state)

      const challenge = result.devilsAdvocateResult!.challenges[0]
      expect(challenge.decision).toBe('downgraded')
      expect(challenge.final_severity).toBe('medium')
      expect(challenge.original_severity).toBe('high')
    })

    it('downgrades a critical severity low confidence finding to high', async () => {
      const finding = makeFinding({ id: 'F-001', severity: 'critical', confidence: 'low', title: 'Low conf critical' })
      const state = makeState({ lensResults: [makeLensResult([finding])] })
      const result = await runDevilsAdvocate(state)

      const challenge = result.devilsAdvocateResult!.challenges[0]
      expect(challenge.decision).toBe('downgraded')
      expect(challenge.final_severity).toBe('high')
    })

    it('downgrades a medium severity low confidence finding to low', async () => {
      const finding = makeFinding({ id: 'F-001', severity: 'medium', confidence: 'low', title: 'Low conf medium' })
      const state = makeState({ lensResults: [makeLensResult([finding])] })
      const result = await runDevilsAdvocate(state)

      const challenge = result.devilsAdvocateResult!.challenges[0]
      expect(challenge.decision).toBe('downgraded')
      expect(challenge.final_severity).toBe('low')
    })

    it('low severity low confidence stays at low (floor)', async () => {
      const finding = makeFinding({ id: 'F-001', severity: 'low', confidence: 'low', title: 'Low conf low sev' })
      const state = makeState({ lensResults: [makeLensResult([finding])] })
      const result = await runDevilsAdvocate(state)

      const challenge = result.devilsAdvocateResult!.challenges[0]
      expect(challenge.decision).toBe('downgraded')
      expect(challenge.final_severity).toBe('low')
    })

    it('confirms a high confidence high severity finding', async () => {
      const finding = makeFinding({ id: 'F-001', severity: 'high', confidence: 'high', file: 'src/app.ts', title: 'High conf' })
      const state = makeState({ lensResults: [makeLensResult([finding])] })
      const result = await runDevilsAdvocate(state)

      const challenge = result.devilsAdvocateResult!.challenges[0]
      expect(challenge.decision).toBe('confirmed')
    })

    it('increments the downgraded counter correctly', async () => {
      const findings = [
        makeFinding({ id: 'F-001', severity: 'high', confidence: 'low', title: 'Low conf 1' }),
        makeFinding({ id: 'F-002', severity: 'critical', confidence: 'low', title: 'Low conf 2' }),
        makeFinding({ id: 'F-003', severity: 'medium', confidence: 'high', file: 'src/app.ts', title: 'High conf' }),
      ]
      const state = makeState({ lensResults: [makeLensResult(findings)] })
      const result = await runDevilsAdvocate(state)

      expect(result.devilsAdvocateResult!.downgraded).toBe(2)
      expect(result.devilsAdvocateResult!.confirmed).toBe(1)
    })
  })

  describe('AC-11: test file paths with high/critical severity → downgraded to medium', () => {
    it('downgrades a high severity finding in __tests__/ directory to medium', async () => {
      const finding = makeFinding({
        id: 'F-001',
        severity: 'high',
        confidence: 'high',
        file: 'src/__tests__/app.test.ts',
        title: 'Test file high sev',
      })
      const state = makeState({ lensResults: [makeLensResult([finding])] })
      const result = await runDevilsAdvocate(state)

      const challenge = result.devilsAdvocateResult!.challenges[0]
      expect(challenge.decision).toBe('downgraded')
      expect(challenge.final_severity).toBe('medium')
    })

    it('downgrades a critical severity finding in __tests__/ directory to medium', async () => {
      const finding = makeFinding({
        id: 'F-001',
        severity: 'critical',
        confidence: 'high',
        file: 'src/__tests__/dangerous.ts',
        title: 'Critical in test dir',
      })
      const state = makeState({ lensResults: [makeLensResult([finding])] })
      const result = await runDevilsAdvocate(state)

      const challenge = result.devilsAdvocateResult!.challenges[0]
      expect(challenge.decision).toBe('downgraded')
      expect(challenge.final_severity).toBe('medium')
    })

    it('downgrades a high severity finding matching .test. in filename to medium', async () => {
      const finding = makeFinding({
        id: 'F-001',
        severity: 'high',
        confidence: 'high',
        file: 'src/components/Button.test.tsx',
        title: 'High in .test. file',
      })
      const state = makeState({ lensResults: [makeLensResult([finding])] })
      const result = await runDevilsAdvocate(state)

      const challenge = result.devilsAdvocateResult!.challenges[0]
      expect(challenge.decision).toBe('downgraded')
      expect(challenge.final_severity).toBe('medium')
    })

    it('downgrades a high severity finding matching .spec. in filename to medium', async () => {
      const finding = makeFinding({
        id: 'F-001',
        severity: 'high',
        confidence: 'high',
        file: 'src/components/Button.spec.tsx',
        title: 'High in .spec. file',
      })
      const state = makeState({ lensResults: [makeLensResult([finding])] })
      const result = await runDevilsAdvocate(state)

      const challenge = result.devilsAdvocateResult!.challenges[0]
      expect(challenge.decision).toBe('downgraded')
      expect(challenge.final_severity).toBe('medium')
    })

    it('does NOT downgrade a medium severity finding in a test file', async () => {
      const finding = makeFinding({
        id: 'F-001',
        severity: 'medium',
        confidence: 'high',
        file: 'src/__tests__/util.test.ts',
        title: 'Medium in test file',
      })
      const state = makeState({ lensResults: [makeLensResult([finding])] })
      const result = await runDevilsAdvocate(state)

      const challenge = result.devilsAdvocateResult!.challenges[0]
      // medium severity in test file is not subject to test-file rule (only high/critical are)
      expect(challenge.decision).toBe('confirmed')
    })

    it('downgrades a high severity finding in a config file to medium', async () => {
      const finding = makeFinding({
        id: 'F-001',
        severity: 'high',
        confidence: 'high',
        file: 'vite.config.ts',
        title: 'High in config file',
      })
      const state = makeState({ lensResults: [makeLensResult([finding])] })
      const result = await runDevilsAdvocate(state)

      const challenge = result.devilsAdvocateResult!.challenges[0]
      expect(challenge.decision).toBe('downgraded')
      expect(challenge.final_severity).toBe('medium')
    })

    it('downgrades a high severity finding in setup.ts file to medium', async () => {
      const finding = makeFinding({
        id: 'F-001',
        severity: 'high',
        confidence: 'high',
        file: 'src/test/setup.ts',
        title: 'High in setup.ts',
      })
      const state = makeState({ lensResults: [makeLensResult([finding])] })
      const result = await runDevilsAdvocate(state)

      const challenge = result.devilsAdvocateResult!.challenges[0]
      expect(challenge.decision).toBe('downgraded')
      expect(challenge.final_severity).toBe('medium')
    })

    it('finding_id in challenge matches the input finding id', async () => {
      const finding = makeFinding({
        id: 'F-XYZ-999',
        severity: 'high',
        confidence: 'high',
        file: 'src/__tests__/app.test.ts',
        title: 'ID check',
      })
      const state = makeState({ lensResults: [makeLensResult([finding])] })
      const result = await runDevilsAdvocate(state)

      expect(result.devilsAdvocateResult!.challenges[0].finding_id).toBe('F-XYZ-999')
    })
  })
})
