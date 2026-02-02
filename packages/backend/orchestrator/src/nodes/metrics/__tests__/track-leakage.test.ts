import { describe, expect, it, vi } from 'vitest'
import {
  detectUnknownLeakage,
  calculateLeakageMetrics,
  trackLeakage,
  LeakageSeveritySchema,
  LeakageCategorySchema,
  LeakageEventSchema,
  LeakageMetricsSchema,
  LeakageResultSchema,
  KnownUnknownSchema,
  LeakageConfigSchema,
  type LeakageEvent,
  type LeakageMetrics,
  type KnownUnknown,
  type GraphStateWithLeakage,
} from '../track-leakage.js'
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
  const storyId = overrides.storyId || 'flow-040'
  return createEvent(type, storyId, phase, {
    description: overrides.description || `${type} event`,
  })
}

const createTestGraphState = (
  overrides: Partial<GraphStateWithLeakage> = {},
): GraphStateWithLeakage =>
  ({
    schemaVersion: '1.0.0',
    epicPrefix: 'flow',
    storyId: 'flow-040',
    artifactPaths: {},
    routingFlags: {},
    evidenceRefs: [],
    gateDecisions: {},
    errors: [],
    stateHistory: [],
    ...overrides,
  }) as GraphStateWithLeakage

describe('detectUnknownLeakage', () => {
  it('returns empty array for empty events', () => {
    const result = detectUnknownLeakage([])

    expect(result).toEqual([])
  })

  it('returns empty array for null events', () => {
    const result = detectUnknownLeakage(null as unknown as WorkflowEvent[])

    expect(result).toEqual([])
  })

  it('ignores non-churn events', () => {
    const events = [
      createTestEvent('commitment', 'commitment'),
      createTestEvent('completion', 'complete'),
      createTestEvent('blocker_added', 'implementation'),
    ]

    const result = detectUnknownLeakage(events)

    expect(result.length).toBe(0)
  })

  it('ignores pre-commitment churn events', () => {
    const events = [
      createTestEvent('clarification', 'seed', { description: 'This is something we didnt know' }),
      createTestEvent('clarification', 'elaboration', { description: 'Missed requirement here' }),
      createTestEvent('commitment', 'commitment'),
    ]

    const result = detectUnknownLeakage(events)

    expect(result.length).toBe(0)
  })

  it('detects leakage in post-commitment phases', () => {
    const events = [
      createTestEvent('commitment', 'commitment'),
      createTestEvent('clarification', 'implementation', { description: 'We didnt know this requirement was missed' }),
      createTestEvent('scope_change', 'verification', { description: 'Discovered new edge case that was overlooked' }),
    ]

    const result = detectUnknownLeakage(events)

    expect(result.length).toBe(2)
    expect(result.every(e => e.discoveredPhase === 'implementation' || e.discoveredPhase === 'verification')).toBe(true)
  })

  it('only detects events matching leakage patterns', () => {
    const events = [
      createTestEvent('commitment', 'commitment'),
      createTestEvent('clarification', 'implementation', { description: 'Regular question about the API endpoint' }),
      createTestEvent('clarification', 'implementation', { description: 'We didnt know about this requirement that was missed' }),
    ]

    const result = detectUnknownLeakage(events)

    // Only the second clarification should be detected as leakage
    expect(result.length).toBe(1)
    expect(result[0].unknownDescription).toContain('didnt know')
  })

  it('excludes known unknowns from leakage', () => {
    const events = [
      createTestEvent('commitment', 'commitment'),
      createTestEvent('clarification', 'implementation', { description: 'Database schema details were not specified' }),
    ]

    const knownUnknowns: KnownUnknown[] = [
      { id: 'KU-1', description: 'Database schema details' },
    ]

    const resultWithKnown = detectUnknownLeakage(events, knownUnknowns)
    const resultWithoutKnown = detectUnknownLeakage(events, [])

    expect(resultWithKnown.length).toBe(0)
    expect(resultWithoutKnown.length).toBe(1)
  })

  it('assigns correct severity based on description', () => {
    const events = [
      createTestEvent('commitment', 'commitment'),
      createTestEvent('clarification', 'implementation', { description: 'Minor edge case discovered' }),
      createTestEvent('scope_change', 'implementation', { description: 'Major security vulnerability not covered' }),
      createTestEvent('clarification', 'verification', { description: 'Critical data loss scenario discovered' }),
    ]

    const result = detectUnknownLeakage(events)

    expect(result.length).toBe(3)

    const minorEvent = result.find(e => e.unknownDescription.includes('Minor'))
    const securityEvent = result.find(e => e.unknownDescription.includes('security'))
    const criticalEvent = result.find(e => e.unknownDescription.includes('Critical'))

    expect(minorEvent?.severity).toBe('low')
    expect(securityEvent?.severity).toBe('critical')
    expect(criticalEvent?.severity).toBe('critical')
  })

  it('assigns higher severity for verification/complete phase', () => {
    const events = [
      createTestEvent('commitment', 'commitment'),
      createTestEvent('clarification', 'implementation', { description: 'Need to add new field' }),
      createTestEvent('clarification', 'verification', { description: 'Need to add another field' }),
    ]

    const result = detectUnknownLeakage(events)

    const implEvent = result.find(e => e.discoveredPhase === 'implementation')
    const verifyEvent = result.find(e => e.discoveredPhase === 'verification')

    expect(implEvent?.severity).toBe('medium')
    expect(verifyEvent?.severity).toBe('high')
  })

  it('assigns correct categories based on description', () => {
    const events = [
      createTestEvent('commitment', 'commitment'),
      createTestEvent('clarification', 'implementation', { description: 'Missed auth permission check that was overlooked' }),
      createTestEvent('clarification', 'implementation', { description: 'Performance optimization needed that was not covered' }),
      createTestEvent('scope_change', 'implementation', { description: 'External API integration issue discovered that was missed' }),
      createTestEvent('clarification', 'implementation', { description: 'Edge case for null values overlooked in spec' }),
    ]

    const result = detectUnknownLeakage(events)

    expect(result.find(e => e.unknownDescription.includes('auth'))?.category).toBe('security')
    expect(result.find(e => e.unknownDescription.includes('Performance'))?.category).toBe('performance')
    expect(result.find(e => e.unknownDescription.includes('integration'))?.category).toBe('integration')
    expect(result.find(e => e.unknownDescription.includes('Edge case'))?.category).toBe('edge_case')
  })

  it('respects custom leakage patterns', () => {
    const events = [
      createTestEvent('commitment', 'commitment'),
      createTestEvent('clarification', 'implementation', { description: 'This is a custom pattern match' }),
      createTestEvent('clarification', 'implementation', { description: 'Regular clarification' }),
    ]

    const config = LeakageConfigSchema.parse({
      leakagePatterns: ['custom pattern'],
    })

    const result = detectUnknownLeakage(events, [], config)

    expect(result.length).toBe(1)
    expect(result[0].unknownDescription).toContain('custom pattern')
  })
})

