/**
 * Unit tests for createCLIDecisionCallbackAdapter
 *
 * Covers all 4 decision paths:
 *   1. approve — prompts for flow selection, returns confirmedFlowIds/rejectedFlowIds
 *   2. edit    — no follow-up, returns all flows rejected
 *   3. reject  — prompts for reason, returns decision=reject
 *   4. defer   — prompts for reason, returns decision=defer
 *
 * Also verifies prompt format (plan slug header, flow summaries, warnings, errors).
 *
 * AC-3: Unit tests for bridge adapter
 * APRS-5040: ST-3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createCLIDecisionCallbackAdapter } from '../cli-decision-callback-adapter.js'
import type { DecisionContext } from '../../../nodes/plan-refinement/human-review-checkpoint.js'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock inquirer
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}))

import inquirer from 'inquirer'
import { logger } from '@repo/logger'

// ============================================================================
// Test Fixtures
// ============================================================================

const SAMPLE_FLOWS = [
  {
    id: 'flow-1',
    name: 'User Creates Plan',
    actor: 'Admin',
    trigger: 'User clicks create',
    steps: [{ index: 1, description: 'Open form' }, { index: 2, description: 'Submit' }],
    successOutcome: 'Plan created',
    source: 'user' as const,
    confidence: 0.9,
    status: 'unconfirmed' as const,
  },
  {
    id: 'flow-2',
    name: 'User Views Dashboard',
    actor: 'User',
    trigger: 'Login',
    steps: [{ index: 1, description: 'Navigate to dashboard' }],
    successOutcome: 'Dashboard displayed',
    source: 'inferred' as const,
    confidence: 0.7,
    status: 'unconfirmed' as const,
  },
]

const BASE_CONTEXT: DecisionContext = {
  planSlug: 'test-plan',
  flows: SAMPLE_FLOWS,
  warnings: [],
  errors: [],
}

// ============================================================================
// Tests
// ============================================================================

describe('createCLIDecisionCallbackAdapter', () => {
  let writeSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  })

  afterEach(() => {
    writeSpy.mockRestore()
  })

  describe('factory function', () => {
    it('returns an object with an ask() method', () => {
      const adapter = createCLIDecisionCallbackAdapter()
      expect(typeof adapter.ask).toBe('function')
    })
  })

  describe('approve path', () => {
    it('returns approve decision with confirmed and rejected flow IDs', async () => {
      const adapter = createCLIDecisionCallbackAdapter()

      // First prompt: decision list → approve
      // Second prompt: checkbox → select only flow-1
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ decision: 'approve' })
        .mockResolvedValueOnce({ confirmedFlowIds: ['flow-1'] })

      const result = await adapter.ask(BASE_CONTEXT)

      expect(result.decision).toBe('approve')
      expect(result.confirmedFlowIds).toEqual(['flow-1'])
      expect(result.rejectedFlowIds).toEqual(['flow-2'])
    })

    it('confirms all flows when all checkboxes checked', async () => {
      const adapter = createCLIDecisionCallbackAdapter()

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ decision: 'approve' })
        .mockResolvedValueOnce({ confirmedFlowIds: ['flow-1', 'flow-2'] })

      const result = await adapter.ask(BASE_CONTEXT)

      expect(result.decision).toBe('approve')
      expect(result.confirmedFlowIds).toEqual(['flow-1', 'flow-2'])
      expect(result.rejectedFlowIds).toEqual([])
    })

    it('handles approve with no flows — skips checkbox prompt', async () => {
      const adapter = createCLIDecisionCallbackAdapter()
      const noFlowsContext: DecisionContext = { ...BASE_CONTEXT, flows: [] }

      // Only one prompt call needed (the list)
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ decision: 'approve' })

      const result = await adapter.ask(noFlowsContext)

      // When no flows, the adapter returns approve with empty arrays
      expect(result.decision).toBe('approve')
      // inquirer.prompt was only called once (no checkbox prompt)
      expect(vi.mocked(inquirer.prompt)).toHaveBeenCalledTimes(1)
    })

    it('logs approve decision to logger', async () => {
      const adapter = createCLIDecisionCallbackAdapter()

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ decision: 'approve' })
        .mockResolvedValueOnce({ confirmedFlowIds: ['flow-1'] })

      await adapter.ask(BASE_CONTEXT)

      expect(logger.info).toHaveBeenCalledWith(
        'plan-refinement CLI: approve decision confirmed',
        expect.objectContaining({
          planSlug: 'test-plan',
          confirmedFlowIds: ['flow-1'],
        }),
      )
    })
  })

  describe('edit path', () => {
    it('returns edit decision with empty confirmedFlowIds', async () => {
      const adapter = createCLIDecisionCallbackAdapter()

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ decision: 'edit' })

      const result = await adapter.ask(BASE_CONTEXT)

      expect(result.decision).toBe('edit')
      expect(result.confirmedFlowIds).toEqual([])
      // rejectedFlowIds should be all flow IDs
      expect(result.rejectedFlowIds).toEqual(['flow-1', 'flow-2'])
    })

    it('only calls inquirer.prompt once for edit (no follow-up)', async () => {
      const adapter = createCLIDecisionCallbackAdapter()

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ decision: 'edit' })

      await adapter.ask(BASE_CONTEXT)

      expect(vi.mocked(inquirer.prompt)).toHaveBeenCalledTimes(1)
    })
  })

  describe('reject path', () => {
    it('returns reject decision with reason', async () => {
      const adapter = createCLIDecisionCallbackAdapter()

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ decision: 'reject' })
        .mockResolvedValueOnce({ reason: 'Plan is not viable' })

      const result = await adapter.ask(BASE_CONTEXT)

      expect(result.decision).toBe('reject')
      expect(result.reason).toBe('Plan is not viable')
    })

    it('returns reject decision with undefined reason when empty string given', async () => {
      const adapter = createCLIDecisionCallbackAdapter()

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ decision: 'reject' })
        .mockResolvedValueOnce({ reason: '' })

      const result = await adapter.ask(BASE_CONTEXT)

      expect(result.decision).toBe('reject')
      expect(result.reason).toBeUndefined()
    })

    it('logs reject decision to logger', async () => {
      const adapter = createCLIDecisionCallbackAdapter()

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ decision: 'reject' })
        .mockResolvedValueOnce({ reason: 'Not viable' })

      await adapter.ask(BASE_CONTEXT)

      expect(logger.info).toHaveBeenCalledWith(
        'plan-refinement CLI: reject decision confirmed',
        expect.objectContaining({ planSlug: 'test-plan' }),
      )
    })
  })

  describe('defer path', () => {
    it('returns defer decision with reason', async () => {
      const adapter = createCLIDecisionCallbackAdapter()

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ decision: 'defer' })
        .mockResolvedValueOnce({ reason: 'Waiting for stakeholder' })

      const result = await adapter.ask(BASE_CONTEXT)

      expect(result.decision).toBe('defer')
      expect(result.reason).toBe('Waiting for stakeholder')
    })

    it('logs defer decision to logger', async () => {
      const adapter = createCLIDecisionCallbackAdapter()

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ decision: 'defer' })
        .mockResolvedValueOnce({ reason: 'TBD' })

      await adapter.ask(BASE_CONTEXT)

      expect(logger.info).toHaveBeenCalledWith(
        'plan-refinement CLI: defer decision confirmed',
        expect.objectContaining({ planSlug: 'test-plan' }),
      )
    })
  })

  describe('prompt format', () => {
    it('prints plan slug in header output', async () => {
      const adapter = createCLIDecisionCallbackAdapter()

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ decision: 'edit' })

      await adapter.ask(BASE_CONTEXT)

      // Check that stdout.write was called with plan slug
      const allWrites = writeSpy.mock.calls.map(call => call[0] as string).join('')
      expect(allWrites).toContain('test-plan')
    })

    it('prints flow IDs and names in output', async () => {
      const adapter = createCLIDecisionCallbackAdapter()

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ decision: 'edit' })

      await adapter.ask(BASE_CONTEXT)

      const allWrites = writeSpy.mock.calls.map(call => call[0] as string).join('')
      expect(allWrites).toContain('flow-1')
      expect(allWrites).toContain('User Creates Plan')
      expect(allWrites).toContain('flow-2')
      expect(allWrites).toContain('User Views Dashboard')
    })

    it('prints warnings when present', async () => {
      const adapter = createCLIDecisionCallbackAdapter()
      const contextWithWarnings: DecisionContext = {
        ...BASE_CONTEXT,
        warnings: ['Critical: missing auth flow'],
      }

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ decision: 'edit' })

      await adapter.ask(contextWithWarnings)

      const allWrites = writeSpy.mock.calls.map(call => call[0] as string).join('')
      expect(allWrites).toContain('Critical: missing auth flow')
    })

    it('prints errors when present', async () => {
      const adapter = createCLIDecisionCallbackAdapter()
      const contextWithErrors: DecisionContext = {
        ...BASE_CONTEXT,
        errors: ['LLM failed: timeout'],
      }

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ decision: 'edit' })

      await adapter.ask(contextWithErrors)

      const allWrites = writeSpy.mock.calls.map(call => call[0] as string).join('')
      expect(allWrites).toContain('LLM failed: timeout')
    })

    it('calls inquirer.prompt with 4 choices for the decision list', async () => {
      const adapter = createCLIDecisionCallbackAdapter()

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ decision: 'edit' })

      await adapter.ask(BASE_CONTEXT)

      expect(vi.mocked(inquirer.prompt)).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'list',
          name: 'decision',
          choices: expect.arrayContaining([
            expect.objectContaining({ value: 'approve' }),
            expect.objectContaining({ value: 'edit' }),
            expect.objectContaining({ value: 'reject' }),
            expect.objectContaining({ value: 'defer' }),
          ]),
        }),
      ])
    })
  })

  describe('Ctrl+C / interruption handling', () => {
    it('defaults to defer when primary prompt is interrupted', async () => {
      const adapter = createCLIDecisionCallbackAdapter()

      vi.mocked(inquirer.prompt).mockRejectedValueOnce(new Error('User interrupted'))

      const result = await adapter.ask(BASE_CONTEXT)

      expect(result.decision).toBe('defer')
      expect(result.reason).toBe('Decision interrupted by user')
    })

    it('approves all flows when checkbox selection is interrupted', async () => {
      const adapter = createCLIDecisionCallbackAdapter()

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ decision: 'approve' })
        .mockRejectedValueOnce(new Error('Interrupted'))

      const result = await adapter.ask(BASE_CONTEXT)

      expect(result.decision).toBe('approve')
      expect(result.confirmedFlowIds).toEqual(['flow-1', 'flow-2'])
      expect(result.rejectedFlowIds).toEqual([])
    })
  })
})
