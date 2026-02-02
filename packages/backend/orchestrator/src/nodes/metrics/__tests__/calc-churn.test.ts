import { describe, expect, it, vi } from 'vitest'
import {
  mapToChurnPhase,
  identifyChurnEvents,
  classifyChurnByPhase,
  calculateDistribution,
  assessChurnHealthiness,
  calculateChurnIndex,
  ChurnPhaseSchema,
  ChurnEventSchema,
  ChurnDistributionSchema,
  ChurnPlacementIndexSchema,
  ChurnResultSchema,
  ChurnConfigSchema,
  type ChurnEvent,
  type ChurnDistribution,
  type ChurnPlacementIndex,
  type GraphStateWithChurn,
} from '../calc-churn.js'
import { createEvent, type WorkflowEvent, type WorkflowPhase } from '../collect-events.js'

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
const createTestEvent = (
  type: 'commitment' | 'clarification' | 'scope_change' | 'completion' | 'blocker_added' | 'blocker_resolved',
  phase: WorkflowPhase,
  overrides: Partial<{ storyId: string; timestamp: string; description: string }> = {},
): WorkflowEvent => {
  const storyId = overrides.storyId || 'flow-039'
  return createEvent(type, storyId, phase, {
    description: overrides.description || `${type} event`,
  })
}

const createTestGraphState = (
  overrides: Partial<GraphStateWithChurn> = {},
): GraphStateWithChurn =>
  ({
    schemaVersion: '1.0.0',
    epicPrefix: 'flow',
    storyId: 'flow-039',
    artifactPaths: {},
    routingFlags: {},
    evidenceRefs: [],
    gateDecisions: {},
    errors: [],
    stateHistory: [],
    ...overrides,
  }) as GraphStateWithChurn

describe('mapToChurnPhase', () => {
  it('maps seed phase to discovery', () => {
    expect(mapToChurnPhase('seed')).toBe('discovery')
  })

  it('maps review phase to discovery', () => {
    expect(mapToChurnPhase('review')).toBe('discovery')
  })

  it('maps elaboration phase to elaboration', () => {
    expect(mapToChurnPhase('elaboration')).toBe('elaboration')
  })

  it('maps hygiene phase to elaboration', () => {
    expect(mapToChurnPhase('hygiene')).toBe('elaboration')
  })

  it('maps readiness phase to elaboration', () => {
    expect(mapToChurnPhase('readiness')).toBe('elaboration')
  })

  it('maps commitment phase to development', () => {
    expect(mapToChurnPhase('commitment')).toBe('development')
  })

  it('maps implementation phase to development', () => {
    expect(mapToChurnPhase('implementation')).toBe('development')
  })

  it('maps verification phase to post_dev', () => {
    expect(mapToChurnPhase('verification')).toBe('post_dev')
  })

  it('maps complete phase to post_dev', () => {
    expect(mapToChurnPhase('complete')).toBe('post_dev')
  })
})

describe('identifyChurnEvents', () => {
  it('returns empty array for empty events', () => {
    const result = identifyChurnEvents([])

    expect(result).toEqual([])
  })

  it('returns empty array for null events', () => {
    const result = identifyChurnEvents(null as unknown as WorkflowEvent[])

    expect(result).toEqual([])
  })

  it('identifies clarification events as churn', () => {
    const events = [
      createTestEvent('clarification', 'elaboration'),
      createTestEvent('commitment', 'commitment'),
      createTestEvent('completion', 'complete'),
    ]

    const result = identifyChurnEvents(events)

    expect(result.length).toBe(1)
    expect(result[0].type).toBe('clarification')
  })

  it('identifies scope_change events as churn', () => {
    const events = [
      createTestEvent('scope_change', 'implementation'),
      createTestEvent('commitment', 'commitment'),
    ]

    const result = identifyChurnEvents(events)

    expect(result.length).toBe(1)
    expect(result[0].type).toBe('scope_change')
  })

  it('ignores non-churn events', () => {
    const events = [
      createTestEvent('commitment', 'commitment'),
      createTestEvent('completion', 'complete'),
      createTestEvent('blocker_added', 'implementation'),
      createTestEvent('blocker_resolved', 'implementation'),
    ]

    const result = identifyChurnEvents(events)

    expect(result.length).toBe(0)
  })

  it('classifies churn events to correct phases', () => {
    const events = [
      createTestEvent('clarification', 'seed'),
      createTestEvent('clarification', 'elaboration'),
      createTestEvent('scope_change', 'implementation'),
      createTestEvent('clarification', 'verification'),
    ]

    const result = identifyChurnEvents(events)

    expect(result.length).toBe(4)
    expect(result[0].churnPhase).toBe('discovery')
    expect(result[1].churnPhase).toBe('elaboration')
    expect(result[2].churnPhase).toBe('development')
    expect(result[3].churnPhase).toBe('post_dev')
  })
})

