/**
 * Unit tests for kb-writer-node.ts
 * LNGG-0080: Workflow Command Integration - Step 13
 * Target: 90%+ coverage
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { kbWriterNode, createKBWriterNode } from '../kb-writer-node.js'
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

const mockAddLesson = vi.fn()
const mockAddDecision = vi.fn()
const mockAddConstraint = vi.fn()
const mockAddMany = vi.fn()

vi.mock('../../../adapters/kb-writer/factory.js', () => {
  return {
    createKbWriter: vi.fn(() => ({
      addLesson: mockAddLesson,
      addDecision: mockAddDecision,
      addConstraint: mockAddConstraint,
      addMany: mockAddMany,
    })),
  }
})

describe('kb-writer-node', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('addLesson operation', () => {
    it('successfully writes lesson', async () => {
      mockAddLesson.mockResolvedValue({ success: true })

      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'addLesson',
        lessonRequest: {
          content: 'Always validate input',
          storyId: 'LNGG-0080',
          severity: 'high',
        },
        kbDeps: {},
      } as any

      const result = await kbWriterNode(state)

      expect(result.kbWriter?.success).toBe(true)
      expect(result.kbWriter?.entriesWritten).toBe(1)
      expect(result.kbWriter?.entriesDeferred).toBe(0)
    })

    it('handles KB write failure (non-blocking)', async () => {
      mockAddLesson.mockResolvedValue({ success: false })

      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'addLesson',
        lessonRequest: {
          content: 'Test lesson',
          storyId: 'LNGG-0080',
        },
        kbDeps: {},
      } as any

      const result = await kbWriterNode(state)

      expect(result.kbWriter?.success).toBe(false)
      expect(result.kbWriter?.entriesWritten).toBe(0)
      expect(result.kbWriter?.entriesDeferred).toBe(1)
    })

    it('skips when lessonRequest missing (non-blocking)', async () => {
      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'addLesson',
      } as any

      const result = await kbWriterNode(state)

      expect(result.kbWriter?.success).toBe(true)
      expect(result.kbWriter?.entriesDeferred).toBe(1)
    })
  })

  describe('addDecision operation', () => {
    it('successfully writes decision', async () => {
      mockAddDecision.mockResolvedValue({ success: true })

      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'addDecision',
        decisionRequest: {
          content: 'Use Zod for validation',
          storyId: 'LNGG-0080',
          rationale: 'Type safety',
        },
        kbDeps: {},
      } as any

      const result = await kbWriterNode(state)

      expect(result.kbWriter?.success).toBe(true)
      expect(result.kbWriter?.entriesWritten).toBe(1)
    })

    it('skips when decisionRequest missing (non-blocking)', async () => {
      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'addDecision',
      } as any

      const result = await kbWriterNode(state)

      expect(result.kbWriter?.success).toBe(true)
      expect(result.kbWriter?.entriesDeferred).toBe(1)
    })
  })

  describe('addConstraint operation', () => {
    it('successfully writes constraint', async () => {
      mockAddConstraint.mockResolvedValue({ success: true })

      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'addConstraint',
        constraintRequest: {
          content: 'Must use ESM imports',
          storyId: 'LNGG-0080',
          scope: 'architectural',
        },
        kbDeps: {},
      } as any

      const result = await kbWriterNode(state)

      expect(result.kbWriter?.success).toBe(true)
      expect(result.kbWriter?.entriesWritten).toBe(1)
    })

    it('skips when constraintRequest missing (non-blocking)', async () => {
      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'addConstraint',
      } as any

      const result = await kbWriterNode(state)

      expect(result.kbWriter?.success).toBe(true)
      expect(result.kbWriter?.entriesDeferred).toBe(1)
    })
  })

  describe('addMany operation', () => {
    it('successfully writes multiple entries', async () => {
      mockAddMany.mockResolvedValue({
        successCount: 2,
        errorCount: 0,
      })

      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'addMany',
        batchRequests: [
          { type: 'lesson', content: 'Lesson 1' },
          { type: 'decision', content: 'Decision 1' },
        ],
        kbDeps: {},
      } as any

      const result = await kbWriterNode(state)

      expect(result.kbWriter?.success).toBe(true)
      expect(result.kbWriter?.entriesWritten).toBe(2)
      expect(result.kbWriter?.entriesDeferred).toBe(0)
    })

    it('handles partial success', async () => {
      mockAddMany.mockResolvedValue({
        successCount: 1,
        errorCount: 1,
      })

      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'addMany',
        batchRequests: [
          { type: 'lesson', content: 'Lesson 1' },
          { type: 'decision', content: 'Decision 1' },
        ],
        kbDeps: {},
      } as any

      const result = await kbWriterNode(state)

      expect(result.kbWriter?.success).toBe(true)
      expect(result.kbWriter?.entriesWritten).toBe(1)
      expect(result.kbWriter?.entriesDeferred).toBe(1)
    })

    it('skips when batchRequests missing (non-blocking)', async () => {
      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'addMany',
      } as any

      const result = await kbWriterNode(state)

      expect(result.kbWriter?.success).toBe(true)
    })
  })

  describe('mock mode', () => {
    it('uses no-op writer in mock mode', async () => {
      mockAddLesson.mockResolvedValue({ success: true })

      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'addLesson',
        lessonRequest: { content: 'Test', storyId: 'LNGG-0080' },
        mockMode: true,
      } as any

      await kbWriterNode(state)

      const { createKbWriter } = await import('../../../adapters/kb-writer/factory.js')
      expect(createKbWriter).toHaveBeenCalledWith({ kbDeps: undefined })
    })

    it('uses no-op writer when kbDeps missing', async () => {
      mockAddLesson.mockResolvedValue({ success: true })

      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'addLesson',
        lessonRequest: { content: 'Test', storyId: 'LNGG-0080' },
      } as any

      await kbWriterNode(state)

      const { createKbWriter } = await import('../../../adapters/kb-writer/factory.js')
      expect(createKbWriter).toHaveBeenCalledWith({ kbDeps: undefined })
    })
  })

  describe('error handling (non-blocking)', () => {
    it('handles write error gracefully', async () => {
      mockAddLesson.mockRejectedValue(new Error('KB unavailable'))

      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'addLesson',
        lessonRequest: { content: 'Test', storyId: 'LNGG-0080' },
        kbDeps: {},
      } as any

      const result = await kbWriterNode(state)

      expect(result.kbWriter?.success).toBe(true)
      expect(result.kbWriter?.entriesDeferred).toBe(1)
      expect(result.kbWriter?.error).toContain('KB unavailable')
    })

    it('handles unknown operation gracefully', async () => {
      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'invalid',
      } as any

      const result = await kbWriterNode(state)

      expect(result.kbWriter?.success).toBe(true)
      expect(result.kbWriter?.error).toContain('Unknown operation')
    })
  })

  describe('state immutability', () => {
    it('does not modify original state', async () => {
      mockAddLesson.mockResolvedValue({ success: true })

      const state: GraphState = {
        storyId: 'LNGG-0080',
        operation: 'addLesson',
        lessonRequest: { content: 'Test', storyId: 'LNGG-0080' },
        kbDeps: {},
      } as any

      const originalState = { ...state }
      await kbWriterNode(state)

      expect(state).toEqual(originalState)
    })
  })

  describe('createKBWriterNode', () => {
    it('creates node with custom config', async () => {
      mockAddLesson.mockResolvedValue({ success: true })

      const customNode = createKBWriterNode({
        operation: 'addLesson',
        lessonRequest: { content: 'Test', storyId: 'LNGG-0080' },
        kbDeps: {},
      })

      const state: GraphState = { storyId: 'LNGG-0080' } as any
      const result = await customNode(state)

      expect(result.kbWriter?.success).toBe(true)
    })
  })
})
