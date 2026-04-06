/**
 * dependency_wirer_agent Node (v2) — AGENTIC
 *
 * Decides dependency structure between enriched stories.
 * Unlike v1 (purely structural from flow order), this agent can recognize
 * cross-flow dependencies by reading story scopes.
 *
 * Fallback: v1 flow-order logic if no LLM adapter provided.
 * Token usage tracked and appended to state.tokenUsage.
 *
 * Returns: { dependencyEdges, parallelGroups, orderedStories, tokenUsage,
 *            generationV2Phase: 'validation' }
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type {
  EnrichedStory,
  DependencyEdgeV2,
  TokenUsage,
  StoryGenerationV2State,
} from '../../state/story-generation-v2-state.js'

// ============================================================================
// Injectable Adapter Types
// ============================================================================

export type DependencyWirerLlmAdapterFn = (prompt: string) => Promise<{
  edges: Array<{
    from: string
    to: string
    type: string
    rationale: string
  }>
  minimumPath: string[]
  inputTokens: number
  outputTokens: number
}>

// ============================================================================
// Config Schema
// ============================================================================

export const DependencyWirerConfigSchema = z.object({
  llmAdapter: z.function().optional(),
})

export type DependencyWirerConfig = z.infer<typeof DependencyWirerConfigSchema>

// ============================================================================
// Pure Functions (exported for unit testability)
// ============================================================================

/**
 * Build the dependency wiring prompt.
 * Includes enriched story scopes so the LLM can identify cross-flow deps.
 */
export function buildDependencyPrompt(stories: EnrichedStory[]): string {
  const storySections = stories
    .map(s => {
      const inScope = s.scopeBoundary.inScope.join('; ') || 'unspecified'
      const outScope = s.scopeBoundary.outOfScope.join('; ') || 'unspecified'
      const files = s.relevantFiles.join(', ') || 'none'

      return [
        `Story: "${s.title}"`,
        `Flow: ${s.parent_flow_id}`,
        `In scope: ${inScope}`,
        `Out of scope: ${outScope}`,
        `Relevant files: ${files}`,
      ].join('\n')
    })
    .join('\n\n---\n\n')

  return `You are a software architect determining dependencies between user stories.

STORIES:
${storySections}

DEPENDENCY RULES:
- Add an edge { from, to, type } only when story "to" CANNOT start until story "from" completes
- Types: "flow_order" (same flow sequential), "cross_flow" (different flows), "shared_file" (same file must be modified in order)
- Identify the MINIMUM PATH: stories that must be done sequentially to deliver the core value
- Prefer parallel execution — only add dependencies that are truly required

OUTPUT FORMAT (JSON):
{
  "edges": [
    { "from": "<story title>", "to": "<story title>", "type": "<type>", "rationale": "<why>" }
  ],
  "minimumPath": ["<story title in order>"]
}

Return ONLY valid JSON. No explanation outside JSON.`
}

/**
 * Topological sort (Kahn's algorithm) — returns ordered story titles.
 * Returns null if a cycle is detected.
 */
export function topologicalSort(storyTitles: string[], edges: DependencyEdgeV2[]): string[] | null {
  const inDegree = new Map<string, number>()
  const adjacency = new Map<string, string[]>()

  storyTitles.forEach(title => {
    inDegree.set(title, 0)
    adjacency.set(title, [])
  })

  edges.forEach(edge => {
    if (!inDegree.has(edge.from) || !inDegree.has(edge.to)) return
    adjacency.get(edge.from)!.push(edge.to)
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1)
  })

  const queue = storyTitles.filter(t => (inDegree.get(t) ?? 0) === 0)
  const result: string[] = []

  while (queue.length > 0) {
    const node = queue.shift()!
    result.push(node)
    ;(adjacency.get(node) ?? []).forEach(neighbor => {
      const deg = (inDegree.get(neighbor) ?? 1) - 1
      inDegree.set(neighbor, deg)
      if (deg === 0) queue.push(neighbor)
    })
  }

  return result.length === storyTitles.length ? result : null
}

/**
 * Compute parallel groups via layer partitioning.
 * Each layer contains stories whose predecessors are all in earlier layers.
 *
 * NOTE: only call with acyclic edge sets — cyclic edges cause infinite loops.
 * Callers must run topologicalSort first; if null (cycle), skip this function.
 */
export function computeParallelGroups(
  storyTitles: string[],
  edges: DependencyEdgeV2[],
): string[][] {
  const layers = new Map<string, number>()

  storyTitles.forEach(t => layers.set(t, 0))

  // Safety cap: max iterations = storyTitles.length (DAG can have at most n layers)
  const maxIterations = storyTitles.length + 1
  let iterationCount = 0
  let changed = true

  while (changed && iterationCount < maxIterations) {
    changed = false
    iterationCount++
    edges.forEach(edge => {
      const fromLayer = layers.get(edge.from) ?? 0
      const toLayer = layers.get(edge.to) ?? 0
      if (toLayer <= fromLayer) {
        layers.set(edge.to, fromLayer + 1)
        changed = true
      }
    })
  }

  // Group by layer
  const maxLayer = Math.max(0, ...Array.from(layers.values()))
  const groups: string[][] = Array.from({ length: maxLayer + 1 }, () => [])
  storyTitles.forEach(t => {
    const layer = layers.get(t) ?? 0
    // Clamp to valid group index in case of cycle detection failure
    const safeLayer = Math.min(layer, groups.length - 1)
    groups[safeLayer].push(t)
  })

  return groups.filter(g => g.length > 0)
}

