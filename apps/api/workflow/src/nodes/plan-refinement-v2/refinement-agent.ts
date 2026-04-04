/**
 * refinement_agent Node (v2 agentic pipeline)
 *
 * The core agentic node. Runs an internal ReAct loop with a tool belt.
 * This is the ONLY node in the v2 pipeline that makes LLM calls.
 *
 * Replaces the fixed coverage_agent → gap_specialists → reconciliation
 * sequence from v1 with a single agent capable of dynamic tool use.
 *
 * Internal loop:
 *   1. Build system prompt (plan + flows + grounding context + postconditions + tools)
 *   2. Call LLM → get tool call or 'complete'
 *   3. Execute tool, accumulate evidence
 *   4. Check postconditions
 *   5. If passed or max internal iterations reached → return
 *   6. Inject failure list into next LLM call and repeat
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type { Flow, NormalizedPlan } from '../../state/plan-refinement-state.js'
import type {
  GroundingContext,
  PostconditionResult,
  TokenUsage,
  PlanRefinementV2State,
} from '../../state/plan-refinement-v2-state.js'

// ============================================================================
// Tool + LLM Adapter Types
// ============================================================================

export type QueryKbFn = (query: string) => Promise<string>
export type SearchCodebaseFn = (pattern: string) => Promise<string>
export type CallSpecialistFn = (
  domain: 'ux' | 'qa' | 'security' | 'performance',
  question: string,
) => Promise<string>
export type FlagForHumanFn = (flowId: string, reason: string) => Promise<void>

export const LlmMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
})
export type LlmMessage = z.infer<typeof LlmMessageSchema>

export type LlmAdapterFn = (messages: LlmMessage[]) => Promise<{
  content: string
  inputTokens: number
  outputTokens: number
}>

// ============================================================================
// Tool Call Schema
// ============================================================================

export const ToolCallSchema = z.object({
  tool: z.enum([
    'query_kb',
    'search_codebase',
    'call_specialist',
    'flag_for_human',
    'update_flows',
    'complete',
  ]),
  args: z.record(z.string(), z.unknown()),
})
export type ToolCall = z.infer<typeof ToolCallSchema>

// ============================================================================
// Config Schema
// ============================================================================

export const RefinementAgentConfigSchema = z.object({
  llmAdapter: z.function().optional(),
  queryKb: z.function().optional(),
  searchCodebase: z.function().optional(),
  callSpecialist: z.function().optional(),
  flagForHuman: z.function().optional(),
  maxInternalIterations: z.number().int().positive().optional(),
})

export type RefinementAgentConfig = {
  llmAdapter?: LlmAdapterFn
  queryKb?: QueryKbFn
  searchCodebase?: SearchCodebaseFn
  callSpecialist?: CallSpecialistFn
  flagForHuman?: FlagForHumanFn
  maxInternalIterations?: number
}

// ============================================================================
// Postconditions
// ============================================================================

/**
 * The postconditions the refinement_agent must satisfy before calling 'complete':
 *
 * 1. Every flow has source + confidence set
 * 2. Every flow with confidence < 0.7 must have either: confidence raised, or
 *    be flagged for human (flowId in flaggedForHuman set)
 * 3. No contradictions between flows (same actor + incompatible triggers)
 * 4. Feasibility flags from grounding are addressed (resolved or accepted risk in evidence)
 * 5. Evidence field is non-empty (agent documented what it checked)
 */

// ============================================================================
// Exported Pure Functions (for unit testability)
// ============================================================================

/**
 * Builds the system prompt for the refinement agent LLM call.
 *
 * @param plan - Normalized plan
 * @param flows - Current flows
 * @param groundingContext - Grounding context from grounding_scout
 * @param previousFailures - Postcondition failures from a prior attempt (if any)
 * @returns System prompt string
 */
