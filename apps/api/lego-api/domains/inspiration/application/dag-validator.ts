import type { Result } from '@repo/api-core'
import { ok, err } from '@repo/api-core'
import { logger } from '@repo/logger'
import type { AlbumParentRepository } from '../ports/index.js'

/**
 * DAG (Directed Acyclic Graph) Validator
 *
 * INSP-022: DAG Cycle Detection Algorithm
 *
 * Provides DFS-based cycle detection with memoization for album hierarchies.
 * Ensures albums cannot be their own ancestors, preventing infinite loops
 * in the album tree structure.
 *
 * Performance: O(V+E) where V = number of albums, E = number of parent relationships
 * Max nesting depth: 10 levels (configurable)
 */

export const MAX_ALBUM_DEPTH = 10

export type DagError = 'CYCLE_DETECTED' | 'MAX_DEPTH_EXCEEDED' | 'DB_ERROR'

/**
 * State tracking for DFS cycle detection
 *
 * - 'unvisited': Node has not been processed
 * - 'visiting': Node is currently in the DFS stack (potential cycle if revisited)
 * - 'visited': Node has been fully processed (no cycle through this path)
 */
type VisitState = 'unvisited' | 'visiting' | 'visited'

/**
 * Create the DAG Validator service
 *
 * @param albumParentRepo - Repository for accessing album parent relationships
 */
export function createDagValidator(albumParentRepo: AlbumParentRepository) {
  /**
   * Check if adding a parent relationship would create a cycle
   *
   * Uses DFS (Depth-First Search) to detect cycles. The algorithm works by:
   * 1. Starting from the potential parent album
   * 2. Traversing up through all ancestors
   * 3. If we find the child album in the ancestor chain, adding this
   *    relationship would create a cycle
   *
   * @param albumId - The album that would get a new parent
   * @param parentAlbumId - The album that would become the parent
   * @returns true if adding this relationship would create a cycle
   */
  async function wouldCreateCycle(albumId: string, parentAlbumId: string): Promise<boolean> {
    // Self-reference is always a cycle
    if (albumId === parentAlbumId) {
      return true
    }

    // Get all ancestors of the potential parent
    // If albumId is already an ancestor of parentAlbumId,
    // making parentAlbumId a parent of albumId would create a cycle
    try {
      const ancestors = await albumParentRepo.getAncestors(parentAlbumId)
      return ancestors.includes(albumId)
    } catch (error) {
      logger.error('Error checking for cycle:', error)
      // On error, assume cycle to be safe
      return true
    }
  }

  /**
   * Validate that adding a parent relationship is allowed
   *
   * Checks both cycle detection and max depth constraints.
   *
   * @param albumId - The album that would get a new parent
   * @param parentAlbumId - The album that would become the parent
   */
  async function validateAddParent(
    albumId: string,
    parentAlbumId: string,
  ): Promise<Result<void, DagError>> {
    // Check for cycle
    const hasCycle = await wouldCreateCycle(albumId, parentAlbumId)
    if (hasCycle) {
      logger.warn('Cycle detected when adding parent', { albumId, parentAlbumId })
      return err('CYCLE_DETECTED')
    }

    // Check depth constraint
    // The new depth of albumId would be: depth of parentAlbumId + 1
    try {
      const parentDepth = await albumParentRepo.getDepth(parentAlbumId)
      if (parentDepth + 1 > MAX_ALBUM_DEPTH) {
        logger.warn('Max depth exceeded when adding parent', {
          albumId,
          parentAlbumId,
          parentDepth,
          maxDepth: MAX_ALBUM_DEPTH,
        })
        return err('MAX_DEPTH_EXCEEDED')
      }
    } catch (error) {
      logger.error('Error checking depth:', error)
      return err('DB_ERROR')
    }

    return ok(undefined)
  }

  /**
   * Get the full ancestor chain for an album using DFS
   *
   * This is a utility function that returns all albums in the ancestor
   * chain, useful for breadcrumb navigation and debugging.
   *
   * @param albumId - The album to get ancestors for
   * @returns Array of album IDs from immediate parent to root
   */
  async function getAncestorChain(albumId: string): Promise<string[]> {
    const ancestors: string[] = []
    const visited = new Set<string>()

    async function dfs(currentId: string): Promise<void> {
      if (visited.has(currentId)) {
        return // Already processed this node
      }
      visited.add(currentId)

      const parents = await albumParentRepo.getParents(currentId)
      for (const parent of parents) {
        ancestors.push(parent.id)
        await dfs(parent.id)
      }
    }

    await dfs(albumId)
    return ancestors
  }

  /**
   * Get all descendants of an album using BFS
   *
   * Useful for bulk operations or checking impact of deletions.
   *
   * @param albumId - The album to get descendants for
   * @returns Array of album IDs that are descendants
   */
  async function getDescendants(albumId: string): Promise<string[]> {
    const descendants: string[] = []
    const visited = new Set<string>()
    const queue: string[] = [albumId]

    while (queue.length > 0) {
      const currentId = queue.shift()!
      if (visited.has(currentId)) {
        continue
      }
      visited.add(currentId)

      const children = await albumParentRepo.getChildren(currentId)
      for (const child of children) {
        if (!visited.has(child.id)) {
          descendants.push(child.id)
          queue.push(child.id)
        }
      }
    }

    return descendants
  }

  /**
   * Validate the entire DAG structure for a user
   *
   * Performs a full validation of all album relationships, checking for:
   * - Cycles in the graph
   * - Albums exceeding max depth
   *
   * This is useful for data integrity checks and migrations.
   *
   * @param userId - The user whose albums to validate
   * @param getAllAlbums - Function to get all album IDs for the user
   */
  async function validateEntireGraph(
    getAllAlbums: () => Promise<string[]>,
  ): Promise<Result<void, DagError>> {
    const allAlbums = await getAllAlbums()
    const visitState = new Map<string, VisitState>()

    // Initialize all albums as unvisited
    for (const albumId of allAlbums) {
      visitState.set(albumId, 'unvisited')
    }

    // DFS function with cycle detection
    async function dfs(albumId: string, depth: number): Promise<Result<void, DagError>> {
      if (depth > MAX_ALBUM_DEPTH) {
        return err('MAX_DEPTH_EXCEEDED')
      }

      const state = visitState.get(albumId)

      if (state === 'visiting') {
        // Back edge detected - cycle exists
        return err('CYCLE_DETECTED')
      }

      if (state === 'visited') {
        // Already fully processed
        return ok(undefined)
      }

      // Mark as visiting (in current DFS stack)
      visitState.set(albumId, 'visiting')

      // Visit all children
      const children = await albumParentRepo.getChildren(albumId)
      for (const child of children) {
        const result = await dfs(child.id, depth + 1)
        if (!result.ok) {
          return result
        }
      }

      // Mark as fully visited
      visitState.set(albumId, 'visited')
      return ok(undefined)
    }

    // Run DFS from each unvisited album
    for (const albumId of allAlbums) {
      if (visitState.get(albumId) === 'unvisited') {
        const result = await dfs(albumId, 0)
        if (!result.ok) {
          return result
        }
      }
    }

    return ok(undefined)
  }

  return {
    wouldCreateCycle,
    validateAddParent,
    getAncestorChain,
    getDescendants,
    validateEntireGraph,
    MAX_DEPTH: MAX_ALBUM_DEPTH,
  }
}

export type DagValidator = ReturnType<typeof createDagValidator>