describe('calculateLeakageMetrics', () => {
  it('returns zero metrics for empty events', () => {
    const result = calculateLeakageMetrics([])

    expect(result.count).toBe(0)
    expect(result.rate).toBe(0)
    expect(result.highSeverityRate).toBe(0)
    expect(() => LeakageMetricsSchema.parse(result)).not.toThrow()
  })

  it('counts leakage events correctly', () => {
    const leakageEvents: LeakageEvent[] = [
      { id: 'LEAK-1', storyId: 'flow-040', unknownDescription: 'Test 1', discoveredPhase: 'implementation', timestamp: new Date().toISOString(), category: 'requirement', severity: 'low', addressed: false },
      { id: 'LEAK-2', storyId: 'flow-040', unknownDescription: 'Test 2', discoveredPhase: 'implementation', timestamp: new Date().toISOString(), category: 'constraint', severity: 'medium', addressed: false },
      { id: 'LEAK-3', storyId: 'flow-040', unknownDescription: 'Test 3', discoveredPhase: 'verification', timestamp: new Date().toISOString(), category: 'edge_case', severity: 'high', addressed: true },
    ]

    const result = calculateLeakageMetrics(leakageEvents)

    expect(result.count).toBe(3)
    expect(result.byPhase.implementation).toBe(2)
    expect(result.byPhase.verification).toBe(1)
    expect(result.byCategory.requirement).toBe(1)
    expect(result.byCategory.constraint).toBe(1)
    expect(result.byCategory.edge_case).toBe(1)
    expect(result.bySeverity.low).toBe(1)
    expect(result.bySeverity.medium).toBe(1)
    expect(result.bySeverity.high).toBe(1)
    expect(result.addressedRate).toBeCloseTo(1 / 3)
  })

  it('calculates high severity rate correctly', () => {
    const leakageEvents: LeakageEvent[] = [
      { id: 'LEAK-1', storyId: 'flow-040', unknownDescription: 'Test', discoveredPhase: 'implementation', timestamp: new Date().toISOString(), category: 'requirement', severity: 'low', addressed: false },
      { id: 'LEAK-2', storyId: 'flow-040', unknownDescription: 'Test', discoveredPhase: 'implementation', timestamp: new Date().toISOString(), category: 'requirement', severity: 'high', addressed: false },
      { id: 'LEAK-3', storyId: 'flow-040', unknownDescription: 'Test', discoveredPhase: 'verification', timestamp: new Date().toISOString(), category: 'security', severity: 'critical', addressed: false },
    ]

    const result = calculateLeakageMetrics(leakageEvents)

    expect(result.highSeverityRate).toBe(2) // 1 high + 1 critical
  })
})

