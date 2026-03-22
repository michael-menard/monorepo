/**
 * Story Scope Defend Node
 *
 * Devil's Advocate agent that challenges non-MVP scope during elaboration.
 * Produces scope-challenges.json for downstream Round Table synthesis.
 * Ports the scope-defender Claude Code agent to a native LangGraph node.
 *
 * WINT-9040: LangGraph Story Node - Scope Defend
 * WINT-8060: Integrate scope-defender with Backlog (KB task writes)
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { z } from 'zod'
import { logger } from '@repo/logger'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'
import { updateState } from '../../runner/state-helpers.js'
import {
  RecommendationSchema,
  RiskIfDeferredSchema,
  ScopeChallengeSchema,
  ScopeChallengesSchema,
  type RiskIfDeferred,
  type ScopeChallenge,
  type ScopeChallenges,
} from '../../artifacts/scope-challenges.js'

// Re-export canonical types for backward compatibility
export {
  RecommendationSchema,
  RiskIfDeferredSchema,
  ScopeChallengeSchema,
  ScopeChallengesSchema,
  type RiskIfDeferred,
  type ScopeChallenge,
}
export type ScopeChallengeRecommendation = z.infer<typeof RecommendationSchema>
export type ScopeChallengesOutput = ScopeChallenges

// ============================================================================
// KbAddTaskFn type — injectable for backlog writes (WINT-8060)
// ============================================================================

/**
 * Input shape for kb_add_task, matching task-operations.ts KbAddTaskInputSchema.
 */
export const KbAddTaskInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  source_story_id: z.string().nullable().optional(),
  source_phase: z.string().nullable().optional(),
  source_agent: z.string().nullable().optional(),
  task_type: z.enum(['follow_up', 'improvement', 'bug', 'tech_debt', 'feature_idea']),
  tags: z.array(z.string()).nullable().optional(),
})

export type KbAddTaskInput = z.infer<typeof KbAddTaskInputSchema>

/**
 * Injectable function type for creating KB tasks.
 * Matches the signature of kb_add_task MCP tool handler.
 */
export type KbAddTaskFn = (input: KbAddTaskInput) => Promise<{ id: string } | null>

/**
 * Injectable function type for listing KB tasks (used for idempotency checks).
 */
export type KbListTasksFn = (params: {
  source_story_id?: string
  tags?: string[]
  limit?: number
}) => Promise<Array<{ id: string; title: string; tags: string[] | null }>>

// ============================================================================
// Node-local state extension schemas
// ============================================================================

/**
 * A single acceptance criterion item.
 */
export const AcceptanceCriterionItemSchema = z.object({
  /** AC identifier (e.g. "AC-1") */
  id: z.string().min(1),
  /** AC description text */
  description: z.string().min(1),
  /** Whether this AC is MVP-critical */
  mvp_critical: z.boolean().optional(),
})

export type AcceptanceCriterionItem = z.infer<typeof AcceptanceCriterionItemSchema>

/**
 * Story brief with title, goal, and context.
 */
export const StoryBriefSchema = z.object({
  title: z.string().min(1),
  goal: z.string().min(1),
  context: z.string(),
})

export type StoryBrief = z.infer<typeof StoryBriefSchema>

/**
 * Gap analysis with MVP-critical and blocking item IDs.
 * Uses passthrough to allow additional fields.
 */
export const GapAnalysisSchema = z
  .object({
    mvp_critical_ids: z.array(z.string()).optional(),
    blocking_ids: z.array(z.string()).optional(),
  })
  .passthrough()

export type GapAnalysis = z.infer<typeof GapAnalysisSchema>

/**
 * Extended GraphState with scope-defend node fields.
 */
export type GraphStateWithScopeDefend = GraphState & {
  /** Story brief with title, goal, and context */
  story_brief?: z.infer<typeof StoryBriefSchema> | null
  /** Proposed acceptance criteria to challenge */
  acceptance_criteria?: z.infer<typeof AcceptanceCriterionItemSchema>[]
  /** Gap analysis identifying blocking/MVP-critical items */
  gap_analysis?: z.infer<typeof GapAnalysisSchema> | null
  /** Path to DA role pack file */
  role_pack_path?: string | null
  /** Accumulated warning count */
  warning_count?: number
  /** Scope defend output */
  scope_defend_output?: ScopeChallenges | null
}

