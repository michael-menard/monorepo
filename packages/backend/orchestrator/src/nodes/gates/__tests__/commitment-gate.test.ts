import { describe, expect, it, vi } from 'vitest'
import type { ReadinessResult, ReadinessFactors } from '../../story/readiness-score.js'
import {
  checkReadinessThreshold,
  checkBlockerCount,
  checkUnknownCount,
  generateGateSummary,
  createOverrideAudit,
  validateCommitmentReadiness,
  DEFAULT_GATE_THRESHOLDS,
  GateRequirementsSchema,
  GateCheckResultSchema,
  OverrideRequestSchema,
  OverrideAuditEntrySchema,
  CommitmentGateResultSchema,
  CommitmentGateConfigSchema,
  type GateCheckResult,
  type OverrideRequest,
} from '../commitment-gate.js'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}))

// Test fixtures
const createTestReadinessResult = (overrides: Partial<ReadinessResult> = {}): ReadinessResult => ({
  storyId: 'flow-034',
  analyzedAt: new Date().toISOString(),
  score: 90,
  breakdown: {
    baseScore: 100,
    deductions: [],
    additions: [],
    totalDeductions: 10,
    totalAdditions: 0,
    finalScore: 90,
  },
  ready: true,
  threshold: 85,
  factors: {
    mvpBlockingCount: 0,
    mvpImportantCount: 1,
    knownUnknownsCount: 2,
    hasStrongContext: true,
    hasBaselineAlignment: true,
    totalGapsAnalyzed: 5,
  },
  recommendations: [],
  summary: 'Story is ready',
  confidence: 'high',
  ...overrides,
})

const createTestOverrideRequest = (overrides: Partial<OverrideRequest> = {}): OverrideRequest => ({
  requestedBy: 'test-user',
  reason: 'Critical business deadline requires proceeding despite minor issues',
  requestedAt: new Date().toISOString(),
  risksAcknowledged: ['Technical debt may increase', 'Additional testing needed post-release'],
  ...overrides,
})

describe('checkReadinessThreshold', () => {
  it('passes when score meets threshold', () => {
    const result = checkReadinessThreshold(85, 85)

    expect(result.passed).toBe(true)
    expect(result.requirement).toBe('readiness_score')
    expect(result.operator).toBe('>=')
    expect(result.actual).toBe(85)
    expect(result.threshold).toBe(85)
  })

  it('passes when score exceeds threshold', () => {
    const result = checkReadinessThreshold(95, 85)

    expect(result.passed).toBe(true)
    expect(result.actual).toBe(95)
  })

  it('fails when score is below threshold', () => {
    const result = checkReadinessThreshold(80, 85)

    expect(result.passed).toBe(false)
    expect(result.actual).toBe(80)
    expect(result.description).toContain('below')
  })

  it('uses default threshold when not specified', () => {
    const result = checkReadinessThreshold(85)

    expect(result.threshold).toBe(DEFAULT_GATE_THRESHOLDS.MIN_READINESS_SCORE)
    expect(result.passed).toBe(true)
  })

  it('handles edge case of 0 score', () => {
    const result = checkReadinessThreshold(0, 85)

    expect(result.passed).toBe(false)
    expect(result.actual).toBe(0)
  })

  it('handles edge case of 100 score', () => {
    const result = checkReadinessThreshold(100, 85)

    expect(result.passed).toBe(true)
    expect(result.actual).toBe(100)
  })
})

describe('checkBlockerCount', () => {
  it('passes when blockers equal max (0)', () => {
    const result = checkBlockerCount(0, 0)

    expect(result.passed).toBe(true)
    expect(result.requirement).toBe('blocker_count')
    expect(result.operator).toBe('==')
    expect(result.actual).toBe(0)
  })

  it('fails when blockers exceed max', () => {
    const result = checkBlockerCount(1, 0)

    expect(result.passed).toBe(false)
    expect(result.actual).toBe(1)
    expect(result.description).toContain('1 blocker')
  })

  it('passes with higher max threshold', () => {
    const result = checkBlockerCount(2, 3)

    expect(result.passed).toBe(true)
    expect(result.actual).toBe(2)
    expect(result.threshold).toBe(3)
  })

  it('uses default max when not specified', () => {
    const result = checkBlockerCount(0)

    expect(result.threshold).toBe(DEFAULT_GATE_THRESHOLDS.MAX_BLOCKERS)
    expect(result.passed).toBe(true)
  })

  it('handles multiple blockers correctly', () => {
    const result = checkBlockerCount(5, 0)

    expect(result.passed).toBe(false)
    expect(result.actual).toBe(5)
    expect(result.description).toContain('5 blocker')
  })
})

