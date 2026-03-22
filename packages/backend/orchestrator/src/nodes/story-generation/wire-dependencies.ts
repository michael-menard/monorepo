/**
 * wire_dependencies Node
 *
 * Infers dependency edges between generated stories based on parent_flow_id
 * and flow step ordering. Computes parallel groups via BFS topological layer
 * partitioning (Kahn's algorithm). Fully deterministic — NO LLM calls.
 *
 * ARCH-001: composite key "title|flow_id" used as edge identifiers.
 * DEC-2: assign minimum_path=true to stories whose flow has fewest total steps.
 *
 * APRS-4020: ST-2 (AC-2/3/4)
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type { Flow } from '../../state/plan-refinement-state.js'
import type {
  GeneratedStory,
  DependencyEdge,
  StoryGenerationState,
} from '../../state/story-generation-state.js'

// ============================================================================
// Injectable Adapter Types
// ============================================================================

/**
 * Injectable function for determining which stories are on the minimum path.
 * DEC-2: default heuristic uses the flow with fewest total steps.
 */
export type MinimumPathFn = (stories: GeneratedStory[], flows: Flow[]) => GeneratedStory[]

// ============================================================================
// Config Schema
// ============================================================================

export const WireDependenciesConfigSchema = z.object({
  /** Injectable minimum-path override function */
  minimumPathFn: z.function().optional(),
})

export type WireDependenciesConfig = z.infer<typeof WireDependenciesConfigSchema>

// ============================================================================
// Utility: Composite Key
// ============================================================================

/**
 * Build the composite key for a story: "title|flow_id" (ARCH-001).
 */
export function storyKey(story: GeneratedStory): string {
  return `${story.title}|${story.parent_flow_id}`
}

// ============================================================================
// Default Minimum-Path Heuristic (DEC-2)
// ============================================================================

/**
 * Default minimum-path heuristic: stories whose flow has the fewest total steps
 * are considered on the minimum path.
 *
 * Ties: all flows with the minimum step count are included.
 */
export function defaultMinimumPathFn(stories: GeneratedStory[], flows: Flow[]): GeneratedStory[] {
  if (flows.length === 0) return []

  // Build flow → step count map
  const flowStepCounts = new Map<string, number>(flows.map(f => [f.id, f.steps.length]))

  // Find minimum step count across all flows that have stories
  const flowIdsWithStories = new Set(stories.map(s => s.parent_flow_id))
  let minStepCount = Infinity
  for (const flowId of flowIdsWithStories) {
    const count = flowStepCounts.get(flowId) ?? 0
    if (count < minStepCount) minStepCount = count
  }

  // Stories belonging to any flow with minStepCount steps are minimum-path
  const minFlowIds = new Set<string>()
  for (const flowId of flowIdsWithStories) {
    if ((flowStepCounts.get(flowId) ?? 0) === minStepCount) {
      minFlowIds.add(flowId)
    }
  }

  return stories.filter(s => minFlowIds.has(s.parent_flow_id))
}

// ============================================================================
// Dependency Inference
// ============================================================================

/**
 * Infer dependency edges from stories sharing the same parent_flow_id.
 * Stories from the same flow are ordered by their flow_step_reference and
 * connected sequentially: story[i] → story[i+1].
 *
 * Edge type: 'flow_order'
 */
export function inferDependencyEdges(stories: GeneratedStory[]): DependencyEdge[] {
  // Group stories by parent_flow_id
  const byFlow = new Map<string, GeneratedStory[]>()
  for (const story of stories) {
    const group = byFlow.get(story.parent_flow_id) ?? []
    group.push(story)
    byFlow.set(story.parent_flow_id, group)
  }

  const edges: DependencyEdge[] = []

  for (const [_flowId, flowStories] of byFlow) {
    if (flowStories.length <= 1) continue

    // Sort by flow_step_reference (lexicographic — step-1, step-2, steps-1-3, etc.)
    const sorted = [...flowStories].sort((a, b) =>
      a.flow_step_reference.localeCompare(b.flow_step_reference),
    )

    // Wire sequential edges
    for (let i = 0; i < sorted.length - 1; i++) {
      edges.push({
        from: storyKey(sorted[i]),
        to: storyKey(sorted[i + 1]),
        type: 'flow_order',
      })
    }
  }

  return edges
}

// ============================================================================
// Topological Layer Partitioning (Kahn's Algorithm)
// ============================================================================

/**
 * Compute parallel groups via BFS topological layer partitioning.
 * Each layer contains stories with no unresolved dependencies in prior layers.
 *
 * Returns: array of layers, each layer is an array of story composite keys.
 */