describe('trackLeakage', () => {
  it('returns unsuccessful result for null events', async () => {
    const result = await trackLeakage('flow-040', null)

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.hasCommitment).toBe(false)
    expect(() => LeakageResultSchema.parse(result)).not.toThrow()
  })

  it('returns unsuccessful result for empty events', async () => {
    const result = await trackLeakage('flow-040', [])

    expect(result.success).toBe(false)
    expect(result.hasCommitment).toBe(false)
  })

  it('indicates when no commitment found', async () => {
    const events = [
      createTestEvent('clarification', 'implementation', { description: 'Something missed' }),
    ]

    const result = await trackLeakage('flow-040', events)

    expect(result.success).toBe(true)
    expect(result.hasCommitment).toBe(false)
    expect(result.commitmentTimestamp).toBeUndefined()
    expect(result.insights.some(i => i.includes('No commitment'))).toBe(true)
  })

  it('tracks complete leakage analysis with commitment', async () => {
    const events = [
      createTestEvent('commitment', 'commitment'),
      createTestEvent('clarification', 'implementation', { description: 'We didnt know about this edge case' }),
      createTestEvent('scope_change', 'verification', { description: 'Discovered new requirement' }),
    ]

    const result = await trackLeakage('flow-040', events)

    expect(result.success).toBe(true)
    expect(result.storyId).toBe('flow-040')
    expect(result.hasCommitment).toBe(true)
    expect(result.commitmentTimestamp).toBeDefined()
    expect(result.metrics.count).toBe(2)
    expect(result.events.length).toBe(2)
    expect(result.insights.length).toBeGreaterThan(0)
    expect(() => LeakageResultSchema.parse(result)).not.toThrow()
  })

  it('generates excellent insight for zero leakage', async () => {
    const events = [
      createTestEvent('commitment', 'commitment'),
      createTestEvent('completion', 'complete'),
    ]

    const result = await trackLeakage('flow-040', events)

    expect(result.success).toBe(true)
    expect(result.metrics.count).toBe(0)
    expect(result.insights.some(i => i.includes('Zero') || i.includes('Excellent'))).toBe(true)
  })

  it('generates critical insight for critical leakage', async () => {
    const events = [
      createTestEvent('commitment', 'commitment'),
      createTestEvent('clarification', 'implementation', { description: 'Critical security vulnerability discovered' }),
    ]

    const result = await trackLeakage('flow-040', events)

    expect(result.success).toBe(true)
    expect(result.metrics.bySeverity.critical).toBe(1)
    expect(result.insights.some(i => i.includes('CRITICAL') || i.includes('critical'))).toBe(true)
  })

  it('generates insight for verification phase leakage', async () => {
    const events = [
      createTestEvent('commitment', 'commitment'),
      createTestEvent('clarification', 'verification', { description: 'New edge case discovered' }),
    ]

    const result = await trackLeakage('flow-040', events)

    expect(result.success).toBe(true)
    expect(result.metrics.byPhase.verification).toBe(1)
    expect(result.insights.some(i => i.includes('QA') || i.includes('verification'))).toBe(true)
  })

  it('respects known unknowns exclusion', async () => {
    const events = [
      createTestEvent('commitment', 'commitment'),
      createTestEvent('clarification', 'implementation', { description: 'Database schema not specified' }),
    ]

    const knownUnknowns: KnownUnknown[] = [
      { id: 'KU-1', description: 'Database schema' },
    ]

    const resultWithKnown = await trackLeakage('flow-040', events, knownUnknowns)
    const resultWithoutKnown = await trackLeakage('flow-040', events, [])

    expect(resultWithKnown.metrics.count).toBe(0)
    expect(resultWithoutKnown.metrics.count).toBe(1)
  })

  it('identifies most common leakage category', async () => {
    const events = [
      createTestEvent('commitment', 'commitment'),
      createTestEvent('clarification', 'implementation', { description: 'Missed edge case 1' }),
      createTestEvent('clarification', 'implementation', { description: 'Missed edge case 2' }),
      createTestEvent('scope_change', 'implementation', { description: 'Security issue discovered' }),
    ]

    const result = await trackLeakage('flow-040', events)

    expect(result.insights.some(i => i.includes('edge_case'))).toBe(true)
  })

  it('warns when critical threshold exceeded', async () => {
    const events = [
      createTestEvent('commitment', 'commitment'),
      createTestEvent('clarification', 'implementation', { description: 'Missed requirement 1' }),
      createTestEvent('clarification', 'implementation', { description: 'Overlooked requirement 2' }),
      createTestEvent('scope_change', 'implementation', { description: 'Discovered new feature needed' }),
      createTestEvent('clarification', 'verification', { description: 'Unforeseen edge case' }),
    ]

    const result = await trackLeakage('flow-040', events, [], { criticalThreshold: 3 })

    expect(result.metrics.count).toBeGreaterThanOrEqual(3)
    expect(result.insights.some(i => i.includes('critical threshold') || i.includes('review'))).toBe(true)
  })
})

