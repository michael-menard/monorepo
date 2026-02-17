/**
 * Unit tests for checkpoint-node.ts
 * LNGG-0080: Workflow Command Integration - Step 11
 * Target: 90%+ coverage
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { checkpointNode, createCheckpointNode } from '../checkpoint-node.js'
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

const mockRead = vi.fn()
const mockWrite = vi.fn()
const mockUpdate = vi.fn()
const mockAdvancePhase = vi.fn()

vi.mock('../../../adapters/checkpoint-adapter.js', () => {
  return {
    CheckpointAdapter: vi.fn().mockImplementation(() => ({
      read: mockRead,
      write: mockWrite,
      update: mockUpdate,
      advancePhase: mockAdvancePhase,
    })),
  }
})

describe('checkpoint-node', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('read operation', () => {
    it('successfully reads checkpoint', async () => {
      const mockCheckpoint = { current_phase: 'execute', story_id: 'LNGG-0080' }
      mockRead.mockResolvedValue(mockCheckpoint)

      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'read',
        filePath: '/path/to/CHECKPOINT.yaml',
      } as any

      const result = await checkpointNode(state)

      expect(result.checkpoint?.success).toBe(true)
      expect(result.checkpoint?.checkpoint).toEqual(mockCheckpoint)
    })

    it('handles CheckpointNotFoundError', async () => {
      mockRead.mockRejectedValue(new Error('Checkpoint not found'))

      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'read',
        filePath: '/path/to/missing.yaml',
      } as any

      const result = await checkpointNode(state)

      expect(result.checkpoint?.success).toBe(false)
      expect(result.checkpoint?.error).toContain('Checkpoint not found')
    })

    it('handles resume-from capability', async () => {
      const mockCheckpoint = { current_phase: 'execute', story_id: 'LNGG-0080' }
      const updatedCheckpoint = { current_phase: 'plan', story_id: 'LNGG-0080' }

      mockRead
        .mockResolvedValueOnce(mockCheckpoint)
        .mockResolvedValueOnce(updatedCheckpoint)
      mockUpdate.mockResolvedValue(undefined)

      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'read',
        filePath: '/path/to/CHECKPOINT.yaml',
        resumeFromPhase: 'plan',
      } as any

      const result = await checkpointNode(state)

      expect(result.checkpoint?.success).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith('/path/to/CHECKPOINT.yaml', {
        current_phase: 'plan',
      })
    })
  })

  describe('write operation', () => {
    it('successfully writes checkpoint', async () => {
      const mockCheckpoint = { current_phase: 'setup', story_id: 'LNGG-0080' }
      mockWrite.mockResolvedValue(undefined)

      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'write',
        filePath: '/path/to/CHECKPOINT.yaml',
        checkpoint: mockCheckpoint,
      } as any

      const result = await checkpointNode(state)

      expect(result.checkpoint?.success).toBe(true)
    })

    it('returns error when checkpoint data missing', async () => {
      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'write',
        filePath: '/path/to/CHECKPOINT.yaml',
      } as any

      const result = await checkpointNode(state)

      expect(result.checkpoint?.success).toBe(false)
      expect(result.checkpoint?.error).toContain('checkpoint data is required')
    })
  })

  describe('update operation', () => {
    it('successfully updates checkpoint', async () => {
      mockUpdate.mockResolvedValue(undefined)

      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'update',
        filePath: '/path/to/CHECKPOINT.yaml',
        partialUpdate: { blocked: true },
      } as any

      const result = await checkpointNode(state)

      expect(result.checkpoint?.success).toBe(true)
    })

    it('returns error when partialUpdate missing', async () => {
      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'update',
        filePath: '/path/to/CHECKPOINT.yaml',
      } as any

      const result = await checkpointNode(state)

      expect(result.checkpoint?.success).toBe(false)
      expect(result.checkpoint?.error).toContain('partialUpdate is required')
    })
  })

  describe('advancePhase operation', () => {
    it('successfully advances phase', async () => {
      const updatedCheckpoint = { current_phase: 'execute', story_id: 'LNGG-0080' }

      mockAdvancePhase.mockResolvedValue(undefined)
      mockRead.mockResolvedValue(updatedCheckpoint)

      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'advancePhase',
        filePath: '/path/to/CHECKPOINT.yaml',
        fromPhase: 'plan',
        toPhase: 'execute',
      } as any

      const result = await checkpointNode(state)

      expect(result.checkpoint?.success).toBe(true)
      expect(result.checkpoint?.checkpoint).toEqual(updatedCheckpoint)
    })

    it('returns error when phases missing', async () => {
      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'advancePhase',
        filePath: '/path/to/CHECKPOINT.yaml',
      } as any

      const result = await checkpointNode(state)

      expect(result.checkpoint?.success).toBe(false)
      expect(result.checkpoint?.error).toContain('fromPhase and toPhase are required')
    })
  })

  describe('error when filePath missing', () => {
    it('returns error', async () => {
      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'read',
      } as any

      const result = await checkpointNode(state)

      expect(result.checkpoint?.success).toBe(false)
      expect(result.checkpoint?.error).toContain('filePath is required')
    })
  })

  describe('state immutability', () => {
    it('does not modify original state', async () => {
      const mockCheckpoint = { current_phase: 'execute', story_id: 'LNGG-0080' }
      mockRead.mockResolvedValue(mockCheckpoint)

      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'read',
        filePath: '/path/to/CHECKPOINT.yaml',
      } as any

      const originalState = { ...state }
      await checkpointNode(state)

      expect(state).toEqual(originalState)
    })
  })

  describe('createCheckpointNode', () => {
    it('creates node with custom config', async () => {
      const mockCheckpoint = { current_phase: 'execute', story_id: 'LNGG-0080' }
      mockRead.mockResolvedValue(mockCheckpoint)

      const customNode = createCheckpointNode({
        operation: 'read',
        filePath: '/path/to/CHECKPOINT.yaml',
      })

      const state: GraphState = { storyId: 'LNGG-0080' } as any
      const result = await customNode(state)

      expect(result.checkpoint?.success).toBe(true)
    })
  })
})
