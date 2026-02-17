/**
 * Unit tests for stage-movement-node.ts
 * LNGG-0080: Workflow Command Integration - Step 10
 * Target: 90%+ coverage
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { stageMovementNode, createStageMovementNode } from '../stage-movement-node.js'
import type { GraphState } from '../../../state/index.js'

vi.mock('@repo/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

const mockMoveStage = vi.fn()
const mockBatchMoveStage = vi.fn()

vi.mock('../../../adapters/stage-movement-adapter.js', () => {
  return {
    StageMovementAdapter: vi.fn().mockImplementation(() => ({
      moveStage: mockMoveStage,
      batchMoveStage: mockBatchMoveStage,
    })),
  }
})

describe('stage-movement-node', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('move operation', () => {
    it('successfully moves story to new stage', async () => {
      const mockResult = {
        fromStage: 'in-progress',
        toStage: 'ready-for-qa',
        storyId: 'LNGG-0080',
      }
      mockMoveStage.mockResolvedValue(mockResult)

      const state: GraphState = {
        storyId: 'LNGG-0080',
        featureDir: '/path/to/feature',
        toStage: 'ready-for-qa',
        fromStage: 'in-progress',
      } as any

      const result = await stageMovementNode(state)

      expect(result.stageMovement?.success).toBe(true)
      expect(result.stageMovement?.fromStage).toBe('in-progress')
      expect(result.stageMovement?.toStage).toBe('ready-for-qa')
    })

    it('handles InvalidStageError', async () => {
      mockMoveStage.mockRejectedValue(new Error('Invalid stage: invalid-stage'))

      const state: GraphState = {
        storyId: 'LNGG-0080',
        featureDir: '/path/to/feature',
        toStage: 'invalid-stage',
      } as any

      const result = await stageMovementNode(state)

      expect(result.stageMovement?.success).toBe(false)
      expect(result.stageMovement?.error).toContain('Invalid stage')
    })

    it('handles InvalidTransitionError', async () => {
      mockMoveStage.mockRejectedValue(new Error('Invalid transition'))

      const state: GraphState = {
        storyId: 'LNGG-0080',
        featureDir: '/path/to/feature',
        toStage: 'ready-to-work',
        fromStage: 'completed',
      } as any

      const result = await stageMovementNode(state)

      expect(result.stageMovement?.success).toBe(false)
      expect(result.stageMovement?.error).toContain('Invalid transition')
    })

    it('handles StoryNotFoundError', async () => {
      mockMoveStage.mockRejectedValue(new Error('Story not found'))

      const state: GraphState = {
        storyId: 'MISSING-0001',
        featureDir: '/path/to/feature',
        toStage: 'ready-for-qa',
      } as any

      const result = await stageMovementNode(state)

      expect(result.stageMovement?.success).toBe(false)
      expect(result.stageMovement?.error).toContain('Story not found')
    })

    it('returns error when required fields missing', async () => {
      const state: GraphState = {
        storyId: 'LNGG-0080',
      } as any

      const result = await stageMovementNode(state)

      expect(result.stageMovement?.success).toBe(false)
      expect(result.stageMovement?.error).toContain('storyId, featureDir, and toStage are required')
    })
  })

  describe('state immutability', () => {
    it('does not modify original state', async () => {
      const mockResult = {
        fromStage: 'in-progress',
        toStage: 'ready-for-qa',
        storyId: 'LNGG-0080',
      }
      mockMoveStage.mockResolvedValue(mockResult)

      const state: GraphState = {
        storyId: 'LNGG-0080',
        featureDir: '/path/to/feature',
        toStage: 'ready-for-qa',
      } as any

      const originalState = { ...state }
      await stageMovementNode(state)

      expect(state).toEqual(originalState)
    })
  })

  describe('createStageMovementNode', () => {
    it('creates node with custom config', async () => {
      const mockResult = {
        fromStage: 'in-progress',
        toStage: 'ready-for-qa',
        storyId: 'LNGG-0080',
      }
      mockMoveStage.mockResolvedValue(mockResult)

      const customNode = createStageMovementNode({
        storyId: 'LNGG-0080',
        featureDir: '/path/to/feature',
        toStage: 'ready-for-qa',
      })

      const state: GraphState = { storyId: 'LNGG-0080', errors: [] } as any
      const result = await customNode(state)

      expect(result.stageMovement?.success).toBe(true)
    })
  })
})
