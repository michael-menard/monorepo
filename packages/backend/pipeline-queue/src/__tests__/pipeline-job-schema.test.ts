/**
 * PipelineJobDataSchema Unit Tests (AC-2, AC-7)
 */

import { describe, it, expect } from 'vitest'
import { PipelineJobDataSchema } from '../__types__/index.js'

describe('PipelineJobDataSchema', () => {
  describe('valid payloads', () => {
    it('accepts a minimal valid payload', () => {
      const result = PipelineJobDataSchema.parse({
        storyId: 'APIP-0010',
        phase: 'elaboration',
      })
      expect(result.storyId).toBe('APIP-0010')
      expect(result.phase).toBe('elaboration')
      expect(result.priority).toBeUndefined()
      expect(result.metadata).toBeUndefined()
    })

    it('accepts all valid phase values', () => {
      const phases = ['elaboration', 'implementation', 'review', 'qa', 'merge'] as const
      for (const phase of phases) {
        const result = PipelineJobDataSchema.parse({ storyId: 'APIP-0010', phase })
        expect(result.phase).toBe(phase)
      }
    })

    it('accepts optional priority field', () => {
      const result = PipelineJobDataSchema.parse({
        storyId: 'APIP-0010',
        phase: 'implementation',
        priority: 1,
      })
      expect(result.priority).toBe(1)
    })

    it('accepts optional metadata field', () => {
      const result = PipelineJobDataSchema.parse({
        storyId: 'APIP-0010',
        phase: 'review',
        metadata: { iteration: 2, tags: ['urgent'] },
      })
      expect(result.metadata).toEqual({ iteration: 2, tags: ['urgent'] })
    })

    it('accepts both priority and metadata together', () => {
      const result = PipelineJobDataSchema.parse({
        storyId: 'APIP-0020',
        phase: 'qa',
        priority: 5,
        metadata: { reviewer: 'claude-opus' },
      })
      expect(result.storyId).toBe('APIP-0020')
      expect(result.priority).toBe(5)
      expect(result.metadata).toEqual({ reviewer: 'claude-opus' })
    })
  })

  describe('invalid payloads', () => {
    it('rejects empty storyId', () => {
      expect(() =>
        PipelineJobDataSchema.parse({ storyId: '', phase: 'elaboration' }),
      ).toThrow()
    })

    it('rejects missing storyId', () => {
      expect(() =>
        PipelineJobDataSchema.parse({ phase: 'elaboration' }),
      ).toThrow()
    })

    it('rejects missing phase', () => {
      expect(() =>
        PipelineJobDataSchema.parse({ storyId: 'APIP-0010' }),
      ).toThrow()
    })

    it('rejects invalid phase value', () => {
      expect(() =>
        PipelineJobDataSchema.parse({ storyId: 'APIP-0010', phase: 'deployment' }),
      ).toThrow()
    })

    it('rejects non-integer priority', () => {
      expect(() =>
        PipelineJobDataSchema.parse({ storyId: 'APIP-0010', phase: 'qa', priority: 1.5 }),
      ).toThrow()
    })

    it('rejects null storyId', () => {
      expect(() =>
        PipelineJobDataSchema.parse({ storyId: null, phase: 'merge' }),
      ).toThrow()
    })
  })

  describe('safeParse', () => {
    it('returns success: false for invalid payload without throwing', () => {
      const result = PipelineJobDataSchema.safeParse({ storyId: 'APIP-0010', phase: 'unknown' })
      expect(result.success).toBe(false)
    })

    it('returns success: true for valid payload', () => {
      const result = PipelineJobDataSchema.safeParse({ storyId: 'APIP-0010', phase: 'merge' })
      expect(result.success).toBe(true)
    })
  })
})