describe('checkUnknownCount', () => {
  it('passes when unknowns within limit', () => {
    const result = checkUnknownCount(3, 5)

    expect(result.passed).toBe(true)
    expect(result.requirement).toBe('unknown_count')
    expect(result.operator).toBe('<=')
    expect(result.actual).toBe(3)
  })

  it('passes when unknowns equal limit', () => {
    const result = checkUnknownCount(5, 5)

    expect(result.passed).toBe(true)
    expect(result.actual).toBe(5)
  })

  it('fails when unknowns exceed limit', () => {
    const result = checkUnknownCount(7, 5)

    expect(result.passed).toBe(false)
    expect(result.actual).toBe(7)
    expect(result.description).toContain('exceeds')
  })

  it('uses default max when not specified', () => {
    const result = checkUnknownCount(3)

    expect(result.threshold).toBe(DEFAULT_GATE_THRESHOLDS.MAX_UNKNOWNS)
    expect(result.passed).toBe(true)
  })

  it('passes with zero unknowns', () => {
    const result = checkUnknownCount(0, 5)

    expect(result.passed).toBe(true)
    expect(result.actual).toBe(0)
  })
})

describe('generateGateSummary', () => {
  const passingChecks: GateCheckResult[] = [
    {
      requirement: 'readiness_score',
      threshold: 85,
      actual: 90,
      passed: true,
      operator: '>=',
      description: 'Readiness score 90 meets threshold of 85',
    },
    {
      requirement: 'blocker_count',
      threshold: 0,
      actual: 0,
      passed: true,
      operator: '==',
      description: 'No blockers found',
    },
    {
      requirement: 'unknown_count',
      threshold: 5,
      actual: 2,
      passed: true,
      operator: '<=',
      description: 'Unknown count 2 is within limit of 5',
    },
  ]

  it('generates passing summary', () => {
    const summary = generateGateSummary(true, passingChecks)

    expect(summary).toContain('COMMITMENT GATE: PASSED')
    expect(summary).toContain('All 3 requirements met')
    expect(summary).toContain('cleared for implementation')
  })

  it('generates passing summary with override', () => {
    const summary = generateGateSummary(true, passingChecks, true)

    expect(summary).toContain('PASSED (with override)')
    expect(summary).toContain('bypassed')
  })

  it('generates failing summary', () => {
    const failingChecks: GateCheckResult[] = [
      ...passingChecks.slice(0, 2),
      {
        requirement: 'unknown_count',
        threshold: 5,
        actual: 8,
        passed: false,
        operator: '<=',
        description: '8 unknown(s) found, exceeds maximum of 5',
      },
    ]

    const summary = generateGateSummary(false, failingChecks)

    expect(summary).toContain('COMMITMENT GATE: FAILED')
    expect(summary).toContain('2/3 requirements met')
    expect(summary).toContain('exceeds maximum')
    expect(summary).toContain('requires additional work')
  })

  it('lists all failed checks in summary', () => {
    const multipleFailures: GateCheckResult[] = [
      {
        requirement: 'readiness_score',
        threshold: 85,
        actual: 70,
        passed: false,
        operator: '>=',
        description: 'Readiness score 70 is below required threshold of 85',
      },
      {
        requirement: 'blocker_count',
        threshold: 0,
        actual: 2,
        passed: false,
        operator: '==',
        description: '2 blocker(s) found, but maximum allowed is 0',
      },
      {
        requirement: 'unknown_count',
        threshold: 5,
        actual: 3,
        passed: true,
        operator: '<=',
        description: 'Unknown count 3 is within limit of 5',
      },
    ]

    const summary = generateGateSummary(false, multipleFailures)

    expect(summary).toContain('1/3 requirements met')
    expect(summary).toContain('below required threshold')
    expect(summary).toContain('2 blocker')
  })
})

