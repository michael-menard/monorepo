import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DecisionCallbackRegistry } from '../registry.js'
import { AutoDecisionCallback } from '../auto-callback.js'
import { NoopDecisionCallback } from '../noop-callback.js'
import type { DecisionRequest, DecisionCallback } from '../types.js'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('Decision Callback Integration', () => {
  let registry: DecisionCallbackRegistry
  let originalAuto: DecisionCallback
  let originalNoop: DecisionCallback

  beforeEach(() => {
    registry = DecisionCallbackRegistry.getInstance()
    // Save original callbacks
    originalAuto = registry.get('auto')
    originalNoop = registry.get('noop')
  })

  afterEach(() => {
    // Restore original callbacks to prevent test pollution
    registry.register('auto', originalAuto)
    registry.register('noop', originalNoop)
  })

  describe('Graph Configuration Pattern', () => {
    it('should support passing callback via config object', async () => {
      // Simulate graph config
      const graphConfig = {
        decisionCallback: registry.get('auto'),
      }

      // Simulate node asking for decision
      const request: DecisionRequest = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'single-choice',
        question: 'How to handle this gap?',
        options: [
          { value: 'add_ac', label: 'Add as AC' },
          { value: 'skip', label: 'Skip' },
        ],
        context: { gapType: 'minor' },
        timeout_ms: 5000,
      }

      const response = await graphConfig.decisionCallback.ask(request)

      expect(response.id).toBe(request.id)
      expect(response.cancelled).toBe(false)
      expect(response.timedOut).toBe(false)
    })
  })

  describe('Auto-Decision Workflow', () => {
    it('should complete workflow without user interaction', async () => {
      const rules = [
        {
          name: 'skip-minor-gaps',
          condition: (ctx: Record<string, unknown>) => ctx.gapType === 'minor',
          answer: 'skip',
          rationale: 'Minor gaps are skipped automatically',
        },
        {
          name: 'add-major-gaps',
          condition: (ctx: Record<string, unknown>) => ctx.gapType === 'major',
          answer: 'add_ac',
          rationale: 'Major gaps are added as ACs',
        },
      ]

      const autoCallback = new AutoDecisionCallback(rules, 'skip')
      registry.register('auto', autoCallback)

      // Workflow state
      const workflowState = {
        gaps: [
          { id: 1, type: 'minor', description: 'Minor gap' },
          { id: 2, type: 'major', description: 'Major gap' },
        ],
        decisions: [] as Array<{ gapId: number; decision: string }>,
      }

      // Simulate workflow processing gaps
      for (const gap of workflowState.gaps) {
        const request: DecisionRequest = {
          id: `gap-${gap.id}`,
          type: 'single-choice',
          question: `How to handle gap: ${gap.description}?`,
          options: [
            { value: 'add_ac', label: 'Add as AC' },
            { value: 'skip', label: 'Skip' },
          ],
          context: { gapType: gap.type },
          timeout_ms: 5000,
        }

        const callback = registry.get('auto')
        const response = await callback.ask(request)

        workflowState.decisions.push({
          gapId: gap.id,
          decision: response.answer as string,
        })
      }

      // Verify workflow completed with correct decisions
      expect(workflowState.decisions).toHaveLength(2)
      expect(workflowState.decisions[0].decision).toBe('skip')
      expect(workflowState.decisions[1].decision).toBe('add_ac')
    })
  })

  describe('Noop Mode Workflow', () => {
    it('should auto-select first option for all decisions', async () => {
      const noopCallback = new NoopDecisionCallback()
      registry.register('noop', noopCallback)

      const requests: DecisionRequest[] = [
        {
          id: 'decision-1',
          type: 'single-choice',
          question: 'First decision?',
          options: [
            { value: 'opt1', label: 'Option 1' },
            { value: 'opt2', label: 'Option 2' },
          ],
          timeout_ms: 5000,
        },
        {
          id: 'decision-2',
          type: 'single-choice',
          question: 'Second decision?',
          options: [
            { value: 'optA', label: 'Option A' },
            { value: 'optB', label: 'Option B' },
          ],
          timeout_ms: 5000,
        },
      ]

      const callback = registry.get('noop')
      const responses = await Promise.all(
        requests.map((req) => callback.ask(req)),
      )

      expect(responses[0].answer).toBe('opt1')
      expect(responses[1].answer).toBe('optA')
      expect(responses.every((r) => !r.cancelled && !r.timedOut)).toBe(true)
    })
  })

  describe('Callback Switching', () => {
    it('should support switching callback modes mid-workflow', async () => {
      const decisions: string[] = []

      // Start with auto callback
      const autoCallback = new AutoDecisionCallback(
        [
          {
            name: 'always-approve',
            condition: () => true,
            answer: 'approve',
            rationale: 'Auto-approve all',
          },
        ],
        'approve',
      )
      registry.register('auto', autoCallback)

      let callback = registry.get('auto')
      const response1 = await callback.ask({
        id: 'decision-1',
        type: 'single-choice',
        question: 'Approve?',
        options: [
          { value: 'approve', label: 'Approve' },
          { value: 'reject', label: 'Reject' },
        ],
        timeout_ms: 5000,
      })
      decisions.push(response1.answer as string)

      // Switch to noop callback
      callback = registry.get('noop')
      const response2 = await callback.ask({
        id: 'decision-2',
        type: 'single-choice',
        question: 'Continue?',
        options: [
          { value: 'continue', label: 'Continue' },
          { value: 'stop', label: 'Stop' },
        ],
        timeout_ms: 5000,
      })
      decisions.push(response2.answer as string)

      expect(decisions).toEqual(['approve', 'continue'])
    })
  })

  describe('Error Handling in Workflow', () => {
    it('should handle timeout gracefully in workflow', async () => {
      // Create fresh callback with no matching rules so it uses first option
      const freshAutoCallback = new AutoDecisionCallback([], undefined)
      registry.register('timeout-test', freshAutoCallback)

      const callback = registry.get('timeout-test')

      const request: DecisionRequest = {
        id: 'timeout-test',
        type: 'single-choice',
        question: 'Timeout test?',
        options: [
          { value: 'default', label: 'Default' },
          { value: 'other', label: 'Other' },
        ],
        context: {},
        timeout_ms: 1, // Very short timeout (auto-decision completes synchronously anyway)
      }

      const response = await callback.ask(request)

      // Auto callback should complete without timeout
      expect(response.timedOut).toBe(false)
      expect(response.answer).toBe('default')
    })

    it('should handle cancelled decision in workflow', async () => {
      const callback = new AutoDecisionCallback([], undefined)

      const request: DecisionRequest = {
        id: 'cancel-test',
        type: 'single-choice',
        question: 'Cancel test?',
        options: [{ value: 'proceed', label: 'Proceed' }],
        context: {},
        timeout_ms: 5000,
      }

      const response = await callback.ask(request)

      // Auto callback never cancels
      expect(response.cancelled).toBe(false)
    })
  })

  describe('Context Propagation', () => {
    it('should propagate workflow context to decision rules', async () => {
      const rules = [
        {
          name: 'check-story-state',
          condition: (ctx: Record<string, unknown>) => {
            const state = ctx.storyState as { status: string } | undefined
            return state?.status === 'ready_for_qa'
          },
          answer: 'deploy',
          rationale: 'Story is ready for deployment',
        },
      ]

      const callback = new AutoDecisionCallback(rules, 'skip')
      registry.register('contextual', callback)

      const request: DecisionRequest = {
        id: 'context-test',
        type: 'single-choice',
        question: 'Deploy?',
        options: [
          { value: 'deploy', label: 'Deploy' },
          { value: 'skip', label: 'Skip' },
        ],
        context: {
          storyState: {
            status: 'ready_for_qa',
            storyId: 'LNGG-0030',
          },
        },
        timeout_ms: 5000,
      }

      const response = await registry.get('contextual').ask(request)

      expect(response.answer).toBe('deploy')
    })
  })
})
