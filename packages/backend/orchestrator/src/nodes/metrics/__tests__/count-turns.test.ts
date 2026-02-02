import { describe, expect, it, vi } from 'vitest'
import {
  filterPostCommitmentTurns,
  classifyStakeholderTurn,
  countTurnsByPair,
  calculateTurnMetrics,
  generateTurnCountAnalysis,
  StakeholderTypeSchema,
  TurnTriggerSchema,
  TurnEventSchema,
  StakeholderPairSchema,
  TurnCountsByPairSchema,
  TurnCountsByTriggerSchema,
  TurnMetricsSchema,
  TurnCountResultSchema,
  TurnCountConfigSchema,
  type TurnEvent,
  type TurnMetrics,
  type GraphStateWithTurnCount,
} from '../count-turns.js'
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
  type:
    | 'commitment'
    | 'clarification'
    | 'scope_change'
    | 'completion'
    | 'blocker_added'
    | 'blocker_resolved',
  phase: WorkflowPhase,
  overrides: Partial<{ storyId: string; timestamp: string; description: string; actor: string }> = {},
): WorkflowEvent => {
  const storyId = overrides.storyId || 'flow-038'
  return createEvent(type, storyId, phase, {
    description: overrides.description || `${type} event`,
    actor: overrides.actor || 'system',
  })
}

const createTestGraphState = (
  overrides: Partial<GraphStateWithTurnCount> = {},
): GraphStateWithTurnCount =>
  ({
    schemaVersion: '1.0.0',
    epicPrefix: 'flow',
    storyId: 'flow-038',
    artifactPaths: {},
    routingFlags: {},
    evidenceRefs: [],
    gateDecisions: {},
    errors: [],
    stateHistory: [],
    ...overrides,
  }) as GraphStateWithTurnCount

describe('filterPostCommitmentTurns', () => {
  it('returns empty array for empty events', () => {
    const result = filterPostCommitmentTurns([])

    expect(result).toEqual([])
  })

  it('returns empty array for null events', () => {
    const result = filterPostCommitmentTurns(null as unknown as WorkflowEvent[])

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

    const result = filterPostCommitmentTurns(events)

    expect(result.length).toBe(2) // Only clarification and scope_change in post-commitment
    expect(result.every(e => ['implementation', 'verification', 'complete'].includes(e.phase))).toBe(
      true,
    )
    expect(result.every(e => e.type === 'clarification' || e.type === 'scope_change')).toBe(true)
  })

  it('only includes clarification and scope_change events', () => {
    const events = [
      createTestEvent('commitment', 'commitment'),
      createTestEvent('clarification', 'implementation'),
      createTestEvent('completion', 'implementation'),
      createTestEvent('blocker_added', 'implementation'),
      createTestEvent('scope_change', 'verification'),
    ]

    const result = filterPostCommitmentTurns(events)

    expect(result.length).toBe(2)
    expect(result[0].type).toBe('clarification')
    expect(result[1].type).toBe('scope_change')
  })

  it('includes events based on commitment timestamp when provided', () => {
    const commitTime = new Date('2024-01-15T12:00:00Z')
    const beforeCommit = new Date('2024-01-15T11:00:00Z')
    const afterCommit = new Date('2024-01-15T13:00:00Z')

    const events: WorkflowEvent[] = [
      {
        id: 'EVT-1',
        type: 'clarification',
        storyId: 'flow-038',
        timestamp: beforeCommit.toISOString(),
        phase: 'elaboration',
        details: { description: 'Before commit', actor: 'user', relatedIds: [], metadata: {} },
        sequenceNumber: 0,
      },
      {
        id: 'EVT-2',
        type: 'commitment',
        storyId: 'flow-038',
        timestamp: commitTime.toISOString(),
        phase: 'commitment',
        details: { description: 'Committed', actor: 'system', relatedIds: [], metadata: {} },
        sequenceNumber: 1,
      },
      {
        id: 'EVT-3',
        type: 'clarification',
        storyId: 'flow-038',
        timestamp: afterCommit.toISOString(),
        phase: 'elaboration', // Even in earlier phase, but after commit time
        details: { description: 'After commit', actor: 'user', relatedIds: [], metadata: {} },
        sequenceNumber: 2,
      },
    ]

    const result = filterPostCommitmentTurns(events, commitTime.toISOString())

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

    const result = filterPostCommitmentTurns(events)

    // Should include implementation phase event
    expect(result.some(e => e.phase === 'implementation')).toBe(true)
    // Should not include elaboration phase event (before commitment)
    expect(result.some(e => e.phase === 'elaboration')).toBe(false)
  })
})

