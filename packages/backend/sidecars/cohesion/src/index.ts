/**
 * Cohesion Sidecar — Package Entry Point
 * WINT-4010: Create Cohesion Sidecar
 *
 * Exports MCP tool wrappers for cohesion audit and check operations.
 * MCP wrappers call compute functions directly (OPP-04 — no HTTP runtime dependency).
 */

export { cohesion_audit } from './mcp-tools/cohesion-audit.js'
export { cohesion_check } from './mcp-tools/cohesion-check.js'

// Types
export type {
  CohesionAuditResult,
  CohesionCheckResult,
  CohesionAuditRequest,
  CohesionCheckRequest,
  CoverageSummary,
  CapabilityCoverage,
} from './__types__/index.js'