describe('classifyChurnByPhase', () => {
  it('delegates to identifyChurnEvents', () => {
    const events = [
      createTestEvent('clarification', 'seed'),
      createTestEvent('scope_change', 'elaboration'),
    ]

    const result = classifyChurnByPhase(events)

    expect(result.length).toBe(2)
    expect(result[0].churnPhase).toBe('discovery')
    expect(result[1].churnPhase).toBe('elaboration')
  })
})

describe('calculateDistribution', () => {
  it('returns zero distribution for empty events', () => {
    const result = calculateDistribution([])

    expect(result.discovery).toBe(0)
    expect(result.elaboration).toBe(0)
    expect(result.development).toBe(0)
    expect(result.post_dev).toBe(0)
    expect(result.total).toBe(0)
    expect(() => ChurnDistributionSchema.parse(result)).not.toThrow()
  })

  it('calculates correct distribution percentages', () => {
    const churnEvents: ChurnEvent[] = [
      { storyId: 'flow-039', churnPhase: 'discovery', originalPhase: 'seed', type: 'clarification', timestamp: new Date().toISOString(), originalEventId: 'EVT-1' },
      { storyId: 'flow-039', churnPhase: 'discovery', originalPhase: 'review', type: 'clarification', timestamp: new Date().toISOString(), originalEventId: 'EVT-2' },
      { storyId: 'flow-039', churnPhase: 'elaboration', originalPhase: 'elaboration', type: 'scope_change', timestamp: new Date().toISOString(), originalEventId: 'EVT-3' },
      { storyId: 'flow-039', churnPhase: 'development', originalPhase: 'implementation', type: 'clarification', timestamp: new Date().toISOString(), originalEventId: 'EVT-4' },
    ]

    const result = calculateDistribution(churnEvents)

    expect(result.discovery).toBe(0.5) // 2/4
    expect(result.elaboration).toBe(0.25) // 1/4
    expect(result.development).toBe(0.25) // 1/4
    expect(result.post_dev).toBe(0) // 0/4
    expect(result.counts.discovery).toBe(2)
    expect(result.counts.elaboration).toBe(1)
    expect(result.counts.development).toBe(1)
    expect(result.counts.post_dev).toBe(0)
    expect(result.total).toBe(4)
  })

  it('handles single phase concentration', () => {
    const churnEvents: ChurnEvent[] = [
      { storyId: 'flow-039', churnPhase: 'discovery', originalPhase: 'seed', type: 'clarification', timestamp: new Date().toISOString(), originalEventId: 'EVT-1' },
      { storyId: 'flow-039', churnPhase: 'discovery', originalPhase: 'seed', type: 'scope_change', timestamp: new Date().toISOString(), originalEventId: 'EVT-2' },
      { storyId: 'flow-039', churnPhase: 'discovery', originalPhase: 'review', type: 'clarification', timestamp: new Date().toISOString(), originalEventId: 'EVT-3' },
    ]

    const result = calculateDistribution(churnEvents)

    expect(result.discovery).toBe(1) // All 3 in discovery
    expect(result.elaboration).toBe(0)
    expect(result.development).toBe(0)
    expect(result.post_dev).toBe(0)
    expect(result.total).toBe(3)
  })
})