// ============================================================================
// Risk sort order
// ============================================================================

const RISK_ORDER: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
}

// ============================================================================
// Challenge generation helpers
// ============================================================================

/**
 * Derives a risk level for a candidate AC based on its content.
 * Higher specificity / complexity = higher risk if deferred.
 */
function deriveRiskLevel(ac: AcceptanceCriterionItem): RiskIfDeferred {
  const desc = ac.description.toLowerCase()

  // High-risk signals
  if (
    desc.includes('security') ||
    desc.includes('auth') ||
    desc.includes('critical') ||
    desc.includes('must') ||
    desc.includes('required')
  ) {
    return 'high'
  }

  // Low-risk signals (cosmetic / enhancement)
  if (
    desc.includes('optional') ||
    desc.includes('nice-to-have') ||
    desc.includes('style') ||
    desc.includes('colour') ||
    desc.includes('color') ||
    desc.includes('animation') ||
    desc.includes('tooltip')
  ) {
    return 'low'
  }

  return 'medium'
}

/**
 * Generates a one-line DA challenge for an AC.
 */
function generateChallenge(ac: AcceptanceCriterionItem): string {
  const desc = ac.description.toLowerCase()

  if (desc.includes('export') || desc.includes('download')) {
    return 'Export/download feature adds complexity not required for core MVP user journey'
  }
  if (desc.includes('notification') || desc.includes('email') || desc.includes('alert')) {
    return 'Notification system can be shipped in a later iteration without blocking MVP'
  }
  if (desc.includes('filter') || desc.includes('search') || desc.includes('sort')) {
    return 'Advanced filtering/search adds implementation complexity disproportionate to MVP value'
  }
  if (desc.includes('audit') || desc.includes('log') || desc.includes('history')) {
    return 'Audit trail adds persistence complexity not required for MVP scope defense'
  }
  if (desc.includes('pagination') || desc.includes('infinite scroll')) {
    return 'Pagination can be deferred if initial dataset is small enough for MVP'
  }
  if (desc.includes('animation') || desc.includes('transition') || desc.includes('tooltip')) {
    return 'UI polish (animations/tooltips) is not required for core functionality'
  }
  if (desc.includes('report') || desc.includes('analytic') || desc.includes('dashboard')) {
    return 'Reporting/analytics can be added post-MVP when user data is available'
  }
  if (desc.includes('bulk') || desc.includes('batch')) {
    return 'Bulk operations add complexity; single-item workflow may be sufficient for MVP'
  }

  return `"${ac.description.substring(0, 60)}" may not be needed for core MVP user journey`
}

/**
 * Derives a recommendation for a candidate AC.
 */
function deriveRecommendation(
  ac: AcceptanceCriterionItem,
  risk: RiskIfDeferred,
): z.infer<typeof RecommendationSchema> {
  if (risk === 'high' || risk === 'critical') return 'accept-as-mvp'
  if (risk === 'low' || risk === 'none') return 'defer-to-backlog'
  // medium — reduce-scope or defer
  const desc = ac.description.toLowerCase()
  if (desc.includes('partial') || desc.includes('basic') || desc.includes('simple')) {
    return 'reduce-scope'
  }
  return 'defer-to-backlog'
}

/**
 * Derives an optional deferral note when recommendation is defer-to-backlog.
 */
function deriveDeferralNote(
  ac: AcceptanceCriterionItem,
  recommendation: z.infer<typeof RecommendationSchema>,
): string | undefined {
  if (recommendation !== 'defer-to-backlog') return undefined
  return `Add to backlog: ${ac.description.substring(0, 80)}`
}

// ============================================================================
// Core logic — exported for testability
// ============================================================================

/**
 * Identifies challenge candidates from acceptance criteria.
 * Excludes items protected by gap analysis (MVP-critical or blocking).
 *
 * @param acs - Acceptance criteria list
 * @param gapAnalysis - Optional gap analysis for protected items
 * @returns Filtered candidate list (uncapped)
 */
