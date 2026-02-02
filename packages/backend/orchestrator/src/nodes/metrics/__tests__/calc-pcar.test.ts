import { describe, expect, it, vi } from 'vitest'
import {
  filterPostCommitmentEvents,
  classifyAmbiguityEvent,
  calculatePCARRate,
  calculatePCARMetrics,
  generatePCARAnalysis,
  AmbiguityEventTypeSchema,
  AmbiguityEventSchema,
  PCARMetricsSchema,
  PCARResultSchema,
  PCARConfigSchema,
  type AmbiguityEvent,
  type PCARMetrics,
  type GraphStateWithPCAR,
} from '../calc-pcar.js'
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
  const storyId = overrides.storyId || 'flow-037'
  return createEvent(type, storyId, phase, {
    description: overrides.description || `${type} event`,
  })
}

const createTestGraphState = (
  overrides: Partial<GraphStateWithPCAR> = {},
): GraphStateWithPCAR =>
  ({
    schemaVersion: '1.0.0',
    epicPrefix: 'flow',
    storyId: 'flow-037',
    artifactPaths: {},
    routingFlags: {},
    evidenceRefs: [],
    gateDecisions: {},
    errors: [],
    stateHistory: [],
    ...overrides,
  }) as GraphStateWithPCAR

describe('filterPostCommitmentEvents', () => {
  it('returns empty array for empty events', () => {
    const result = filterPostCommitmentEvents([])

    expect(result).toEqual([])
  })

  it('returns empty array for null events', () => {
    const result = filterPostCommitmentEvents(null as unknown as WorkflowEvent[])

    expect(result).toEqual([])
  })

  it('filters events to only post-commitment phases', () => {
    const events = [
      createTestEvent('clarification', 'seed'),
      createTestEvent('clarification', 'elaboration'),
      createTestEvent('clarification', 'review'),
      createTestEvent('commitment', 'commitment'),
      createTestEvent('clarification', 'implementation'),
      createTestEvent('scope_change', 'verification'),
      createTestEvent('completion', 'complete'),
    ]

    const result = filterPostCommitmentEvents(events)

    expect(result.length).toBe(3)
    expect(result.every(e => ['implementation', 'verification', 'complete'].includes(e.phase))).toBe(
      true,
    )
  })

  it('includes events based on commitment timestamp when provided', () => {
    const commitTime = new Date('2024-01-15T12:00:00Z')
    const beforeCommit = new Date('2024-01-15T11:00:00Z')
    const afterCommit = new Date('2024-01-15T13:00:00Z')

    // Create events with specific timestamps
    const events: WorkflowEvent[] = [
      {
        id: 'EVT-1',
        type: 'clarification',
        storyId: 'flow-037',
        timestamp: beforeCommit.toISOString(),
        phase: 'elaboration',
        details: { description: 'Before commit', actor: 'system', relatedIds: [], metadata: {} },
        sequenceNumber: 0,
      },
      {
        id: 'EVT-2',
        type: 'commitment',
        storyId: 'flow-037',
        timestamp: commitTime.toISOString(),
        phase: 'commitment',
        details: { description: 'Committed', actor: 'system', relatedIds: [], metadata: {} },
        sequenceNumber: 1,
      },
      {
        id: 'EVT-3',
        type: 'clarification',
        storyId: 'flow-037',
        timestamp: afterCommit.toISOString(),
        phase: 'elaboration', // Even in earlier phase, but after commit time
        details: { description: 'After commit', actor: 'system', relatedIds: [], metadata: {} },
        sequenceNumber: 2,
      },
    ]

    const result = filterPostCommitmentEvents(events, commitTime.toISOString())

    // Should include event after commit time even if in earlier phase
    expect(result.some(e => e.id === 'EVT-3')).toBe(true)
    // Should not include event before commit time (unless in post-commitment phase)
    expect(result.some(e => e.id === 'EVT-1')).toBe(false)
  })

  it('finds commitment event automatically when timestamp not provided', () => {
    const events: WorkflowEvent[] = [
      createTestEvent('clarification', 'elaboration'),
      createTestEvent('commitment', 'commitment'),
      createTestEvent('clarification', 'implementation'),
    ]

    const result = filterPostCommitmentEvents(events)

    // Should include implementation phase event
    expect(result.some(e => e.phase === 'implementation')).toBe(true)
    // Should not include elaboration phase event (before commitment)
    expect(result.some(e => e.phase === 'elaboration')).toBe(false)
  })
})

