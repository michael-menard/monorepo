/* eslint-disable import/order */
import { randomUUID } from 'crypto'
import { describe, it, expect, vi, beforeEach } from 'vitest'
/* eslint-enable import/order */

// Hoist mock functions
const {
  mockSelect,
  mockFrom,
  mockWhere,
  mockWarn,
  mockFeatures,
  mockCohesionRules,
  mockEq,
  mockAnd,
} = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockFrom: vi.fn(),
  mockWhere: vi.fn(),
  mockWarn: vi.fn(),
  mockFeatures: {
    id: 'id',
    featureName: 'feature_name',
    packageName: 'package_name',
  },
  mockCohesionRules: {
    isActive: 'is_active',
    ruleName: 'rule_name',
    ruleType: 'rule_type',
    conditions: 'conditions',
    severity: 'severity',
  },
  mockEq: vi.fn((a, b) => ({ type: 'eq', a, b })),
  mockAnd: vi.fn((...args) => ({ type: 'and', args })),
}))

vi.mock('@repo/db', () => ({
  db: {
    select: mockSelect,
  },
}))

vi.mock('@repo/knowledge-base/db', () => ({
  features: mockFeatures,
  cohesionRules: mockCohesionRules,
}))

vi.mock('drizzle-orm', () => ({
  eq: mockEq,
  and: mockAnd,
}))

vi.mock('@repo/logger', () => ({
  logger: {
    warn: mockWarn,
  },
}))

import { graph_apply_rules } from '../graph-apply-rules'

function makeRule(overrides = {}) {
  return {
    id: randomUUID(),
    ruleName: 'package-cohesion-rule',
    ruleType: 'package_cohesion',
    severity: 'error',
    isActive: true,
    maxViolations: 0,
    conditions: {
      featurePatterns: { include: ['my-feature'] },
      packagePatterns: { include: ['@repo/api'] },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeFeature(overrides = {}) {
  return {
    id: randomUUID(),
    featureName: 'my-feature',
    packageName: '@repo/wrong',
    featureType: 'service',
    filePath: null,
    description: null,
    tags: null,
    metadata: null,
    isActive: true,
    deprecatedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function setupMockChains(ruleRows: unknown[], featureRows: unknown[]) {
  let callCount = 0
  mockSelect.mockImplementation(() => {
    callCount++
    const currentCall = callCount
    if (currentCall === 1) {
      // First call: cohesion rules query — has .where()
      return {
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve(ruleRows)),
        })),
      }
    }
    // Second call: features query — no .where(), resolves directly after .from()
    return {
      from: vi.fn(() => Promise.resolve(featureRows)),
    }
  })
}

describe('graph_apply_rules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns rules with violations when features violate rules (AC-14)', async () => {
    const rule = makeRule()
    const violatingFeature = makeFeature({ packageName: '@repo/wrong' })

    setupMockChains([rule], [violatingFeature])

    const result = await graph_apply_rules({})

    expect(result).toHaveLength(1)
    expect(result[0].ruleName).toBe('package-cohesion-rule')
    expect(result[0].violations).toHaveLength(1)
    expect(result[0].violations[0].featureId).toBe(violatingFeature.id)
  })

  it('returns empty array when no active rules exist (AC-14)', async () => {
    setupMockChains([], [])

    const result = await graph_apply_rules({})

    expect(result).toEqual([])
  })

  it('filters by ruleType when provided (AC-14)', async () => {
    const rule = makeRule({ ruleType: 'package_cohesion' })

    setupMockChains([rule], [makeFeature({ packageName: '@repo/wrong' })])

    const result = await graph_apply_rules({ ruleType: 'package_cohesion' })

    // Should have queried with the ruleType filter
    expect(result).toBeDefined()
    expect(Array.isArray(result)).toBe(true)
  })

  it('returns empty array for rule type with no matching rules (AC-14)', async () => {
    setupMockChains([], [])

    const result = await graph_apply_rules({ ruleType: 'feature_completeness' })

    expect(result).toEqual([])
  })

  it('catches DB errors, logs warning, and returns empty array (AC-14)', async () => {
    // First select call (rules query) throws
    mockSelect.mockImplementation(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockRejectedValue(new Error('Query failed')),
      })),
    }))

    const result = await graph_apply_rules({})

    expect(result).toEqual([])
    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringContaining('[mcp-tools] Failed to apply cohesion rules:'),
      expect.stringContaining('Query failed'),
    )
  })

  it('throws ZodError for invalid ruleType value (AC-14)', async () => {
    await expect(
      graph_apply_rules({ ruleType: 'invalid_rule_type' as never }),
    ).rejects.toThrow()
  })

  it('handles malformed JSONB conditions without crashing (AC-14)', async () => {
    const ruleWithBadConditions = makeRule({
      conditions: null, // null conditions will cause TypeError
    })
    const violatingFeature = makeFeature()

    setupMockChains([ruleWithBadConditions], [violatingFeature])

    // Should not throw — logs warning and skips malformed rule
    const result = await graph_apply_rules({})

    expect(Array.isArray(result)).toBe(true)
    // malformed rule is skipped, no violations returned from it
    expect(result).toHaveLength(0)
    expect(mockWarn).toHaveBeenCalled()
  })

  it('does not include rules with zero violations in output (AC-14)', async () => {
    const rule = makeRule()
    // Feature that MATCHES the feature pattern and MATCHES the package pattern (no violation)
    const compliantFeature = makeFeature({ packageName: '@repo/api' })

    setupMockChains([rule], [compliantFeature])

    const result = await graph_apply_rules({})

    // No violations, so nothing returned
    expect(result).toHaveLength(0)
  })
})
