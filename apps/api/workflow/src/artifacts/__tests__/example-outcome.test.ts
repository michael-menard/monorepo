import { describe, expect, it } from 'vitest'

import {
  calculateEffectivenessScore,
  createOutcomeEvent,
  createOutcomeMetrics,
  ExampleOutcomeEventSchema,
  ExampleOutcomeMetricsSchema,
  OutcomeEventTypeSchema,
  updateOutcomeMetrics,
  type ExampleOutcomeEvent,
  type ExampleOutcomeMetrics,
  type OutcomeEventType,
} from '../example-outcome'

describe('ExampleOutcome Schemas', () => {
  describe('OutcomeEventTypeSchema', () => {
    it('accepts valid event types', () => {
      const validTypes: OutcomeEventType[] = [
        'queried',
        'followed',
        'ignored',
        'success',
        'failure',
        'deprecated',
      ]

      validTypes.forEach(type => {
        expect(OutcomeEventTypeSchema.parse(type)).toBe(type)
      })
    })

    it('rejects invalid event types', () => {
      expect(() => OutcomeEventTypeSchema.parse('invalid')).toThrow()
      expect(() => OutcomeEventTypeSchema.parse('used')).toThrow()
    })
  })

  describe('ExampleOutcomeEventSchema validation', () => {
    it('validates a minimal outcome event', () => {
      const event = {
        event_id: 'evt_001',
        example_id: 'example-001',
        event_type: 'queried',
        timestamp: '2026-02-14T12:00:00.000Z',
        story_id: null,
        agent_id: null,
        decision_id: null,
        was_successful: null,
        confidence: null,
        notes: null,
      }

      const result = ExampleOutcomeEventSchema.parse(event)
      expect(result).toMatchObject(event)
    })

    it('validates outcome event with all optional fields', () => {
      const event = {
        event_id: 'evt_002',
        example_id: 'example-002',
        event_type: 'followed',
        timestamp: '2026-02-14T12:00:00.000Z',
        story_id: 'WINT-0180',
        agent_id: 'dev-coder',
        decision_id: 'dec_123',
        was_successful: true,
        confidence: 0.85,
        notes: 'Example matched scenario perfectly',
      }

      const result = ExampleOutcomeEventSchema.parse(event)
      expect(result.story_id).toBe('WINT-0180')
      expect(result.confidence).toBe(0.85)
      expect(result.notes).toBe('Example matched scenario perfectly')
    })

    it('validates confidence range constraints', () => {
      const event = {
        event_id: 'evt_003',
        example_id: 'example-003',
        event_type: 'success',
        timestamp: '2026-02-14T12:00:00.000Z',
        confidence: 0.5, // Valid
      }

      expect(() => ExampleOutcomeEventSchema.parse(event)).not.toThrow()
    })

    it('rejects confidence outside valid range', () => {
      const event = {
        event_id: 'evt_004',
        example_id: 'example-004',
        event_type: 'success',
        timestamp: '2026-02-14T12:00:00.000Z',
        confidence: 1.5, // Invalid
      }

      expect(() => ExampleOutcomeEventSchema.parse(event)).toThrow()
    })

    it('rejects invalid timestamp', () => {
      const event = {
        event_id: 'evt_005',
        example_id: 'example-005',
        event_type: 'queried',
        timestamp: 'not-a-timestamp',
      }

      expect(() => ExampleOutcomeEventSchema.parse(event)).toThrow()
    })
  })

  describe('ExampleOutcomeMetricsSchema validation', () => {
    it('validates minimal outcome metrics', () => {
      const metrics = {
        example_id: 'example-006',
        times_referenced: 0,
        times_followed: 0,
        times_ignored: 0,
        success_count: 0,
        failure_count: 0,
        success_rate: null,
        follow_rate: null,
        first_used_at: null,
        last_used_at: null,
        last_updated_at: '2026-02-14T12:00:00.000Z',
        unique_agents: 0,
        unique_stories: 0,
      }

      const result = ExampleOutcomeMetricsSchema.parse(metrics)
      expect(result).toMatchObject(metrics)
    })

    it('validates metrics with usage data', () => {
      const metrics = {
        example_id: 'example-007',
        times_referenced: 10,
        times_followed: 8,
        times_ignored: 2,
        success_count: 6,
        failure_count: 2,
        success_rate: 0.75,
        follow_rate: 0.8,
        first_used_at: '2026-02-13T10:00:00.000Z',
        last_used_at: '2026-02-14T11:00:00.000Z',
        last_updated_at: '2026-02-14T12:00:00.000Z',
        unique_agents: 3,
        unique_stories: 5,
      }

      const result = ExampleOutcomeMetricsSchema.parse(metrics)
      expect(result.success_rate).toBe(0.75)
      expect(result.follow_rate).toBe(0.8)
      expect(result.unique_agents).toBe(3)
    })

    it('rejects negative count values', () => {
      const metrics = {
        example_id: 'example-008',
        times_referenced: -1, // Invalid
        times_followed: 0,
        times_ignored: 0,
        success_count: 0,
        failure_count: 0,
        last_updated_at: '2026-02-14T12:00:00.000Z',
      }

      expect(() => ExampleOutcomeMetricsSchema.parse(metrics)).toThrow()
    })

    it('rejects success_rate outside valid range', () => {
      const metrics = {
        example_id: 'example-009',
        times_referenced: 5,
        times_followed: 5,
        times_ignored: 0,
        success_count: 5,
        failure_count: 0,
        success_rate: 1.2, // Invalid
        last_updated_at: '2026-02-14T12:00:00.000Z',
      }

      expect(() => ExampleOutcomeMetricsSchema.parse(metrics)).toThrow()
    })

    it('rejects follow_rate outside valid range', () => {
      const metrics = {
        example_id: 'example-010',
        times_referenced: 5,
        times_followed: 5,
        times_ignored: 0,
        success_count: 5,
        failure_count: 0,
        follow_rate: -0.1, // Invalid
        last_updated_at: '2026-02-14T12:00:00.000Z',
      }

      expect(() => ExampleOutcomeMetricsSchema.parse(metrics)).toThrow()
    })
  })

  describe('createOutcomeEvent', () => {
    it('creates event with required fields only', () => {
      const event = createOutcomeEvent({
        example_id: 'example-011',
        event_type: 'queried',
      })

      expect(event.example_id).toBe('example-011')
      expect(event.event_type).toBe('queried')
      expect(event.event_id).toMatch(/^evt_/)
      expect(event.timestamp).toBeDefined()
      expect(event.story_id).toBeNull()
      expect(event.agent_id).toBeNull()
    })

    it('creates event with all optional fields', () => {
      const event = createOutcomeEvent({
        example_id: 'example-012',
        event_type: 'followed',
        story_id: 'WINT-0180',
        agent_id: 'dev-agent',
        decision_id: 'dec_456',
        was_successful: true,
        confidence: 0.9,
        notes: 'Perfect match',
      })

      expect(event.story_id).toBe('WINT-0180')
      expect(event.agent_id).toBe('dev-agent')
      expect(event.decision_id).toBe('dec_456')
      expect(event.was_successful).toBe(true)
      expect(event.confidence).toBe(0.9)
      expect(event.notes).toBe('Perfect match')
    })

    it('generates unique event IDs', () => {
      const event1 = createOutcomeEvent({
        example_id: 'example-013',
        event_type: 'queried',
      })

      const event2 = createOutcomeEvent({
        example_id: 'example-013',
        event_type: 'queried',
      })

      expect(event1.event_id).not.toBe(event2.event_id)
    })

    it('creates valid event that passes schema validation', () => {
      const event = createOutcomeEvent({
        example_id: 'example-014',
        event_type: 'success',
        was_successful: true,
      })

      expect(() => ExampleOutcomeEventSchema.parse(event)).not.toThrow()
    })
  })

  describe('createOutcomeMetrics', () => {
    it('initializes metrics with zero values', () => {
      const metrics = createOutcomeMetrics('example-015')

      expect(metrics.example_id).toBe('example-015')
      expect(metrics.times_referenced).toBe(0)
      expect(metrics.times_followed).toBe(0)
      expect(metrics.times_ignored).toBe(0)
      expect(metrics.success_count).toBe(0)
      expect(metrics.failure_count).toBe(0)
      expect(metrics.success_rate).toBeNull()
      expect(metrics.follow_rate).toBeNull()
      expect(metrics.unique_agents).toBe(0)
      expect(metrics.unique_stories).toBe(0)
    })

    it('sets timestamps correctly', () => {
      const before = new Date().toISOString()
      const metrics = createOutcomeMetrics('example-016')
      const after = new Date().toISOString()

      expect(metrics.last_updated_at).toBeDefined()
      expect(metrics.last_updated_at >= before).toBe(true)
      expect(metrics.last_updated_at <= after).toBe(true)
      expect(metrics.first_used_at).toBeNull()
      expect(metrics.last_used_at).toBeNull()
    })

    it('creates valid metrics that pass schema validation', () => {
      const metrics = createOutcomeMetrics('example-017')

      expect(() => ExampleOutcomeMetricsSchema.parse(metrics)).not.toThrow()
    })
  })

  describe('updateOutcomeMetrics', () => {
    it('increments times_referenced on queried event', () => {
      const metrics = createOutcomeMetrics('example-018')
      const event = createOutcomeEvent({
        example_id: 'example-018',
        event_type: 'queried',
      })

      const updated = updateOutcomeMetrics(metrics, event)

      expect(updated.times_referenced).toBe(1)
      expect(updated.times_followed).toBe(0)
      expect(updated.times_ignored).toBe(0)
    })

    it('increments times_followed on followed event', () => {
      const metrics = createOutcomeMetrics('example-019')
      const event = createOutcomeEvent({
        example_id: 'example-019',
        event_type: 'followed',
      })

      const updated = updateOutcomeMetrics(metrics, event)

      expect(updated.times_followed).toBe(1)
    })

    it('increments times_ignored on ignored event', () => {
      const metrics = createOutcomeMetrics('example-020')
      const event = createOutcomeEvent({
        example_id: 'example-020',
        event_type: 'ignored',
      })

      const updated = updateOutcomeMetrics(metrics, event)

      expect(updated.times_ignored).toBe(1)
    })

    it('increments success_count on success event', () => {
      const metrics = createOutcomeMetrics('example-021')
      const event = createOutcomeEvent({
        example_id: 'example-021',
        event_type: 'success',
      })

      const updated = updateOutcomeMetrics(metrics, event)

      expect(updated.success_count).toBe(1)
      expect(updated.failure_count).toBe(0)
    })

    it('increments failure_count on failure event', () => {
      const metrics = createOutcomeMetrics('example-022')
      const event = createOutcomeEvent({
        example_id: 'example-022',
        event_type: 'failure',
      })

      const updated = updateOutcomeMetrics(metrics, event)

      expect(updated.failure_count).toBe(1)
      expect(updated.success_count).toBe(0)
    })

    it('calculates success_rate correctly', () => {
      let metrics = createOutcomeMetrics('example-023')

      // First success
      let event = createOutcomeEvent({
        example_id: 'example-023',
        event_type: 'success',
      })
      metrics = updateOutcomeMetrics(metrics, event)
      expect(metrics.success_rate).toBe(1.0)

      // First failure
      event = createOutcomeEvent({
        example_id: 'example-023',
        event_type: 'failure',
      })
      metrics = updateOutcomeMetrics(metrics, event)
      expect(metrics.success_rate).toBe(0.5)

      // Second success
      event = createOutcomeEvent({
        example_id: 'example-023',
        event_type: 'success',
      })
      metrics = updateOutcomeMetrics(metrics, event)
      expect(metrics.success_rate).toBeCloseTo(0.667, 2)
    })

    it('calculates follow_rate correctly', () => {
      let metrics = createOutcomeMetrics('example-024')

      // Queried
      let event = createOutcomeEvent({
        example_id: 'example-024',
        event_type: 'queried',
      })
      metrics = updateOutcomeMetrics(metrics, event)

      // Followed
      event = createOutcomeEvent({
        example_id: 'example-024',
        event_type: 'followed',
      })
      metrics = updateOutcomeMetrics(metrics, event)

      expect(metrics.follow_rate).toBe(1.0) // 1 followed / 1 referenced

      // Queried again
      event = createOutcomeEvent({
        example_id: 'example-024',
        event_type: 'queried',
      })
      metrics = updateOutcomeMetrics(metrics, event)

      expect(metrics.follow_rate).toBe(0.5) // 1 followed / 2 referenced
    })

    it('updates temporal tracking', () => {
      const metrics = createOutcomeMetrics('example-025')
      expect(metrics.first_used_at).toBeNull()
      expect(metrics.last_used_at).toBeNull()

      const event = createOutcomeEvent({
        example_id: 'example-025',
        event_type: 'queried',
      })

      const updated = updateOutcomeMetrics(metrics, event)

      expect(updated.first_used_at).toBe(event.timestamp)
      expect(updated.last_used_at).toBe(event.timestamp)
    })

    it('updates last_used_at but preserves first_used_at', () => {
      let metrics = createOutcomeMetrics('example-026')

      // First event
      const event1 = createOutcomeEvent({
        example_id: 'example-026',
        event_type: 'queried',
      })
      metrics = updateOutcomeMetrics(metrics, event1)
      const firstUsedAt = metrics.first_used_at

      // Second event
      const event2 = createOutcomeEvent({
        example_id: 'example-026',
        event_type: 'followed',
      })
      metrics = updateOutcomeMetrics(metrics, event2)

      expect(metrics.first_used_at).toBe(firstUsedAt)
      expect(metrics.last_used_at).toBe(event2.timestamp)
    })

    it('updates last_updated_at timestamp', async () => {
      const metrics = createOutcomeMetrics('example-027')
      const originalUpdated = metrics.last_updated_at

      // Small delay to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10))

      const event = createOutcomeEvent({
        example_id: 'example-027',
        event_type: 'queried',
      })

      const updated = updateOutcomeMetrics(metrics, event)

      expect(updated.last_updated_at).not.toBe(originalUpdated)
    })
  })

  describe('calculateEffectivenessScore', () => {
    it('returns 0 for unused example', () => {
      const metrics = createOutcomeMetrics('example-028')

      const score = calculateEffectivenessScore(metrics)

      expect(score).toBe(0)
    })

    it('calculates score for high success rate', () => {
      const metrics: ExampleOutcomeMetrics = {
        example_id: 'example-029',
        times_referenced: 10,
        times_followed: 8,
        times_ignored: 2,
        success_count: 8,
        failure_count: 0,
        success_rate: 1.0,
        follow_rate: 0.8,
        first_used_at: '2026-02-13T10:00:00.000Z',
        last_used_at: '2026-02-14T11:00:00.000Z',
        last_updated_at: '2026-02-14T12:00:00.000Z',
        unique_agents: 3,
        unique_stories: 5,
      }

      const score = calculateEffectivenessScore(metrics)

      // score = (0.7 * 100) + (0.3 * 80) + usage_bonus
      // score = 70 + 24 + usage_bonus ≈ 94 + bonus
      expect(score).toBeGreaterThan(90)
      expect(score).toBeLessThanOrEqual(100)
    })

    it('calculates score for medium effectiveness', () => {
      const metrics: ExampleOutcomeMetrics = {
        example_id: 'example-030',
        times_referenced: 5,
        times_followed: 3,
        times_ignored: 2,
        success_count: 2,
        failure_count: 1,
        success_rate: 0.667,
        follow_rate: 0.6,
        first_used_at: '2026-02-13T10:00:00.000Z',
        last_used_at: '2026-02-14T11:00:00.000Z',
        last_updated_at: '2026-02-14T12:00:00.000Z',
        unique_agents: 2,
        unique_stories: 3,
      }

      const score = calculateEffectivenessScore(metrics)

      // score = (0.7 * 66.7) + (0.3 * 60) + usage_bonus
      // score ≈ 46.7 + 18 + small_bonus ≈ 65-70
      expect(score).toBeGreaterThan(60)
      expect(score).toBeLessThan(75)
    })

    it('calculates score for low effectiveness', () => {
      const metrics: ExampleOutcomeMetrics = {
        example_id: 'example-031',
        times_referenced: 10,
        times_followed: 3,
        times_ignored: 7,
        success_count: 1,
        failure_count: 2,
        success_rate: 0.333,
        follow_rate: 0.3,
        first_used_at: '2026-02-13T10:00:00.000Z',
        last_used_at: '2026-02-14T11:00:00.000Z',
        last_updated_at: '2026-02-14T12:00:00.000Z',
        unique_agents: 1,
        unique_stories: 2,
      }

      const score = calculateEffectivenessScore(metrics)

      // score = (0.7 * 33.3) + (0.3 * 30) + usage_bonus
      // score ≈ 23.3 + 9 + bonus ≈ 32-38
      expect(score).toBeLessThan(45)
    })

    it('applies usage bonus for popular examples', () => {
      const lowUsage: ExampleOutcomeMetrics = {
        example_id: 'example-032',
        times_referenced: 10,
        times_followed: 8,
        times_ignored: 2,
        success_count: 8,
        failure_count: 0,
        success_rate: 1.0,
        follow_rate: 0.8,
        first_used_at: '2026-02-13T10:00:00.000Z',
        last_used_at: '2026-02-14T11:00:00.000Z',
        last_updated_at: '2026-02-14T12:00:00.000Z',
        unique_agents: 2,
        unique_stories: 3,
      }

      const highUsage: ExampleOutcomeMetrics = {
        ...lowUsage,
        example_id: 'example-033',
        times_referenced: 100, // 10x more usage
      }

      const lowScore = calculateEffectivenessScore(lowUsage)
      const highScore = calculateEffectivenessScore(highUsage)

      expect(highScore).toBeGreaterThan(lowScore)
    })

    it('caps score at 100', () => {
      const perfect: ExampleOutcomeMetrics = {
        example_id: 'example-034',
        times_referenced: 1000,
        times_followed: 1000,
        times_ignored: 0,
        success_count: 1000,
        failure_count: 0,
        success_rate: 1.0,
        follow_rate: 1.0,
        first_used_at: '2026-02-13T10:00:00.000Z',
        last_used_at: '2026-02-14T11:00:00.000Z',
        last_updated_at: '2026-02-14T12:00:00.000Z',
        unique_agents: 50,
        unique_stories: 100,
      }

      const score = calculateEffectivenessScore(perfect)

      expect(score).toBe(100)
    })
  })

  describe('Round-trip validation (AC-6)', () => {
    it('validates outcome event can be stringified and parsed', () => {
      const event = createOutcomeEvent({
        example_id: 'example-035',
        event_type: 'followed',
        story_id: 'WINT-0180',
        agent_id: 'dev-agent',
        was_successful: true,
        confidence: 0.85,
      })

      // Round trip
      const jsonString = JSON.stringify(event)
      const parsed = JSON.parse(jsonString)
      const validated = ExampleOutcomeEventSchema.parse(parsed)

      expect(validated).toMatchObject(event)
      expect(validated.event_type).toBe(event.event_type)
      expect(validated.confidence).toBe(event.confidence)
    })

    it('validates outcome metrics can be stringified and parsed', () => {
      const metrics: ExampleOutcomeMetrics = {
        example_id: 'example-036',
        times_referenced: 15,
        times_followed: 12,
        times_ignored: 3,
        success_count: 10,
        failure_count: 2,
        success_rate: 0.833,
        follow_rate: 0.8,
        first_used_at: '2026-02-13T10:00:00.000Z',
        last_used_at: '2026-02-14T11:00:00.000Z',
        last_updated_at: '2026-02-14T12:00:00.000Z',
        unique_agents: 4,
        unique_stories: 7,
      }

      // Round trip
      const jsonString = JSON.stringify(metrics)
      const parsed = JSON.parse(jsonString)
      const validated = ExampleOutcomeMetricsSchema.parse(parsed)

      expect(validated).toMatchObject(metrics)
      expect(validated.success_rate).toBe(metrics.success_rate)
      expect(validated.unique_agents).toBe(metrics.unique_agents)
    })
  })
})
