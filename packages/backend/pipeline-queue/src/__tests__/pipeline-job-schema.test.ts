/**
 * PipelineJobDataSchema Unit Tests (AC-2, AC-7)
 */

import { describe, it, expect } from 'vitest'
import { PipelineJobDataSchema } from '../__types__/index.js'

describe('PipelineJobDataSchema', () => {
  describe('valid payloads', () => {
    it('accepts a minimal elaboration payload', () => {
      const result = PipelineJobDataSchema.parse({
        storyId: 'APIP-0010',
        stage: 'elaboration',
        attemptNumber: 1,
        payload: {},
      })
      expect(result.storyId).toBe('APIP-0010')
      expect(result.stage).toBe('elaboration')
      expect(result.priority).toBeUndefined()
      expect(result.touchedPathPrefixes).toEqual([])
    })

    it('accepts all valid stage values', () => {
      const stages = [
        'elaboration',
        'story-creation',
        'implementation',
        'review',
        'qa',
      ] as const
      for (const stage of stages) {
        const payload =
          stage === 'implementation' || stage === 'review' || stage === 'qa'
            ? {
                storyId: 'STORY-001',
                title: 'Test Story',
              }
            : {}
        const result = PipelineJobDataSchema.parse({
          storyId: 'APIP-0010',
          stage,
          attemptNumber: 1,
          payload,
        })
        expect(result.stage).toBe(stage)
      }
    })

    it('accepts optional priority field', () => {
      const result = PipelineJobDataSchema.parse({
        storyId: 'APIP-0010',
        stage: 'elaboration',
        attemptNumber: 1,
        payload: {},
        priority: 1,
      })
      expect(result.priority).toBe(1)
    })

    it('accepts touchedPathPrefixes field', () => {
      const result = PipelineJobDataSchema.parse({
        storyId: 'APIP-0010',
        stage: 'review',
        attemptNumber: 1,
        payload: {
          storyId: 'APIP-0010',
          title: 'My Story',
        },
        touchedPathPrefixes: ['packages/backend', 'apps/api'],
      })
      expect(result.touchedPathPrefixes).toEqual(['packages/backend', 'apps/api'])
    })

    it('accepts implementation payload with story snapshot', () => {
      const result = PipelineJobDataSchema.parse({
        storyId: 'APIP-0020',
        stage: 'implementation',
        attemptNumber: 2,
        payload: {
          storyId: 'APIP-0020',
          title: 'BullMQ Work Queue Setup',
          description: 'Setup BullMQ pipeline queue',
          feature: 'apip',
          state: 'in_progress',
        },
        priority: 5,
      })
      expect(result.storyId).toBe('APIP-0020')
      expect(result.stage).toBe('implementation')
      if (result.stage === 'implementation') {
        expect(result.payload.storyId).toBe('APIP-0020')
      }
    })
  })

  describe('invalid payloads', () => {
    it('rejects empty storyId', () => {
      expect(() =>
        PipelineJobDataSchema.parse({
          storyId: '',
          stage: 'elaboration',
          attemptNumber: 1,
          payload: {},
        }),
      ).toThrow()
    })

    it('rejects missing storyId', () => {
      expect(() =>
        PipelineJobDataSchema.parse({
          stage: 'elaboration',
          attemptNumber: 1,
          payload: {},
        }),
      ).toThrow()
    })

    it('rejects missing stage', () => {
      expect(() =>
        PipelineJobDataSchema.parse({ storyId: 'APIP-0010', attemptNumber: 1, payload: {} }),
      ).toThrow()
    })

    it('rejects invalid stage value', () => {
      expect(() =>
        PipelineJobDataSchema.parse({
          storyId: 'APIP-0010',
          stage: 'deployment',
          attemptNumber: 1,
          payload: {},
        }),
      ).toThrow()
    })

    it('rejects non-integer priority', () => {
      expect(() =>
        PipelineJobDataSchema.parse({
          storyId: 'APIP-0010',
          stage: 'qa',
          attemptNumber: 1,
          payload: { storyId: 'APIP-0010', title: 'T' },
          priority: 1.5,
        }),
      ).toThrow()
    })

    it('rejects null storyId', () => {
      expect(() =>
        PipelineJobDataSchema.parse({
          storyId: null,
          stage: 'elaboration',
          attemptNumber: 1,
          payload: {},
        }),
      ).toThrow()
    })

    it('rejects missing attemptNumber', () => {
      expect(() =>
        PipelineJobDataSchema.parse({
          storyId: 'APIP-0010',
          stage: 'elaboration',
          payload: {},
        }),
      ).toThrow()
    })
  })

  describe('safeParse', () => {
    it('returns success: false for invalid payload without throwing', () => {
      const result = PipelineJobDataSchema.safeParse({
        storyId: 'APIP-0010',
        stage: 'unknown',
        attemptNumber: 1,
        payload: {},
      })
      expect(result.success).toBe(false)
    })

    it('returns success: true for valid payload', () => {
      const result = PipelineJobDataSchema.safeParse({
        storyId: 'APIP-0010',
        stage: 'story-creation',
        attemptNumber: 1,
        payload: {},
      })
      expect(result.success).toBe(true)
    })
  })
})
