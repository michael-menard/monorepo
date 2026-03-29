/**
 * StoryTransitionService
 *
 * Shared helper for LangGraph nodes to claim and advance story states with
 * optional artifact pre-condition enforcement (AUDIT-2 finding A2-001).
 *
 * Graceful degradation:
 * - If storyRepo is not injected, transitions are skipped with a warning log.
 * - If workflowRepo is not injected, artifact gate checks are skipped with a warning.
 * - ArtifactGateError signals a blocked (not failed) story.
 */

import { logger } from '@repo/logger'
import type { StoryRepository } from './story-repository.js'
import type { WorkflowRepository } from './workflow-repository.js'
import type { StoryState } from '../state/enums/story-state.js'

// ============================================================================
// Artifact Gate Map (A2-001)
// ============================================================================

/**
 * States that require a persisted artifact before the transition is allowed.
 *
 * Canonical forward-flow gates:
 * - needs_code_review: dev must have submitted proof (evidence/EVIDENCE.yaml)
 * - ready_for_qa:      code review artifact required before opening QA
 * - in_qa:             code review must exist before QA agent actively runs
 * - completed:         QA verification artifact required to close the story
 *
 * Ghost states and recovery states (failed_*, blocked, cancelled) are exempt
 * via Partial<Record<StoryState, ...>> — no gate key means no enforcement.
 */
export const ARTIFACT_GATES: Partial<Record<StoryState, { type: string; label: string }>> = {
  needs_code_review: { type: 'proof', label: 'Dev proof (evidence)' },
  ready_for_qa: { type: 'review', label: 'Code review' },
  in_qa: { type: 'review', label: 'Code review' },
  completed: { type: 'qa_verify', label: 'QA verification' },
}

// ============================================================================
// ArtifactGateError
// ============================================================================

export class ArtifactGateError extends Error {
  constructor(
    message: string,
    public readonly storyId: string,
    public readonly toState: StoryState,
    public readonly missingArtifact: string,
  ) {
    super(message)
    this.name = 'ArtifactGateError'
  }
}

// ============================================================================
// StoryTransitionService
// ============================================================================

export class StoryTransitionService {
  constructor(
    private storyRepo: StoryRepository,
    private workflowRepo?: WorkflowRepository,
  ) {}

  /**
   * Claim a story by transitioning to a new state.
   * No artifact gate — claiming is unconditional (e.g., ready → in_progress).
   */
  async claim(storyId: string, toState: StoryState, actor: string, reason?: string): Promise<void> {
    await this.storyRepo.updateStoryState(storyId, toState, actor, reason)
    logger.info('Story claimed', { storyId, toState, actor })
  }

  /**
   * Advance a story state with artifact gate enforcement.
   * Used for "complete" transitions that require proof of work.
   * Throws ArtifactGateError if the required artifact is missing.
   */
  async advance(
    storyId: string,
    toState: StoryState,
    actor: string,
    reason?: string,
  ): Promise<void> {
    await this.assertArtifactExists(storyId, toState)
    await this.storyRepo.updateStoryState(storyId, toState, actor, reason)
    logger.info('Story advanced', { storyId, toState, actor })
  }

  /**
   * Assert that the required artifact exists before advancing to toState.
   * Skips the check if workflowRepo is not injected (graceful degradation).
   */
  private async assertArtifactExists(storyId: string, toState: StoryState): Promise<void> {
    const gate = ARTIFACT_GATES[toState]
    if (!gate) return

    if (!this.workflowRepo) {
      logger.warn('workflowRepo not injected — skipping artifact gate check', { storyId, toState })
      return
    }

    let exists = false

    if (gate.type === 'proof') {
      const proof = await this.workflowRepo.getLatestProof(storyId)
      exists = proof !== null
    } else {
      const verification = await this.workflowRepo.getLatestVerification(
        storyId,
        gate.type as 'qa_verify' | 'review' | 'uat',
      )
      exists = verification !== null
    }

    if (!exists) {
      throw new ArtifactGateError(
        `Cannot advance to ${toState}: missing artifact '${gate.label}' for story ${storyId}`,
        storyId,
        toState,
        gate.label,
      )
    }
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createStoryTransitionService(
  storyRepo: StoryRepository,
  workflowRepo?: WorkflowRepository,
): StoryTransitionService {
  return new StoryTransitionService(storyRepo, workflowRepo)
}
