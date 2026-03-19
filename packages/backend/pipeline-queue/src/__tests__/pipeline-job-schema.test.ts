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

    // PIPE-2010: HP-1 — review payload with worktree context
    it('accepts review payload with worktreePath and featureDir', () => {
      const result = PipelineJobDataSchema.parse({
        storyId: 'PIPE-2020',
        stage: 'review',
        attemptNumber: 1,
        payload: {
          storyId: 'PIPE-2020',
          title: 'Dispatch Router Review Branch',
          worktreePath: '/tmp/worktrees/PIPE-2020',
          featureDir: 'plans/future/platform/pipeline-orchestrator-activation',
        },
      })
      expect(result.stage).toBe('review')
      if (result.stage === 'review') {
        expect(result.payload.worktreePath).toBe('/tmp/worktrees/PIPE-2020')
        expect(result.payload.featureDir).toBe(
          'plans/future/platform/pipeline-orchestrator-activation',
        )
      }
    })

    // PIPE-2010: HP-2 — review payload without optional fields
    it('accepts review payload without optional worktree fields', () => {
      const result = PipelineJobDataSchema.parse({
        storyId: 'PIPE-2020',
        stage: 'review',
        attemptNumber: 1,
        payload: {
          storyId: 'PIPE-2020',
          title: 'Dispatch Router Review Branch',
        },
      })
      expect(result.stage).toBe('review')
      if (result.stage === 'review') {
        expect(result.payload.worktreePath).toBeUndefined()
        expect(result.payload.featureDir).toBeUndefined()
      }
    })

    // PIPE-2010: HP-3 — QA payload with standard snapshot shape
    it('accepts QA payload with standard story snapshot', () => {
      const result = PipelineJobDataSchema.parse({
        storyId: 'PIPE-2030',
        stage: 'qa',
        attemptNumber: 1,
        payload: {
          storyId: 'PIPE-2030',
          title: 'Completion Callbacks',
          description: 'QA verification',
          feature: 'pipe',
          state: 'ready_for_qa',
        },
      })
      expect(result.stage).toBe('qa')
      if (result.stage === 'qa') {
        expect(result.payload.storyId).toBe('PIPE-2030')
      }
    })

    // PIPE-2010: ED-1 — review payload with only worktreePath (featureDir omitted)
    it('accepts review payload with only worktreePath', () => {
      const result = PipelineJobDataSchema.parse({
        storyId: 'PIPE-2020',
        stage: 'review',
        attemptNumber: 1,
        payload: {
          storyId: 'PIPE-2020',
          title: 'Partial worktree context',
          worktreePath: '/tmp/worktrees/PIPE-2020',
        },
      })
      expect(result.stage).toBe('review')
      if (result.stage === 'review') {
        expect(result.payload.worktreePath).toBe('/tmp/worktrees/PIPE-2020')
        expect(result.payload.featureDir).toBeUndefined()
      }
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

    // PIPE-2010: EC-1 — review payload missing required storyId
    it('rejects review payload missing required payload.storyId', () => {
      expect(() =>
        PipelineJobDataSchema.parse({
          storyId: 'PIPE-2020',
          stage: 'review',
          attemptNumber: 1,
          payload: { title: 'Missing storyId' },
        }),
      ).toThrow()
    })

    // PIPE-2010: EC-2 — review payload with worktreePath as non-string
    it('rejects review payload with worktreePath as non-string', () => {
      expect(() =>
        PipelineJobDataSchema.parse({
          storyId: 'PIPE-2020',
          stage: 'review',
          attemptNumber: 1,
          payload: { storyId: 'PIPE-2020', title: 'T', worktreePath: 123 },
        }),
      ).toThrow()
    })
  })

  // PIPE-2010: ED-2 — passthrough behavior preserved
  describe('passthrough behavior', () => {
    it('preserves extra fields on review payload via passthrough()', () => {
      const result = PipelineJobDataSchema.parse({
        storyId: 'PIPE-2020',
        stage: 'review',
        attemptNumber: 1,
        payload: {
          storyId: 'PIPE-2020',
          title: 'Passthrough test',
          worktreePath: '/tmp/wt',
          customField: 'should-pass-through',
        },
      })
      expect(result.stage).toBe('review')
      if (result.stage === 'review') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((result.payload as any).customField).toBe('should-pass-through')
      }
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