describe('Schema validations', () => {
  describe('LeakageSeveritySchema', () => {
    it('validates all severity levels', () => {
      expect(() => LeakageSeveritySchema.parse('low')).not.toThrow()
      expect(() => LeakageSeveritySchema.parse('medium')).not.toThrow()
      expect(() => LeakageSeveritySchema.parse('high')).not.toThrow()
      expect(() => LeakageSeveritySchema.parse('critical')).not.toThrow()
    })

    it('rejects invalid severity', () => {
      expect(() => LeakageSeveritySchema.parse('extreme')).toThrow()
      expect(() => LeakageSeveritySchema.parse('minor')).toThrow()
    })
  })

  describe('LeakageCategorySchema', () => {
    it('validates all categories', () => {
      expect(() => LeakageCategorySchema.parse('requirement')).not.toThrow()
      expect(() => LeakageCategorySchema.parse('constraint')).not.toThrow()
      expect(() => LeakageCategorySchema.parse('dependency')).not.toThrow()
      expect(() => LeakageCategorySchema.parse('edge_case')).not.toThrow()
      expect(() => LeakageCategorySchema.parse('integration')).not.toThrow()
      expect(() => LeakageCategorySchema.parse('performance')).not.toThrow()
      expect(() => LeakageCategorySchema.parse('security')).not.toThrow()
      expect(() => LeakageCategorySchema.parse('accessibility')).not.toThrow()
      expect(() => LeakageCategorySchema.parse('other')).not.toThrow()
    })

    it('rejects invalid category', () => {
      expect(() => LeakageCategorySchema.parse('unknown')).toThrow()
    })
  })

  describe('LeakageEventSchema', () => {
    it('validates valid leakage event', () => {
      const event: LeakageEvent = {
        id: 'LEAK-001',
        storyId: 'flow-040',
        unknownDescription: 'Missed requirement for authentication',
        discoveredPhase: 'implementation',
        timestamp: new Date().toISOString(),
        category: 'requirement',
        severity: 'high',
        sourceEventId: 'EVT-123',
        impact: 'Requires additional sprint',
        addressed: false,
      }

      expect(() => LeakageEventSchema.parse(event)).not.toThrow()
    })

    it('validates minimal leakage event', () => {
      const event = {
        id: 'LEAK-002',
        storyId: 'flow-040',
        unknownDescription: 'Edge case not covered',
        discoveredPhase: 'verification',
        timestamp: new Date().toISOString(),
        category: 'edge_case',
        severity: 'medium',
      }

      expect(() => LeakageEventSchema.parse(event)).not.toThrow()
    })

    it('rejects empty unknown description', () => {
      const event = {
        id: 'LEAK-003',
        storyId: 'flow-040',
        unknownDescription: '', // Invalid
        discoveredPhase: 'implementation',
        timestamp: new Date().toISOString(),
        category: 'requirement',
        severity: 'low',
      }

      expect(() => LeakageEventSchema.parse(event)).toThrow()
    })
  })

  describe('LeakageMetricsSchema', () => {
    it('validates complete metrics', () => {
      const metrics: LeakageMetrics = {
        count: 5,
        byPhase: { implementation: 3, verification: 2, complete: 0 },
        byCategory: {
          requirement: 2,
          constraint: 1,
          dependency: 0,
          edge_case: 1,
          integration: 1,
          performance: 0,
          security: 0,
          accessibility: 0,
          other: 0,
        },
        bySeverity: { low: 1, medium: 2, high: 1, critical: 1 },
        rate: 5,
        highSeverityRate: 2,
        addressedRate: 0.4,
      }

      expect(() => LeakageMetricsSchema.parse(metrics)).not.toThrow()
    })

    it('rejects negative counts', () => {
      const metrics = {
        count: -1, // Invalid
        byPhase: { implementation: 0, verification: 0, complete: 0 },
        byCategory: {
          requirement: 0, constraint: 0, dependency: 0, edge_case: 0,
          integration: 0, performance: 0, security: 0, accessibility: 0, other: 0,
        },
        bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
        rate: 0,
        highSeverityRate: 0,
        addressedRate: 0,
      }

      expect(() => LeakageMetricsSchema.parse(metrics)).toThrow()
    })

    it('rejects addressed rate outside 0-1', () => {
      const metrics = {
        count: 5,
        byPhase: { implementation: 3, verification: 2, complete: 0 },
        byCategory: {
          requirement: 5, constraint: 0, dependency: 0, edge_case: 0,
          integration: 0, performance: 0, security: 0, accessibility: 0, other: 0,
        },
        bySeverity: { low: 5, medium: 0, high: 0, critical: 0 },
        rate: 5,
        highSeverityRate: 0,
        addressedRate: 1.5, // Invalid
      }

      expect(() => LeakageMetricsSchema.parse(metrics)).toThrow()
    })
  })

  describe('LeakageResultSchema', () => {
    it('validates successful result', async () => {
      const result = await trackLeakage('flow-040', [
        createTestEvent('commitment', 'commitment'),
        createTestEvent('clarification', 'implementation', { description: 'Missed requirement' }),
      ])

      expect(() => LeakageResultSchema.parse(result)).not.toThrow()
    })

    it('validates failed result with error', () => {
      const result = {
        storyId: 'flow-040',
        analyzedAt: new Date().toISOString(),
        metrics: {
          count: 0,
          byPhase: { implementation: 0, verification: 0, complete: 0 },
          byCategory: {
            requirement: 0, constraint: 0, dependency: 0, edge_case: 0,
            integration: 0, performance: 0, security: 0, accessibility: 0, other: 0,
          },
          bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
          rate: 0,
          highSeverityRate: 0,
          addressedRate: 0,
        },
        events: [],
        totalEventsAnalyzed: 0,
        hasCommitment: false,
        insights: [],
        success: false,
        error: 'No events provided',
      }

      expect(() => LeakageResultSchema.parse(result)).not.toThrow()
    })
  })

  describe('KnownUnknownSchema', () => {
    it('validates complete known unknown', () => {
      const ku: KnownUnknown = {
        id: 'KU-001',
        description: 'Database schema details TBD',
        identifiedAt: new Date().toISOString(),
        resolved: false,
      }

      expect(() => KnownUnknownSchema.parse(ku)).not.toThrow()
    })

    it('validates minimal known unknown', () => {
      const ku = {
        id: 'KU-002',
        description: 'API contract pending',
      }

      expect(() => KnownUnknownSchema.parse(ku)).not.toThrow()
    })

    it('rejects empty description', () => {
      const ku = {
        id: 'KU-003',
        description: '', // Invalid
      }

      expect(() => KnownUnknownSchema.parse(ku)).toThrow()
    })
  })

  describe('LeakageConfigSchema', () => {
    it('applies default values', () => {
      const config = LeakageConfigSchema.parse({})

      expect(config.leakagePatterns.length).toBeGreaterThan(0)
      expect(config.minLeakageForAnalysis).toBe(1)
      expect(config.highSeverityThreshold).toBe(1)
      expect(config.criticalThreshold).toBe(3)
    })

    it('accepts custom patterns', () => {
      const config = LeakageConfigSchema.parse({
        leakagePatterns: ['custom1', 'custom2'],
      })

      expect(config.leakagePatterns).toEqual(['custom1', 'custom2'])
    })

    it('accepts custom thresholds', () => {
      const config = LeakageConfigSchema.parse({
        minLeakageForAnalysis: 2,
        highSeverityThreshold: 2,
        criticalThreshold: 5,
      })

      expect(config.minLeakageForAnalysis).toBe(2)
      expect(config.highSeverityThreshold).toBe(2)
      expect(config.criticalThreshold).toBe(5)
    })

    it('rejects non-positive thresholds', () => {
      expect(() => LeakageConfigSchema.parse({ minLeakageForAnalysis: 0 })).toThrow()
      expect(() => LeakageConfigSchema.parse({ highSeverityThreshold: -1 })).toThrow()
      expect(() => LeakageConfigSchema.parse({ criticalThreshold: 0 })).toThrow()
    })
  })
})
