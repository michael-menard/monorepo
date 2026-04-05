/**
 * Phase Mapping — Legacy CHECKPOINT.yaml to LangGraph Node Names
 *
 * Translates legacy CHECKPOINT.yaml `current_phase` string values (Phase enum)
 * to the equivalent LangGraph node names in story-creation.ts.
 *
 * AC-008: resume_from phase number from legacy CHECKPOINT.yaml semantics translates
 * to a LangGraph thread checkpoint at the equivalent graph phase.
 *
 * ARCH-002 decision: Phase string keys (Record<Phase, string>) — not integers.
 * CheckpointSchema.current_phase is a Phase string enum.
 * Grounded in actual Phase enum from packages/backend/orchestrator/src/artifacts/checkpoint.ts.
 *
 * GAP-002 resolution: Mapping uses Phase string keys verified against story-creation.ts node names:
 * - 'setup' -> 'initialize' (first node in graph)
 * - 'plan' -> 'seed' (seed generates the story structure = plan phase)
 * - 'execute' -> 'synthesis' (synthesis = execution of story creation)
 * - 'proof' -> 'save_to_db' (proof phase = persistence of results)
 * - 'review' -> 'hitl' (human-in-the-loop review)
 * - 'fix' -> 'seed' (fix phase = re-seed with corrections)
 * - 'qa-setup' -> 'gap_hygiene' (QA setup = gap hygiene analysis)
 * - 'qa-verify' -> 'readiness_scoring' (QA verification = readiness check)
 * - 'qa-complete' -> 'complete' (QA done = workflow complete)
 * - 'done' -> 'complete' (workflow done)
 *
 * HP-6: PHASE_TO_CHECKPOINT_MAP exported; translatePhaseToNode unit tested.
 */

import type { Phase } from '../artifacts/checkpoint.js'
import type { PipelinePhase } from '../state/pipeline-orchestrator-v2-state.js'

/**
 * Mapping from legacy CHECKPOINT.yaml Phase strings to LangGraph node names.
 *
 * The value is the LangGraph node name at which the graph should resume when
 * the legacy checkpoint reports that phase. Resumption happens at the NEXT
 * node after the one that completed (handled by resume-graph CLI).
 *
 * Node names correspond to nodes defined in createStoryCreationGraph() in
 * packages/backend/orchestrator/src/graphs/story-creation.ts.
 */
export const PHASE_TO_CHECKPOINT_MAP: Record<Phase, string> = {
  /**
   * 'setup': Initial configuration and validation node.
   * Maps to 'initialize' — the entry point of the story creation graph.
   */
  setup: 'initialize',

  /**
   * 'plan': Story planning phase.
   * Maps to 'seed' — the story seed generation node that creates the story structure.
   */
  plan: 'seed',

  /**
   * 'execute': Implementation / execution phase.
   * Maps to 'synthesis' — the story synthesis node that produces the final story.
   */
  execute: 'synthesis',

  /**
   * 'proof': Proof/evidence collection phase.
   * Maps to 'save_to_db' — the persistence node that saves synthesized story to DB.
   */
  proof: 'save_to_db',

  /**
   * 'review': Code/content review phase.
   * Maps to 'hitl' — the Human-in-the-Loop decision node.
   */
  review: 'hitl',

  /**
   * 'fix': Fix/correction phase (typically follows a failed review).
   * Maps to 'seed' — returns to seed node to regenerate story structure with corrections.
   */
  fix: 'seed',

  /**
   * 'qa-setup': QA preparation phase.
   * Maps to 'gap_hygiene' — the gap hygiene analysis node.
   */
  'qa-setup': 'gap_hygiene',

  /**
   * 'qa-verify': QA verification phase.
   * Maps to 'readiness_scoring' — the readiness scoring node that evaluates story quality.
   */
  'qa-verify': 'readiness_scoring',

  /**
   * 'qa-complete': QA completion phase.
   * Maps to 'complete' — the terminal completion node.
   */
  'qa-complete': 'complete',

  /**
   * 'qa-completion': Legacy variant of 'qa-complete'.
   * Maps to 'complete' — the terminal completion node.
   */
  'qa-completion': 'complete',

  /**
   * 'uat-complete': Legacy UAT completion variant.
   * Maps to 'complete' — the terminal completion node.
   */
  'uat-complete': 'complete',

  /**
   * 'done': Workflow fully done.
   * Maps to 'complete' — the terminal completion node.
   */
  done: 'complete',
}