describe('classifyAmbiguityEvent', () => {
  it('classifies clarification event as ambiguity', () => {
    const event = createTestEvent('clarification', 'implementation')

    const result = classifyAmbiguityEvent(event)

    expect(result).not.toBeNull()
    expect(result?.type).toBe('clarification')
    expect(result?.storyId).toBe('flow-037')
    expect(result?.phase).toBe('implementation')
    expect(() => AmbiguityEventSchema.parse(result)).not.toThrow()
  })

  it('classifies scope_change event as ambiguity', () => {
    const event = createTestEvent('scope_change', 'verification')

    const result = classifyAmbiguityEvent(event)

    expect(result).not.toBeNull()
    expect(result?.type).toBe('scope_change')
    expect(result?.phase).toBe('verification')
    expect(() => AmbiguityEventSchema.parse(result)).not.toThrow()
  })

  it('returns null for commitment event', () => {
    const event = createTestEvent('commitment', 'commitment')

    const result = classifyAmbiguityEvent(event)

    expect(result).toBeNull()
  })

  it('returns null for completion event', () => {
    const event = createTestEvent('completion', 'complete')

    const result = classifyAmbiguityEvent(event)

    expect(result).toBeNull()
  })

  it('returns null for blocker events', () => {
    const blockerAdded = createTestEvent('blocker_added', 'implementation')
    const blockerResolved = createTestEvent('blocker_resolved', 'implementation')

    expect(classifyAmbiguityEvent(blockerAdded)).toBeNull()
    expect(classifyAmbiguityEvent(blockerResolved)).toBeNull()
  })
})

describe('calculatePCARRate', () => {
  it('calculates rate correctly', () => {
    expect(calculatePCARRate(5, 10)).toBe(0.5)
    expect(calculatePCARRate(10, 5)).toBe(2)
    expect(calculatePCARRate(0, 10)).toBe(0)
  })

  it('returns 0 when stories count is 0', () => {
    expect(calculatePCARRate(5, 0)).toBe(0)
  })

  it('returns 0 when stories count is negative', () => {
    expect(calculatePCARRate(5, -1)).toBe(0)
  })
})

describe('calculatePCARMetrics', () => {
  it('counts clarification and scope_change events separately', () => {
    const events = [
      createTestEvent('commitment', 'commitment'),
      createTestEvent('clarification', 'implementation'),
      createTestEvent('clarification', 'implementation'),
      createTestEvent('scope_change', 'verification'),
      createTestEvent('completion', 'complete'),
    ]

    const { metrics, ambiguityEvents } = calculatePCARMetrics(events)

    expect(metrics.clarificationCount).toBe(2)
    expect(metrics.scopeChangeCount).toBe(1)
    expect(metrics.totalAmbiguity).toBe(3)
    expect(ambiguityEvents.length).toBe(3)
    expect(() => PCARMetricsSchema.parse(metrics)).not.toThrow()
  })

  it('groups events by post-commitment phase', () => {
    const events = [
      createTestEvent('commitment', 'commitment'),
      createTestEvent('clarification', 'implementation'),
      createTestEvent('clarification', 'implementation'),
      createTestEvent('scope_change', 'verification'),
      createTestEvent('clarification', 'complete'),
    ]

    const { metrics } = calculatePCARMetrics(events)

    expect(metrics.byPhase.implementation).toBe(2)
    expect(metrics.byPhase.verification).toBe(1)
    expect(metrics.byPhase.complete).toBe(1)
  })

  it('excludes pre-commitment events', () => {
    const events = [
      createTestEvent('clarification', 'seed'),
      createTestEvent('clarification', 'elaboration'),
      createTestEvent('scope_change', 'review'),
      createTestEvent('commitment', 'commitment'),
      createTestEvent('clarification', 'implementation'),
    ]

    const { metrics } = calculatePCARMetrics(events)

    // Only the post-commitment clarification should count
    expect(metrics.clarificationCount).toBe(1)
    expect(metrics.scopeChangeCount).toBe(0)
    expect(metrics.totalAmbiguity).toBe(1)
  })

  it('respects includeCompletePhase config', () => {
    const events = [
      createTestEvent('commitment', 'commitment'),
      createTestEvent('clarification', 'implementation'),
      createTestEvent('clarification', 'complete'),
    ]

    const withComplete = calculatePCARMetrics(events, { includeCompletePhase: true })
    const withoutComplete = calculatePCARMetrics(events, { includeCompletePhase: false })

    expect(withComplete.metrics.totalAmbiguity).toBe(2)
    expect(withoutComplete.metrics.totalAmbiguity).toBe(1)
  })

  it('calculates rate as events per story', () => {
    const events = [
      createTestEvent('commitment', 'commitment'),
      createTestEvent('clarification', 'implementation'),
      createTestEvent('scope_change', 'implementation'),
    ]

    const { metrics } = calculatePCARMetrics(events)

    // For single story, rate should equal totalAmbiguity
    expect(metrics.rate).toBe(2)
  })

  it('returns zero metrics for empty events', () => {
    const { metrics, ambiguityEvents } = calculatePCARMetrics([])

    expect(metrics.clarificationCount).toBe(0)
    expect(metrics.scopeChangeCount).toBe(0)
    expect(metrics.totalAmbiguity).toBe(0)
    expect(metrics.rate).toBe(0)
    expect(ambiguityEvents.length).toBe(0)
  })
})