/**
 * V1-style fallback: wire deps by flow order (stories in same flow are sequential).
 */
export function fallbackWireDependencies(stories: EnrichedStory[]): DependencyEdgeV2[] {
  const edges: DependencyEdgeV2[] = []
  const flowGroups = new Map<string, EnrichedStory[]>()

  stories.forEach(s => {
    const group = flowGroups.get(s.parent_flow_id) ?? []
    group.push(s)
    flowGroups.set(s.parent_flow_id, group)
  })

  flowGroups.forEach(group => {
    for (let i = 1; i < group.length; i++) {
      edges.push({
        from: group[i - 1].title,
        to: group[i].title,
        type: 'flow_order',
      })
    }
  })

  return edges
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the dependency_wirer_agent LangGraph node (v2).
 *
 * Agentic: uses LLM to detect cross-flow dependencies from story scopes.
 * Falls back to v1 flow-order logic if no adapter provided.
 *
 * Returns: { dependencyEdges, parallelGroups, orderedStories, tokenUsage,
 *            generationV2Phase: 'validation' }
 */
export function createDependencyWirerAgentNode(
  config: {
    llmAdapter?: DependencyWirerLlmAdapterFn
  } = {},
) {
  return async (state: StoryGenerationV2State): Promise<Partial<StoryGenerationV2State>> => {
    try {
      logger.info('dependency_wirer_agent: starting', {
        planSlug: state.planSlug,
        storyCount: state.enrichedStories.length,
        hasLlmAdapter: !!config.llmAdapter,
      })

      const stories = state.enrichedStories
      const storyTitles = stories.map(s => s.title)
      const newTokenUsage: TokenUsage[] = []

      let edges: DependencyEdgeV2[] = []
      let minimumPathTitles: string[] = []

      let llmSucceeded = false
      if (config.llmAdapter && stories.length > 0) {
        const prompt = buildDependencyPrompt(stories)
        try {
          const response = await config.llmAdapter(prompt)

          newTokenUsage.push({
            nodeId: 'dependency_wirer_agent',
            inputTokens: response.inputTokens,
            outputTokens: response.outputTokens,
          })

          edges = response.edges.map(e => ({ from: e.from, to: e.to, type: e.type }))
          minimumPathTitles = response.minimumPath
          llmSucceeded = true
        } catch (llmErr) {
          const msg = llmErr instanceof Error ? llmErr.message : String(llmErr)
          logger.warn('dependency_wirer_agent: LLM failed, falling back to heuristic wirer', {
            error: msg,
            planSlug: state.planSlug,
          })
        }
      }

      if (!llmSucceeded) {
        edges = fallbackWireDependencies(stories)
        // Minimum path = all stories (conservative fallback)
        minimumPathTitles = storyTitles
      }

      // Topological sort — returns null on cycle (validation node will catch this)
      const topoOrder = topologicalSort(storyTitles, edges)
      const orderedTitles = topoOrder ?? storyTitles

      // Compute parallel groups — ONLY for acyclic graphs (cycle → single group)
      // This avoids infinite loops in computeParallelGroups
      const parallelGroups =
        topoOrder !== null ? computeParallelGroups(storyTitles, edges) : [storyTitles] // all stories in one group if cycle (validation will fail anyway)

      // Mark minimum_path on stories
      const minimumPathSet = new Set(minimumPathTitles)
      const storyMap = new Map(stories.map(s => [s.title, s]))

      const orderedStories: EnrichedStory[] = orderedTitles
        .map(title => {
          const story = storyMap.get(title)
          if (!story) return null
          return {
            ...story,
            minimum_path: minimumPathSet.has(title),
          }
        })
        .filter((s): s is EnrichedStory => s !== null)

      // Add any stories missing from topo order (safety net)
      const orderedSet = new Set(orderedTitles)
      stories.forEach(s => {
        if (!orderedSet.has(s.title)) {
          orderedStories.push({ ...s, minimum_path: false })
        }
      })

      logger.info('dependency_wirer_agent: complete', {
        planSlug: state.planSlug,
        edgeCount: edges.length,
        parallelGroupCount: parallelGroups.length,
        minimumPathCount: minimumPathTitles.length,
        cycleDetected: topoOrder === null,
      })

      return {
        dependencyEdges: edges,
        parallelGroups,
        orderedStories,
        tokenUsage: newTokenUsage,
        generationV2Phase: 'validation',
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logger.error('dependency_wirer_agent: unexpected error', { err, planSlug: state.planSlug })
      return {
        generationV2Phase: 'error',
        errors: [`dependency_wirer_agent failed: ${message}`],
      }
    }
  }
}