export function buildSystemPrompt(
  plan: NormalizedPlan,
  flows: Flow[],
  groundingContext: GroundingContext | null,
  previousFailures: Array<{ check: string; reason: string }> = [],
): string {
  const flowSummary = flows
    .map(
      f =>
        `  - [${f.id}] "${f.name}" | actor: ${f.actor} | confidence: ${f.confidence} | source: ${f.source} | status: ${f.status}`,
    )
    .join('\n')

  const feasibilityFlagSummary =
    groundingContext && groundingContext.feasibilityFlags.length > 0
      ? groundingContext.feasibilityFlags
          .map(ff => `  - [${ff.flag}] ${ff.claim}: ${ff.evidence}`)
          .join('\n')
      : '  (none)'

  const existingStoriesSummary =
    groundingContext && groundingContext.existingStories.length > 0
      ? groundingContext.existingStories
          .map(
            s =>
              `  - [${s.storyId}] "${s.title}" state=${s.state}${s.parentFlowId ? ` parentFlowId=${s.parentFlowId}` : ''}`,
          )
          .join('\n')
      : '  (none)'

  const previousFailureSection =
    previousFailures.length > 0
      ? `\nPREVIOUS ATTEMPT FAILURES:\n${previousFailures.map(f => `  - [${f.check}] ${f.reason}`).join('\n')}\n`
      : ''

  const noFlowsInstruction =
    flows.length === 0
      ? `\n\nIMPORTANT: There are NO flows defined yet. You MUST derive user flows from the plan content and call update_flows before calling complete. Extract 3-8 concrete user flows from the SOLUTION section. Each flow must have: id (e.g. "flow-1"), name, actor ("user" or "system"), trigger, steps (array of {index, description}), successOutcome, source ("inferred"), confidence (0.0-1.0), status ("confirmed").`
      : ''

  return `You are a plan refinement agent for a LEGO MOC instructions platform.

PLAN: ${plan.planSlug}
TITLE: ${plan.title}
SUMMARY: ${plan.summary}
PROBLEM: ${plan.problemStatement}
SOLUTION: ${plan.proposedSolution}

CURRENT FLOWS:
${flowSummary || '  (no flows — you must create them, see instructions below)'}

GROUNDING CONTEXT:
Existing Stories:
${existingStoriesSummary}

Feasibility Flags:
${feasibilityFlagSummary}
${previousFailureSection}${noFlowsInstruction}

POSTCONDITIONS you must satisfy before calling 'complete':
1. every_flow_has_source_confidence: Every flow has non-empty source and confidence set (0.0-1.0)
2. low_confidence_flows_addressed: Every flow with confidence < 0.7 must either have confidence raised OR be flagged for human review
3. no_flow_contradictions: No two flows have the same actor + incompatible/identical triggers
4. feasibility_flags_addressed: Every feasibility flag has a corresponding evidence entry explaining resolution or accepted risk
5. evidence_non_empty: The evidence record has at least one entry documenting what was checked

AVAILABLE TOOLS (respond with JSON tool call):
- query_kb: { tool: "query_kb", args: { query: string } } — search KB for context
- search_codebase: { tool: "search_codebase", args: { pattern: string } } — search codebase
- call_specialist: { tool: "call_specialist", args: { domain: "ux"|"qa"|"security"|"performance", question: string } }
- flag_for_human: { tool: "flag_for_human", args: { flowId: string, reason: string } } — flag a low-confidence flow
- update_flows: { tool: "update_flows", args: { flows: Flow[] } } — replace the flows array
- complete: { tool: "complete", args: { evidence: Record<string,string> } } — finish when all postconditions pass

Respond ONLY with a valid JSON tool call object.`
}

/**
 * Attempts to parse an LLM response string as a ToolCall.
 * Returns null if parsing fails.
 *
 * @param llmResponse - Raw string content from the LLM
 * @returns Parsed ToolCall or null
 */
