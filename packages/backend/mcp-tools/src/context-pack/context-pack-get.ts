/**
 * context_pack_get MCP Tool Wrapper
 * WINT-2020: Create Context Pack Sidecar
 *
 * Imports assembleContextPack directly from @repo/context-pack-sidecar (ARCH-001).
 * Direct import avoids requiring the sidecar HTTP server to be running.
 *
 * The kbSearch dependency is set to a no-op by default — callers that need real
 * KB search results must inject a concrete KbSearchFn via the optional deps parameter.
 */

import { logger } from '@repo/logger'
import {
  assembleContextPack,
  type AssembleContextPackDeps,
  type KbSearchResult,
  ContextPackRequestSchema,
  type ContextPackRequest,
  type ContextPackResponse,
} from '@repo/context-pack-sidecar'

// ============================================================================
// No-op fallback KB search
// ============================================================================

/**
 * No-op KB search for when the real KB client is not available.
 * Returns empty results gracefully.
 */
function createNoOpKbSearch(): AssembleContextPackDeps['kbSearch'] {
  return async (_input): Promise<KbSearchResult> => ({
    results: [],
    metadata: { total: 0, fallback_mode: true },
  })
}

const defaultDeps: AssembleContextPackDeps = {
  kbSearch: createNoOpKbSearch(),
}

// ============================================================================
// MCP Tool Entry Point
// ============================================================================

/**
 * Retrieve or assemble a context pack for the given story + role.
 *
 * Direct import from @repo/context-pack-sidecar (ARCH-001) — no HTTP call.
 *
 * @param input - ContextPackRequest: story_id, node_type, role, optional ttl
 * @param deps - Optional KB search deps; defaults to no-op (cache-only)
 * @returns Assembled context pack or null on error
 *
 * @example
 * ```typescript
 * const pack = await contextPackGet({
 *   story_id: 'WINT-2020',
 *   node_type: 'plan',
 *   role: 'dev',
 * })
 * if (pack) {
 *   console.log(pack.story_brief)
 * }
 * ```
 */
export async function contextPackGet(
  input: ContextPackRequest,
  deps: AssembleContextPackDeps = defaultDeps,
): Promise<ContextPackResponse | null> {
  try {
    const validated = ContextPackRequestSchema.parse(input)

    logger.info('[mcp-tools] context_pack_get called', {
      story_id: validated.story_id,
      node_type: validated.node_type,
      role: validated.role,
    })

    const result = await assembleContextPack(validated, deps)

    logger.info('[mcp-tools] context_pack_get succeeded', {
      story_id: validated.story_id,
      node_type: validated.node_type,
      role: validated.role,
    })

    return result
  } catch (error) {
    logger.warn('[mcp-tools] context_pack_get failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}
