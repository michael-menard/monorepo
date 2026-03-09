/**
 * Gatekeeper Sidecar Service — Public API
 * WINT-3010: Create Gatekeeper Sidecar
 *
 * Exports the core gate check function and all Zod schemas.
 * The MCP tool wrapper imports gateCheck directly (ARCH-002).
 */

// Core gate check compute function
export { gateCheck } from './gate-check.js'

// Schemas and types
export {
  GateStageSchema,
  GateCheckRequestSchema,
  GateCheckHttpResponseSchema,
  GateCheckPassedResultSchema,
  PostBootstrapProofSchema,
  ElabCompleteProofSchema,
  ScopeOkProofSchema,
  PatchCompleteProofSchema,
  type GateStage,
  type GateCheckRequest,
  type GateCheckHttpResponse,
  type GateCheckPassedResult,
  type PostBootstrapProof,
  type ElabCompleteProof,
  type ScopeOkProof,
  type PatchCompleteProof,
} from './__types__/index.js'
