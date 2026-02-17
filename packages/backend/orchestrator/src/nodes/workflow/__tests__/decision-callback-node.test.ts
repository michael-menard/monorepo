/**
 * Unit tests for decision-callback-node.ts
 * LNGG-0080: Workflow Command Integration - Step 12
 * Target: 90%+ coverage
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { decisionCallbackNode, createDecisionCallbackNode } from '../decision-callback-node.js'
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

const mockAsk = vi.fn()

vi.mock('../../../adapters/decision-callbacks/registry.js', () => {
  return {
    DecisionCallbackRegistry: {
      getInstance: vi.fn(() => ({
        get: vi.fn(() => ({
          ask: mockAsk,
        })),
      })),
    },
  }
})

describe('decision-callback-node', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('CLI mode', () => {
    it('successfully prompts for decision', async () => {
      mockAsk.mockResolvedValue({
        answer: 'yes',
        cancelled: false,
        timedOut: false,
      })

      const state: GraphState = {
        storyId: 'LNGG-0080',
        mode: 'cli',
        question: 'Proceed?',
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
        ],
      } as any

      const result = await decisionCallbackNode(state)

      expect(result.decision?.success).toBe(true)
      expect(result.decision?.decision).toBe('yes')
      expect(result.decision?.cancelled).toBe(false)
    })

    it('handles timeout', async () => {
      mockAsk.mockResolvedValue({
        answer: undefined,
        cancelled: false,
        timedOut: true,
      })

      const state: GraphState = {
        storyId: 'LNGG-0080',
        mode: 'cli',
        question: 'Proceed?',
        options: [{ value: 'yes', label: 'Yes' }],
        timeoutMs: 5000,
      } as any

      const result = await decisionCallbackNode(state)

      expect(result.decision?.success).toBe(false)
      expect(result.decision?.timedOut).toBe(true)
    })

    it('handles cancellation', async () => {
      mockAsk.mockResolvedValue({
        answer: undefined,
        cancelled: true,
        timedOut: false,
      })

      const state: GraphState = {
        storyId: 'LNGG-0080',
        mode: 'cli',
        question: 'Proceed?',
        options: [{ value: 'yes', label: 'Yes' }],
      } as any

      const result = await decisionCallbackNode(state)

      expect(result.decision?.success).toBe(false)
      expect(result.decision?.cancelled).toBe(true)
    })
  })

  describe('auto-decision mode', () => {
    it('makes rule-based decision', async () => {
      mockAsk.mockResolvedValue({
        answer: 'exponential',
        cancelled: false,
        timedOut: false,
      })

      const state: GraphState = {
        storyId: 'LNGG-0080',
        mode: 'auto',
        question: 'Select retry strategy',
        options: [
          { value: 'exponential', label: 'Exponential', recommended: true },
          { value: 'linear', label: 'Linear' },
        ],
      } as any

      const result = await decisionCallbackNode(state)

      expect(result.decision?.success).toBe(true)
      expect(result.decision?.decision).toBe('exponential')
    })
  })

  describe('noop mode', () => {
    it('returns without making decision', async () => {
      mockAsk.mockResolvedValue({
        answer: undefined,
        cancelled: false,
        timedOut: false,
      })

      const state: GraphState = {
        storyId: 'LNGG-0080',
        mode: 'noop',
        question: 'Proceed?',
        options: [{ value: 'yes', label: 'Yes' }],
      } as any

      const result = await decisionCallbackNode(state)

      expect(result.decision?.success).toBe(true)
    })
  })

  describe('error handling', () => {
    it('returns error when question missing', async () => {
      const state: GraphState = {
        storyId: 'LNGG-0080',
        mode: 'cli',
        options: [{ value: 'yes', label: 'Yes' }],
      } as any

      const result = await decisionCallbackNode(state)

      expect(result.decision?.success).toBe(false)
      expect(result.decision?.error).toContain('question and options are required')
    })

    it('returns error when options missing', async () => {
      const state: GraphState = {
        storyId: 'LNGG-0080',
        mode: 'cli',
        question: 'Proceed?',
      } as any

      const result = await decisionCallbackNode(state)

      expect(result.decision?.success).toBe(false)
      expect(result.decision?.error).toContain('question and options are required')
    })

    it('handles callback error', async () => {
      mockAsk.mockRejectedValue(new Error('Callback failed'))

      const state: GraphState = {
        storyId: 'LNGG-0080',
        mode: 'cli',
        question: 'Proceed?',
        options: [{ value: 'yes', label: 'Yes' }],
      } as any

      const result = await decisionCallbackNode(state)

      expect(result.decision?.success).toBe(false)
      expect(result.decision?.error).toContain('Callback failed')
    })
  })

  describe('state immutability', () => {
    it('does not modify original state', async () => {
      mockAsk.mockResolvedValue({
        answer: 'yes',
        cancelled: false,
        timedOut: false,
      })

      const state: GraphState = {
        storyId: 'LNGG-0080',
        mode: 'cli',
        question: 'Proceed?',
        options: [{ value: 'yes', label: 'Yes' }],
      } as any

      const originalState = { ...state }
      await decisionCallbackNode(state)

      expect(state).toEqual(originalState)
    })
  })

  describe('createDecisionCallbackNode', () => {
    it('creates node with custom config', async () => {
      mockAsk.mockResolvedValue({
        answer: 'yes',
        cancelled: false,
        timedOut: false,
      })

      const customNode = createDecisionCallbackNode({
        mode: 'auto',
        question: 'Proceed?',
        options: [{ value: 'yes', label: 'Yes' }],
      })

      const state: GraphState = { storyId: 'LNGG-0080' } as any
      const result = await customNode(state)

      expect(result.decision?.success).toBe(true)
    })
  })
})
