/**
 * Integration Tests for Automatic Worktree Cleanup
 * WINT-1150 AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-10, AC-11, AC-12, AC-13
 *
 * Scenarios:
 *   (a) no-worktree: worktree_get_by_story returns null → no-op, no warning (AC-2, AC-10)
 *   (b) cleanup-succeeds: worktree found, wt-finish succeeds → merged (AC-3, AC-4, AC-10)
 *   (c) ci-failing-defer: worktree found, wt-finish fails → abandoned + unknown reason (AC-5, AC-7, AC-10, AC-12, AC-13)
 *   (d) pr-review-defer: worktree found, wt-finish fails → same as (c) per AC-12 (AC-6, AC-7, AC-12, AC-13)
 *   (e) exception-safety: unexpected error in wt-finish → flow continues, no propagation (AC-11)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  WorktreeCleanupResultSchema,
  WorktreeCleanupDeferralReasonSchema,
} from '../__types__/index'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockWorktreeGetByStory = vi.fn()
const mockWorktreeMarkComplete = vi.fn()
const mockWtFinish = vi.fn()
const mockWarn = vi.fn()

vi.mock('@repo/logger', () => ({
  logger: { warn: mockWarn, info: vi.fn() },
}))

// ---------------------------------------------------------------------------
// Inline cleanup orchestration logic (mirrors agent instruction in
// qa-verify-completion-leader.agent.md and story-update.md)
// This logic is the subject under test — it is not a module but an
// agent instruction pattern; we test it as a function here for isolation.
// ---------------------------------------------------------------------------

/**
 * cleanupWorktreeForStory
 *
 * Implements the worktree cleanup logic described in:
 *   .claude/agents/qa-verify-completion-leader.agent.md (PASS branch, Step 0)
 *   .claude/commands/story-update.md (Worktree Cleanup on Completed Transition)
 *
 * Returns a WorktreeCleanupResult indicating what happened.
 */