describe('generatePCARAnalysis', () => {
  it('generates successful analysis with commitment', async () => {
    const events = [
      createTestEvent('commitment', 'commitment'),
      createTestEvent('clarification', 'implementation'),
      createTestEvent('scope_change', 'verification'),
    ]

    const result = await generatePCARAnalysis('flow-037', events)

    expect(result.success).toBe(true)
    expect(result.storyId).toBe('flow-037')
    expect(result.hasCommitment).toBe(true)
    expect(result.commitmentTimestamp).toBeDefined()
    expect(result.metrics.totalAmbiguity).toBe(2)
    expect(result.storiesAnalyzed).toBe(1)
    expect(result.events.length).toBe(2)
    expect(result.insights.length).toBeGreaterThan(0)
    expect(() => PCARResultSchema.parse(result)).not.toThrow()
  })

  it('returns unsuccessful for null events', async () => {
    const result = await generatePCARAnalysis('flow-037', null)

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.metrics.totalAmbiguity).toBe(0)
  })

  it('returns unsuccessful for empty events', async () => {
    const result = await generatePCARAnalysis('flow-037', [])

    expect(result.success).toBe(false)
    expect(result.hasCommitment).toBe(false)
  })

  it('indicates when no commitment found', async () => {
    const events = [
      createTestEvent('clarification', 'implementation'),
      createTestEvent('scope_change', 'verification'),
    ]

    const result = await generatePCARAnalysis('flow-037', events)

    expect(result.success).toBe(true) // Still calculates, but flags missing commitment
    expect(result.hasCommitment).toBe(false)
    expect(result.commitmentTimestamp).toBeUndefined()
    expect(result.insights.some(i => i.includes('No commitment event found'))).toBe(true)
  })

  it('generates insights for zero ambiguity', async () => {
    const events = [
      createTestEvent('commitment', 'commitment'),
      createTestEvent('completion', 'complete'),
    ]

    const result = await generatePCARAnalysis('flow-037', events)

    expect(result.success).toBe(true)
    expect(result.metrics.totalAmbiguity).toBe(0)
    expect(result.insights.some(i => i.includes('Zero post-commitment ambiguity'))).toBe(true)
  })

  it('generates high PCAR warning when threshold exceeded', async () => {
    const events = [
      createTestEvent('commitment', 'commitment'),
      createTestEvent('clarification', 'implementation'),
      createTestEvent('clarification', 'implementation'),
      createTestEvent('clarification', 'implementation'),
      createTestEvent('scope_change', 'verification'),
    ]

    const result = await generatePCARAnalysis('flow-037', events, {
      highPCARThreshold: 3,
      criticalPCARThreshold: 5,
    })

    expect(result.success).toBe(true)
    expect(result.metrics.totalAmbiguity).toBe(4)
    expect(result.insights.some(i => i.includes('High PCAR'))).toBe(true)
  })

  it('generates critical PCAR warning when critical threshold exceeded', async () => {
    const events = [
      createTestEvent('commitment', 'commitment'),
      createTestEvent('clarification', 'implementation'),
      createTestEvent('clarification', 'implementation'),
      createTestEvent('clarification', 'implementation'),
      createTestEvent('scope_change', 'verification'),
      createTestEvent('scope_change', 'verification'),
      createTestEvent('scope_change', 'verification'),
    ]

    const result = await generatePCARAnalysis('flow-037', events, {
      highPCARThreshold: 3,
      criticalPCARThreshold: 5,
    })

    expect(result.success).toBe(true)
    expect(result.metrics.totalAmbiguity).toBe(6)
    expect(result.insights.some(i => i.includes('Critical PCAR'))).toBe(true)
  })

  it('identifies clarification-heavy pattern', async () => {
    const events = [
      createTestEvent('commitment', 'commitment'),
      createTestEvent('clarification', 'implementation'),
      createTestEvent('clarification', 'implementation'),
      createTestEvent('clarification', 'implementation'),
      createTestEvent('clarification', 'implementation'),
      createTestEvent('clarification', 'implementation'),
    ]

    const result = await generatePCARAnalysis('flow-037', events)

    expect(result.metrics.clarificationCount).toBe(5)
    expect(result.metrics.scopeChangeCount).toBe(0)
    expect(result.insights.some(i => i.includes('Clarification-heavy'))).toBe(true)
  })

  it('identifies scope-change-heavy pattern', async () => {
    const events = [
      createTestEvent('commitment', 'commitment'),
      createTestEvent('scope_change', 'implementation'),
      createTestEvent('scope_change', 'implementation'),
      createTestEvent('scope_change', 'implementation'),
      createTestEvent('scope_change', 'implementation'),
      createTestEvent('scope_change', 'implementation'),
    ]

    const result = await generatePCARAnalysis('flow-037', events)

    expect(result.metrics.scopeChangeCount).toBe(5)
    expect(result.metrics.clarificationCount).toBe(0)
    expect(result.insights.some(i => i.includes('Scope-change-heavy'))).toBe(true)
  })

  it('flags high implementation phase ratio', async () => {
    const events = [
      createTestEvent('commitment', 'commitment'),
      createTestEvent('clarification', 'implementation'),
      createTestEvent('clarification', 'implementation'),
      createTestEvent('clarification', 'implementation'),
      createTestEvent('clarification', 'implementation'),
    ]

    const result = await generatePCARAnalysis('flow-037', events)

    expect(result.metrics.byPhase.implementation).toBe(4)
    expect(result.insights.some(i => i.includes('implementation phase'))).toBe(true)
  })

  it('flags verification phase ambiguity', async () => {
    const events = [
      createTestEvent('commitment', 'commitment'),
      createTestEvent('clarification', 'verification'),
    ]

    const result = await generatePCARAnalysis('flow-037', events)

    expect(result.metrics.byPhase.verification).toBe(1)
    expect(result.insights.some(i => i.includes('verification'))).toBe(true)
  })
})

