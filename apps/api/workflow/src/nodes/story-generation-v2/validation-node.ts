/**
 * validation_node (v2) — DETERMINISTIC
 *
 * Checks postconditions on the full story set before KB write.
 *
 * Story set postconditions:
 * 1. No cycles in dependency graph (HARD ERROR — blocks write)
 * 2. No orphan stories (story with no deps AND not on minimum path) → warning
 * 3. No duplicate story titles → warning
 * 4. At least one minimum_path: true story → warning if missing
 * 5. Every story has >= 2 AC → warning
 * 6. Every story has non-empty relevantFiles → warning
 * 7. Every story has non-empty scopeBoundary.inScope → warning
 *
 * Hard errors → generationV2Phase='error'
 * Warnings → generationV2Phase='write_to_kb' (proceed)
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type {
  EnrichedStory,
  DependencyEdgeV2,
  ValidationResultV2,
  StoryGenerationV2State,
} from '../../state/story-generation-v2-state.js'

// ============================================================================
// Config Schema
// ============================================================================

export const ValidationNodeConfigSchema = z.object({})

export type ValidationNodeConfig = z.infer<typeof ValidationNodeConfigSchema>

// ============================================================================
// Pure Functions (exported for unit testability)
// ============================================================================

/**
 * Detect cycles in a dependency graph using DFS.
 * Returns arrays of titles forming each detected cycle.
 */
export function detectCycles(edges: DependencyEdgeV2[]): string[][] {
  const adjacency = new Map<string, string[]>()

  edges.forEach(edge => {
    const neighbors = adjacency.get(edge.from) ?? []
    neighbors.push(edge.to)
    adjacency.set(edge.from, neighbors)
  })

  const allNodes = new Set<string>()
  edges.forEach(e => {
    allNodes.add(e.from)
    allNodes.add(e.to)
  })

  const visited = new Set<string>()
  const inStack = new Set<string>()
  const cycles: string[][] = []

  function dfs(node: string, path: string[]): void {
    if (inStack.has(node)) {
      // Found a cycle — extract it
      const cycleStart = path.indexOf(node)
      cycles.push(path.slice(cycleStart))
      return
    }

    if (visited.has(node)) return

    visited.add(node)
    inStack.add(node)
    path.push(node)
    ;(adjacency.get(node) ?? []).forEach(neighbor => {
      dfs(neighbor, [...path])
    })

    inStack.delete(node)
  }

  allNodes.forEach(node => {
    if (!visited.has(node)) {
      dfs(node, [])
    }
  })

  return cycles
}

/**
 * Find orphan stories: stories with no incoming or outgoing deps
 * AND not on the minimum path.
 */
export function findOrphans(stories: EnrichedStory[], edges: DependencyEdgeV2[]): string[] {
  const connectedTitles = new Set<string>()
  edges.forEach(e => {
    connectedTitles.add(e.from)
    connectedTitles.add(e.to)
  })

  return stories.filter(s => !connectedTitles.has(s.title) && !s.minimum_path).map(s => s.title)
}

/**
 * Find stories with duplicate titles.
 * Returns arrays of duplicate title strings.
 */
export function findDuplicates(stories: EnrichedStory[]): string[] {
  const seen = new Map<string, number>()
  stories.forEach(s => {
    seen.set(s.title, (seen.get(s.title) ?? 0) + 1)
  })

  return Array.from(seen.entries())
    .filter(([, count]) => count > 1)
    .map(([title]) => title)
}

/**
 * Validate the full story set.
 * Returns a ValidationResultV2 with errors (hard) and warnings (soft).
 */
export function validateStorySet(
  stories: EnrichedStory[],
  edges: DependencyEdgeV2[],
): ValidationResultV2 {
  const errors: string[] = []
  const warnings: string[] = []

  // 1. Cycle detection (hard error)
  const cycles = detectCycles(edges)
  if (cycles.length > 0) {
    cycles.forEach(cycle => {
      errors.push(`Dependency cycle detected: ${cycle.join(' → ')} → ${cycle[0]}`)
    })
  }

  // 2. Orphan stories (warning)
  const orphans = findOrphans(stories, edges)
  if (orphans.length > 0) {
    warnings.push(`Orphan stories (no deps, not on minimum path): ${orphans.join(', ')}`)
  }

  // 3. Duplicate titles (warning)
  const duplicates = findDuplicates(stories)
  if (duplicates.length > 0) {
    warnings.push(`Duplicate story titles: ${duplicates.join(', ')}`)
  }

  // 4. At least one minimum_path story (warning)
  const hasMinimumPath = stories.some(s => s.minimum_path)
  if (stories.length > 0 && !hasMinimumPath) {
    warnings.push(
      'No stories marked as minimum_path — at least one story should be on the critical path',
    )
  }

  // 5. Every story has >= 2 AC (warning)
  stories.forEach(s => {
    if (s.acceptance_criteria.length < 2) {
      warnings.push(`Story "${s.title}" has ${s.acceptance_criteria.length} AC (expected >= 2)`)
    }
  })

  // 6. Every story has non-empty relevantFiles (warning)
  stories.forEach(s => {
    if (s.relevantFiles.length === 0) {
      warnings.push(`Story "${s.title}" has no relevantFiles`)
    }
  })

  // 7. Every story has non-empty scopeBoundary.inScope (warning)
  stories.forEach(s => {
    if (s.scopeBoundary.inScope.length === 0) {
      warnings.push(`Story "${s.title}" has empty scopeBoundary.inScope`)
    }
  })

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  }
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the validation_node LangGraph node (v2).
 *
 * DETERMINISTIC — no LLM calls.
 * Cycle → hard error → generationV2Phase='error'
 * Warnings only → generationV2Phase='write_to_kb'
 */
export function createValidationNode(_config: Record<string, never> = {}) {
  return async (state: StoryGenerationV2State): Promise<Partial<StoryGenerationV2State>> => {
    try {
      logger.info('validation_node_v2: starting', {
        planSlug: state.planSlug,
        storyCount: state.orderedStories.length,
        edgeCount: state.dependencyEdges.length,
      })

      const validationResult = validateStorySet(state.orderedStories, state.dependencyEdges)

      logger.info('validation_node_v2: complete', {
        planSlug: state.planSlug,
        passed: validationResult.passed,
        errorCount: validationResult.errors.length,
        warningCount: validationResult.warnings.length,
      })

      if (!validationResult.passed) {
        logger.error('validation_node_v2: hard validation failure (cycle detected)', {
          planSlug: state.planSlug,
          errors: validationResult.errors,
        })
        return {
          validationResult,
          generationV2Phase: 'error',
          errors: validationResult.errors,
          warnings: validationResult.warnings,
        }
      }

      return {
        validationResult,
        generationV2Phase: 'write_to_kb',
        warnings: validationResult.warnings,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logger.error('validation_node_v2: unexpected error', { err, planSlug: state.planSlug })
      return {
        generationV2Phase: 'error',
        errors: [`validation_node_v2 failed: ${message}`],
      }
    }
  }
}
