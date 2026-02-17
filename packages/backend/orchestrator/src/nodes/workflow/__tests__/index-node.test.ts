/**
 * Unit tests for index-node.ts
 * LNGG-0080: Workflow Command Integration - Step 9
 * Target: 90%+ coverage
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { indexNode, createIndexNode } from '../index-node.js'
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

const mockReadIndex = vi.fn()
const mockUpdateStoryStatus = vi.fn()
const mockAddStory = vi.fn()
const mockRemoveStory = vi.fn()
const mockValidate = vi.fn()
const mockRecalculateMetrics = vi.fn()

vi.mock('../../../adapters/index-adapter.js', () => {
  return {
    IndexAdapter: vi.fn().mockImplementation(() => ({
      readIndex: mockReadIndex,
      updateStoryStatus: mockUpdateStoryStatus,
      addStory: mockAddStory,
      removeStory: mockRemoveStory,
      validate: mockValidate,
      recalculateMetrics: mockRecalculateMetrics,
    })),
  }
})

describe('index-node', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('add operation', () => {
    it('successfully adds story to index', async () => {
      const mockIndex = { stories: [] }
      const mockMetrics = { total: 1, completed: 0 }

      mockAddStory.mockResolvedValue(undefined)
      mockReadIndex.mockResolvedValue(mockIndex)
      mockRecalculateMetrics.mockReturnValue(mockMetrics)

      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'add',
        indexPath: '/path/to/index.md',
        entry: { id: 'LNGG-0080', title: 'Test' },
        waveSection: 'wave-1',
      } as any

      const result = await indexNode(state)

      expect(result.index?.success).toBe(true)
      expect(result.index?.metrics).toEqual(mockMetrics)
    })

    it('handles DuplicateStoryIdError', async () => {
      mockAddStory.mockRejectedValue(new Error('Duplicate story ID'))

      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'add',
        indexPath: '/path/to/index.md',
        entry: { id: 'LNGG-0080', title: 'Test' },
        waveSection: 'wave-1',
      } as any

      const result = await indexNode(state)

      expect(result.index?.success).toBe(false)
      expect(result.index?.error).toContain('Duplicate')
    })

    it('returns error when entry missing', async () => {
      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'add',
        indexPath: '/path/to/index.md',
        waveSection: 'wave-1',
      } as any

      const result = await indexNode(state)

      expect(result.index?.success).toBe(false)
      expect(result.index?.error).toContain('entry and waveSection are required')
    })
  })

  describe('update operation', () => {
    it('successfully updates story status', async () => {
      const mockIndex = { stories: [] }
      const mockMetrics = { total: 1, completed: 1 }

      mockUpdateStoryStatus.mockResolvedValue(undefined)
      mockReadIndex.mockResolvedValue(mockIndex)
      mockRecalculateMetrics.mockReturnValue(mockMetrics)

      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'update',
        indexPath: '/path/to/index.md',
        status: 'completed',
      } as any

      const result = await indexNode(state)

      expect(result.index?.success).toBe(true)
      expect(result.index?.metrics).toEqual(mockMetrics)
    })

    it('returns error when status missing', async () => {
      const state: GraphState = {
        storyId: 'LNGG-0080',
        errors: [],
        operation: 'update',
        indexPath: '/path/to/index.md',
      } as any

      const result = await indexNode(state)

      expect(result.index?.success).toBe(false)
      expect(result.index?.error).toContain('storyId and status are required')
    })
  })

  describe('remove operation', () => {
    it('successfully removes story from index', async () => {
      const mockIndex = { stories: [] }
      const mockMetrics = { total: 0, completed: 0 }

      mockRemoveStory.mockResolvedValue(undefined)
      mockReadIndex.mockResolvedValue(mockIndex)
      mockRecalculateMetrics.mockReturnValue(mockMetrics)

      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'remove',
        indexPath: '/path/to/index.md',
      } as any

      const result = await indexNode(state)

      expect(result.index?.success).toBe(true)
      expect(result.index?.metrics).toEqual(mockMetrics)
    })

    it('handles StoryNotInIndexError', async () => {
      mockRemoveStory.mockRejectedValue(new Error('Story not found in index'))

      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'remove',
        indexPath: '/path/to/index.md',
      } as any

      const result = await indexNode(state)

      expect(result.index?.success).toBe(false)
      expect(result.index?.error).toContain('Story not found')
    })
  })

  describe('validate operation', () => {
    it('successfully validates index', async () => {
      const mockIndex = { stories: [] }
      const mockValidation = { valid: true, errors: [] }
      const mockMetrics = { total: 1, completed: 0 }

      mockReadIndex.mockResolvedValue(mockIndex)
      mockValidate.mockReturnValue(mockValidation)
      mockRecalculateMetrics.mockReturnValue(mockMetrics)

      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'validate',
        indexPath: '/path/to/index.md',
      } as any

      const result = await indexNode(state)

      expect(result.index?.success).toBe(true)
      expect(result.index?.validation).toEqual(mockValidation)
    })

    it('detects circular dependencies', async () => {
      const mockIndex = { stories: [] }
      const mockValidation = { valid: false, errors: ['Circular dependency detected'] }
      const mockMetrics = { total: 1, completed: 0 }

      mockReadIndex.mockResolvedValue(mockIndex)
      mockValidate.mockReturnValue(mockValidation)
      mockRecalculateMetrics.mockReturnValue(mockMetrics)

      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'validate',
        indexPath: '/path/to/index.md',
      } as any

      const result = await indexNode(state)

      expect(result.index?.success).toBe(false)
      expect(result.index?.validation?.valid).toBe(false)
    })
  })

  describe('error when indexPath missing', () => {
    it('returns error', async () => {
      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'validate',
      } as any

      const result = await indexNode(state)

      expect(result.index?.success).toBe(false)
      expect(result.index?.error).toContain('indexPath is required')
    })
  })

  describe('state immutability', () => {
    it('does not modify original state', async () => {
      const mockIndex = { stories: [] }
      const mockValidation = { valid: true, errors: [] }
      const mockMetrics = { total: 1, completed: 0 }

      mockReadIndex.mockResolvedValue(mockIndex)
      mockValidate.mockReturnValue(mockValidation)
      mockRecalculateMetrics.mockReturnValue(mockMetrics)

      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'validate',
        indexPath: '/path/to/index.md',
      } as any

      const originalState = { ...state }
      await indexNode(state)

      expect(state).toEqual(originalState)
    })
  })

  describe('createIndexNode', () => {
    it('creates node with custom config', async () => {
      const mockIndex = { stories: [] }
      const mockValidation = { valid: true, errors: [] }
      const mockMetrics = { total: 1, completed: 0 }

      mockReadIndex.mockResolvedValue(mockIndex)
      mockValidate.mockReturnValue(mockValidation)
      mockRecalculateMetrics.mockReturnValue(mockMetrics)

      const customNode = createIndexNode({
        operation: 'validate',
        indexPath: '/path/to/index.md',
      })

      const state: GraphState = { storyId: 'LNGG-0080' } as any
      const result = await customNode(state)

      expect(result.index?.success).toBe(true)
    })
  })
})