async function cleanupWorktreeForStory(storyId: string): Promise<string> {
  // Step 1: Look up active worktree for this story
  const worktree = await mockWorktreeGetByStory({ storyId })

  // Step 2: No active worktree → skip silently (AC-2)
  if (!worktree) {
    return 'not_found'
  }

  // Step 3: Active worktree found → invoke wt-finish (AC-3)
  let wtFinishSucceeded = false
  try {
    await mockWtFinish({ branchName: worktree.branchName, worktreePath: worktree.worktreePath })
    wtFinishSucceeded = true
  } catch {
    // Any failure → treat as 'unknown' reason per AC-12 (wt-finish has no structured output)
    wtFinishSucceeded = false
  }

  if (wtFinishSucceeded) {
    // Step 4: Success → mark merged (AC-4)
    await mockWorktreeMarkComplete({ worktreeId: worktree.id, status: 'merged' })
    return 'success'
  } else {
    // Step 5: Failure → mark abandoned + deferred metadata (AC-12, AC-13)
    await mockWorktreeMarkComplete({
      worktreeId: worktree.id,
      status: 'abandoned',
      metadata: { cleanup_deferred: true, reason: 'unknown' },
    })

    // Step 6: Emit warning per AC-7
    mockWarn(
      `WARNING: Worktree '${worktree.branchName}' at '${worktree.worktreePath}' was not cleaned up. Reason: unknown. Action: Run /wt:finish ${storyId} when ready.`,
    )

    return 'deferred'
  }
}

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const mockWorktreeRecord = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  storyId: 'WINT-1150',
  worktreePath: '/Users/dev/worktrees/WINT-1150',
  branchName: 'feature/wint-1150-worktree-cleanup',
  status: 'active' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  mergedAt: null,
  abandonedAt: null,
  metadata: {},
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Worktree Cleanup — cleanupWorktreeForStory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWorktreeMarkComplete.mockResolvedValue({ success: true })
    mockWtFinish.mockResolvedValue(undefined)
  })

  // -----------------------------------------------------------------------
  // Scenario (a): no-worktree
  // -----------------------------------------------------------------------
  describe('scenario (a): no active worktree found', () => {
    it('returns not_found and emits no warning when worktree_get_by_story returns null (AC-2, AC-10)', async () => {
      mockWorktreeGetByStory.mockResolvedValue(null)

      const result = await cleanupWorktreeForStory('WINT-1150')

      // Result
      expect(result).toBe('not_found')

      // No mark-complete call (AC-2: no-op)
      expect(mockWorktreeMarkComplete).not.toHaveBeenCalled()

      // No warning emitted
      expect(mockWarn).not.toHaveBeenCalled()

      // wt-finish not invoked
      expect(mockWtFinish).not.toHaveBeenCalled()
    })

    it('result is a valid WorktreeCleanupResultSchema value (AC-9)', async () => {
      mockWorktreeGetByStory.mockResolvedValue(null)

      const result = await cleanupWorktreeForStory('WINT-1150')
      expect(() => WorktreeCleanupResultSchema.parse(result)).not.toThrow()
    })
  })

  // -----------------------------------------------------------------------
  // Scenario (b): cleanup-succeeds
  // -----------------------------------------------------------------------
  describe('scenario (b): worktree found, wt-finish succeeds', () => {
    beforeEach(() => {
      mockWorktreeGetByStory.mockResolvedValue(mockWorktreeRecord)
      mockWtFinish.mockResolvedValue(undefined) // Success
    })

    it('invokes wt-finish with branchName and worktreePath (AC-3, AC-10)', async () => {
      await cleanupWorktreeForStory('WINT-1150')

      expect(mockWtFinish).toHaveBeenCalledWith({
        branchName: mockWorktreeRecord.branchName,
        worktreePath: mockWorktreeRecord.worktreePath,
      })
    })

    it('calls worktree_mark_complete with status merged on success (AC-4, AC-10)', async () => {
      await cleanupWorktreeForStory('WINT-1150')

      expect(mockWorktreeMarkComplete).toHaveBeenCalledWith({
        worktreeId: mockWorktreeRecord.id,
        status: 'merged',
      })
    })

    it('does not emit any warning on success (AC-7)', async () => {
      await cleanupWorktreeForStory('WINT-1150')

      expect(mockWarn).not.toHaveBeenCalled()
    })

    it('returns success (AC-10)', async () => {
      const result = await cleanupWorktreeForStory('WINT-1150')
      expect(result).toBe('success')
    })
  })

  // -----------------------------------------------------------------------
  // Scenario (c): ci-failing-defer
  // wt-finish fails (no structured output, simulated as thrown error)
  // → treated as reason 'unknown' per AC-12
  // -----------------------------------------------------------------------
  describe('scenario (c): worktree found, wt-finish fails (CI failing)', () => {
    beforeEach(() => {
      mockWorktreeGetByStory.mockResolvedValue(mockWorktreeRecord)
      mockWtFinish.mockRejectedValue(new Error('CI checks failed — cannot merge'))
    })

    it('calls worktree_mark_complete with status abandoned and deferred metadata (AC-5, AC-12, AC-13)', async () => {
      await cleanupWorktreeForStory('WINT-1150')

      expect(mockWorktreeMarkComplete).toHaveBeenCalledWith({
        worktreeId: mockWorktreeRecord.id,
        status: 'abandoned',
        metadata: { cleanup_deferred: true, reason: 'unknown' },
      })
    })

    it('emits warning containing branchName, worktreePath, and /wt:finish action (AC-7)', async () => {
      await cleanupWorktreeForStory('WINT-1150')

      expect(mockWarn).toHaveBeenCalledTimes(1)
      const warningMessage: string = mockWarn.mock.calls[0][0]

      expect(warningMessage).toContain(mockWorktreeRecord.branchName)
      expect(warningMessage).toContain(mockWorktreeRecord.worktreePath)
      expect(warningMessage).toContain('unknown')
      expect(warningMessage).toContain('/wt:finish WINT-1150')
    })

    it('maps any wt-finish failure to reason unknown (AC-12)', async () => {
      await cleanupWorktreeForStory('WINT-1150')

      const callArgs = mockWorktreeMarkComplete.mock.calls[0][0]
      expect(callArgs.metadata.reason).toBe('unknown')
    })

    it('returns deferred (AC-10, AC-13)', async () => {
      const result = await cleanupWorktreeForStory('WINT-1150')
      expect(result).toBe('deferred')
    })
  })

  // -----------------------------------------------------------------------
  // Scenario (d): pr-review-defer
  // wt-finish fails because PR is under review → same as (c) per AC-12
  // -----------------------------------------------------------------------
  describe('scenario (d): worktree found, wt-finish fails (PR review pending)', () => {
    beforeEach(() => {
      mockWorktreeGetByStory.mockResolvedValue(mockWorktreeRecord)
      mockWtFinish.mockRejectedValue(new Error('PR is pending review — cannot close'))
    })

    it('treats PR-review failure as reason unknown per AC-12 (AC-6, AC-12)', async () => {
      await cleanupWorktreeForStory('WINT-1150')

      const callArgs = mockWorktreeMarkComplete.mock.calls[0][0]
      expect(callArgs.metadata.reason).toBe('unknown')
    })

    it('calls worktree_mark_complete with abandoned + deferred metadata (AC-13)', async () => {
      await cleanupWorktreeForStory('WINT-1150')

      expect(mockWorktreeMarkComplete).toHaveBeenCalledWith({
        worktreeId: mockWorktreeRecord.id,
        status: 'abandoned',
        metadata: { cleanup_deferred: true, reason: 'unknown' },
      })
    })

    it('emits warning with /wt:finish action for PR-review failure (AC-7)', async () => {
      await cleanupWorktreeForStory('WINT-1150')

      expect(mockWarn).toHaveBeenCalledTimes(1)
      const warningMessage: string = mockWarn.mock.calls[0][0]
      expect(warningMessage).toContain('/wt:finish WINT-1150')
      expect(warningMessage).toContain('unknown')
    })
  })

  // -----------------------------------------------------------------------
  // Scenario (e): exception-safety (AC-11)
  // Unexpected error in wt-finish → cleanup defers, PASS flow continues
  // -----------------------------------------------------------------------
  describe('scenario (e): unexpected exception in wt-finish', () => {
    it('does not propagate exceptions — flow continues (AC-11)', async () => {
      mockWorktreeGetByStory.mockResolvedValue(mockWorktreeRecord)
      mockWtFinish.mockRejectedValue(new Error('Unexpected network timeout'))

      // Must not throw
      await expect(cleanupWorktreeForStory('WINT-1150')).resolves.not.toThrow()
    })

    it('still marks worktree abandoned when exception occurs (AC-11, AC-13)', async () => {
      mockWorktreeGetByStory.mockResolvedValue(mockWorktreeRecord)
      mockWtFinish.mockRejectedValue(new Error('Unexpected network timeout'))

      await cleanupWorktreeForStory('WINT-1150')

      expect(mockWorktreeMarkComplete).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'abandoned', metadata: expect.objectContaining({ cleanup_deferred: true }) }),
      )
    })

    it('emits warning even for unexpected exceptions (AC-7)', async () => {
      mockWorktreeGetByStory.mockResolvedValue(mockWorktreeRecord)
      mockWtFinish.mockRejectedValue(new Error('Unexpected network timeout'))

      await cleanupWorktreeForStory('WINT-1150')

      expect(mockWarn).toHaveBeenCalledTimes(1)
    })

    it('returns deferred (not throws) on unexpected exception (AC-11)', async () => {
      mockWorktreeGetByStory.mockResolvedValue(mockWorktreeRecord)
      mockWtFinish.mockRejectedValue(new Error('Unexpected network timeout'))

      const result = await cleanupWorktreeForStory('WINT-1150')
      expect(result).toBe('deferred')
    })
  })

  // -----------------------------------------------------------------------
  // Schema validation (AC-9)
  // -----------------------------------------------------------------------
  describe('Zod schema validation (AC-9)', () => {
    it('WorktreeCleanupResultSchema accepts all valid values', () => {
      expect(() => WorktreeCleanupResultSchema.parse('success')).not.toThrow()
      expect(() => WorktreeCleanupResultSchema.parse('deferred')).not.toThrow()
      expect(() => WorktreeCleanupResultSchema.parse('skipped')).not.toThrow()
      expect(() => WorktreeCleanupResultSchema.parse('not_found')).not.toThrow()
    })

    it('WorktreeCleanupResultSchema rejects invalid values', () => {
      expect(() => WorktreeCleanupResultSchema.parse('failed')).toThrow()
      expect(() => WorktreeCleanupResultSchema.parse('')).toThrow()
      expect(() => WorktreeCleanupResultSchema.parse(null)).toThrow()
    })

    it('WorktreeCleanupDeferralReasonSchema accepts all valid values', () => {
      expect(() => WorktreeCleanupDeferralReasonSchema.parse('ci_failing')).not.toThrow()
      expect(() => WorktreeCleanupDeferralReasonSchema.parse('pr_review_pending')).not.toThrow()
      expect(() => WorktreeCleanupDeferralReasonSchema.parse('user_requested')).not.toThrow()
      expect(() => WorktreeCleanupDeferralReasonSchema.parse('unknown')).not.toThrow()
    })

    it('WorktreeCleanupDeferralReasonSchema rejects invalid values', () => {
      expect(() => WorktreeCleanupDeferralReasonSchema.parse('timeout')).toThrow()
      expect(() => WorktreeCleanupDeferralReasonSchema.parse('')).toThrow()
      expect(() => WorktreeCleanupDeferralReasonSchema.parse(123)).toThrow()
    })
  })
})