describe('classifyStakeholderTurn', () => {
  it('classifies clarification event as turn', () => {
    const event = createTestEvent('clarification', 'implementation', { actor: 'user' })

    const result = classifyStakeholderTurn(event)

    expect(result).not.toBeNull()
    expect(result?.trigger).toBe('clarification')
    expect(result?.storyId).toBe('flow-038')
    expect(result?.phase).toBe('implementation')
    expect(result?.from).toBe('pm') // user maps to pm
    expect(result?.to).toBe('dev')
    expect(() => TurnEventSchema.parse(result)).not.toThrow()
  })

  it('classifies scope_change event as turn', () => {
    const event = createTestEvent('scope_change', 'verification', { actor: 'pm' })

    const result = classifyStakeholderTurn(event)

    expect(result).not.toBeNull()
    expect(result?.trigger).toBe('scope_change')
    expect(result?.phase).toBe('verification')
    expect(result?.from).toBe('pm')
    expect(result?.to).toBe('dev')
    expect(() => TurnEventSchema.parse(result)).not.toThrow()
  })

  it('returns null for commitment event', () => {
    const event = createTestEvent('commitment', 'commitment')

    const result = classifyStakeholderTurn(event)

    expect(result).toBeNull()
  })

  it('returns null for completion event', () => {
    const event = createTestEvent('completion', 'complete')

    const result = classifyStakeholderTurn(event)

    expect(result).toBeNull()
  })

  it('returns null for blocker events', () => {
    const blockerAdded = createTestEvent('blocker_added', 'implementation')
    const blockerResolved = createTestEvent('blocker_resolved', 'implementation')

    expect(classifyStakeholderTurn(blockerAdded)).toBeNull()
    expect(classifyStakeholderTurn(blockerResolved)).toBeNull()
  })

  it('correctly maps dev actor', () => {
    const event = createTestEvent('clarification', 'implementation', { actor: 'developer' })

    const result = classifyStakeholderTurn(event)

    expect(result?.from).toBe('dev')
    expect(result?.to).toBe('pm')
  })

  it('correctly maps qa actor', () => {
    const event = createTestEvent('clarification', 'verification', { actor: 'qa' })

    const result = classifyStakeholderTurn(event)

    expect(result?.from).toBe('qa')
    expect(result?.to).toBe('dev')
  })

  it('correctly maps ux actor', () => {
    const event = createTestEvent('clarification', 'implementation', { actor: 'designer' })

    const result = classifyStakeholderTurn(event)

    expect(result?.from).toBe('ux')
    expect(result?.to).toBe('dev')
  })

  it('correctly maps architect actor', () => {
    const event = createTestEvent('scope_change', 'implementation', { actor: 'architect' })

    const result = classifyStakeholderTurn(event)

    expect(result?.from).toBe('architect')
    expect(result?.to).toBe('dev')
  })
})

