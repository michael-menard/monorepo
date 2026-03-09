/**
 * gate_check MCP Tool Wrapper
 * WINT-3010: Create Gatekeeper Sidecar
 *
 * Imports gateCheck directly from @repo/gatekeeper-sidecar (ARCH-002).
 * Direct import avoids requiring the sidecar HTTP server to be running.
 * No fetch/HTTP call — follows context-pack-get.ts pattern.
 *
 * AC-9: MCP wrapper uses direct import, no HTTP call
 */

import { logger } from '@repo/logger'
import {
  gateCheck,
  GateCheckRequestSchema,
  type GateCheckRequest,
  type GateCheckHttpResponse,
} from '@repo/gatekeeper-sidecar'

// ============================================================================
// MCP Tool Entry Point
// ============================================================================

/**
 * Validate a gate check request against per-stage proof requirements.
 *
 * Direct import from @repo/gatekeeper-sidecar (ARCH-002) — no HTTP call.
 *
 * @param input - GateCheckRequest: stage, story_id, proof
 * @returns GateCheckHttpResponse or null on error
 *
 * @example
 * ```typescript
 * const result = await gateCheckTool({
 *   stage: 'POST_BOOTSTRAP',
 *   story_id: 'WINT-3010',
 *   proof: {
 *     story_id: 'WINT-3010',
 *     setup_complete: true,
 *     worktree_path: '/path/to/worktree',
 *   },
 * })
 * if (result?.ok) {
 *   console.log(result.data.passed) // true
 * }
 * ```
 */
export async function gateCheckTool(input: GateCheckRequest): Promise<GateCheckHttpResponse | null> {
  try {
    const validated = GateCheckRequestSchema.parse(input)

    logger.info('[mcp-tools] gate_check called', {
      stage: validated.stage,
      story_id: validated.story_id,
    })

    const result = gateCheck(validated)

    logger.info('[mcp-tools] gate_check completed', {
      stage: validated.stage,
      story_id: validated.story_id,
      ok: result.ok,
    })

    return result
  } catch (error) {
    logger.warn('[mcp-tools] gate_check failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}