export function computeParallelGroups(storyKeys: string[], edges: DependencyEdge[]): string[][] {
  if (storyKeys.length === 0) return []

  // Build adjacency list and in-degree map
  const inDegree = new Map<string, number>()
  const adjacency = new Map<string, string[]>()

  for (const key of storyKeys) {
    inDegree.set(key, 0)
    adjacency.set(key, [])
  }

  for (const edge of edges) {
    // Only include edges where both endpoints are in our key set
    if (!inDegree.has(edge.from) || !inDegree.has(edge.to)) continue

    adjacency.get(edge.from)!.push(edge.to)
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1)
  }

  const layers: string[][] = []
  let frontier = storyKeys.filter(k => (inDegree.get(k) ?? 0) === 0)

  while (frontier.length > 0) {
    layers.push([...frontier])
    const nextFrontier: string[] = []

    for (const key of frontier) {
      for (const neighbor of adjacency.get(key) ?? []) {
        const deg = (inDegree.get(neighbor) ?? 0) - 1
        inDegree.set(neighbor, deg)
        if (deg === 0) nextFrontier.push(neighbor)
      }
    }

    frontier = nextFrontier
  }

  return layers
}

// ============================================================================
// Topological Order
// ============================================================================

/**
 * Produce a flattened topological order of stories, minimum-path first.
 */
export function orderStories(
  stories: GeneratedStory[],
  parallelGroups: string[][],
): GeneratedStory[] {
  const keyToStory = new Map<string, GeneratedStory>(stories.map(s => [storyKey(s), s]))

  const seen = new Set<string>()
  const result: GeneratedStory[] = []

  // Minimum-path stories first (within each layer)
  for (const layer of parallelGroups) {
    const minPath = layer.filter(k => keyToStory.get(k)?.minimum_path === true)
    const rest = layer.filter(k => keyToStory.get(k)?.minimum_path !== true)

    for (const key of [...minPath, ...rest]) {
      if (!seen.has(key)) {
        seen.add(key)
        const story = keyToStory.get(key)
        if (story) result.push(story)
      }
    }
  }

  // Append any stories not captured in topological order (cycle or orphan)
  for (const story of stories) {
    const key = storyKey(story)
    if (!seen.has(key)) {
      result.push(story)
    }
  }

  return result
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the wire_dependencies LangGraph node.
 *
 * AC-2: Infers dependency edges from parent_flow_id + flow step ordering.
 * AC-3: Assigns minimum_path=true to stories in the flow with fewest total steps.
 * AC-4: Computes parallelGroups via BFS topological layer partitioning.
 *
 * @param config - Optional config with injectable minimumPathFn
 */
export function createWireDependenciesNode(config: { minimumPathFn?: MinimumPathFn } = {}) {
  return async (state: StoryGenerationState): Promise<Partial<StoryGenerationState>> => {
    try {
      logger.info('wire_dependencies: starting', {
        planSlug: state.planSlug,
        storyCount: state.generatedStories.length,
      })

      if (state.generatedStories.length === 0) {
        logger.warn('wire_dependencies: no generated stories to wire', {
          planSlug: state.planSlug,
        })
        return {
          dependencyEdges: [],
          parallelGroups: [],
          orderedStories: [],
          generatedStoriesWithDeps: [],
          generationPhase: 'validate_graph',
        }
      }

      // Determine minimum-path stories
      const minimumPathFn = config.minimumPathFn ?? defaultMinimumPathFn
      const minPathStories = minimumPathFn(state.generatedStories, state.flows)
      const minPathKeys = new Set(minPathStories.map(storyKey))

      // Apply minimum_path flag to all stories
      const storiesWithMinPath: GeneratedStory[] = state.generatedStories.map(s => ({
        ...s,
        minimum_path: minPathKeys.has(storyKey(s)),
      }))

      // Infer dependency edges
      const dependencyEdges = inferDependencyEdges(storiesWithMinPath)

      // Compute parallel groups
      const allKeys = storiesWithMinPath.map(storyKey)
      const parallelGroups = computeParallelGroups(allKeys, dependencyEdges)

      // Order stories: minimum-path first, then topo order
      const orderedStories = orderStories(storiesWithMinPath, parallelGroups)

      logger.info('wire_dependencies: complete', {
        planSlug: state.planSlug,
        edgeCount: dependencyEdges.length,
        layerCount: parallelGroups.length,
        orderedCount: orderedStories.length,
      })

      return {
        generatedStories: storiesWithMinPath,
        dependencyEdges,
        parallelGroups,
        orderedStories,
        generatedStoriesWithDeps: orderedStories,
        generationPhase: 'validate_graph',
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logger.error('wire_dependencies: unexpected error', { err, planSlug: state.planSlug })
      return {
        generationPhase: 'error',
        errors: [`wire_dependencies failed: ${message}`],
      }
    }
  }
}
