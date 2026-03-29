import { describe, expect, it } from 'vitest'

import {
  AuditFindingsSchema,
  LensResultSchema,
  ChallengeResultSchema,
  RoundtableResultSchema,
  DedupResultSchema,
  TrendSnapshotSchema,
  createAuditFindings,
  addLensFindings,
  calculateTrend,
  type AuditFindings,
  type LensResult,
  type AuditLens,
  type AuditSeverity,
} from '../audit-findings.js'

describe('AuditFindingsSchema', () => {
  it('validates a minimal valid audit findings artifact', () => {
    const findings: AuditFindings = {
      schema: 1,
      timestamp: '2026-02-14T12:00:00.000Z',
      mode: 'pipeline',
      scope: 'full',
      target: 'apps/',
      lenses_run: ['security', 'duplication'],
      summary: {
        total_findings: 0,
        by_severity: { critical: 0, high: 0, medium: 0, low: 0 },
        by_lens: {},
        new_since_last: 0,
        recurring: 0,
        fixed_since_last: 0,
      },
      findings: [],
      metrics: {
        files_scanned: 42,
      },
    }

    const result = AuditFindingsSchema.parse(findings)
    expect(result).toEqual(findings)
  })

  it('validates audit findings with all optional fields', () => {
    const findings: AuditFindings = {
      schema: 1,
      timestamp: '2026-02-14T12:00:00.000Z',
      mode: 'roundtable',
      scope: 'delta',
      target: 'packages/',
      lenses_run: ['security', 'react', 'typescript'],
      summary: {
        total_findings: 5,
        by_severity: { critical: 1, high: 2, medium: 1, low: 1 },
        by_lens: { security: 2, react: 2, typescript: 1 },
        new_since_last: 3,
        recurring: 2,
        fixed_since_last: 1,
      },
      findings: [
        {
          id: 'F-001',
          lens: 'security',
          severity: 'critical',
          confidence: 'high',
          title: 'SQL Injection vulnerability',
          file: 'src/db/query.ts',
          evidence: 'Unsanitized input used in query',
          remediation: 'Use parameterized queries',
          status: 'new',
        },
      ],
      metrics: {
        files_scanned: 100,
        lines_scanned: 5000,
        duration_ms: 30000,
        tokens: { in: 1000, out: 500 },
      },
      trend_data: {
        previous_run: 'FINDINGS-2026-02-13.yaml',
        delta: { new: 3, fixed: 1, recurring: 2 },
      },
    }

    const result = AuditFindingsSchema.parse(findings)
    expect(result.findings.length).toBe(1)
    expect(result.trend_data?.previous_run).toBe('FINDINGS-2026-02-13.yaml')
  })

  it('rejects invalid schema version', () => {
    const findings = {
      schema: 2,
      timestamp: '2026-02-14T12:00:00.000Z',
      mode: 'pipeline',
      scope: 'full',
      target: 'apps/',
      lenses_run: [],
      summary: {
        total_findings: 0,
        by_severity: { critical: 0, high: 0, medium: 0, low: 0 },
        by_lens: {},
        new_since_last: 0,
        recurring: 0,
        fixed_since_last: 0,
      },
      findings: [],
      metrics: { files_scanned: 0 },
    }

    expect(() => AuditFindingsSchema.parse(findings)).toThrow()
  })

  it('rejects invalid timestamp format', () => {
    const findings = {
      schema: 1,
      timestamp: 'not-a-timestamp',
      mode: 'pipeline',
      scope: 'full',
      target: 'apps/',
      lenses_run: [],
      summary: {
        total_findings: 0,
        by_severity: { critical: 0, high: 0, medium: 0, low: 0 },
        by_lens: {},
        new_since_last: 0,
        recurring: 0,
        fixed_since_last: 0,
      },
      findings: [],
      metrics: { files_scanned: 0 },
    }

    expect(() => AuditFindingsSchema.parse(findings)).toThrow()
  })

  it('rejects missing required fields', () => {
    const findings = {
      schema: 1,
      timestamp: '2026-02-14T12:00:00.000Z',
      mode: 'pipeline',
      // missing scope, target, lenses_run, summary, findings, metrics
    }

    expect(() => AuditFindingsSchema.parse(findings)).toThrow()
  })

  it('validates empty findings array', () => {
    const findings = createAuditFindings('pipeline', 'full', 'apps/', [])

    expect(() => AuditFindingsSchema.parse(findings)).not.toThrow()
    expect(findings.findings).toEqual([])
    expect(findings.summary.total_findings).toBe(0)
  })

  it('validates boundary values for severity counts', () => {
    const findings = createAuditFindings('pipeline', 'full', 'apps/', [])
    findings.summary.by_severity = { critical: 0, high: 0, medium: 0, low: 0 }

    expect(() => AuditFindingsSchema.parse(findings)).not.toThrow()
  })

  it('rejects negative severity counts', () => {
    const findings = createAuditFindings('pipeline', 'full', 'apps/', [])
    findings.summary.by_severity = { critical: -1, high: 0, medium: 0, low: 0 }

    expect(() => AuditFindingsSchema.parse(findings)).toThrow()
  })
})