describe('countTurnsByPair', () => {
  it('counts turns by stakeholder pair', () => {
    const turns: TurnEvent[] = [
      {
        from: 'pm',
        to: 'dev',
        storyId: 'flow-038',
        timestamp: new Date().toISOString(),
        phase: 'implementation',
        trigger: 'clarification',
      },
      {
        from: 'dev',
        to: 'pm',
        storyId: 'flow-038',
        timestamp: new Date().toISOString(),
        phase: 'implementation',
        trigger: 'clarification',
      },
      {
        from: 'qa',
        to: 'dev',
        storyId: 'flow-038',
        timestamp: new Date().toISOString(),
        phase: 'verification',
        trigger: 'clarification',
      },
    ]

    const result = countTurnsByPair(turns)

    expect(result.dev_pm).toBe(2) // Both pm->dev and dev->pm normalize to dev_pm
    expect(result.dev_qa).toBe(1)
    expect(result.dev_ux).toBe(0)
    expect(() => TurnCountsByPairSchema.parse(result)).not.toThrow()
  })

  it('returns zeros for empty turns', () => {
    const result = countTurnsByPair([])

    expect(result.dev_pm).toBe(0)
    expect(result.dev_qa).toBe(0)
    expect(result.dev_ux).toBe(0)
  })

  it('normalizes pair order alphabetically', () => {
    const turns: TurnEvent[] = [
      {
        from: 'ux',
        to: 'architect',
        storyId: 'flow-038',
        timestamp: new Date().toISOString(),
        phase: 'implementation',
        trigger: 'scope_change',
      },
    ]

    const result = countTurnsByPair(turns)

    expect(result.architect_ux).toBe(1) // Normalized to architect_ux not ux_architect
  })
})

describe('calculateTurnMetrics', () => {
  it('counts clarification and scope_change events separately', () => {
    const events = [
      createTestEvent('commitment', 'commitment'),
      createTestEvent('clarification', 'implementation', { actor: 'user' }),
      createTestEvent('clarification', 'implementation', { actor: 'developer' }),
      createTestEvent('scope_change', 'verification', { actor: 'pm' }),
      createTestEvent('completion', 'complete'),
    ]

    const { metrics, turnEvents } = calculateTurnMetrics(events)

    expect(metrics.byTrigger.clarification).toBe(2)
    expect(metrics.byTrigger.scope_change).toBe(1)
    expect(metrics.totalTurns).toBe(3)
    expect(turnEvents.length).toBe(3)
    expect(() => TurnMetricsSchema.parse(metrics)).not.toThrow()
  })

  it('groups events by post-commitment phase', () => {
    const events = [
      createTestEvent('commitment', 'commitment'),
      createTestEvent('clarification', 'implementation', { actor: 'user' }),
      createTestEvent('clarification', 'implementation', { actor: 'developer' }),
      createTestEvent('scope_change', 'verification', { actor: 'pm' }),
      createTestEvent('clarification', 'complete', { actor: 'qa' }),
    ]

    const { metrics } = calculateTurnMetrics(events)

    expect(metrics.byPhase.implementation).toBe(2)
    expect(metrics.byPhase.verification).toBe(1)
    expect(metrics.byPhase.complete).toBe(1)
  })

  it('excludes pre-commitment events', () => {
    const events = [
      createTestEvent('clarification', 'seed', { actor: 'user' }),
      createTestEvent('clarification', 'elaboration', { actor: 'pm' }),
      createTestEvent('scope_change', 'review', { actor: 'architect' }),
      createTestEvent('commitment', 'commitment'),
      createTestEvent('clarification', 'implementation', { actor: 'user' }),
    ]

    const { metrics } = calculateTurnMetrics(events)

    // Only the post-commitment clarification should count
    expect(metrics.totalTurns).toBe(1)
  })

  it('respects includeCompletePhase config', () => {
    const events = [
      createTestEvent('commitment', 'commitment'),
      createTestEvent('clarification', 'implementation', { actor: 'user' }),
      createTestEvent('clarification', 'complete', { actor: 'qa' }),
    ]

    const withComplete = calculateTurnMetrics(events, { includeCompletePhase: true })
    const withoutComplete = calculateTurnMetrics(events, { includeCompletePhase: false })

    expect(withComplete.metrics.totalTurns).toBe(2)
    expect(withoutComplete.metrics.totalTurns).toBe(1)
  })

  it('returns zero metrics for empty events', () => {
    const { metrics, turnEvents } = calculateTurnMetrics([])

    expect(metrics.totalTurns).toBe(0)
    expect(metrics.byTrigger.clarification).toBe(0)
    expect(metrics.byTrigger.scope_change).toBe(0)
    expect(turnEvents.length).toBe(0)
  })
})

