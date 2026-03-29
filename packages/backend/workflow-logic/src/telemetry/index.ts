/**
 * Telemetry phase mapping business logic
 *
 * Pure functions for converting between workflow ArtifactPhase values and
 * the MCP telemetry phase enum used by workflow_log_invocation.
 * No I/O — all functions are deterministic and side-effect free.
 *
 * AC-8: mapArtifactPhaseToMcpPhase pure function with explicit mapping table
 *
 * Story: WINT-9100
 */

import { z } from 'zod'
import { ArtifactPhaseSchema, type ArtifactPhase } from '../artifact/index.js'

// ============================================================================
// Schemas
// ============================================================================

/**
 * MCP invocation phase enum.
 * Maps to WorkflowLogInvocationInputSchema.phase in the KB MCP tools.
 */
export const McpInvocationPhaseSchema = z.enum(['setup', 'plan', 'execute', 'review', 'qa'])
export type McpInvocationPhase = z.infer<typeof McpInvocationPhaseSchema>

// ============================================================================
// Phase mapping table
// Explicit, tested mapping from ArtifactPhase → McpInvocationPhase
// ============================================================================

const ARTIFACT_TO_MCP_PHASE_MAP: Record<ArtifactPhase, McpInvocationPhase> = {
  setup: 'setup',
  analysis: 'plan',
  planning: 'plan',
  implementation: 'execute',
  code_review: 'review',
  qa_verification: 'qa',
  completion: 'qa',
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Maps an ArtifactPhase or MCP phase string to a McpInvocationPhase.
 *
 * Handles two cases:
 * 1. Value is already a valid McpInvocationPhase (pass-through)
 * 2. Value is an ArtifactPhase — converts using explicit mapping table
 *
 * Returns undefined for unknown/null/undefined values.
 *
 * @param phase - ArtifactPhase value or McpInvocationPhase string
 * @returns McpInvocationPhase or undefined if unmappable
 */
export function mapArtifactPhaseToMcpPhase(
  phase: string | undefined | null,
): McpInvocationPhase | undefined {
  if (!phase) return undefined

  // If already a valid MCP phase, return as-is
  const mcpParse = McpInvocationPhaseSchema.safeParse(phase)
  if (mcpParse.success) {
    return mcpParse.data
  }

  // Try to map from ArtifactPhase
  const artifactParse = ArtifactPhaseSchema.safeParse(phase)
  if (artifactParse.success) {
    return ARTIFACT_TO_MCP_PHASE_MAP[artifactParse.data]
  }

  return undefined
}