describe('assessChurnHealthiness', () => {
  it('identifies healthy pattern with early churn concentration', () => {
    const distribution: ChurnDistribution = {
      discovery: 0.5,
      elaboration: 0.3,
      development: 0.15,
      post_dev: 0.05,
      counts: { discovery: 10, elaboration: 6, development: 3, post_dev: 1 },
      total: 20,
    }

    const result = assessChurnHealthiness(distribution)

    expect(result.isHealthy).toBe(true)
    expect(result.earlyRatio).toBe(0.8)
    expect(result.lateRatio).toBe(0.2)
    expect(result.healthScore).toBe(80)
    expect(result.commitmentDropRatio).toBe(4) // 0.8 / 0.2
  })

  it('identifies unhealthy pattern with late churn concentration', () => {
    const distribution: ChurnDistribution = {
      discovery: 0.1,
      elaboration: 0.2,
      development: 0.4,
      post_dev: 0.3,
      counts: { discovery: 1, elaboration: 2, development: 4, post_dev: 3 },
      total: 10,
    }

    const result = assessChurnHealthiness(distribution)

    expect(result.isHealthy).toBe(false)
    expect(result.earlyRatio).toBeCloseTo(0.3)
    expect(result.lateRatio).toBeCloseTo(0.7)
    expect(result.healthScore).toBe(30)
  })

  it('caps commitment drop ratio at 10', () => {
    const distribution: ChurnDistribution = {
      discovery: 1,
      elaboration: 0,
      development: 0,
      post_dev: 0,
      counts: { discovery: 10, elaboration: 0, development: 0, post_dev: 0 },
      total: 10,
    }

    const result = assessChurnHealthiness(distribution)

    expect(result.commitmentDropRatio).toBe(10)
  })

  it('handles zero late churn', () => {
    const distribution: ChurnDistribution = {
      discovery: 0.6,
      elaboration: 0.4,
      development: 0,
      post_dev: 0,
      counts: { discovery: 6, elaboration: 4, development: 0, post_dev: 0 },
      total: 10,
    }

    const result = assessChurnHealthiness(distribution)

    expect(result.isHealthy).toBe(true)
    expect(result.healthScore).toBe(100)
    expect(result.commitmentDropRatio).toBe(10) // Capped because late is 0
  })

  it('respects custom healthy threshold', () => {
    const distribution: ChurnDistribution = {
      discovery: 0.4,
      elaboration: 0.2,
      development: 0.2,
      post_dev: 0.2,
      counts: { discovery: 4, elaboration: 2, development: 2, post_dev: 2 },
      total: 10,
    }

    // With default 0.7 threshold
    const defaultResult = assessChurnHealthiness(distribution)
    expect(defaultResult.isHealthy).toBe(false) // 0.6 < 0.7

    // With custom 0.5 threshold
    const customResult = assessChurnHealthiness(distribution, ChurnConfigSchema.parse({ healthyThreshold: 0.5 }))
    expect(customResult.isHealthy).toBe(true) // 0.6 >= 0.5
  })
})

describe('calculateChurnIndex', () => {
  it('returns unsuccessful result for null events', async () => {
    const result = await calculateChurnIndex('flow-039', null)

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.totalChurnEvents).toBe(0)
    expect(() => ChurnResultSchema.parse(result)).not.toThrow()
  })

  it('returns unsuccessful result for empty events', async () => {
    const result = await calculateChurnIndex('flow-039', [])

    expect(result.success).toBe(false)
    expect(result.totalChurnEvents).toBe(0)
  })

  it('calculates complete churn index from events', async () => {
    const events = [
      createTestEvent('clarification', 'seed'),
      createTestEvent('clarification', 'elaboration'),
      createTestEvent('scope_change', 'elaboration'),
      createTestEvent('clarification', 'implementation'),
      createTestEvent('commitment', 'commitment'),
    ]

    const result = await calculateChurnIndex('flow-039', events)

    expect(result.success).toBe(true)
    expect(result.storyId).toBe('flow-039')
    expect(result.totalChurnEvents).toBe(4) // Only churn events counted
    expect(result.events.length).toBe(4)
    expect(result.index.distribution.total).toBe(4)
    expect(result.insights.length).toBeGreaterThan(0)
    expect(() => ChurnResultSchema.parse(result)).not.toThrow()
  })

  it('indicates healthy pattern when churn is early-concentrated', async () => {
    const events = [
      createTestEvent('clarification', 'seed'),
      createTestEvent('clarification', 'seed'),
      createTestEvent('scope_change', 'elaboration'),
      createTestEvent('clarification', 'elaboration'),
    ]

    const result = await calculateChurnIndex('flow-039', events)

    expect(result.success).toBe(true)
    expect(result.index.isHealthyPattern).toBe(true)
    expect(result.index.earlyChurnRatio).toBe(1) // All churn is early
    expect(result.index.healthScore).toBe(100)
  })

  it('indicates unhealthy pattern when churn is late-concentrated', async () => {
    const events = [
      createTestEvent('clarification', 'seed'),
      createTestEvent('clarification', 'implementation'),
      createTestEvent('scope_change', 'implementation'),
      createTestEvent('clarification', 'verification'),
      createTestEvent('scope_change', 'verification'),
    ]

    const result = await calculateChurnIndex('flow-039', events)

    expect(result.success).toBe(true)
    expect(result.index.isHealthyPattern).toBe(false)
    expect(result.index.lateChurnRatio).toBeGreaterThan(0.7)
    expect(result.insights.some(i => i.toLowerCase().includes('unhealthy') || i.toLowerCase().includes('warning') || i.toLowerCase().includes('critical'))).toBe(true)
  })

  it('handles insufficient churn events gracefully', async () => {
    const events = [
      createTestEvent('clarification', 'seed'),
      createTestEvent('commitment', 'commitment'),
    ]

    const result = await calculateChurnIndex('flow-039', events, { minChurnEvents: 3 })

    expect(result.success).toBe(true)
    expect(result.totalChurnEvents).toBe(1)
    expect(result.insights.some(i => i.includes('Insufficient'))).toBe(true)
  })

  it('generates warning insights for high late churn', async () => {
    const events = [
      createTestEvent('clarification', 'seed'),
      createTestEvent('clarification', 'implementation'),
      createTestEvent('scope_change', 'implementation'),
      createTestEvent('clarification', 'verification'),
    ]

    const result = await calculateChurnIndex('flow-039', events, {
      warningThreshold: 0.4,
      criticalThreshold: 0.6,
    })

    expect(result.success).toBe(true)
    // Late ratio is 3/4 = 0.75, which exceeds critical threshold
    expect(result.insights.some(i => i.includes('Critical') || i.includes('Warning'))).toBe(true)
  })

  it('generates insights for post-dev churn', async () => {
    const events = [
      createTestEvent('clarification', 'verification'),
      createTestEvent('scope_change', 'verification'),
      createTestEvent('clarification', 'complete'),
    ]

    const result = await calculateChurnIndex('flow-039', events)

    expect(result.success).toBe(true)
    expect(result.index.distribution.post_dev).toBeGreaterThan(0)
    expect(result.insights.some(i => i.includes('post-dev') || i.includes('upstream'))).toBe(true)
  })
})