// ============================================================================
// Orchestrator V2 Phase → Node Mapping
// ============================================================================

/**
 * Mapping from pipeline orchestrator V2 PipelinePhase values to graph node names.
 *
 * Used by the resume handler to determine which orchestrator node corresponds
 * to the checkpoint phase. The node name is the graph node that completed
 * when this checkpoint was written.
 *
 * Node names correspond to nodes defined in createPipelineOrchestratorV2Graph()
 * in apps/api/workflow/src/graphs/pipeline-orchestrator-v2.ts.
 */
export const ORCHESTRATOR_PHASE_TO_NODE_MAP: Record<PipelinePhase, string> = {
  preflight: 'preflight_checks',
  routing: 'route_input',
  plan_refinement: 'plan_refinement',
  story_generation: 'story_generation',
  story_picking: 'story_picker',
  worktree_setup: 'create_worktree',
  dev_implement: 'dev_implement',
  commit_push: 'commit_push',
  review: 'review',
  review_decision: 'review_decision',
  create_pr: 'create_pr',
  qa_verify: 'qa_verify',
  qa_decision: 'qa_decision',
  merge_cleanup: 'merge_cleanup',
  post_completion: 'post_completion',
  block_story: 'block_story',
  pipeline_complete: 'pipeline_complete',
  pipeline_stalled: 'pipeline_stalled',
}

/**
 * Translates an orchestrator V2 PipelinePhase to the corresponding graph node name.
 *
 * @param phase - PipelinePhase value from orchestrator V2 state
 * @returns Graph node name, or null if the phase is not in the mapping
 */
export function translateOrchestratorPhaseToNode(phase: PipelinePhase): string | null {
  return ORCHESTRATOR_PHASE_TO_NODE_MAP[phase] ?? null
}

/**
 * Given a completed orchestrator node name, determines the next node in the
 * linear pipeline sequence that should be resumed.
 *
 * For nodes with conditional edges (review_decision, qa_decision, story_picker),
 * returns null — the graph's own routing logic handles those.
 */
export function getNextOrchestratorNode(completedNode: string): string | null {
  const linearSequence: Record<string, string> = {
    preflight_checks: 'route_input',
    route_input: 'story_picker',
    // story_picker has conditional edges — handled by graph routing
    create_worktree: 'dev_implement',
    dev_implement: 'commit_push',
    commit_push: 'review',
    review: 'review_decision',
    // review_decision has conditional edges
    create_pr: 'qa_verify',
    qa_verify: 'qa_decision',
    // qa_decision has conditional edges
    merge_cleanup: 'post_completion',
    post_completion: 'story_picker',
    block_story: 'story_picker',
  }

  return linearSequence[completedNode] ?? null
}

/**
 * Translates a legacy Phase string to the corresponding LangGraph node name.
 *
 * AC-008: Used by resume-graph CLI to determine which LangGraph node corresponds
 * to the legacy resume_from phase value.
 *
 * @param phase - Phase string from legacy CHECKPOINT.yaml current_phase
 * @returns LangGraph node name, or null if the phase is not in the mapping
 *
 * @example
 * translatePhaseToNode('plan')      // -> 'seed'
 * translatePhaseToNode('execute')   // -> 'synthesis'
 * translatePhaseToNode('setup')     // -> 'initialize'
 */
export function translatePhaseToNode(phase: Phase): string | null {
  return PHASE_TO_CHECKPOINT_MAP[phase] ?? null
}