describe('createOverrideAudit', () => {
  it('creates audit entry for approved override', () => {
    const request = createTestOverrideRequest()
    const checks: GateCheckResult[] = [
      {
        requirement: 'readiness_score',
        threshold: 85,
        actual: 80,
        passed: false,
        operator: '>=',
        description: 'Score below threshold',
      },
    ]

    const audit = createOverrideAudit('flow-034', request, checks, 80, true, 'admin-user')

    expect(audit.storyId).toBe('flow-034')
    expect(audit.approved).toBe(true)
    expect(audit.approvedBy).toBe('admin-user')
    expect(audit.approvedAt).toBeDefined()
    expect(audit.scoreAtOverride).toBe(80)
    expect(audit.bypassedChecks).toHaveLength(1)
    expect(audit.request).toEqual(request)
  })

  it('creates audit entry for rejected override', () => {
    const request = createTestOverrideRequest()
    const checks: GateCheckResult[] = []

    const audit = createOverrideAudit('flow-034', request, checks, 75, false)

    expect(audit.approved).toBe(false)
    expect(audit.approvedBy).toBeUndefined()
    expect(audit.approvedAt).toBeUndefined()
  })

  it('only includes failed checks in bypassed list', () => {
    const request = createTestOverrideRequest()
    const checks: GateCheckResult[] = [
      {
        requirement: 'readiness_score',
        threshold: 85,
        actual: 90,
        passed: true,
        operator: '>=',
        description: 'Passed',
      },
      {
        requirement: 'blocker_count',
        threshold: 0,
        actual: 2,
        passed: false,
        operator: '==',
        description: 'Failed',
      },
    ]

    const audit = createOverrideAudit('flow-034', request, checks, 90, true, 'admin')

    expect(audit.bypassedChecks).toHaveLength(1)
    expect(audit.bypassedChecks[0].requirement).toBe('blocker_count')
  })
})