export function identifyCandidates(
  acs: AcceptanceCriterionItem[],
  gapAnalysis: GapAnalysis | null | undefined,
): AcceptanceCriterionItem[] {
  const protectedIds = new Set<string>()

  if (gapAnalysis) {
    const mvpIds = gapAnalysis.mvp_critical_ids ?? []
    const blockingIds = gapAnalysis.blocking_ids ?? []
    for (const id of [...mvpIds, ...blockingIds]) {
      protectedIds.add(id)
    }
  }

  return acs.filter(ac => {
    // Exclude protected by gap analysis
    if (protectedIds.has(ac.id)) return false
    // Exclude items marked mvp_critical in the AC itself
    if (ac.mvp_critical === true) return false
    return true
  })
}

/**
 * Applies DA challenges to a candidate list (max 5, sorted by risk).
 *
 * @param candidates - Filtered candidate list
 * @param storyId - Story ID for the output
 * @param warnings - Accumulated warnings list
 * @returns Scope challenges output (unvalidated)
 */
export function applyDAChallenges(
  candidates: AcceptanceCriterionItem[],
  storyId: string,
  warnings: string[],
): ScopeChallenges {
  const totalCandidates = candidates.length
  const truncated = totalCandidates > 5

  // Sort by risk descending, then by index for stability
  const sorted = [...candidates].sort((a, b) => {
    const riskA = RISK_ORDER[deriveRiskLevel(a)] ?? 0
    const riskB = RISK_ORDER[deriveRiskLevel(b)] ?? 0
    return riskB - riskA
  })

  const selected = sorted.slice(0, 5)

  const challenges: ScopeChallenge[] = selected.map((ac, idx) => {
    const risk = deriveRiskLevel(ac)
    const recommendation = deriveRecommendation(ac, risk)
    const deferralNote = deriveDeferralNote(ac, recommendation)
    const challenge: ScopeChallenge = {
      id: `DA-${String(idx + 1).padStart(3, '0')}`,
      target: ac.id,
      challenge: generateChallenge(ac),
      recommendation,
      risk_if_deferred: risk,
    }
    if (deferralNote !== undefined) {
      challenge.deferral_note = deferralNote
    }
    return challenge
  })

  return {
    story_id: storyId,
    generated_at: new Date().toISOString(),
    challenges,
    total_candidates_reviewed: totalCandidates,
    truncated,
    warnings,
    warning_count: warnings.length,
  }
}

// ============================================================================
// Backlog task writing (WINT-8060)
// ============================================================================

/**
 * Writes backlog tasks for challenges with recommendation='defer-to-backlog'.
 * Fire-and-forget: failures are logged as warnings, never thrown.
 * Idempotent: checks for existing tasks with matching tag before writing.
 *
 * AC-1: Calls kb_add_task for each defer-to-backlog challenge
 * AC-3: Failures are non-blocking (logged, not thrown)
 * AC-4: Only defer-to-backlog challenges generate tasks
 * AC-9: Idempotency via deterministic tag check
 * AC-10: Tags include both 'scope-defender' and 'deferred'
 *
 * @param challenges - Scope challenges output
 * @param storyId - Story ID for source attribution
 * @param kbAddTaskFn - Injectable KB task creation function
 * @param kbListTasksFn - Injectable KB task listing function (for idempotency)
 * @returns Count of tasks created and warnings
 */
