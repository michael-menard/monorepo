/**
 * extract_flows Node
 *
 * Async, LLM-dependent node that:
 * 1. Extracts user-authored flows from normalizedPlan markdown (source=user, confidence=1.0)
 * 2. Infers missing flows via LLM adapter (source=inferred, confidence per DEC-3)
 * 3. Writes flows via flow-writer adapter (logs warning if absent, no throw)
 *
 * Injectable adapters:
 *   - LlmAdapterFn: inference (required for step 2)
 *   - FlowWriterFn: DB write (defaults to no-op per DEC-1)
 *
 * APRS-2010: ST-3
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import {
  FlowSchema,
  FlowStepSchema,
  type Flow,
  type NormalizedPlan,
  type PlanRefinementState,
} from '../../state/plan-refinement-state.js'
import { extractSection } from './normalize-plan.js'

// ============================================================================
// Injectable Adapter Types
// ============================================================================

/**
 * Prompt payload passed to the LLM adapter for flow inference.
 */
export const LlmFlowInferencePromptSchema = z.object({
  problemStatement: z.string(),
  proposedSolution: z.string(),
  existingFlowNames: z.array(z.string()),
})

export type LlmFlowInferencePrompt = z.infer<typeof LlmFlowInferencePromptSchema>

/**
 * Raw flow shape returned by LLM (before validation/typing).
 */
export const LlmRawFlowSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  actor: z.string(),
  trigger: z.string(),
  steps: z.array(z.union([z.string(), z.object({ description: z.string() })])).default([]),
  successOutcome: z.string(),
  confidence: z.number().min(0.5).max(0.9).optional(),
})

export type LlmRawFlow = z.infer<typeof LlmRawFlowSchema>

/**
 * Injectable LLM adapter function type.
 * Receives inference prompt, returns raw inferred flows.
 * AC-4: source=inferred, confidence in [0.5, 0.9]
 */
export type LlmAdapterFn = (prompt: LlmFlowInferencePrompt) => Promise<LlmRawFlow[]>

/**
 * Injectable flow-writer adapter function type.
 * AC-6: If absent or table missing, logs warning and continues in-memory only.
 */
export type FlowWriterFn = (planSlug: string, flows: Flow[]) => Promise<void>

/**
 * Default no-op flow-writer (in-memory only per DEC-1).
 */
const defaultFlowWriter: FlowWriterFn = async (_planSlug: string, _flows: Flow[]) => {
  // No-op: in-memory only for MVP
}

// ============================================================================
// Config Schema
// ============================================================================

export const ExtractFlowsConfigSchema = z.object({
  /** Injectable LLM adapter for flow inference */
  llmAdapter: z.function().optional(),
  /** Injectable flow-writer adapter (defaults to no-op) */
  flowWriter: z.function().optional(),
})

export type ExtractFlowsConfig = z.infer<typeof ExtractFlowsConfigSchema>

// ============================================================================
// Phase Functions (exported for unit testability)
// ============================================================================

/**
 * Parse a single flow block from markdown text.
 * Flow blocks use format:
 *   ### Flow Name
 *   - Actor: ...
 *   - Trigger: ...
 *   - Steps: ...
 *   - Success Outcome: ...
 */
