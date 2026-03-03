import { describe, expect, it } from 'vitest'

import { runRoundtable } from '../roundtable.js'
import { RoundtableResultSchema } from '../../../artifacts/audit-findings.js'
import type {
  AuditFinding,
  LensResult,
  ChallengeResult,
} from '../../../artifacts/audit-findings.js'
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

function makeChallengeResult(
  challenges: ChallengeResult['challenges'],
): ChallengeResult {
  return {
    total_reviewed: challenges.length,
    confirmed: challenges.filter(c => c.decision === 'confirmed').length,
    downgraded: challenges.filter(c => c.decision === 'downgraded').length,
    upgraded: challenges.filter(c => c.decision === 'upgraded').length,
    false_positives: challenges.filter(c => c.decision === 'false_positive').length,
    duplicates: challenges.filter(c => c.decision === 'duplicate').length,
    challenges,
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

describe('runRoundtable', () => {
  describe('AC-12: RoundtableResultSchema validates; vetted_count matches expectations', () => {
    it('produces a result that parses against RoundtableResultSchema without throwing', async () => {
      const findings = [
        makeFinding({ id: 'F-001', severity: 'high', title: 'Issue A' }),
        makeFinding({ id: 'F-002', severity: 'medium', title: 'Issue B' }),
      ]
      const daResult = makeChallengeResult([
        {
          finding_id: 'F-001',
          original_severity: 'high',
          decision: 'confirmed',
          final_severity: 'high',
          reasoning: 'Valid high severity issue',
        },
        {
          finding_id: 'F-002',
          original_severity: 'medium',
          decision: 'confirmed',
          final_severity: 'medium',
          reasoning: 'Valid medium severity issue',
        },
      ])
      const state = makeState({
        lensResults: [makeLensResult(findings)],
        devilsAdvocateResult: daResult,
      })
      const result = await runRoundtable(state)

      expect(result.roundtableResult).toBeDefined()
      expect(() => RoundtableResultSchema.parse(result.roundtableResult)).not.toThrow()
    })

    it('vetted_count equals number of confirmed findings', async () => {
      const findings = [
        makeFinding({ id: 'F-001', severity: 'high', title: 'Confirmed' }),
        makeFinding({ id: 'F-002', severity: 'medium', title: 'Also confirmed' }),
        makeFinding({ id: 'F-003', severity: 'low', title: 'False positive' }),
      ]
      const daResult = makeChallengeResult([
        {
          finding_id: 'F-001',
          original_severity: 'high',
          decision: 'confirmed',
          final_severity: 'high',
          reasoning: 'Confirmed',
        },
        {
          finding_id: 'F-002',
          original_severity: 'medium',
          decision: 'confirmed',
          final_severity: 'medium',
          reasoning: 'Confirmed',
        },
        {
          finding_id: 'F-003',
          original_severity: 'low',
          decision: 'false_positive',
          final_severity: null,
          reasoning: 'Not real',
        },
      ])
      const state = makeState({
        lensResults: [makeLensResult(findings)],
        devilsAdvocateResult: daResult,
      })
      const result = await runRoundtable(state)

      expect(result.roundtableResult!.vetted_count).toBe(2)
    })

    it('original_count matches total findings from lensResults', async () => {
      const findings = [
        makeFinding({ id: 'F-001', title: 'A' }),
        makeFinding({ id: 'F-002', title: 'B' }),
        makeFinding({ id: 'F-003', title: 'C' }),
      ]
      const daResult = makeChallengeResult([
        { finding_id: 'F-001', original_severity: 'medium', decision: 'confirmed', final_severity: 'medium', reasoning: 'ok' },
        { finding_id: 'F-002', original_severity: 'medium', decision: 'confirmed', final_severity: 'medium', reasoning: 'ok' },
        { finding_id: 'F-003', original_severity: 'medium', decision: 'confirmed', final_severity: 'medium', reasoning: 'ok' },
      ])
      const state = makeState({
        lensResults: [makeLensResult(findings)],
        devilsAdvocateResult: daResult,
      })
      const result = await runRoundtable(state)

      expect(result.roundtableResult!.original_count).toBe(3)
    })

    it('passes all findings through when no devil\'s advocate result', async () => {
      const findings = [
        makeFinding({ id: 'F-001', title: 'A' }),
        makeFinding({ id: 'F-002', title: 'B' }),
      ]
      const state = makeState({
        lensResults: [makeLensResult(findings)],
        devilsAdvocateResult: null,
      })
      const result = await runRoundtable(state)

      expect(() => RoundtableResultSchema.parse(result.roundtableResult)).not.toThrow()
      expect(result.roundtableResult!.vetted_count).toBe(2)
      expect(result.roundtableResult!.vetted_findings.length).toBe(2)
    })

    it('downgraded findings appear in vetted_findings with adjusted severity', async () => {
      const finding = makeFinding({ id: 'F-001', severity: 'high', title: 'Downgraded' })
      const daResult = makeChallengeResult([
        {
          finding_id: 'F-001',
          original_severity: 'high',
          decision: 'downgraded',
          final_severity: 'medium',
          reasoning: 'Reduced after review',
        },
      ])
      const state = makeState({
        lensResults: [makeLensResult([finding])],
        devilsAdvocateResult: daResult,
      })
      const result = await runRoundtable(state)

      expect(result.roundtableResult!.vetted_count).toBe(1)
      expect(result.roundtableResult!.vetted_findings[0].severity).toBe('medium')
      expect(result.roundtableResult!.severity_changes.downgraded).toBe(1)
    })

    it('upgraded findings appear in vetted_findings with elevated severity', async () => {
      const finding = makeFinding({ id: 'F-001', severity: 'medium', title: 'Upgraded' })
      const daResult = makeChallengeResult([
        {
          finding_id: 'F-001',
          original_severity: 'medium',
          decision: 'upgraded',
          final_severity: 'high',
          reasoning: 'More severe than initially assessed',
        },
      ])
      const state = makeState({
        lensResults: [makeLensResult([finding])],
        devilsAdvocateResult: daResult,
      })
      const result = await runRoundtable(state)

      expect(result.roundtableResult!.vetted_count).toBe(1)
      expect(result.roundtableResult!.vetted_findings[0].severity).toBe('high')
      expect(result.roundtableResult!.severity_changes.upgraded).toBe(1)
    })

    it('deferred findings are kept as-is in vetted_findings', async () => {
      const finding = makeFinding({ id: 'F-001', severity: 'medium', title: 'Deferred' })
      const daResult = makeChallengeResult([
        {
          finding_id: 'F-001',
          original_severity: 'medium',
          decision: 'deferred',
          final_severity: 'medium',
          reasoning: 'Review later',
        },
      ])
      const state = makeState({
        lensResults: [makeLensResult([finding])],
        devilsAdvocateResult: daResult,
      })
      const result = await runRoundtable(state)

      expect(result.roundtableResult!.vetted_count).toBe(1)
      expect(result.roundtableResult!.vetted_findings[0].severity).toBe('medium')
    })

    it('detects cross-references when same file is flagged by different lenses', async () => {
      const lensResult1 = makeLensResult(
        [makeFinding({ id: 'F-001', lens: 'security', file: 'src/shared.ts', title: 'Security issue' })],
        'security',
      )
      const lensResult2 = makeLensResult(
        [makeFinding({ id: 'F-002', lens: 'react', file: 'src/shared.ts', title: 'React issue' })],
        'react',
      )
      const daResult = makeChallengeResult([
        { finding_id: 'F-001', original_severity: 'medium', decision: 'confirmed', final_severity: 'medium', reasoning: 'ok' },
        { finding_id: 'F-002', original_severity: 'medium', decision: 'confirmed', final_severity: 'medium', reasoning: 'ok' },
      ])
      const state = makeState({
        lensResults: [lensResult1, lensResult2],
        devilsAdvocateResult: daResult,
      })
      const result = await runRoundtable(state)

      expect(result.roundtableResult!.cross_references.length).toBeGreaterThan(0)
      const crossRef = result.roundtableResult!.cross_references[0]
      expect(crossRef.findings).toContain('F-001')
      expect(crossRef.findings).toContain('F-002')
    })

    it('no cross-references when findings are in different files', async () => {
      const findings = [
        makeFinding({ id: 'F-001', lens: 'security', file: 'src/a.ts', title: 'Issue A' }),
        makeFinding({ id: 'F-002', lens: 'react', file: 'src/b.ts', title: 'Issue B' }),
      ]
      const daResult = makeChallengeResult([
        { finding_id: 'F-001', original_severity: 'medium', decision: 'confirmed', final_severity: 'medium', reasoning: 'ok' },
        { finding_id: 'F-002', original_severity: 'medium', decision: 'confirmed', final_severity: 'medium', reasoning: 'ok' },
      ])
      const state = makeState({
        lensResults: [makeLensResult(findings)],
        devilsAdvocateResult: daResult,
      })
      const result = await runRoundtable(state)

      expect(result.roundtableResult!.cross_references.length).toBe(0)
    })
  })

  describe('AC-13: false_positive decision → finding excluded from vetted_findings', () => {
    it('excludes a single false_positive finding from vetted_findings', async () => {
      const finding = makeFinding({ id: 'F-001', severity: 'high', title: 'False positive' })
      const daResult = makeChallengeResult([
        {
          finding_id: 'F-001',
          original_severity: 'high',
          decision: 'false_positive',
          final_severity: null,
          reasoning: 'Not a real issue',
        },
      ])
      const state = makeState({
        lensResults: [makeLensResult([finding])],
        devilsAdvocateResult: daResult,
      })
      const result = await runRoundtable(state)

      expect(result.roundtableResult!.vetted_findings.length).toBe(0)
      expect(result.roundtableResult!.vetted_count).toBe(0)
      expect(result.roundtableResult!.removed.false_positives).toBe(1)
    })

    it('excludes duplicate findings from vetted_findings', async () => {
      const finding = makeFinding({ id: 'F-001', severity: 'medium', title: 'Duplicate' })
      const daResult = makeChallengeResult([
        {
          finding_id: 'F-001',
          original_severity: 'medium',
          decision: 'duplicate',
          final_severity: null,
          reasoning: 'Already covered by another finding',
        },
      ])
      const state = makeState({
        lensResults: [makeLensResult([finding])],
        devilsAdvocateResult: daResult,
      })
      const result = await runRoundtable(state)

      expect(result.roundtableResult!.vetted_findings.length).toBe(0)
      expect(result.roundtableResult!.removed.duplicates).toBe(1)
    })

    it('keeps other findings when only some are false positives', async () => {
      const findings = [
        makeFinding({ id: 'F-001', severity: 'high', title: 'Real issue' }),
        makeFinding({ id: 'F-002', severity: 'medium', title: 'False positive' }),
        makeFinding({ id: 'F-003', severity: 'low', title: 'Also real' }),
      ]
      const daResult = makeChallengeResult([
        { finding_id: 'F-001', original_severity: 'high', decision: 'confirmed', final_severity: 'high', reasoning: 'real' },
        { finding_id: 'F-002', original_severity: 'medium', decision: 'false_positive', final_severity: null, reasoning: 'not real' },
        { finding_id: 'F-003', original_severity: 'low', decision: 'confirmed', final_severity: 'low', reasoning: 'real' },
      ])
      const state = makeState({
        lensResults: [makeLensResult(findings)],
        devilsAdvocateResult: daResult,
      })
      const result = await runRoundtable(state)

      expect(result.roundtableResult!.vetted_findings.length).toBe(2)
      const vettedIds = result.roundtableResult!.vetted_findings.map(f => f.id)
      expect(vettedIds).toContain('F-001')
      expect(vettedIds).toContain('F-003')
      expect(vettedIds).not.toContain('F-002')
    })

    it('finding not in challengeMap is kept as-is in vetted_findings', async () => {
      const findings = [
        makeFinding({ id: 'F-001', severity: 'high', title: 'Challenged' }),
        makeFinding({ id: 'F-002', severity: 'medium', title: 'Not challenged' }),
      ]
      const daResult = makeChallengeResult([
        // Only F-001 in challenges — F-002 has no challenge entry
        { finding_id: 'F-001', original_severity: 'high', decision: 'confirmed', final_severity: 'high', reasoning: 'ok' },
      ])
      const state = makeState({
        lensResults: [makeLensResult(findings)],
        devilsAdvocateResult: daResult,
      })
      const result = await runRoundtable(state)

      const vettedIds = result.roundtableResult!.vetted_findings.map(f => f.id)
      expect(vettedIds).toContain('F-001')
      expect(vettedIds).toContain('F-002')
    })

    it('removed.false_positives count matches number of false_positive decisions', async () => {
      const findings = [
        makeFinding({ id: 'F-001', title: 'FP 1' }),
        makeFinding({ id: 'F-002', title: 'FP 2' }),
        makeFinding({ id: 'F-003', title: 'Real' }),
      ]
      const daResult = makeChallengeResult([
        { finding_id: 'F-001', original_severity: 'medium', decision: 'false_positive', final_severity: null, reasoning: 'fp' },
        { finding_id: 'F-002', original_severity: 'medium', decision: 'false_positive', final_severity: null, reasoning: 'fp' },
        { finding_id: 'F-003', original_severity: 'medium', decision: 'confirmed', final_severity: 'medium', reasoning: 'real' },
      ])
      const state = makeState({
        lensResults: [makeLensResult(findings)],
        devilsAdvocateResult: daResult,
      })
      const result = await runRoundtable(state)

      expect(result.roundtableResult!.removed.false_positives).toBe(2)
    })

    it('vetted_findings include devils_advocate annotation on challenged findings', async () => {
      const finding = makeFinding({ id: 'F-001', severity: 'high', title: 'Challenged confirmed' })
      const daResult = makeChallengeResult([
        {
          finding_id: 'F-001',
          original_severity: 'high',
          decision: 'confirmed',
          final_severity: 'high',
          reasoning: 'Definitely real',
        },
      ])
      const state = makeState({
        lensResults: [makeLensResult([finding])],
        devilsAdvocateResult: daResult,
      })
      const result = await runRoundtable(state)

      const vettedFinding = result.roundtableResult!.vetted_findings[0]
      expect(vettedFinding.devils_advocate).toBeDefined()
      expect(vettedFinding.devils_advocate!.challenged).toBe(true)
      expect(vettedFinding.devils_advocate!.decision).toBe('confirmed')
    })
  })
})
