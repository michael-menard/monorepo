/* eslint-disable import/order */
import { randomUUID } from 'crypto'
import { describe, it, expect, vi, beforeEach } from 'vitest'
/* eslint-enable import/order */

// Hoist mock functions
const {
  mockSelect,
  mockFrom,
  mockWhere,
  mockLimit,
  mockWarn,
  mockFeatures,
  mockCohesionRules,
  mockEq,
  mockOr,
} = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockFrom: vi.fn(),
  mockWhere: vi.fn(),
  mockLimit: vi.fn(),
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
  },
  mockEq: vi.fn((a, b) => ({ type: 'eq', a, b })),
  mockOr: vi.fn((...args) => ({ type: 'or', args })),
}))

vi.mock('@repo/db', () => ({
  db: {
    select: mockSelect,
  },
}))

vi.mock('@repo/database-schema', () => ({
  features: mockFeatures,
  cohesionRules: mockCohesionRules,
}))

vi.mock('drizzle-orm', () => ({
  eq: mockEq,
  or: mockOr,
}))

vi.mock('@repo/logger', () => ({
  logger: {
    warn: mockWarn,
  },
}))

import { graph_check_cohesion } from '../graph-check-cohesion'

const featureUuid = randomUUID()

function makeFeature(overrides = {}) {
  return {
    id: featureUuid,
    featureName: 'test-feature',
    packageName: '@repo/api',
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

function makeRule(overrides = {}) {
  return {
    id: randomUUID(),
    ruleName: 'test-rule',
    ruleType: 'package_cohesion',
    severity: 'error',
    isActive: true,
    maxViolations: 0,
    conditions: {
      featurePatterns: { include: ['test-feature'] },
      packagePatterns: { include: ['@repo/api'] },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function setupMockChains(featureRows: unknown[], ruleRows: unknown[]) {
  let callCount = 0
  mockSelect.mockImplementation(() => {
    callCount++
    const currentCall = callCount
    return {
      from: vi.fn(() => ({
        where: vi.fn(() => {
          if (currentCall === 1) {
            // Feature query - has .limit()
            return { limit: vi.fn().mockResolvedValue(featureRows) }
          }
          // Rules query - resolves directly
          return Promise.resolve(ruleRows)
        }),
      })),
    }
  })
}

describe('graph_check_cohesion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns complete status when feature found and no violations (AC-14)', async () => {
    const feature = makeFeature({ packageName: '@repo/api' })
    const rule = makeRule({
      conditions: {
        featurePatterns: { include: ['test-feature'] },
        packagePatterns: { include: ['@repo/api'] },
      },
    })

    setupMockChains([feature], [rule])

    const result = await graph_check_cohesion({ featureId: featureUuid })

    expect(result.status).toBe('complete')
    expect(result.violations).toBeUndefined()
  })

  it('returns incomplete status when feature violates package cohesion rule (AC-14)', async () => {
    const feature = makeFeature({ packageName: '@repo/wrong-package' })
    const rule = makeRule({
      conditions: {
        featurePatterns: { include: ['test-feature'] },
        packagePatterns: { include: ['@repo/api'] },
      },
    })

    setupMockChains([feature], [rule])

    const result = await graph_check_cohesion({ featureId: featureUuid })

    expect(result.status).toBe('incomplete')
    expect(result.violations).toBeDefined()
    expect(result.violations!.length).toBeGreaterThan(0)
  })

  it('returns unknown status when feature not found (AC-14)', async () => {
    setupMockChains([], [])

    const result = await graph_check_cohesion({ featureId: featureUuid })

    expect(result.status).toBe('unknown')
  })

  it('returns complete status when no active rules exist (AC-14)', async () => {
    const feature = makeFeature()

    setupMockChains([feature], []) // No active rules

    const result = await graph_check_cohesion({ featureId: featureUuid })

    expect(result.status).toBe('complete')
    expect(result.violations).toBeUndefined()
  })

  it('catches DB errors and returns unknown status (AC-14)', async () => {
    mockSelect.mockImplementation(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockRejectedValue(new Error('DB error')),
        })),
      })),
    }))

    const result = await graph_check_cohesion({ featureId: featureUuid })

    expect(result.status).toBe('unknown')
    expect(mockWarn).toHaveBeenCalled()
  })

  it('throws ZodError for empty featureId string (AC-14)', async () => {
    await expect(graph_check_cohesion({ featureId: '' })).rejects.toThrow()
  })

  it('handles malformed JSONB conditions without crashing (AC-14)', async () => {
    const feature = makeFeature()
    // Rule with malformed conditions that will throw when accessed
    const ruleWithBadConditions = makeRule({
      conditions: null, // null will cause TypeError when accessing .featurePatterns
    })

    setupMockChains([feature], [ruleWithBadConditions])

    // Should not throw — resilient to malformed JSONB
    const result = await graph_check_cohesion({ featureId: featureUuid })

    // Will log a warning for the malformed rule but still return a valid response
    expect(result).toBeDefined()
    expect(['complete', 'incomplete', 'unknown']).toContain(result.status)
  })

  it('accepts feature name as featureId (dual ID support) (AC-14)', async () => {
    const feature = makeFeature()

    setupMockChains([feature], [])

    const result = await graph_check_cohesion({ featureId: 'test-feature' })

    expect(result.status).toBe('complete')
  })
})
