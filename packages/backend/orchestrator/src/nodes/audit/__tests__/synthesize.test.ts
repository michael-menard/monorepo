import { describe, expect, it } from 'vitest'

import { synthesize } from '../synthesize.js'
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
  } as CodeAuditState
}

// --- Tests ---

describe('synthesize', () => {
  describe('AC-6: sequential AUDIT-001..AUDIT-00N IDs in severity order', () => {
    it('assigns sequential IDs starting from AUDIT-001', async () => {
      const findings = [
        makeFinding({ severity: 'low', file: 'src/a.ts', title: 'Low issue' }),
        makeFinding({ severity: 'high', file: 'src/b.ts', title: 'High issue' }),
        makeFinding({ severity: 'critical', file: 'src/c.ts', title: 'Critical issue' }),
      ]
      const state = makeState({ lensResults: [makeLensResult(findings)] })
      const result = await synthesize(state)

      expect(result.findings).toBeDefined()
      const ids = result.findings!.map(f => f.id)
      expect(ids[0]).toBe('AUDIT-001')
      expect(ids[1]).toBe('AUDIT-002')
      expect(ids[2]).toBe('AUDIT-003')
    })

    it('orders findings by severity: critical first, then high, medium, low', async () => {
      const findings = [
        makeFinding({ severity: 'low', file: 'src/a.ts', title: 'Low issue' }),
        makeFinding({ severity: 'medium', file: 'src/b.ts', title: 'Medium issue' }),
        makeFinding({ severity: 'high', file: 'src/c.ts', title: 'High issue' }),
        makeFinding({ severity: 'critical', file: 'src/d.ts', title: 'Critical issue' }),
      ]
      const state = makeState({ lensResults: [makeLensResult(findings)] })
      const result = await synthesize(state)

      expect(result.findings).toBeDefined()
      const severities = result.findings!.map(f => f.severity)
      expect(severities).toEqual(['critical', 'high', 'medium', 'low'])
    })

    it('sorts findings of same severity alphabetically by file', async () => {
      const findings = [
        makeFinding({ severity: 'high', file: 'src/z.ts', title: 'Z file issue' }),
        makeFinding({ severity: 'high', file: 'src/a.ts', title: 'A file issue' }),
        makeFinding({ severity: 'high', file: 'src/m.ts', title: 'M file issue' }),
      ]
      const state = makeState({ lensResults: [makeLensResult(findings)] })
      const result = await synthesize(state)

      expect(result.findings).toBeDefined()
      const files = result.findings!.map(f => f.file)
      expect(files).toEqual(['src/a.ts', 'src/m.ts', 'src/z.ts'])
    })

    it('uses roundtable vetted_findings when roundtableResult is set', async () => {
      const vettedFindings = [
        makeFinding({ severity: 'critical', file: 'src/vetted.ts', title: 'Vetted critical' }),
        makeFinding({ severity: 'medium', file: 'src/other.ts', title: 'Vetted medium' }),
      ]
      const state = makeState({
        roundtableResult: {
          original_count: 3,
          vetted_count: 2,
          removed: { false_positives: 1, duplicates: 0 },
          severity_changes: { downgraded: 0, upgraded: 0 },
          cross_references: [],
          vetted_findings: vettedFindings,
        },
        // lensResults present but should be ignored in roundtable mode
        lensResults: [makeLensResult([makeFinding({ severity: 'low', file: 'src/ignored.ts', title: 'Ignored' })])],
      })
      const result = await synthesize(state)

      expect(result.findings).toBeDefined()
      expect(result.findings!.length).toBe(2)
      // Confirm it came from vetted_findings, not lensResults
      const files = result.findings!.map(f => f.file)
      expect(files).not.toContain('src/ignored.ts')
      expect(files).toContain('src/vetted.ts')
    })

    it('assigns padded 3-digit IDs (AUDIT-001 not AUDIT-1)', async () => {
      const findings = Array.from({ length: 12 }, (_, i) =>
        makeFinding({ severity: 'low', file: `src/file${i}.ts`, title: `Issue ${i}` }),
      )
      const state = makeState({ lensResults: [makeLensResult(findings)] })
      const result = await synthesize(state)

      expect(result.findings![0].id).toBe('AUDIT-001')
      expect(result.findings![9].id).toBe('AUDIT-010')
      expect(result.findings![11].id).toBe('AUDIT-012')
    })
  })

  describe('AC-7: deduplication — same file+title keeps higher severity', () => {
    it('deduplicates findings with same file and title, keeping higher severity', async () => {
      const findings = [
        makeFinding({ severity: 'medium', file: 'src/dup.ts', title: 'Duplicate issue', lens: 'security' }),
        makeFinding({ severity: 'high', file: 'src/dup.ts', title: 'Duplicate issue', lens: 'react' }),
      ]
      const state = makeState({ lensResults: [makeLensResult(findings)] })
      const result = await synthesize(state)

      expect(result.findings).toBeDefined()
      expect(result.findings!.length).toBe(1)
      expect(result.findings![0].severity).toBe('high')
    })

    it('deduplicates across multiple lens results', async () => {
      const lensResult1 = makeLensResult(
        [makeFinding({ severity: 'low', file: 'src/shared.ts', title: 'Cross-lens issue', lens: 'security' })],
        'security',
      )
      const lensResult2 = makeLensResult(
        [makeFinding({ severity: 'critical', file: 'src/shared.ts', title: 'Cross-lens issue', lens: 'react' })],
        'react',
      )
      const state = makeState({ lensResults: [lensResult1, lensResult2] })
      const result = await synthesize(state)

      expect(result.findings!.length).toBe(1)
      expect(result.findings![0].severity).toBe('critical')
    })

    it('keeps both findings when file is same but title differs', async () => {
      const findings = [
        makeFinding({ severity: 'high', file: 'src/same.ts', title: 'Issue A' }),
        makeFinding({ severity: 'medium', file: 'src/same.ts', title: 'Issue B' }),
      ]
      const state = makeState({ lensResults: [makeLensResult(findings)] })
      const result = await synthesize(state)

      expect(result.findings!.length).toBe(2)
    })

    it('keeps both findings when title is same but file differs', async () => {
      const findings = [
        makeFinding({ severity: 'high', file: 'src/file-a.ts', title: 'Same title' }),
        makeFinding({ severity: 'medium', file: 'src/file-b.ts', title: 'Same title' }),
      ]
      const state = makeState({ lensResults: [makeLensResult(findings)] })
      const result = await synthesize(state)

      expect(result.findings!.length).toBe(2)
    })

    it('does not upgrade severity when duplicate has lower severity', async () => {
      const findings = [
        makeFinding({ severity: 'critical', file: 'src/dup.ts', title: 'Dup issue' }),
        makeFinding({ severity: 'low', file: 'src/dup.ts', title: 'Dup issue' }),
      ]
      const state = makeState({ lensResults: [makeLensResult(findings)] })
      const result = await synthesize(state)

      expect(result.findings!.length).toBe(1)
      expect(result.findings![0].severity).toBe('critical')
    })
  })

  describe('AC-8: cap at 100 findings', () => {
    it('returns at most 100 findings when given more than 100', async () => {
      const findings = Array.from({ length: 150 }, (_, i) =>
        makeFinding({ severity: 'low', file: `src/file${i}.ts`, title: `Unique issue ${i}` }),
      )
      const state = makeState({ lensResults: [makeLensResult(findings)] })
      const result = await synthesize(state)

      expect(result.findings).toBeDefined()
      expect(result.findings!.length).toBe(100)
    })

    it('keeps exactly 100 findings when given exactly 100', async () => {
      const findings = Array.from({ length: 100 }, (_, i) =>
        makeFinding({ severity: 'medium', file: `src/file${i}.ts`, title: `Issue ${i}` }),
      )
      const state = makeState({ lensResults: [makeLensResult(findings)] })
      const result = await synthesize(state)

      expect(result.findings!.length).toBe(100)
    })

    it('keeps higher-severity findings when capped at 100 — critical before low', async () => {
      // 50 critical + 60 low = 110 total; after cap, only 100 returned
      // After sort, criticals come first, so all 50 criticals must be in output
      const criticals = Array.from({ length: 50 }, (_, i) =>
        makeFinding({ severity: 'critical', file: `src/crit${i}.ts`, title: `Critical ${i}` }),
      )
      const lows = Array.from({ length: 60 }, (_, i) =>
        makeFinding({ severity: 'low', file: `src/low${i}.ts`, title: `Low ${i}` }),
      )
      const state = makeState({ lensResults: [makeLensResult([...criticals, ...lows])] })
      const result = await synthesize(state)

      expect(result.findings!.length).toBe(100)
      const criticalCount = result.findings!.filter(f => f.severity === 'critical').length
      expect(criticalCount).toBe(50)
      // Only 50 low findings should survive (100 - 50 criticals)
      const lowCount = result.findings!.filter(f => f.severity === 'low').length
      expect(lowCount).toBe(50)
    })

    it('returns all findings when fewer than 100', async () => {
      const findings = Array.from({ length: 5 }, (_, i) =>
        makeFinding({ severity: 'high', file: `src/file${i}.ts`, title: `Issue ${i}` }),
      )
      const state = makeState({ lensResults: [makeLensResult(findings)] })
      const result = await synthesize(state)

      expect(result.findings!.length).toBe(5)
    })
  })

  describe('edge cases', () => {
    it('returns empty findings when no lens results', async () => {
      const state = makeState({ lensResults: [] })
      const result = await synthesize(state)

      expect(result.findings).toBeDefined()
      expect(result.findings!.length).toBe(0)
    })

    it('returns empty findings when lens results have no findings', async () => {
      const state = makeState({ lensResults: [makeLensResult([])] })
      const result = await synthesize(state)

      expect(result.findings!.length).toBe(0)
    })
  })
})