describe('LensResultSchema', () => {
  it('validates lens result with critical severity', () => {
    const result: LensResult = {
      lens: 'security',
      total_findings: 1,
      by_severity: { critical: 1, high: 0, medium: 0, low: 0 },
      findings: [
        {
          id: 'SEC-001',
          lens: 'security',
          severity: 'critical',
          confidence: 'high',
          title: 'Critical security issue',
          file: 'src/auth.ts',
          evidence: 'Password stored in plaintext',
          remediation: 'Use bcrypt for hashing',
          status: 'new',
        },
      ],
    }

    expect(() => LensResultSchema.parse(result)).not.toThrow()
  })

  it('validates lens result with high severity', () => {
    const result: LensResult = {
      lens: 'react',
      total_findings: 1,
      by_severity: { critical: 0, high: 1, medium: 0, low: 0 },
      findings: [
        {
          id: 'REACT-001',
          lens: 'react',
          severity: 'high',
          confidence: 'medium',
          title: 'Missing key prop',
          file: 'src/List.tsx',
          evidence: 'List items lack unique keys',
          remediation: 'Add key prop',
          status: 'new',
        },
      ],
    }

    expect(() => LensResultSchema.parse(result)).not.toThrow()
  })

  it('validates lens result with medium severity', () => {
    const result: LensResult = {
      lens: 'typescript',
      total_findings: 1,
      by_severity: { critical: 0, high: 0, medium: 1, low: 0 },
      findings: [
        {
          id: 'TS-001',
          lens: 'typescript',
          severity: 'medium',
          confidence: 'high',
          title: 'Any type used',
          file: 'src/util.ts',
          evidence: 'Parameter has type any',
          remediation: 'Add explicit type',
          status: 'new',
        },
      ],
    }

    expect(() => LensResultSchema.parse(result)).not.toThrow()
  })

  it('validates lens result with low severity', () => {
    const result: LensResult = {
      lens: 'code-quality',
      total_findings: 1,
      by_severity: { critical: 0, high: 0, medium: 0, low: 1 },
      findings: [
        {
          id: 'CQ-001',
          lens: 'code-quality',
          severity: 'low',
          confidence: 'low',
          title: 'Console.log found',
          file: 'src/debug.ts',
          evidence: 'console.log statement present',
          remediation: 'Remove console.log',
          status: 'new',
        },
      ],
    }

    expect(() => LensResultSchema.parse(result)).not.toThrow()
  })

  it('validates lens result with token metrics', () => {
    const result: LensResult = {
      lens: 'performance',
      total_findings: 0,
      by_severity: { critical: 0, high: 0, medium: 0, low: 0 },
      findings: [],
      tokens: { in: 2000, out: 1000 },
    }

    expect(() => LensResultSchema.parse(result)).not.toThrow()
    expect(result.tokens?.in).toBe(2000)
  })

  it('validates all lens types', () => {
    const lenses: AuditLens[] = [
      'security',
      'duplication',
      'react',
      'typescript',
      'a11y',
      'ui-ux',
      'performance',
      'test-coverage',
      'code-quality',
    ]

    lenses.forEach(lens => {
      const result: LensResult = {
        lens,
        total_findings: 0,
        by_severity: { critical: 0, high: 0, medium: 0, low: 0 },
        findings: [],
      }

      expect(() => LensResultSchema.parse(result)).not.toThrow()
    })
  })
})

describe('ChallengeResultSchema', () => {
  it('validates challenge result with all decision types', () => {
    const result = {
      total_reviewed: 5,
      confirmed: 2,
      downgraded: 1,
      upgraded: 1,
      false_positives: 1,
      duplicates: 0,
      challenges: [
        {
          finding_id: 'F-001',
          original_severity: 'high' as AuditSeverity,
          decision: 'confirmed' as const,
          final_severity: 'high' as AuditSeverity,
          reasoning: 'Valid finding confirmed',
        },
        {
          finding_id: 'F-002',
          original_severity: 'high' as AuditSeverity,
          decision: 'downgraded' as const,
          final_severity: 'medium' as AuditSeverity,
          reasoning: 'Impact overstated',
        },
        {
          finding_id: 'F-003',
          original_severity: 'medium' as AuditSeverity,
          decision: 'upgraded' as const,
          final_severity: 'high' as AuditSeverity,
          reasoning: 'More severe than initially assessed',
        },
        {
          finding_id: 'F-004',
          original_severity: 'low' as AuditSeverity,
          decision: 'false_positive' as const,
          final_severity: null,
          reasoning: 'Not actually an issue',
        },
        {
          finding_id: 'F-005',
          original_severity: 'medium' as AuditSeverity,
          decision: 'deferred' as const,
          final_severity: 'medium' as AuditSeverity,
          reasoning: 'Will address in future sprint',
        },
      ],
    }

    expect(() => ChallengeResultSchema.parse(result)).not.toThrow()
  })
})

