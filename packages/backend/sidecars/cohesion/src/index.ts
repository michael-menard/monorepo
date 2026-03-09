/**
 * Cohesion Sidecar Package Entry Point
 * WINT-4010: Create Cohesion Sidecar
 *
 * AC-9: Exports cohesion_audit and cohesion_check MCP tool wrappers.
 * Also exports compute functions and types for direct use by consumers.
 */

// MCP tool wrappers (AC-9)
export { cohesion_audit } from './mcp-tools/cohesion-audit.js'
export { cohesion_check } from './mcp-tools/cohesion-check.js'

// Compute functions (for direct import)
export { computeAudit } from './compute-audit.js'
export { computeCheck } from './compute-check.js'

// Types
export type {
  CohesionAuditRequest,
  CohesionAuditResult,
  CohesionCheckRequest,
  CohesionCheckResult,
  CohesionStatus,
  CapabilityCoverage,
  CoverageSummary,
  FrankenFeatureItem,
} from './__types__/index.js'