export function parseToolCall(llmResponse: string): ToolCall | null {
  try {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = llmResponse.match(/```(?:json)?\s*([\s\S]*?)```/)
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : llmResponse.trim()
    const parsed = JSON.parse(jsonStr)
    const result = ToolCallSchema.safeParse(parsed)
    if (!result.success) {
      logger.warn('refinement_agent: tool call parsed but failed Zod validation', {
        errors: result.error.errors,
      })
      return null
    }
    return result.data
  } catch {
    logger.warn('refinement_agent: failed to parse LLM response as tool call', {
      response: llmResponse.slice(0, 200),
    })
    return null
  }
}

/**
 * Checks whether all postconditions are satisfied.
 * Pure function — exported for direct unit testing.
 *
 * @param flows - Current flows after agent processing
 * @param evidence - Evidence accumulated by the agent (check name → detail)
 * @param feasibilityFlags - Flags from grounding context
 * @param flaggedForHuman - Set of flowIds flagged for human review
 * @returns PostconditionResult
 */
export function checkPostconditions(
  flows: Flow[],
  evidence: Record<string, string>,
  feasibilityFlags: GroundingContext['feasibilityFlags'],
  flaggedForHuman: Set<string> = new Set(),
): PostconditionResult {
  const failures: PostconditionResult['failures'] = []

  // 0. at_least_one_flow
  if (flows.length === 0) {
    failures.push({
      check: 'at_least_one_flow',
      reason:
        'No flows defined — call update_flows with at least 3 concrete user flows derived from the plan before calling complete',
    })
  }

  // 1. every_flow_has_source_confidence
  const missingSourceOrConfidence = flows.filter(
    f => !f.source || f.confidence === undefined || f.confidence === null,
  )
  if (missingSourceOrConfidence.length > 0) {
    failures.push({
      check: 'every_flow_has_source_confidence',
      reason: `${missingSourceOrConfidence.length} flow(s) missing source or confidence: ${missingSourceOrConfidence.map(f => f.id).join(', ')}`,
    })
  }

  // 2. low_confidence_flows_addressed
  const unaddressedLowConfidence = flows.filter(
    f => f.confidence < 0.7 && !flaggedForHuman.has(f.id),
  )
  if (unaddressedLowConfidence.length > 0) {
    failures.push({
      check: 'low_confidence_flows_addressed',
      reason: `${unaddressedLowConfidence.length} low-confidence flow(s) not raised or flagged: ${unaddressedLowConfidence.map(f => `${f.id}(${f.confidence})`).join(', ')}`,
    })
  }

  // 3. no_flow_contradictions
  const seenActorTriggers = new Map<string, string>()
  for (const flow of flows) {
    const key = `${flow.actor}:${flow.trigger}`
    if (seenActorTriggers.has(key)) {
      failures.push({
        check: 'no_flow_contradictions',
        reason: `Flows "${seenActorTriggers.get(key)}" and "${flow.id}" share same actor+trigger: "${key}"`,
      })
    } else {
      seenActorTriggers.set(key, flow.id)
    }
  }

  // 4. feasibility_flags_addressed
  const unaddressedFlags = feasibilityFlags.filter(ff => {
    const evidenceKey = ff.claim.toLowerCase().replace(/\s+/g, '_').slice(0, 40)
    return !Object.keys(evidence).some(k => k.toLowerCase().includes(evidenceKey.slice(0, 20)))
  })
  if (unaddressedFlags.length > 0) {
    failures.push({
      check: 'feasibility_flags_addressed',
      reason: `${unaddressedFlags.length} feasibility flag(s) not addressed in evidence: ${unaddressedFlags.map(f => f.claim).join('; ')}`,
    })
  }

  // 5. evidence_non_empty
  if (Object.keys(evidence).length === 0) {
    failures.push({
      check: 'evidence_non_empty',
      reason: 'Evidence record is empty — agent must document what was checked',
    })
  }

  return {
    passed: failures.length === 0,
    failures,
    evidence,
  }
}

// ============================================================================
// Default No-op Adapter
// ============================================================================