describe('RoundtableResultSchema', () => {
  it('validates roundtable result', () => {
    const result = {
      original_count: 10,
      vetted_count: 7,
      removed: {
        false_positives: 2,
        duplicates: 1,
      },
      severity_changes: {
        downgraded: 1,
        upgraded: 1,
      },
      cross_references: [
        {
          findings: ['F-001', 'F-002'],
          relationship: 'Related security issues',
        },
      ],
      vetted_findings: [],
    }

    expect(() => RoundtableResultSchema.parse(result)).not.toThrow()
  })
})

describe('DedupResultSchema', () => {
  it('validates dedup result', () => {
    const result = {
      total_checked: 15,
      duplicates_found: 3,
      related_found: 2,
      new_findings: 10,
    }

    expect(() => DedupResultSchema.parse(result)).not.toThrow()
  })
})

describe('TrendSnapshotSchema', () => {
  it('validates trend snapshot', () => {
    const snapshot = {
      schema: 1 as const,
      generated: '2026-02-14T12:00:00.000Z',
      window_days: 30,
      audits_analyzed: 10,
      overall: {
        trend: 'improving' as const,
        total_findings_current: 20,
        total_findings_previous: 30,
        delta: -10,
        fix_rate: 0.5,
      },
      by_severity: {
        critical: {
          current: 1,
          previous: 3,
          trend: 'improving' as const,
        },
        high: {
          current: 5,
          previous: 10,
          trend: 'improving' as const,
        },
        medium: {
          current: 10,
          previous: 12,
          trend: 'improving' as const,
        },
        low: {
          current: 4,
          previous: 5,
          trend: 'stable' as const,
        },
      },
      by_lens: {
        security: {
          current: 5,
          previous: 10,
          trend: 'improving' as const,
        },
      },
      worst_offenders: [
        {
          file: 'src/auth.ts',
          total_findings: 10,
          appearances: 5,
          trend: 'regressing' as const,
        },
      ],
      timeline: [
        {
          date: '2026-02-14',
          total: 20,
          critical: 1,
          high: 5,
          medium: 10,
          low: 4,
        },
      ],
    }

    expect(() => TrendSnapshotSchema.parse(snapshot)).not.toThrow()
  })
})

describe('createAuditFindings', () => {
  it('creates audit findings with pipeline mode', () => {
    const findings = createAuditFindings('pipeline', 'full', 'apps/', ['security', 'react'])

    expect(findings.schema).toBe(1)
    expect(findings.mode).toBe('pipeline')
    expect(findings.scope).toBe('full')
    expect(findings.target).toBe('apps/')
    expect(findings.lenses_run).toEqual(['security', 'react'])
    expect(findings.summary.total_findings).toBe(0)
    expect(findings.findings).toEqual([])
    expect(findings.metrics.files_scanned).toBe(0)
  })

  it('creates audit findings with roundtable mode', () => {
    const findings = createAuditFindings('roundtable', 'delta', 'packages/', ['typescript'])

    expect(findings.mode).toBe('roundtable')
    expect(findings.scope).toBe('delta')
    expect(findings.target).toBe('packages/')
    expect(findings.lenses_run).toEqual(['typescript'])
  })

  it('creates valid timestamp', () => {
    const findings = createAuditFindings('pipeline', 'full', 'apps/', [])
    const timestamp = new Date(findings.timestamp)

    expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now())
    expect(timestamp.getTime()).toBeGreaterThan(Date.now() - 1000)
  })

  it('initializes with zero counts', () => {
    const findings = createAuditFindings('pipeline', 'full', 'apps/', [])

    expect(findings.summary.total_findings).toBe(0)
    expect(findings.summary.by_severity.critical).toBe(0)
    expect(findings.summary.by_severity.high).toBe(0)
    expect(findings.summary.by_severity.medium).toBe(0)
    expect(findings.summary.by_severity.low).toBe(0)
    expect(findings.summary.new_since_last).toBe(0)
    expect(findings.summary.recurring).toBe(0)
    expect(findings.summary.fixed_since_last).toBe(0)
  })
})

