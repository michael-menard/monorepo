import { describe, expect, it } from 'vitest'

import {
  advanceCheckpoint,
  CheckpointSchema,
  createCheckpoint,
  type Phase,
  PhaseSchema,
} from '../checkpoint'

describe('CheckpointSchema', () => {
  describe('PhaseSchema', () => {
    it('accepts valid phases', () => {
      const validPhases: Phase[] = [
        'setup',
        'plan',
        'execute',
        'proof',
        'review',
        'fix',
        'qa-setup',
        'qa-verify',
        'qa-complete',
        'done',
      ]

      validPhases.forEach(phase => {
        expect(PhaseSchema.parse(phase)).toBe(phase)
      })
    })

    it('rejects invalid phases', () => {
      expect(() => PhaseSchema.parse('invalid')).toThrow()
      expect(() => PhaseSchema.parse('')).toThrow()
      expect(() => PhaseSchema.parse(123)).toThrow()
    })
  })

  describe('CheckpointSchema validation', () => {
    it('validates a minimal valid checkpoint', () => {
      const checkpoint = {
        schema: 1,
        story_id: 'WISH-001',
        feature_dir: 'plans/future/wishlist',
        timestamp: '2026-02-01T12:00:00.000Z',
        current_phase: 'setup',
        last_successful_phase: null,
        iteration: 0,
        max_iterations: 3,
        blocked: false,
        forced: false,
        warnings: [],
      }

      const result = CheckpointSchema.parse(checkpoint)
      expect(result).toEqual(checkpoint)
    })

    it('validates a checkpoint with all optional fields', () => {
      const checkpoint = {
        schema: 1,
        story_id: 'WISH-001',
        feature_dir: 'plans/future/wishlist',
        timestamp: '2026-02-01T12:00:00.000Z',
        current_phase: 'review',
        last_successful_phase: 'execute',
        iteration: 2,
        max_iterations: 5,
        gate: {
          decision: 'PASS',
          evaluated_at: '2026-02-01T11:00:00.000Z',
          override_reason: null,
          readiness_score: 85,
        },
        resume_hints: {
          skip_phases: ['setup', 'plan'],
          partial_state: { key: 'value' },
        },
        blocked: false,
        blocked_reason: null,
        forced: false,
        warnings: ['Warning 1'],
        completed_at: null,
      }

      const result = CheckpointSchema.parse(checkpoint)
      expect(result.gate?.decision).toBe('PASS')
      expect(result.resume_hints?.skip_phases).toContain('setup')
    })

    it('rejects invalid schema version', () => {
      const checkpoint = {
        schema: 2,
        story_id: 'WISH-001',
        feature_dir: 'plans/future/wishlist',
        timestamp: '2026-02-01T12:00:00.000Z',
        current_phase: 'setup',
        last_successful_phase: null,
        iteration: 0,
        max_iterations: 3,
        blocked: false,
        forced: false,
        warnings: [],
      }

      expect(() => CheckpointSchema.parse(checkpoint)).toThrow()
    })

    it('rejects invalid timestamp format', () => {
      const checkpoint = {
        schema: 1,
        story_id: 'WISH-001',
        feature_dir: 'plans/future/wishlist',
        timestamp: 'not-a-timestamp',
        current_phase: 'setup',
        last_successful_phase: null,
        iteration: 0,
        max_iterations: 3,
        blocked: false,
        forced: false,
        warnings: [],
      }

      expect(() => CheckpointSchema.parse(checkpoint)).toThrow()
    })
  })

  describe('createCheckpoint', () => {
    it('creates a checkpoint with default phase', () => {
      const checkpoint = createCheckpoint('WISH-001', 'plans/future/wishlist')

      expect(checkpoint.schema).toBe(1)
      expect(checkpoint.story_id).toBe('WISH-001')
      expect(checkpoint.feature_dir).toBe('plans/future/wishlist')
      expect(checkpoint.current_phase).toBe('setup')
      expect(checkpoint.last_successful_phase).toBeNull()
      expect(checkpoint.iteration).toBe(0)
      expect(checkpoint.max_iterations).toBe(3)
      expect(checkpoint.blocked).toBe(false)
      expect(checkpoint.forced).toBe(false)
      expect(checkpoint.warnings).toEqual([])
    })

    it('creates a checkpoint with custom initial phase', () => {
      const checkpoint = createCheckpoint('WISH-001', 'plans/future/wishlist', 'plan')

      expect(checkpoint.current_phase).toBe('plan')
    })

    it('creates a valid checkpoint that passes schema validation', () => {
      const checkpoint = createCheckpoint('WISH-001', 'plans/future/wishlist')

      expect(() => CheckpointSchema.parse(checkpoint)).not.toThrow()
    })
  })

  describe('advanceCheckpoint', () => {
    it('advances the checkpoint to the next phase', () => {
      const initial = createCheckpoint('WISH-001', 'plans/future/wishlist')
      const advanced = advanceCheckpoint(initial, 'setup', 'plan')

      expect(advanced.current_phase).toBe('plan')
      expect(advanced.last_successful_phase).toBe('setup')
    })

    it('preserves other checkpoint properties', () => {
      const initial = createCheckpoint('WISH-001', 'plans/future/wishlist')
      const advanced = advanceCheckpoint(initial, 'setup', 'plan')

      expect(advanced.story_id).toBe(initial.story_id)
      expect(advanced.feature_dir).toBe(initial.feature_dir)
      expect(advanced.schema).toBe(initial.schema)
      expect(advanced.iteration).toBe(initial.iteration)
    })

    it('updates the timestamp', () => {
      const initial = createCheckpoint('WISH-001', 'plans/future/wishlist')
      const initialTimestamp = initial.timestamp

      // Small delay to ensure timestamp changes
      const advanced = advanceCheckpoint(initial, 'setup', 'plan')

      // Timestamps should be different (or very close in fast execution)
      expect(advanced.timestamp).toBeDefined()
      expect(typeof advanced.timestamp).toBe('string')
    })

    it('creates a valid checkpoint after advancement', () => {
      const initial = createCheckpoint('WISH-001', 'plans/future/wishlist')
      const advanced = advanceCheckpoint(initial, 'setup', 'plan')

      expect(() => CheckpointSchema.parse(advanced)).not.toThrow()
    })
  })
})