describe('Schema validations', () => {
  describe('AmbiguityEventTypeSchema', () => {
    it('validates clarification and scope_change', () => {
      expect(() => AmbiguityEventTypeSchema.parse('clarification')).not.toThrow()
      expect(() => AmbiguityEventTypeSchema.parse('scope_change')).not.toThrow()
    })

    it('rejects other event types', () => {
      expect(() => AmbiguityEventTypeSchema.parse('commitment')).toThrow()
      expect(() => AmbiguityEventTypeSchema.parse('completion')).toThrow()
      expect(() => AmbiguityEventTypeSchema.parse('blocker_added')).toThrow()
    })
  })

  describe('AmbiguityEventSchema', () => {
    it('validates valid ambiguity event', () => {
      const event: AmbiguityEvent = {
        type: 'clarification',
        storyId: 'flow-037',
        timestamp: new Date().toISOString(),
        phase: 'implementation',
        originalEventId: 'EVT-001',
        description: 'Need clarification on AC-3',
        actor: 'user',
      }

      expect(() => AmbiguityEventSchema.parse(event)).not.toThrow()
    })

    it('validates minimal ambiguity event', () => {
      const event = {
        type: 'scope_change',
        storyId: 'flow-037',
        timestamp: new Date().toISOString(),
        phase: 'verification',
        originalEventId: 'EVT-002',
      }

      expect(() => AmbiguityEventSchema.parse(event)).not.toThrow()
    })
  })

  describe('PCARMetricsSchema', () => {
    it('validates complete metrics', () => {
      const metrics: PCARMetrics = {
        clarificationCount: 3,
        scopeChangeCount: 2,
        totalAmbiguity: 5,
        rate: 2.5,
        byPhase: {
          implementation: 3,
          verification: 1,
          complete: 1,
        },
      }

      expect(() => PCARMetricsSchema.parse(metrics)).not.toThrow()
    })

    it('rejects negative counts', () => {
      const metrics = {
        clarificationCount: -1,
        scopeChangeCount: 2,
        totalAmbiguity: 1,
        rate: 0.5,
        byPhase: {
          implementation: 0,
          verification: 0,
          complete: 0,
        },
      }

      expect(() => PCARMetricsSchema.parse(metrics)).toThrow()
    })

    it('rejects negative rate', () => {
      const metrics = {
        clarificationCount: 0,
        scopeChangeCount: 0,
        totalAmbiguity: 0,
        rate: -1,
        byPhase: {
          implementation: 0,
          verification: 0,
          complete: 0,
        },
      }

      expect(() => PCARMetricsSchema.parse(metrics)).toThrow()
    })
  })

  describe('PCARResultSchema', () => {
    it('validates successful result', () => {
      const result = {
        storyId: 'flow-037',
        calculatedAt: new Date().toISOString(),
        metrics: {
          clarificationCount: 2,
          scopeChangeCount: 1,
          totalAmbiguity: 3,
          rate: 3,
          byPhase: {
            implementation: 2,
            verification: 1,
            complete: 0,
          },
        },
        events: [],
        storiesAnalyzed: 1,
        hasCommitment: true,
        commitmentTimestamp: new Date().toISOString(),
        insights: ['Some insight'],
        success: true,
      }

      expect(() => PCARResultSchema.parse(result)).not.toThrow()
    })

    it('validates failed result with error', () => {
      const result = {
        storyId: 'flow-037',
        calculatedAt: new Date().toISOString(),
        metrics: {
          clarificationCount: 0,
          scopeChangeCount: 0,
          totalAmbiguity: 0,
          rate: 0,
          byPhase: {
            implementation: 0,
            verification: 0,
            complete: 0,
          },
        },
        events: [],
        storiesAnalyzed: 0,
        hasCommitment: false,
        insights: [],
        success: false,
        error: 'No events provided',
      }

      expect(() => PCARResultSchema.parse(result)).not.toThrow()
    })
  })

  describe('PCARConfigSchema', () => {
    it('applies default values', () => {
      const config = PCARConfigSchema.parse({})

      expect(config.includeCompletePhase).toBe(true)
      expect(config.highPCARThreshold).toBe(3)
      expect(config.criticalPCARThreshold).toBe(5)
    })

    it('accepts custom config', () => {
      const config = PCARConfigSchema.parse({
        includeCompletePhase: false,
        highPCARThreshold: 2,
        criticalPCARThreshold: 4,
      })

      expect(config.includeCompletePhase).toBe(false)
      expect(config.highPCARThreshold).toBe(2)
      expect(config.criticalPCARThreshold).toBe(4)
    })

    it('rejects non-positive thresholds', () => {
      expect(() => PCARConfigSchema.parse({ highPCARThreshold: 0 })).toThrow()
      expect(() => PCARConfigSchema.parse({ criticalPCARThreshold: -1 })).toThrow()
    })
  })
})