describe('addLensFindings', () => {
  it('adds findings from a lens result', () => {
    const audit = createAuditFindings('pipeline', 'full', 'apps/', ['security'])
    const lensResult: LensResult = {
      lens: 'security',
      total_findings: 2,
      by_severity: { critical: 1, high: 1, medium: 0, low: 0 },
      findings: [
        {
          id: 'SEC-001',
          lens: 'security',
          severity: 'critical',
          confidence: 'high',
          title: 'Security issue 1',
          file: 'src/auth.ts',
          evidence: 'Evidence 1',
          remediation: 'Fix 1',
          status: 'new',
        },
        {
          id: 'SEC-002',
          lens: 'security',
          severity: 'high',
          confidence: 'medium',
          title: 'Security issue 2',
          file: 'src/db.ts',
          evidence: 'Evidence 2',
          remediation: 'Fix 2',
          status: 'new',
        },
      ],
    }

    const updated = addLensFindings(audit, lensResult)

    expect(updated.findings.length).toBe(2)
    expect(updated.summary.total_findings).toBe(2)
    expect(updated.summary.by_severity.critical).toBe(1)
    expect(updated.summary.by_severity.high).toBe(1)
    expect(updated.summary.by_lens.security).toBe(2)
  })

  it('accumulates findings from multiple lenses', () => {
    const audit = createAuditFindings('pipeline', 'full', 'apps/', ['security', 'react'])

    const securityResult: LensResult = {
      lens: 'security',
      total_findings: 1,
      by_severity: { critical: 1, high: 0, medium: 0, low: 0 },
      findings: [
        {
          id: 'SEC-001',
          lens: 'security',
          severity: 'critical',
          confidence: 'high',
          title: 'Security issue',
          file: 'src/auth.ts',
          evidence: 'Evidence',
          remediation: 'Fix',
          status: 'new',
        },
      ],
    }

    const reactResult: LensResult = {
      lens: 'react',
      total_findings: 2,
      by_severity: { critical: 0, high: 1, medium: 1, low: 0 },
      findings: [
        {
          id: 'REACT-001',
          lens: 'react',
          severity: 'high',
          confidence: 'high',
          title: 'React issue 1',
          file: 'src/Component.tsx',
          evidence: 'Evidence',
          remediation: 'Fix',
          status: 'new',
        },
        {
          id: 'REACT-002',
          lens: 'react',
          severity: 'medium',
          confidence: 'medium',
          title: 'React issue 2',
          file: 'src/App.tsx',
          evidence: 'Evidence',
          remediation: 'Fix',
          status: 'new',
        },
      ],
    }

    const afterSecurity = addLensFindings(audit, securityResult)
    const afterReact = addLensFindings(afterSecurity, reactResult)

    expect(afterReact.findings.length).toBe(3)
    expect(afterReact.summary.total_findings).toBe(3)
    expect(afterReact.summary.by_severity.critical).toBe(1)
    expect(afterReact.summary.by_severity.high).toBe(1)
    expect(afterReact.summary.by_severity.medium).toBe(1)
    expect(afterReact.summary.by_lens.security).toBe(1)
    expect(afterReact.summary.by_lens.react).toBe(2)
  })

  it('updates timestamp', () => {
    const audit = createAuditFindings('pipeline', 'full', 'apps/', ['security'])
    const lensResult: LensResult = {
      lens: 'security',
      total_findings: 0,
      by_severity: { critical: 0, high: 0, medium: 0, low: 0 },
      findings: [],
    }

    const updated = addLensFindings(audit, lensResult)

    // Timestamp should be a valid ISO string
    expect(() => new Date(updated.timestamp)).not.toThrow()
    expect(new Date(updated.timestamp).getTime()).toBeLessThanOrEqual(Date.now())
  })
})

describe('calculateTrend', () => {
  it('returns improving when current < previous by >10%', () => {
    expect(calculateTrend(50, 100)).toBe('improving')
  })

  it('returns regressing when current > previous by >10%', () => {
    expect(calculateTrend(100, 50)).toBe('regressing')
  })

  it('returns stable when change is within ±10%', () => {
    expect(calculateTrend(95, 100)).toBe('stable')
    expect(calculateTrend(105, 100)).toBe('stable')
  })

  it('returns stable when previous is 0', () => {
    expect(calculateTrend(10, 0)).toBe('stable')
  })

  it('handles boundary at exactly 10% decrease', () => {
    expect(calculateTrend(90, 100)).toBe('stable')
    expect(calculateTrend(89, 100)).toBe('improving')
  })

  it('handles boundary at exactly 10% increase', () => {
    expect(calculateTrend(110, 100)).toBe('stable')
    expect(calculateTrend(111, 100)).toBe('regressing')
  })
})
