/**
 * Unit tests for story-file-node.ts
 * LNGG-0080: Workflow Command Integration - Step 8
 * Target: 90%+ coverage
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { storyFileNode, createStoryFileNode } from '../story-file-node.js'
import type { GraphState } from '../../../state/index.js'

// Mock dependencies
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
const mockExists = vi.fn()

vi.mock('../../../adapters/story-file-adapter.js', () => {
  return {
    StoryFileAdapter: vi.fn().mockImplementation(() => ({
      read: mockRead,
      write: mockWrite,
      update: mockUpdate,
      exists: mockExists,
    })),
  }
})

describe('story-file-node', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('read operation', () => {
    it('successfully reads story file', async () => {
      const mockStory = { id: 'LNGG-0080', title: 'Test Story' }
      mockRead.mockResolvedValue(mockStory)

      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'read',
        filePath: '/path/to/story.yaml',
      } as any

      const result = await storyFileNode(state)

      expect(result.storyFile).toBeDefined()
      expect(result.storyFile?.success).toBe(true)
      expect(result.storyFile?.story).toEqual(mockStory)
      expect(result.storyFile?.filePath).toBe('/path/to/story.yaml')
    })

    it('handles StoryNotFoundError', async () => {
      mockRead.mockRejectedValue(new Error('Story not found'))

      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'read',
        filePath: '/path/to/missing.yaml',
      } as any

      const result = await storyFileNode(state)

      expect(result.storyFile?.success).toBe(false)
      expect(result.storyFile?.error).toContain('Story not found')
    })

    it('handles InvalidYAMLError', async () => {
      mockRead.mockRejectedValue(new Error('Invalid YAML syntax'))

      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'read',
        filePath: '/path/to/invalid.yaml',
      } as any

      const result = await storyFileNode(state)

      expect(result.storyFile?.success).toBe(false)
      expect(result.storyFile?.error).toContain('Invalid YAML')
    })

    it('returns error when filePath missing', async () => {
      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'read',
      } as any

      const result = await storyFileNode(state)

      expect(result.storyFile?.success).toBe(false)
      expect(result.storyFile?.error).toContain('filePath is required')
    })
  })

  describe('write operation', () => {
    it('successfully writes story file', async () => {
      const mockStory = { id: 'LNGG-0080', title: 'Test Story' }
      mockWrite.mockResolvedValue(undefined)

      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'write',
        filePath: '/path/to/story.yaml',
        story: mockStory,
      } as any

      const result = await storyFileNode(state)

      expect(result.storyFile?.success).toBe(true)
      expect(result.storyFile?.filePath).toBe('/path/to/story.yaml')
    })

    it('handles WriteError', async () => {
      mockWrite.mockRejectedValue(new Error('Write failed'))

      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'write',
        filePath: '/path/to/story.yaml',
        story: { id: 'LNGG-0080' },
      } as any

      const result = await storyFileNode(state)

      expect(result.storyFile?.success).toBe(false)
      expect(result.storyFile?.error).toContain('Write failed')
    })

    it('returns error when story data missing', async () => {
      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'write',
        filePath: '/path/to/story.yaml',
      } as any

      const result = await storyFileNode(state)

      expect(result.storyFile?.success).toBe(false)
      expect(result.storyFile?.error).toContain('story data is required')
    })
  })

  describe('update operation', () => {
    it('successfully updates story file', async () => {
      mockUpdate.mockResolvedValue(undefined)

      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'update',
        filePath: '/path/to/story.yaml',
        partialUpdate: { status: 'in-progress' },
      } as any

      const result = await storyFileNode(state)

      expect(result.storyFile?.success).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith(
        '/path/to/story.yaml',
        { status: 'in-progress' },
      )
    })

    it('returns error when partialUpdate missing', async () => {
      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'update',
        filePath: '/path/to/story.yaml',
      } as any

      const result = await storyFileNode(state)

      expect(result.storyFile?.success).toBe(false)
      expect(result.storyFile?.error).toContain('partialUpdate is required')
    })
  })

  describe('unknown operation', () => {
    it('handles unknown operation gracefully', async () => {
      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'invalid',
        filePath: '/path/to/story.yaml',
      } as any

      const result = await storyFileNode(state)

      expect(result.storyFile?.success).toBe(false)
      expect(result.storyFile?.error).toContain('Unknown operation')
    })
  })

  describe('state immutability', () => {
    it('does not modify original state', async () => {
      const mockStory = { id: 'LNGG-0080', title: 'Test Story' }
      mockRead.mockResolvedValue(mockStory)

      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'read',
        filePath: '/path/to/story.yaml',
      } as any

      const originalState = { ...state }
      await storyFileNode(state)

      expect(state).toEqual(originalState)
    })
  })

  describe('createStoryFileNode', () => {
    it('creates node with custom config', async () => {
      const mockStory = { id: 'LNGG-0080', title: 'Test Story' }
      mockRead.mockResolvedValue(mockStory)

      const customNode = createStoryFileNode({
        operation: 'read',
        filePath: '/path/to/story.yaml',
      })

      const state: GraphState = { storyId: 'LNGG-0080' } as any
      const result = await customNode(state)

      expect(result.storyFile?.success).toBe(true)
      expect(result.storyFile?.story).toEqual(mockStory)
    })
  })
})
