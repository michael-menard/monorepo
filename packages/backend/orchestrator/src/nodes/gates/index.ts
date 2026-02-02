/**
 * Gate Nodes
 *
 * Nodes for workflow gate validation in the orchestrator.
 * Gates enforce quality thresholds before allowing workflow progression.
 */

export {
  // Main node (FLOW-034)
  commitmentGateNode,
  createCommitmentGateNode,
  createCommitmentGateWithOverride,
  // Helper functions (for testing and direct use)
  checkReadinessThreshold,
  checkBlockerCount,
  checkUnknownCount,
  generateGateSummary,
  createOverrideAudit,
  validateCommitmentReadiness,
  // Constants
  DEFAULT_GATE_THRESHOLDS,
  // Schemas
  GateRequirementsSchema,
  GateCheckResultSchema,
  OverrideRequestSchema,
  OverrideAuditEntrySchema,
  CommitmentGateResultSchema,
  CommitmentGateConfigSchema,
  CommitmentGateNodeResultSchema,
  // Types
  type GateRequirements,
  type GateCheckResult,
  type OverrideRequest,
  type OverrideAuditEntry,
  type CommitmentGateResult,
  type CommitmentGateConfig,
  type CommitmentGateNodeResult,
  type GraphStateWithCommitmentGate,
} from './commitment-gate.js'