const defaultLlmAdapter: LlmAdapterFn = async _messages => ({
  content: JSON.stringify({ tool: 'complete', args: { evidence: { stub: 'no-op adapter' } } }),
  inputTokens: 0,
  outputTokens: 0,
})

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the refinement_agent LangGraph node.
 *
 * This is the ONLY node in the v2 pipeline that calls the LLM.
 * All LLM calls are behind the injectable llmAdapter.
 *
 * @param config - Injectable adapters and configuration
 * @returns LangGraph-compatible async node function
 */
export function createRefinementAgentNode(config: RefinementAgentConfig = {}) {
  const maxInternalIterations = config.maxInternalIterations ?? 5
  const llmAdapter = config.llmAdapter ?? defaultLlmAdapter

  return async (state: PlanRefinementV2State): Promise<Partial<PlanRefinementV2State>> => {
    const { planSlug, normalizedPlan, flows, groundingContext } = state

    logger.info(`refinement_agent: starting for plan ${planSlug}`, {
      flowCount: flows.length,
      maxInternalIterations,
    })

    if (!normalizedPlan) {
      logger.warn('refinement_agent: normalizedPlan is null — skipping, marking error')
      return {
        errors: ['refinement_agent: normalizedPlan is null'],
        postconditionResult: {
          passed: false,
          failures: [{ check: 'plan_present', reason: 'normalizedPlan is null' }],
          evidence: {},
        },
        refinementV2Phase: 'postcondition_gate',
      }
    }

    // Mutable working copies for the internal ReAct loop
    let currentFlows: Flow[] = [...flows]
    const evidence: Record<string, string> = {}
    const flaggedForHuman = new Set<string>()
    const allTokenUsage: TokenUsage[] = []
    let previousFailures: Array<{ check: string; reason: string }> = []
    let internalIteration = 0

    const messages: LlmMessage[] = []

    while (internalIteration < maxInternalIterations) {
      internalIteration++

      const systemPrompt = buildSystemPrompt(
        normalizedPlan,
        currentFlows,
        groundingContext,
        previousFailures,
      )

      // Build message list: system + prior conversation
      const callMessages: LlmMessage[] =
        messages.length === 0
          ? [{ role: 'system', content: systemPrompt }]
          : [{ role: 'system', content: systemPrompt }, ...messages]

      logger.info(
        `refinement_agent: internal iteration ${internalIteration}/${maxInternalIterations}`,
      )

      let llmResponse: { content: string; inputTokens: number; outputTokens: number }
      try {
        llmResponse = await llmAdapter(callMessages)
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        logger.warn(`refinement_agent: LLM adapter threw on iteration ${internalIteration}`, {
          error: msg,
        })
        allTokenUsage.push({ nodeId: 'refinement_agent', inputTokens: 0, outputTokens: 0 })
        break
      }

      allTokenUsage.push({
        nodeId: 'refinement_agent',
        inputTokens: llmResponse.inputTokens,
        outputTokens: llmResponse.outputTokens,
      })

      messages.push({ role: 'assistant', content: llmResponse.content })

      const toolCall = parseToolCall(llmResponse.content)
      if (!toolCall) {
        logger.warn(`refinement_agent: could not parse tool call on iteration ${internalIteration}`)
        previousFailures = [
          { check: 'tool_call_parse', reason: 'LLM response was not a valid tool call' },
        ]
        continue
      }

      logger.info(`refinement_agent: tool=${toolCall.tool}`, { args: toolCall.args })

      // Execute tool
      if (toolCall.tool === 'complete') {
        const completionEvidence =
          (toolCall.args['evidence'] as Record<string, string> | undefined) ?? {}
        Object.assign(evidence, completionEvidence)
        break
      }

      if (toolCall.tool === 'query_kb' && config.queryKb) {
        try {
          const query = String(toolCall.args['query'] ?? '')
          const result = await config.queryKb(query)
          evidence[`query_kb:${query.slice(0, 30)}`] = result.slice(0, 200)
          messages.push({ role: 'user', content: `query_kb result: ${result}` })
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          messages.push({ role: 'user', content: `query_kb error: ${msg}` })
        }
      } else if (toolCall.tool === 'search_codebase' && config.searchCodebase) {
        try {
          const pattern = String(toolCall.args['pattern'] ?? '')
          const result = await config.searchCodebase(pattern)
          evidence[`search_codebase:${pattern.slice(0, 30)}`] = result.slice(0, 200)
          messages.push({ role: 'user', content: `search_codebase result: ${result}` })
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          messages.push({ role: 'user', content: `search_codebase error: ${msg}` })
        }
      } else if (toolCall.tool === 'call_specialist' && config.callSpecialist) {
        try {
          const domain = toolCall.args['domain'] as 'ux' | 'qa' | 'security' | 'performance'
          const question = String(toolCall.args['question'] ?? '')
          const result = await config.callSpecialist(domain, question)
          evidence[`specialist:${domain}`] = result.slice(0, 200)
          messages.push({ role: 'user', content: `specialist(${domain}) result: ${result}` })
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          messages.push({ role: 'user', content: `call_specialist error: ${msg}` })
        }
      } else if (toolCall.tool === 'flag_for_human') {
        const flowId = String(toolCall.args['flowId'] ?? '')
        const reason = String(toolCall.args['reason'] ?? '')
        flaggedForHuman.add(flowId)
        evidence[`flagged_for_human:${flowId}`] = reason
        if (config.flagForHuman) {
          try {
            await config.flagForHuman(flowId, reason)
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            logger.warn(`refinement_agent: flagForHuman adapter threw`, { error: msg })
          }
        }
        messages.push({
          role: 'user',
          content: `flag_for_human: flow ${flowId} flagged. Reason: ${reason}`,
        })
      } else if (toolCall.tool === 'update_flows') {
        const rawFlows = toolCall.args['flows']
        if (Array.isArray(rawFlows)) {
          currentFlows = rawFlows as Flow[]
          messages.push({
            role: 'user',
            content: `update_flows: ${currentFlows.length} flow(s) updated`,
          })
        } else {
          messages.push({ role: 'user', content: 'update_flows: invalid flows arg, must be array' })
        }
      } else {
        // Tool not configured or unknown — note it and continue
        messages.push({
          role: 'user',
          content: `tool "${toolCall.tool}" not available or not configured`,
        })
      }

      // Check postconditions after each tool call
      const postconditionResult = checkPostconditions(
        currentFlows,
        evidence,
        groundingContext?.feasibilityFlags ?? [],
        flaggedForHuman,
      )

      if (postconditionResult.passed) {
        logger.info('refinement_agent: all postconditions passed early — exiting loop')
        return buildResult(
          currentFlows,
          normalizedPlan,
          postconditionResult,
          allTokenUsage,
          internalIteration,
        )
      }

      previousFailures = postconditionResult.failures
    }

    // Final postcondition check after loop exits
    const finalPostconditionResult = checkPostconditions(
      currentFlows,
      evidence,
      groundingContext?.feasibilityFlags ?? [],
      flaggedForHuman,
    )

    logger.info(`refinement_agent: complete after ${internalIteration} internal iteration(s)`, {
      passed: finalPostconditionResult.passed,
      failureCount: finalPostconditionResult.failures.length,
    })

    return buildResult(
      currentFlows,
      normalizedPlan,
      finalPostconditionResult,
      allTokenUsage,
      internalIteration,
    )
  }
}

// ============================================================================
// Internal Helpers
// ============================================================================

function buildResult(
  flows: Flow[],
  normalizedPlan: NormalizedPlan,
  postconditionResult: PostconditionResult,
  tokenUsage: TokenUsage[],
  internalIterations: number,
): Partial<PlanRefinementV2State> {
  return {
    flows,
    normalizedPlan: { ...normalizedPlan, flows },
    postconditionResult,
    tokenUsage,
    internalIterations,
    refinementV2Phase: 'postcondition_gate',
  }
}