function parseFlowBlock(id: string, block: string): Flow | null {
  const lines = block.split('\n').map(l => l.trim())

  // Name is the first non-empty line
  const nameMatch = block.match(/^(?:###\s+)?(.+)$/m)
  const name = nameMatch ? nameMatch[1].trim().replace(/^Flow\s*:\s*/i, '') : id

  const actorMatch = block.match(/[-*]\s*Actor\s*:\s*(.+)/i)
  const triggerMatch = block.match(/[-*]\s*Trigger\s*:\s*(.+)/i)
  const successMatch =
    block.match(/[-*]\s*Success\s*Outcome\s*:\s*(.+)/i) || block.match(/[-*]\s*Outcome\s*:\s*(.+)/i)

  const actor = actorMatch ? actorMatch[1].trim() : 'User'
  const trigger = triggerMatch ? triggerMatch[1].trim() : 'User initiates'
  const successOutcome = successMatch ? successMatch[1].trim() : 'Flow completes successfully'

  // Extract steps section
  let steps: Flow['steps'] = []
  const stepsStartIdx = lines.findIndex(l => /steps\s*:/i.test(l))
  if (stepsStartIdx >= 0) {
    steps = lines
      .slice(stepsStartIdx + 1)
      .filter(l => /^[-*\d]/.test(l))
      .map((l, idx) => ({
        index: idx + 1,
        description: l.replace(/^[-*\d.]+\s*/, '').trim(),
      }))
      .filter(s => s.description.length > 0)
  }

  if (!name) return null

  return FlowSchema.parse({
    id,
    name,
    actor,
    trigger,
    steps,
    successOutcome,
    source: 'user',
    confidence: 1.0,
    status: 'unconfirmed',
  })
}

/**
 * Phase 1: Extract user-authored flows from normalizedPlan.
 * AC-3: User-authored flows tagged source=user, confidence=1.0, not re-inferred.
 *
 * Looks for a "Flows" or "User Flows" section in rawPlan content
 * and also checks normalizedPlan for pre-existing flows.
 */
export function extractUserFlows(
  normalizedPlan: NormalizedPlan,
  rawPlan: Record<string, unknown> | null,
): Flow[] {
  const flows: Flow[] = []

  // If normalizedPlan already has user flows, respect them
  const existingUserFlows = normalizedPlan.flows.filter(f => f.source === 'user')
  if (existingUserFlows.length > 0) {
    return existingUserFlows
  }

  // Try to extract from rawPlan markdown content
  const content =
    typeof rawPlan?.['content'] === 'string'
      ? rawPlan['content']
      : typeof rawPlan?.['rawContent'] === 'string'
        ? rawPlan['rawContent']
        : typeof rawPlan?.['body'] === 'string'
          ? rawPlan['body']
          : null

  if (!content) return flows

  const flowsSection =
    extractSection(content, 'Flows') ||
    extractSection(content, 'User Flows') ||
    extractSection(content, 'Flow Definitions')

  if (!flowsSection) return flows

  // Split by ### subheadings for individual flow definitions
  const flowBlocks = flowsSection
    .split(/(?=^###\s)/m)
    .map(b => b.trim())
    .filter(b => b.length > 0)

  if (flowBlocks.length === 0) {
    // Try treating each list item as a flow name (minimal parsing)
    const flowLines = flowsSection
      .split('\n')
      .map(l => l.replace(/^[-*\d.]+\s*/, '').trim())
      .filter(l => l.length > 0)

    for (let i = 0; i < flowLines.length; i++) {
      const flowId = `flow-user-${i + 1}`
      flows.push(
        FlowSchema.parse({
          id: flowId,
          name: flowLines[i],
          actor: 'User',
          trigger: 'User initiates',
          steps: [],
          successOutcome: 'Flow completes successfully',
          source: 'user',
          confidence: 1.0,
          status: 'unconfirmed',
        }),
      )
    }
    return flows
  }

  for (let i = 0; i < flowBlocks.length; i++) {
    const flowId = `flow-user-${i + 1}`
    const flow = parseFlowBlock(flowId, flowBlocks[i])
    if (flow) {
      flows.push({ ...flow, id: flowId, source: 'user', confidence: 1.0 })
    }
  }

  return flows
}

/**
 * Convert raw LLM flow into a validated Flow object.
 * AC-4: source=inferred, confidence in [0.5, 0.9] per DEC-3.
 */
export function convertLlmFlow(raw: LlmRawFlow, index: number): Flow {
  const steps = raw.steps.map((s, idx) => {
    const description = typeof s === 'string' ? s : s.description
    return FlowStepSchema.parse({ index: idx + 1, description })
  })

  // DEC-3: LLM-inferred high evidence=0.7, low evidence=0.5 — use provided or default to 0.7
  const confidence = raw.confidence ?? 0.7

  return FlowSchema.parse({
    id: raw.id ?? `flow-inferred-${index + 1}`,
    name: raw.name,
    actor: raw.actor,
    trigger: raw.trigger,
    steps,
    successOutcome: raw.successOutcome,
    source: 'inferred',
    confidence,
    status: 'unconfirmed',
  })
}

/**
 * Phase 2: Infer missing flows via LLM adapter.
 * AC-4: source=inferred, confidence in [0.5, 0.9].
 *
 * Only infers flows not already covered by user-authored flows.
 */
export async function inferFlows(
  normalizedPlan: NormalizedPlan,
  userFlows: Flow[],
  llmAdapter: LlmAdapterFn | undefined,
): Promise<Flow[]> {
  if (!llmAdapter) {
    logger.info('extract_flows: no LLM adapter provided, skipping flow inference')
    return []
  }

  if (!normalizedPlan.problemStatement && !normalizedPlan.proposedSolution) {
    logger.warn('extract_flows: no problem statement or proposed solution, skipping inference')
    return []
  }

  const existingFlowNames = userFlows.map(f => f.name)

  const prompt: LlmFlowInferencePrompt = {
    problemStatement: normalizedPlan.problemStatement,
    proposedSolution: normalizedPlan.proposedSolution,
    existingFlowNames,
  }

  try {
    const rawFlows = await llmAdapter(prompt)
    return rawFlows.map((raw, idx) => convertLlmFlow(raw, idx))
  } catch (err) {
    logger.warn('extract_flows: LLM inference failed, returning empty inferred flows', { err })
    return []
  }
}

/**
 * Phase 3: Write flows via flow-writer adapter.
 * AC-6: If absent or table missing, logs warning and continues in-memory only (no throw).
 */
export async function writeFlows(
  planSlug: string,
  flows: Flow[],
  flowWriter: FlowWriterFn | undefined,
): Promise<void> {
  if (!flowWriter || flowWriter === defaultFlowWriter) {
    logger.info('extract_flows: flow-writer is no-op, flows stored in-memory only', {
      planSlug,
      flowCount: flows.length,
    })
    return
  }

  try {
    await flowWriter(planSlug, flows)
    logger.info('extract_flows: flows written via adapter', { planSlug, flowCount: flows.length })
  } catch (err) {
    // AC-6: no throw — log warning and continue
    logger.warn('extract_flows: flow-writer adapter failed, flows stored in-memory only', {
      err,
      planSlug,
    })
  }
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the extract_flows LangGraph node.
 *
 * AC-2: Returns flows[] with required fields.
 * AC-3: User-authored flows tagged source=user, confidence=1.0.
 * AC-4: Inferred flows tagged source=inferred, confidence in [0.5, 0.9].
 * AC-5: Output stored in PlanRefinementState.normalizedPlan.flows.
 * AC-6: Injectable flow-writer, no throw on absent/failing.
 *
 * @param config - Optional config with injectable adapters
 */
export function createExtractFlowsNode(
  config: {
    llmAdapter?: LlmAdapterFn
    flowWriter?: FlowWriterFn
  } = {},
) {
  const flowWriter = config.flowWriter ?? defaultFlowWriter

  return async (state: PlanRefinementState): Promise<Partial<PlanRefinementState>> => {
    try {
      logger.info('extract_flows: starting', { planSlug: state.planSlug })

      if (!state.normalizedPlan) {
        logger.warn('extract_flows: normalizedPlan is null, returning empty flows', {
          planSlug: state.planSlug,
        })
        return {
          flows: [],
          refinementPhase: 'gap_coverage',
        }
      }

      // Phase 1: Extract user-authored flows
      const userFlows = extractUserFlows(state.normalizedPlan, state.rawPlan)
      logger.info('extract_flows: user flows extracted', {
        planSlug: state.planSlug,
        userFlowCount: userFlows.length,
      })

      // Phase 2: Infer missing flows via LLM
      const inferredFlows = await inferFlows(state.normalizedPlan, userFlows, config.llmAdapter)
      logger.info('extract_flows: inferred flows extracted', {
        planSlug: state.planSlug,
        inferredFlowCount: inferredFlows.length,
      })

      // Combine all flows
      const allFlows: Flow[] = [...userFlows, ...inferredFlows]

      // Phase 3: Write via flow-writer adapter (AC-6)
      await writeFlows(state.planSlug, allFlows, flowWriter)

      // AC-5: Update normalizedPlan.flows and state.flows
      const updatedNormalizedPlan = {
        ...state.normalizedPlan,
        flows: allFlows,
      }

      logger.info('extract_flows: complete', {
        planSlug: state.planSlug,
        totalFlows: allFlows.length,
      })

      return {
        flows: allFlows,
        normalizedPlan: updatedNormalizedPlan,
        refinementPhase: 'gap_coverage',
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logger.error('extract_flows: unexpected error', { err, planSlug: state.planSlug })
      return {
        refinementPhase: 'error',
        errors: [`extract_flows failed: ${message}`],
      }
    }
  }
}