describe('generateTurnCountAnalysis', () => {
  it('generates successful analysis with commitment', async () => {
    const events = [
      createTestEvent('commitment', 'commitment'),
      createTestEvent('clarification', 'implementation', { actor: 'user' }),
      createTestEvent('scope_change', 'verification', { actor: 'pm' }),
    ]

    const result = await generateTurnCountAnalysis('flow-038', events)

    expect(result.success).toBe(true)
    expect(result.storyId).toBe('flow-038')
    expect(result.hasCommitment).toBe(true)
    expect(result.commitmentTimestamp).toBeDefined()
    expect(result.metrics.totalTurns).toBe(2)
    expect(result.storiesAnalyzed).toBe(1)
    expect(result.events.length).toBe(2)
    expect(result.insights.length).toBeGreaterThan(0)
    expect(() => TurnCountResultSchema.parse(result)).not.toThrow()
  })

  it('returns unsuccessful for null events', async () => {
    const result = await generateTurnCountAnalysis('flow-038', null)

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.metrics.totalTurns).toBe(0)
  })

  it('returns unsuccessful for empty events', async () => {
    const result = await generateTurnCountAnalysis('flow-038', [])

    expect(result.success).toBe(false)
    expect(result.hasCommitment).toBe(false)
  })

  it('indicates when no commitment found', async () => {
    const events = [
      createTestEvent('clarification', 'implementation', { actor: 'user' }),
      createTestEvent('scope_change', 'verification', { actor: 'pm' }),
    ]

    const result = await generateTurnCountAnalysis('flow-038', events)

    expect(result.success).toBe(true) // Still calculates, but flags missing commitment
    expect(result.hasCommitment).toBe(false)
    expect(result.commitmentTimestamp).toBeUndefined()
    expect(result.insights.some(i => i.includes('No commitment event found'))).toBe(true)
  })

  it('generates insights for zero turns', async () => {
    const events = [
      createTestEvent('commitment', 'commitment'),
      createTestEvent('completion', 'complete'),
    ]

    const result = await generateTurnCountAnalysis('flow-038', events)

    expect(result.success).toBe(true)
    expect(result.metrics.totalTurns).toBe(0)
    expect(result.insights.some(i => i.includes('Zero post-commitment turns'))).toBe(true)
  })

  it('generates high turn count warning when threshold exceeded', async () => {
    const events = [
      createTestEvent('commitment', 'commitment'),
      createTestEvent('clarification', 'implementation', { actor: 'user' }),
      createTestEvent('clarification', 'implementation', { actor: 'developer' }),
      createTestEvent('clarification', 'implementation', { actor: 'qa' }),
      createTestEvent('scope_change', 'verification', { actor: 'pm' }),
      createTestEvent('scope_change', 'verification', { actor: 'architect' }),
    ]

    const result = await generateTurnCountAnalysis('flow-038', events, {
      highTurnThreshold: 3,
      criticalTurnThreshold: 10,
    })

    expect(result.success).toBe(true)
    expect(result.metrics.totalTurns).toBe(5)
    expect(result.insights.some(i => i.includes('High turn count'))).toBe(true)
  })

  it('generates critical turn count warning when critical threshold exceeded', async () => {
    const events = [
      createTestEvent('commitment', 'commitment'),
      ...Array(12)
        .fill(null)
        .map(() => createTestEvent('clarification', 'implementation', { actor: 'user' })),
    ]

    const result = await generateTurnCountAnalysis('flow-038', events, {
      highTurnThreshold: 5,
      criticalTurnThreshold: 10,
    })

    expect(result.success).toBe(true)
    expect(result.metrics.totalTurns).toBe(12)
    expect(result.insights.some(i => i.includes('Critical turn count'))).toBe(true)
  })

  it('identifies clarification-heavy pattern', async () => {
    const events = [
      createTestEvent('commitment', 'commitment'),
      createTestEvent('clarification', 'implementation', { actor: 'user' }),
      createTestEvent('clarification', 'implementation', { actor: 'developer' }),
      createTestEvent('clarification', 'implementation', { actor: 'qa' }),
      createTestEvent('clarification', 'implementation', { actor: 'ux' }),
      createTestEvent('clarification', 'implementation', { actor: 'pm' }),
    ]

    const result = await generateTurnCountAnalysis('flow-038', events)

    expect(result.metrics.byTrigger.clarification).toBe(5)
    expect(result.metrics.byTrigger.scope_change).toBe(0)
    expect(result.insights.some(i => i.includes('Clarification-heavy'))).toBe(true)
  })

  it('identifies scope-change-heavy pattern', async () => {
    const events = [
      createTestEvent('commitment', 'commitment'),
      createTestEvent('scope_change', 'implementation', { actor: 'pm' }),
      createTestEvent('scope_change', 'implementation', { actor: 'architect' }),
      createTestEvent('scope_change', 'implementation', { actor: 'ux' }),
      createTestEvent('scope_change', 'implementation', { actor: 'pm' }),
      createTestEvent('scope_change', 'implementation', { actor: 'architect' }),
    ]

    const result = await generateTurnCountAnalysis('flow-038', events)

    expect(result.metrics.byTrigger.scope_change).toBe(5)
    expect(result.metrics.byTrigger.clarification).toBe(0)
    expect(result.insights.some(i => i.includes('Scope-change-heavy'))).toBe(true)
  })

  it('flags high implementation phase ratio', async () => {
    const events = [
      createTestEvent('commitment', 'commitment'),
      createTestEvent('clarification', 'implementation', { actor: 'user' }),
      createTestEvent('clarification', 'implementation', { actor: 'developer' }),
      createTestEvent('clarification', 'implementation', { actor: 'qa' }),
      createTestEvent('clarification', 'implementation', { actor: 'ux' }),
    ]

    const result = await generateTurnCountAnalysis('flow-038', events)

    expect(result.metrics.byPhase.implementation).toBe(4)
    expect(result.insights.some(i => i.includes('implementation phase'))).toBe(true)
  })

  it('flags verification phase turns', async () => {
    const events = [
      createTestEvent('commitment', 'commitment'),
      createTestEvent('clarification', 'verification', { actor: 'qa' }),
    ]

    const result = await generateTurnCountAnalysis('flow-038', events)

    expect(result.metrics.byPhase.verification).toBe(1)
    expect(result.insights.some(i => i.includes('verification'))).toBe(true)
  })
})