describe('validateCommitmentReadiness', () => {
  it('passes when all requirements met', () => {
    const readiness = createTestReadinessResult({
      score: 90,
      factors: {
        mvpBlockingCount: 0,
        mvpImportantCount: 1,
        knownUnknownsCount: 3,
        hasStrongContext: true,
        hasBaselineAlignment: true,
        totalGapsAnalyzed: 5,
      },
    })

    const result = validateCommitmentReadiness(readiness)

    expect(result.passed).toBe(true)
    expect(result.passedChecks).toBe(3)
    expect(result.totalChecks).toBe(3)
    expect(result.overrideAvailable).toBe(false)
    expect(result.summary).toContain('PASSED')
  })

  it('fails when readiness score below threshold', () => {
    const readiness = createTestReadinessResult({
      score: 70,
      factors: {
        mvpBlockingCount: 0,
        mvpImportantCount: 0,
        knownUnknownsCount: 2,
        hasStrongContext: true,
        hasBaselineAlignment: true,
        totalGapsAnalyzed: 5,
      },
    })

    const result = validateCommitmentReadiness(readiness)

    expect(result.passed).toBe(false)
    expect(result.passedChecks).toBe(2)
    expect(result.overrideAvailable).toBe(true)
    const scoreCheck = result.checks.find(c => c.requirement === 'readiness_score')
    expect(scoreCheck?.passed).toBe(false)
  })

  it('fails when blockers present', () => {
    const readiness = createTestReadinessResult({
      score: 95,
      factors: {
        mvpBlockingCount: 2,
        mvpImportantCount: 0,
        knownUnknownsCount: 0,
        hasStrongContext: true,
        hasBaselineAlignment: true,
        totalGapsAnalyzed: 5,
      },
    })

    const result = validateCommitmentReadiness(readiness)

    expect(result.passed).toBe(false)
    const blockerCheck = result.checks.find(c => c.requirement === 'blocker_count')
    expect(blockerCheck?.passed).toBe(false)
    expect(blockerCheck?.actual).toBe(2)
  })

  it('fails when unknowns exceed limit', () => {
    const readiness = createTestReadinessResult({
      score: 95,
      factors: {
        mvpBlockingCount: 0,
        mvpImportantCount: 0,
        knownUnknownsCount: 8,
        hasStrongContext: true,
        hasBaselineAlignment: true,
        totalGapsAnalyzed: 5,
      },
    })

    const result = validateCommitmentReadiness(readiness)

    expect(result.passed).toBe(false)
    const unknownCheck = result.checks.find(c => c.requirement === 'unknown_count')
    expect(unknownCheck?.passed).toBe(false)
    expect(unknownCheck?.actual).toBe(8)
  })

  it('respects custom requirements', () => {
    const readiness = createTestReadinessResult({
      score: 75,
      factors: {
        mvpBlockingCount: 1,
        mvpImportantCount: 0,
        knownUnknownsCount: 8,
        hasStrongContext: true,
        hasBaselineAlignment: true,
        totalGapsAnalyzed: 5,
      },
    })

    const result = validateCommitmentReadiness(readiness, {
      requirements: {
        readinessThreshold: 70,
        maxBlockers: 2,
        maxUnknowns: 10,
      },
    })

    expect(result.passed).toBe(true)
    expect(result.requirements.readinessThreshold).toBe(70)
    expect(result.requirements.maxBlockers).toBe(2)
    expect(result.requirements.maxUnknowns).toBe(10)
  })

  it('allows override when gate fails', () => {
    const readiness = createTestReadinessResult({
      score: 70,
      factors: {
        mvpBlockingCount: 1,
        mvpImportantCount: 0,
        knownUnknownsCount: 2,
        hasStrongContext: true,
        hasBaselineAlignment: true,
        totalGapsAnalyzed: 5,
      },
    })
    const overrideRequest = createTestOverrideRequest()

    const result = validateCommitmentReadiness(readiness, { overrideRequest })

    expect(result.passed).toBe(true) // Passes due to override
    expect(result.overrideAvailable).toBe(false) // No longer available since used
    expect(result.overrideAudit).toBeDefined()
    expect(result.overrideAudit?.approved).toBe(true)
    expect(result.overrideAudit?.bypassedChecks.length).toBeGreaterThan(0)
    expect(result.summary).toContain('override')
  })

  it('does not use override when gate passes naturally', () => {
    const readiness = createTestReadinessResult({
      score: 90,
      factors: {
        mvpBlockingCount: 0,
        mvpImportantCount: 0,
        knownUnknownsCount: 2,
        hasStrongContext: true,
        hasBaselineAlignment: true,
        totalGapsAnalyzed: 5,
      },
    })
    const overrideRequest = createTestOverrideRequest()

    const result = validateCommitmentReadiness(readiness, { overrideRequest })

    expect(result.passed).toBe(true)
    expect(result.overrideAudit).toBeUndefined() // Override not needed
    expect(result.summary).not.toContain('override')
  })

  it('respects allowOverride=false setting', () => {
    const readiness = createTestReadinessResult({
      score: 70,
      factors: {
        mvpBlockingCount: 0,
        mvpImportantCount: 0,
        knownUnknownsCount: 2,
        hasStrongContext: true,
        hasBaselineAlignment: true,
        totalGapsAnalyzed: 5,
      },
    })
    const overrideRequest = createTestOverrideRequest()

    const result = validateCommitmentReadiness(readiness, {
      overrideRequest,
      requirements: { allowOverride: false },
    })

    expect(result.passed).toBe(false) // Override not applied
    expect(result.overrideAvailable).toBe(false)
    expect(result.overrideAudit).toBeUndefined()
  })

  it('includes story ID in result', () => {
    const readiness = createTestReadinessResult({ storyId: 'custom-story-123' })

    const result = validateCommitmentReadiness(readiness)

    expect(result.storyId).toBe('custom-story-123')
  })

  it('includes timestamp in result', () => {
    const readiness = createTestReadinessResult()
    const beforeTime = new Date().toISOString()

    const result = validateCommitmentReadiness(readiness)

    expect(result.validatedAt).toBeDefined()
    expect(new Date(result.validatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(beforeTime).getTime(),
    )
  })
})

describe('DEFAULT_GATE_THRESHOLDS', () => {
  it('has correct default values', () => {
    expect(DEFAULT_GATE_THRESHOLDS.MIN_READINESS_SCORE).toBe(85)
    expect(DEFAULT_GATE_THRESHOLDS.MAX_BLOCKERS).toBe(0)
    expect(DEFAULT_GATE_THRESHOLDS.MAX_UNKNOWNS).toBe(5)
  })
})

describe('GateRequirementsSchema validation', () => {
  it('applies default values', () => {
    const requirements = GateRequirementsSchema.parse({})

    expect(requirements.readinessThreshold).toBe(85)
    expect(requirements.maxBlockers).toBe(0)
    expect(requirements.maxUnknowns).toBe(5)
    expect(requirements.allowOverride).toBe(true)
  })

  it('validates custom requirements', () => {
    const requirements = GateRequirementsSchema.parse({
      readinessThreshold: 90,
      maxBlockers: 1,
      maxUnknowns: 3,
      allowOverride: false,
    })

    expect(requirements.readinessThreshold).toBe(90)
    expect(requirements.maxBlockers).toBe(1)
    expect(requirements.maxUnknowns).toBe(3)
    expect(requirements.allowOverride).toBe(false)
  })

  it('rejects invalid threshold range', () => {
    expect(() => GateRequirementsSchema.parse({ readinessThreshold: -1 })).toThrow()
    expect(() => GateRequirementsSchema.parse({ readinessThreshold: 101 })).toThrow()
  })

  it('rejects negative counts', () => {
    expect(() => GateRequirementsSchema.parse({ maxBlockers: -1 })).toThrow()
    expect(() => GateRequirementsSchema.parse({ maxUnknowns: -1 })).toThrow()
  })
})

describe('GateCheckResultSchema validation', () => {
  it('validates complete check result', () => {
    const check = {
      requirement: 'readiness_score',
      threshold: 85,
      actual: 90,
      passed: true,
      operator: '>=',
      description: 'Score meets threshold',
    }

    expect(() => GateCheckResultSchema.parse(check)).not.toThrow()
  })

  it('validates all requirement types', () => {
    const requirements = ['readiness_score', 'blocker_count', 'unknown_count'] as const

    for (const requirement of requirements) {
      const check = {
        requirement,
        threshold: 5,
        actual: 3,
        passed: true,
        operator: '<=',
        description: 'Test',
      }

      expect(() => GateCheckResultSchema.parse(check)).not.toThrow()
    }
  })

  it('validates all operator types', () => {
    const operators = ['>=', '<=', '=='] as const

    for (const operator of operators) {
      const check = {
        requirement: 'readiness_score',
        threshold: 85,
        actual: 90,
        passed: true,
        operator,
        description: 'Test',
      }

      expect(() => GateCheckResultSchema.parse(check)).not.toThrow()
    }
  })
})

describe('OverrideRequestSchema validation', () => {
  it('validates complete override request', () => {
    const request = {
      requestedBy: 'test-user',
      reason: 'Critical deadline requires proceeding',
      requestedAt: new Date().toISOString(),
      risksAcknowledged: ['Risk 1', 'Risk 2'],
    }

    expect(() => OverrideRequestSchema.parse(request)).not.toThrow()
  })

  it('requires minimum reason length', () => {
    const request = {
      requestedBy: 'user',
      reason: 'short', // Less than 10 chars
      requestedAt: new Date().toISOString(),
      risksAcknowledged: ['Risk'],
    }

    expect(() => OverrideRequestSchema.parse(request)).toThrow()
  })

  it('requires at least one acknowledged risk', () => {
    const request = {
      requestedBy: 'user',
      reason: 'Sufficient reason for override',
      requestedAt: new Date().toISOString(),
      risksAcknowledged: [], // Empty array
    }

    expect(() => OverrideRequestSchema.parse(request)).toThrow()
  })

  it('requires valid datetime for requestedAt', () => {
    const request = {
      requestedBy: 'user',
      reason: 'Sufficient reason for override',
      requestedAt: 'invalid-date',
      risksAcknowledged: ['Risk'],
    }

    expect(() => OverrideRequestSchema.parse(request)).toThrow()
  })
})

describe('OverrideAuditEntrySchema validation', () => {
  it('validates complete audit entry', () => {
    const entry = {
      storyId: 'flow-034',
      request: {
        requestedBy: 'user',
        reason: 'Critical deadline requirement',
        requestedAt: new Date().toISOString(),
        risksAcknowledged: ['Risk acknowledged'],
      },
      bypassedChecks: [
        {
          requirement: 'readiness_score',
          threshold: 85,
          actual: 70,
          passed: false,
          operator: '>=',
          description: 'Below threshold',
        },
      ],
      scoreAtOverride: 70,
      approved: true,
      approvedBy: 'admin',
      approvedAt: new Date().toISOString(),
    }

    expect(() => OverrideAuditEntrySchema.parse(entry)).not.toThrow()
  })

  it('allows missing approvedBy and approvedAt when not approved', () => {
    const entry = {
      storyId: 'flow-034',
      request: {
        requestedBy: 'user',
        reason: 'Critical deadline requirement',
        requestedAt: new Date().toISOString(),
        risksAcknowledged: ['Risk acknowledged'],
      },
      bypassedChecks: [],
      scoreAtOverride: 70,
      approved: false,
    }

    expect(() => OverrideAuditEntrySchema.parse(entry)).not.toThrow()
  })
})

describe('CommitmentGateResultSchema validation', () => {
  it('validates complete gate result', () => {
    const result = {
      storyId: 'flow-034',
      validatedAt: new Date().toISOString(),
      passed: true,
      checks: [
        {
          requirement: 'readiness_score',
          threshold: 85,
          actual: 90,
          passed: true,
          operator: '>=',
          description: 'Meets threshold',
        },
      ],
      passedChecks: 1,
      totalChecks: 1,
      overrideAvailable: false,
      summary: 'Gate passed',
      requirements: {
        readinessThreshold: 85,
        maxBlockers: 0,
        maxUnknowns: 5,
        allowOverride: true,
      },
    }

    expect(() => CommitmentGateResultSchema.parse(result)).not.toThrow()
  })

  it('validates result with override', () => {
    const result = {
      storyId: 'flow-034',
      validatedAt: new Date().toISOString(),
      passed: true,
      checks: [],
      passedChecks: 0,
      totalChecks: 1,
      overrideAvailable: false,
      overrideRequest: {
        requestedBy: 'user',
        reason: 'Critical deadline requirement',
        requestedAt: new Date().toISOString(),
        risksAcknowledged: ['Risk'],
      },
      overrideAudit: {
        storyId: 'flow-034',
        request: {
          requestedBy: 'user',
          reason: 'Critical deadline requirement',
          requestedAt: new Date().toISOString(),
          risksAcknowledged: ['Risk'],
        },
        bypassedChecks: [],
        scoreAtOverride: 70,
        approved: true,
      },
      summary: 'Gate passed with override',
      requirements: {
        readinessThreshold: 85,
        maxBlockers: 0,
        maxUnknowns: 5,
        allowOverride: true,
      },
    }

    expect(() => CommitmentGateResultSchema.parse(result)).not.toThrow()
  })
})

describe('CommitmentGateConfigSchema validation', () => {
  it('validates empty config', () => {
    const config = {}

    expect(() => CommitmentGateConfigSchema.parse(config)).not.toThrow()
  })

  it('validates config with requirements', () => {
    const config = {
      requirements: {
        readinessThreshold: 90,
        maxBlockers: 1,
      },
    }

    const parsed = CommitmentGateConfigSchema.parse(config)

    expect(parsed.requirements?.readinessThreshold).toBe(90)
    expect(parsed.requirements?.maxBlockers).toBe(1)
  })

  it('validates config with override request', () => {
    const config = {
      overrideRequest: {
        requestedBy: 'user',
        reason: 'Valid reason for override',
        requestedAt: new Date().toISOString(),
        risksAcknowledged: ['Risk 1'],
      },
    }

    expect(() => CommitmentGateConfigSchema.parse(config)).not.toThrow()
  })
})
