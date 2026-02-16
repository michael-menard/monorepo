/**
 * AC-3: Decision Callback Integration Tests
 *
 * Tests DecisionCallbackRegistry with StoryFileAdapter
 * in realistic workflow scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { randomUUID } from 'node:crypto'
import { DecisionCallbackRegistry } from '../../decision-callbacks/registry.js'
import { AutoDecisionCallback, type DecisionRule } from '../../decision-callbacks/auto-callback.js'
import { NoopDecisionCallback } from '../../decision-callbacks/noop-callback.js'
import { StoryFileAdapter } from '../../story-file-adapter.js'
import type { DecisionRequest } from '../../decision-callbacks/types.js'
import type { StoryArtifact } from '../../../artifacts/story-v2-compatible.js'

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('AC-3: Decision Callback Integration', () => {
  let tmpDir: string
  let storyAdapter: StoryFileAdapter

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lngg-0070-decisions-'))
    storyAdapter = new StoryFileAdapter()
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  const createDecisionRequest = (overrides: Partial<DecisionRequest> = {}): DecisionRequest => ({
    id: randomUUID(),
    type: 'single-choice',
    question: 'Should we proceed with implementation?',
    options: [
      { value: 'proceed', label: 'Proceed', recommended: true },
      { value: 'defer', label: 'Defer' },
      { value: 'skip', label: 'Skip' },
    ],
    timeout_ms: 30000,
    ...overrides,
  })

  describe('Auto-decision mode in workflow scenario', () => {
    it('should use auto callback to make decisions based on rules', async () => {
      const rules: DecisionRule[] = [
        {
          name: 'high-priority-proceed',
          condition: ctx => ctx.priority === 'high',
          answer: 'proceed',
          rationale: 'High priority stories should proceed immediately',
        },
        {
          name: 'low-priority-defer',
          condition: ctx => ctx.priority === 'low',
          answer: 'defer',
          rationale: 'Low priority stories can be deferred',
        },
      ]

      const autoCallback = new AutoDecisionCallback(rules, 'proceed')

      // High priority decision
      const highPriorityRequest = createDecisionRequest({
        context: { priority: 'high', storyId: 'TEST-001' },
      })
      const highResult = await autoCallback.ask(highPriorityRequest)
      expect(highResult.answer).toBe('proceed')
      expect(highResult.cancelled).toBe(false)
      expect(highResult.timedOut).toBe(false)

      // Low priority decision
      const lowPriorityRequest = createDecisionRequest({
        context: { priority: 'low', storyId: 'TEST-002' },
      })
      const lowResult = await autoCallback.ask(lowPriorityRequest)
      expect(lowResult.answer).toBe('defer')
    })

    it('should fall back to default answer when no rules match', async () => {
      const autoCallback = new AutoDecisionCallback([], 'proceed')

      const request = createDecisionRequest({
        context: { priority: 'medium' },
      })
      const result = await autoCallback.ask(request)
      expect(result.answer).toBe('proceed')
    })

    it('should integrate auto decisions with story file updates', async () => {
      // Create a story
      const storyDir = path.join(tmpDir, 'TEST-0030')
      await fs.mkdir(storyDir, { recursive: true })
      const storyPath = path.join(storyDir, 'TEST-0030.md')

      const story: StoryArtifact = {
        id: 'TEST-0030',
        title: 'Decision Integration Test',
        status: 'in-progress',
        epic: 'test',
      }
      await storyAdapter.write(storyPath, story)

      // Make decision
      const rules: DecisionRule[] = [
        {
          name: 'always-proceed',
          condition: () => true,
          answer: 'proceed',
          rationale: 'Auto-proceed for test',
        },
      ]
      const autoCallback = new AutoDecisionCallback(rules)
      const decision = await autoCallback.ask(createDecisionRequest())

      // Update story based on decision
      if (decision.answer === 'proceed') {
        await storyAdapter.update(storyPath, { status: 'ready-for-qa' })
      }

      const updated = await storyAdapter.read(storyPath)
      expect(updated.status).toBe('ready-for-qa')
    })
  })

  describe('Noop callback for automated workflows', () => {
    it('should always select first option', async () => {
      const noopCallback = new NoopDecisionCallback()

      const request = createDecisionRequest()
      const result = await noopCallback.ask(request)

      expect(result.answer).toBe('proceed')
      expect(result.cancelled).toBe(false)
      expect(result.timedOut).toBe(false)
      expect(result.id).toBe(request.id)
    })

    it('should handle multiple sequential noop decisions', async () => {
      const noopCallback = new NoopDecisionCallback()

      const results = await Promise.all([
        noopCallback.ask(createDecisionRequest()),
        noopCallback.ask(createDecisionRequest()),
        noopCallback.ask(createDecisionRequest()),
      ])

      expect(results).toHaveLength(3)
      results.forEach(r => {
        expect(r.answer).toBe('proceed')
        expect(r.cancelled).toBe(false)
      })
    })
  })

  describe('DecisionCallbackRegistry', () => {
    it('should provide built-in callbacks', () => {
      const registry = DecisionCallbackRegistry.getInstance()

      expect(registry.get('auto')).toBeDefined()
      expect(registry.get('noop')).toBeDefined()
      expect(registry.get('cli')).toBeDefined()
    })

    it('should register custom callback', () => {
      const registry = DecisionCallbackRegistry.getInstance()

      const custom = new NoopDecisionCallback()
      registry.register('custom-test', custom)

      expect(registry.get('custom-test')).toBe(custom)
    })

    it('should throw for unknown callback name', () => {
      const registry = DecisionCallbackRegistry.getInstance()

      expect(() => registry.get('nonexistent')).toThrow("Decision callback 'nonexistent' not found")
    })
  })

  describe('Decision context propagation', () => {
    it('should propagate context through decision chain', async () => {
      const contextLog: Record<string, unknown>[] = []

      const rules: DecisionRule[] = [
        {
          name: 'track-context',
          condition: ctx => {
            contextLog.push(ctx)
            return true
          },
          answer: 'proceed',
          rationale: 'Context tracking rule',
        },
      ]

      const autoCallback = new AutoDecisionCallback(rules)

      // First decision with context
      await autoCallback.ask(
        createDecisionRequest({
          context: { storyId: 'TEST-001', phase: 'setup' },
        }),
      )

      // Second decision with updated context
      await autoCallback.ask(
        createDecisionRequest({
          context: { storyId: 'TEST-001', phase: 'execute', previousDecision: 'proceed' },
        }),
      )

      expect(contextLog).toHaveLength(2)
      expect(contextLog[0]).toEqual({ storyId: 'TEST-001', phase: 'setup' })
      expect(contextLog[1]).toEqual({
        storyId: 'TEST-001',
        phase: 'execute',
        previousDecision: 'proceed',
      })
    })
  })
})