describe('Schema validations', () => {
  describe('StakeholderTypeSchema', () => {
    it('validates all stakeholder types', () => {
      expect(() => StakeholderTypeSchema.parse('pm')).not.toThrow()
      expect(() => StakeholderTypeSchema.parse('ux')).not.toThrow()
      expect(() => StakeholderTypeSchema.parse('qa')).not.toThrow()
      expect(() => StakeholderTypeSchema.parse('dev')).not.toThrow()
      expect(() => StakeholderTypeSchema.parse('architect')).not.toThrow()
    })

    it('rejects invalid stakeholder types', () => {
      expect(() => StakeholderTypeSchema.parse('manager')).toThrow()
      expect(() => StakeholderTypeSchema.parse('admin')).toThrow()
    })
  })

  describe('TurnTriggerSchema', () => {
    it('validates clarification and scope_change', () => {
      expect(() => TurnTriggerSchema.parse('clarification')).not.toThrow()
      expect(() => TurnTriggerSchema.parse('scope_change')).not.toThrow()
    })

    it('rejects other trigger types', () => {
      expect(() => TurnTriggerSchema.parse('commitment')).toThrow()
      expect(() => TurnTriggerSchema.parse('completion')).toThrow()
    })
  })

  describe('TurnEventSchema', () => {
    it('validates valid turn event', () => {
      const event: TurnEvent = {
        from: 'pm',
        to: 'dev',
        storyId: 'flow-038',
        timestamp: new Date().toISOString(),
        phase: 'implementation',
        trigger: 'clarification',
        originalEventId: 'EVT-001',
        description: 'Need clarification on AC-3',
      }

      expect(() => TurnEventSchema.parse(event)).not.toThrow()
    })

    it('validates minimal turn event', () => {
      const event = {
        from: 'qa',
        to: 'dev',
        storyId: 'flow-038',
        timestamp: new Date().toISOString(),
        phase: 'verification',
        trigger: 'scope_change',
      }

      expect(() => TurnEventSchema.parse(event)).not.toThrow()
    })
  })

  describe('StakeholderPairSchema', () => {
    it('validates all valid pairs', () => {
      const validPairs = [
        'dev_pm',
        'dev_qa',
        'dev_ux',
        'architect_dev',
        'architect_pm',
        'architect_qa',
        'architect_ux',
        'pm_qa',
        'pm_ux',
        'qa_ux',
      ]

      for (const pair of validPairs) {
        expect(() => StakeholderPairSchema.parse(pair)).not.toThrow()
      }
    })

    it('rejects invalid pairs', () => {
      expect(() => StakeholderPairSchema.parse('pm_dev')).toThrow() // Wrong order
      expect(() => StakeholderPairSchema.parse('dev_dev')).toThrow() // Same stakeholder
    })
  })

  describe('TurnMetricsSchema', () => {
    it('validates complete metrics', () => {
      const metrics: TurnMetrics = {
        totalTurns: 5,
        byPair: {
          dev_pm: 2,
          dev_qa: 1,
          dev_ux: 1,
          architect_dev: 1,
          architect_pm: 0,
          architect_qa: 0,
          architect_ux: 0,
          pm_qa: 0,
          pm_ux: 0,
          qa_ux: 0,
        },
        byTrigger: {
          clarification: 3,
          scope_change: 2,
        },
        averageTurnsPerStory: 5,
        byPhase: {
          implementation: 3,
          verification: 1,
          complete: 1,
        },
      }

      expect(() => TurnMetricsSchema.parse(metrics)).not.toThrow()
    })

    it('rejects negative counts', () => {
      const metrics = {
        totalTurns: -1,
        byPair: TurnCountsByPairSchema.parse({}),
        byTrigger: TurnCountsByTriggerSchema.parse({}),
        averageTurnsPerStory: 0,
        byPhase: {
          implementation: 0,
          verification: 0,
          complete: 0,
        },
      }

      expect(() => TurnMetricsSchema.parse(metrics)).toThrow()
    })
  })

  describe('TurnCountResultSchema', () => {
    it('validates successful result', () => {
      const result = {
        storyId: 'flow-038',
        calculatedAt: new Date().toISOString(),
        metrics: {
          totalTurns: 3,
          byPair: TurnCountsByPairSchema.parse({}),
          byTrigger: {
            clarification: 2,
            scope_change: 1,
          },
          averageTurnsPerStory: 3,
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

      expect(() => TurnCountResultSchema.parse(result)).not.toThrow()
    })

    it('validates failed result with error', () => {
      const result = {
        storyId: 'flow-038',
        calculatedAt: new Date().toISOString(),
        metrics: {
          totalTurns: 0,
          byPair: TurnCountsByPairSchema.parse({}),
          byTrigger: {
            clarification: 0,
            scope_change: 0,
          },
          averageTurnsPerStory: 0,
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

      expect(() => TurnCountResultSchema.parse(result)).not.toThrow()
    })
  })

  describe('TurnCountConfigSchema', () => {
    it('applies default values', () => {
      const config = TurnCountConfigSchema.parse({})

      expect(config.includeCompletePhase).toBe(true)
      expect(config.highTurnThreshold).toBe(5)
      expect(config.criticalTurnThreshold).toBe(10)
    })

    it('accepts custom config', () => {
      const config = TurnCountConfigSchema.parse({
        includeCompletePhase: false,
        highTurnThreshold: 3,
        criticalTurnThreshold: 8,
      })

      expect(config.includeCompletePhase).toBe(false)
      expect(config.highTurnThreshold).toBe(3)
      expect(config.criticalTurnThreshold).toBe(8)
    })

    it('rejects non-positive thresholds', () => {
      expect(() => TurnCountConfigSchema.parse({ highTurnThreshold: 0 })).toThrow()
      expect(() => TurnCountConfigSchema.parse({ criticalTurnThreshold: -1 })).toThrow()
    })
  })
})