describe('Schema validations', () => {
  describe('ChurnPhaseSchema', () => {
    it('validates valid churn phases', () => {
      expect(() => ChurnPhaseSchema.parse('discovery')).not.toThrow()
      expect(() => ChurnPhaseSchema.parse('elaboration')).not.toThrow()
      expect(() => ChurnPhaseSchema.parse('development')).not.toThrow()
      expect(() => ChurnPhaseSchema.parse('post_dev')).not.toThrow()
    })

    it('rejects invalid phases', () => {
      expect(() => ChurnPhaseSchema.parse('implementation')).toThrow()
      expect(() => ChurnPhaseSchema.parse('other')).toThrow()
    })
  })

  describe('ChurnEventSchema', () => {
    it('validates valid churn event', () => {
      const event: ChurnEvent = {
        storyId: 'flow-039',
        churnPhase: 'discovery',
        originalPhase: 'seed',
        type: 'clarification',
        timestamp: new Date().toISOString(),
        originalEventId: 'EVT-001',
        description: 'Some clarification',
      }

      expect(() => ChurnEventSchema.parse(event)).not.toThrow()
    })

    it('validates minimal churn event', () => {
      const event = {
        storyId: 'flow-039',
        churnPhase: 'elaboration',
        originalPhase: 'elaboration',
        type: 'scope_change',
        timestamp: new Date().toISOString(),
        originalEventId: 'EVT-002',
      }

      expect(() => ChurnEventSchema.parse(event)).not.toThrow()
    })

    it('rejects invalid churn type', () => {
      const event = {
        storyId: 'flow-039',
        churnPhase: 'discovery',
        originalPhase: 'seed',
        type: 'commitment', // Invalid - not a churn type
        timestamp: new Date().toISOString(),
        originalEventId: 'EVT-001',
      }

      expect(() => ChurnEventSchema.parse(event)).toThrow()
    })
  })

  describe('ChurnDistributionSchema', () => {
    it('validates complete distribution', () => {
      const distribution: ChurnDistribution = {
        discovery: 0.5,
        elaboration: 0.3,
        development: 0.15,
        post_dev: 0.05,
        counts: { discovery: 10, elaboration: 6, development: 3, post_dev: 1 },
        total: 20,
      }

      expect(() => ChurnDistributionSchema.parse(distribution)).not.toThrow()
    })

    it('rejects percentages outside 0-1 range', () => {
      const distribution = {
        discovery: 1.5, // Invalid
        elaboration: 0.3,
        development: 0.15,
        post_dev: 0.05,
        counts: { discovery: 10, elaboration: 6, development: 3, post_dev: 1 },
        total: 20,
      }

      expect(() => ChurnDistributionSchema.parse(distribution)).toThrow()
    })

    it('rejects negative counts', () => {
      const distribution = {
        discovery: 0.5,
        elaboration: 0.3,
        development: 0.15,
        post_dev: 0.05,
        counts: { discovery: -1, elaboration: 6, development: 3, post_dev: 1 }, // Invalid
        total: 20,
      }

      expect(() => ChurnDistributionSchema.parse(distribution)).toThrow()
    })
  })

  describe('ChurnPlacementIndexSchema', () => {
    it('validates complete index', () => {
      const index: ChurnPlacementIndex = {
        distribution: {
          discovery: 0.5,
          elaboration: 0.3,
          development: 0.15,
          post_dev: 0.05,
          counts: { discovery: 10, elaboration: 6, development: 3, post_dev: 1 },
          total: 20,
        },
        earlyChurnRatio: 0.8,
        lateChurnRatio: 0.2,
        isHealthyPattern: true,
        healthScore: 80,
        commitmentDropRatio: 4,
      }

      expect(() => ChurnPlacementIndexSchema.parse(index)).not.toThrow()
    })

    it('rejects health score outside 0-100', () => {
      const index = {
        distribution: {
          discovery: 0.5,
          elaboration: 0.3,
          development: 0.15,
          post_dev: 0.05,
          counts: { discovery: 10, elaboration: 6, development: 3, post_dev: 1 },
          total: 20,
        },
        earlyChurnRatio: 0.8,
        lateChurnRatio: 0.2,
        isHealthyPattern: true,
        healthScore: 150, // Invalid
        commitmentDropRatio: 4,
      }

      expect(() => ChurnPlacementIndexSchema.parse(index)).toThrow()
    })
  })

  describe('ChurnResultSchema', () => {
    it('validates successful result', async () => {
      const result = await calculateChurnIndex('flow-039', [
        createTestEvent('clarification', 'seed'),
        createTestEvent('clarification', 'elaboration'),
        createTestEvent('scope_change', 'elaboration'),
      ])

      expect(() => ChurnResultSchema.parse(result)).not.toThrow()
    })

    it('validates failed result with error', () => {
      const result = {
        storyId: 'flow-039',
        calculatedAt: new Date().toISOString(),
        index: {
          distribution: {
            discovery: 0,
            elaboration: 0,
            development: 0,
            post_dev: 0,
            counts: { discovery: 0, elaboration: 0, development: 0, post_dev: 0 },
            total: 0,
          },
          earlyChurnRatio: 0,
          lateChurnRatio: 0,
          isHealthyPattern: true,
          healthScore: 100,
          commitmentDropRatio: 10,
        },
        events: [],
        totalChurnEvents: 0,
        insights: [],
        success: false,
        error: 'No events provided',
      }

      expect(() => ChurnResultSchema.parse(result)).not.toThrow()
    })
  })

  describe('ChurnConfigSchema', () => {
    it('applies default values', () => {
      const config = ChurnConfigSchema.parse({})

      expect(config.minChurnEvents).toBe(3)
      expect(config.healthyThreshold).toBe(0.7)
      expect(config.warningThreshold).toBe(0.4)
      expect(config.criticalThreshold).toBe(0.6)
    })

    it('accepts custom config', () => {
      const config = ChurnConfigSchema.parse({
        minChurnEvents: 5,
        healthyThreshold: 0.8,
        warningThreshold: 0.3,
        criticalThreshold: 0.5,
      })

      expect(config.minChurnEvents).toBe(5)
      expect(config.healthyThreshold).toBe(0.8)
      expect(config.warningThreshold).toBe(0.3)
      expect(config.criticalThreshold).toBe(0.5)
    })

    it('rejects thresholds outside 0-1', () => {
      expect(() => ChurnConfigSchema.parse({ healthyThreshold: 1.5 })).toThrow()
      expect(() => ChurnConfigSchema.parse({ warningThreshold: -0.1 })).toThrow()
    })

    it('rejects non-positive minChurnEvents', () => {
      expect(() => ChurnConfigSchema.parse({ minChurnEvents: 0 })).toThrow()
      expect(() => ChurnConfigSchema.parse({ minChurnEvents: -1 })).toThrow()
    })
  })
})