export async function writeBacklogTasks(
  challenges: ScopeChallenges,
  storyId: string,
  kbAddTaskFn: KbAddTaskFn,
  kbListTasksFn?: KbListTasksFn,
): Promise<{ tasksCreated: number; tasksSkipped: number; warnings: string[] }> {
  const deferChallenges = challenges.challenges.filter(c => c.recommendation === 'defer-to-backlog')
  const warnings: string[] = []
  let tasksCreated = 0
  let tasksSkipped = 0

  if (deferChallenges.length === 0) {
    logger.debug('scope_defend: no defer-to-backlog challenges — skipping backlog writes')
    return { tasksCreated: 0, tasksSkipped: 0, warnings }
  }

  // Load existing tasks for idempotency check (AC-9)
  let existingTags: Set<string> = new Set()
  if (kbListTasksFn) {
    try {
      const existing = await kbListTasksFn({
        source_story_id: storyId,
        tags: ['scope-defender'],
        limit: 50,
      })
      for (const task of existing) {
        if (task.tags) {
          for (const tag of task.tags) {
            existingTags.add(tag)
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.warn(`scope_defend: idempotency check failed — proceeding without: ${msg}`)
    }
  }

  for (const challenge of deferChallenges) {
    const challengeTag = `scope-defender:${storyId}:${challenge.id}`

    // AC-9: Skip if task with this tag already exists
    if (existingTags.has(challengeTag)) {
      logger.debug(`scope_defend: skipping duplicate backlog task for ${challengeTag}`)
      tasksSkipped++
      continue
    }

    try {
      const taskTitle =
        challenge.deferral_note ??
        challenge.challenge ??
        challenge.description ??
        `Deferred scope item ${challenge.id}`

      await kbAddTaskFn({
        title: taskTitle,
        description: `Scope challenge ${challenge.id} from story ${storyId}: ${challenge.challenge ?? challenge.description ?? 'No description'}. Target: ${challenge.target ?? 'N/A'}. Risk if deferred: ${challenge.risk_if_deferred}.`,
        source_story_id: storyId,
        source_phase: 'elab',
        source_agent: 'scope-defender',
        task_type: 'feature_idea',
        tags: [
          'scope-defender',
          'deferred',
          'elab:scope-challenge',
          `source:${storyId}`,
          challengeTag,
        ],
      })

      tasksCreated++
      logger.info(`scope_defend: created backlog task for ${challengeTag}`)
    } catch (err) {
      // AC-3: Non-blocking — log warning, continue
      const msg = err instanceof Error ? err.message : String(err)
      warnings.push(`scope_defend: failed to create backlog task for ${challenge.id}: ${msg}`)
      logger.warn(`scope_defend: kb_add_task failed for ${challengeTag}: ${msg}`)
    }
  }

  logger.info(`scope_defend: backlog write complete`, {
    storyId,
    tasksCreated,
    tasksSkipped,
    warnings: warnings.length,
  })

  return { tasksCreated, tasksSkipped, warnings }
}

// ============================================================================
// Scope Defend Node Configuration (WINT-8060)
// ============================================================================

/**
 * Configuration for scope-defend node with optional KB task injection.
 */
export const ScopeDefendConfigSchema = z.object({
  /** Injectable KB task creation function (WINT-8060) */
  kbAddTaskFn: z.function().optional(),
  /** Injectable KB task listing function for idempotency (WINT-8060) */
  kbListTasksFn: z.function().optional(),
})

export type ScopeDefendConfig = {
  kbAddTaskFn?: KbAddTaskFn
  kbListTasksFn?: KbListTasksFn
}

// ============================================================================
// Node implementation
// ============================================================================

/**
 * Core scope defend logic extracted for reuse by both scopeDefendNode and factory.
 */
async function executeScopeDefend(
  state: GraphState,
  config?: ScopeDefendConfig,
): Promise<Partial<GraphStateWithScopeDefend>> {
  const stateWithDefend = state as GraphStateWithScopeDefend

  // -------------------------------------------------------------------------
  // Phase 1: Load Inputs
  // -------------------------------------------------------------------------

  const warnings: string[] = []

  // BLOCKING: story_brief must exist
  if (!stateWithDefend.story_brief) {
    logger.warn('scope_defend: story_brief missing — node blocked')
    return updateState({
      scope_defend_output: null,
      warning_count: (stateWithDefend.warning_count ?? 0) + 1,
    } as Partial<GraphStateWithScopeDefend>)
  }

  const storyBrief = stateWithDefend.story_brief
  const acs = stateWithDefend.acceptance_criteria ?? []
  const gapAnalysis = stateWithDefend.gap_analysis ?? null
  const rolePackPath = stateWithDefend.role_pack_path ?? null

  logger.info(`scope_defend: starting for story ${state.storyId}`, {
    acCount: acs.length,
    hasGapAnalysis: gapAnalysis !== null,
    hasRolePack: rolePackPath !== null,
  })

  // Optional: gap_analysis missing → increment warning
  if (!gapAnalysis) {
    warnings.push('gap_analysis_missing')
    logger.warn('scope_defend: gap_analysis not provided, all ACs treated as challengeable')
  }

  // Optional: role_pack_path missing → increment warning
  if (!rolePackPath) {
    warnings.push('role_pack_missing')
    logger.warn('scope_defend: role_pack_path not provided, using embedded DA constraints')
  }

  // -------------------------------------------------------------------------
  // Phase 2: Identify Candidates
  // -------------------------------------------------------------------------

  const candidates = identifyCandidates(acs, gapAnalysis)

  logger.info(`scope_defend: identified ${candidates.length} challenge candidates`, {
    totalACs: acs.length,
    candidateCount: candidates.length,
  })

  // -------------------------------------------------------------------------
  // Phase 3: Apply DA Challenges
  // -------------------------------------------------------------------------

  const output = applyDAChallenges(candidates, state.storyId, warnings)

  logger.info(`scope_defend: produced ${output.challenges.length} challenges`, {
    truncated: output.truncated,
    warningCount: output.warning_count,
  })

  // -------------------------------------------------------------------------
  // Phase 4: Produce Output
  // -------------------------------------------------------------------------

  // Determine output path from storyId and epicPrefix
  const outputDir = path.join(
    'plans',
    'future',
    'platform',
    state.epicPrefix.toLowerCase(),
    'in-progress',
    state.storyId,
    '_implementation',
  )

  try {
    await fs.mkdir(outputDir, { recursive: true })
    const outputPath = path.join(outputDir, 'scope-challenges.json')
    await fs.writeFile(outputPath, JSON.stringify(output, null, 2), 'utf-8')
    logger.info(`scope_defend: wrote scope-challenges.json to ${outputPath}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.warn(`scope_defend: failed to write scope-challenges.json: ${msg}`)
    // Non-blocking: still return output in state
  }

  // WINT-8060: Write backlog tasks for defer-to-backlog challenges
  if (config?.kbAddTaskFn) {
    const backlogResult = await writeBacklogTasks(
      output,
      state.storyId,
      config.kbAddTaskFn,
      config.kbListTasksFn,
    )
    if (backlogResult.warnings.length > 0) {
      warnings.push(...backlogResult.warnings)
    }
    logger.info(
      `scope_defend: backlog tasks created=${backlogResult.tasksCreated}, skipped=${backlogResult.tasksSkipped}`,
    )
  } else {
    logger.debug('scope_defend: kbAddTaskFn not injected — skipping backlog writes')
  }

  // Validate output against schema before returning
  const validatedOutput = ScopeChallengesSchema.parse(output)

  logger.info(`scope_defend: completed for ${state.storyId}`, {
    storyBriefTitle: storyBrief.title,
    challengeCount: validatedOutput.challenges.length,
  })

  return updateState({
    scope_defend_output: validatedOutput,
    warning_count: (stateWithDefend.warning_count ?? 0) + warnings.length,
  } as Partial<GraphStateWithScopeDefend>)
}

/**
 * Scope Defend node implementation (default, no KB injection).
 *
 * Implements the 4-phase scope-defender agent contract:
 * 1. Load Inputs — Extract state fields, validate story_brief exists
 * 2. Identify Candidates — Filter ACs, exclude MVP-critical/blocking items
 * 3. Apply DA Challenges — Cap at 5, prioritize by risk
 * 4. Produce Output — Write scope-challenges.json, return updated state
 */
export const scopeDefendNode = createToolNode(
  'scope_defend',
  async (state: GraphState): Promise<Partial<GraphStateWithScopeDefend>> => {
    return executeScopeDefend(state)
  },
)

/**
 * Creates a scope defend node with optional KB task injection.
 * Exported for graph assembly — allows configuration of backlog writes (WINT-8060).
 *
 * @param config - Optional configuration with KB injection functions
 * @returns Configured node function
 */
export function createScopeDefendNode(config?: ScopeDefendConfig) {
  if (!config) {
    return createToolNode(
      'scope_defend',
      async (state: GraphState): Promise<Partial<GraphStateWithScopeDefend>> => {
        return executeScopeDefend(state)
      },
    )
  }

  return createToolNode(
    'scope_defend',
    async (state: GraphState): Promise<Partial<GraphStateWithScopeDefend>> => {
      return executeScopeDefend(state, config)
    },
  )
}
