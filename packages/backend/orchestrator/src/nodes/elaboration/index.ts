/**
 * Elaboration Nodes
 *
 * Nodes for story elaboration workflows including delta detection,
 * delta review, and iterative refinement tracking.
 */

export {
  // Main node (FLOW-031)
  deltaDetectionNode,
  createDeltaDetectionNode,
  // Helper functions (for testing and direct use)
  classifyChange,
  diffSections,
  detectDeltas,
  // Schemas
  ChangeTypeSchema,
  SectionNameSchema,
  SectionChangeSchema,
  DeltaSummaryStatsSchema,
  DeltaDetectionResultSchema,
  DeltaDetectionConfigSchema,
  DeltaDetectionNodeResultSchema,
  // Types
  type ChangeType,
  type SectionName,
  type SectionChange,
  type DeltaSummaryStats,
  type DeltaDetectionResult,
  type DeltaDetectionConfig,
  type DeltaDetectionNodeResult,
  type GraphStateWithDeltaDetection,
} from './delta-detect.js'

export {
  // Main node (FLOW-032)
  deltaReviewNode,
  createDeltaReviewNode,
  // Helper functions (for testing and direct use)
  reviewSection,
  aggregateFindings,
  performDeltaReview,
  // Schemas
  ReviewSeveritySchema,
  ReviewCategorySchema,
  ReviewFindingSchema,
  SectionReviewSummarySchema,
  DeltaReviewResultSchema,
  DeltaReviewConfigSchema,
  DeltaReviewNodeResultSchema,
  // Types
  type ReviewSeverity,
  type ReviewCategory,
  type ReviewFinding,
  type SectionReviewSummary,
  type DeltaReviewResult,
  type DeltaReviewConfig,
  type DeltaReviewNodeResult,
  type SectionReviewContext,
  type GraphStateWithDeltaReview,
} from './delta-review.js'

export {
  // Main node (FLOW-033)
  escapeHatchNode,
  createEscapeHatchNode,
  // Helper functions (for testing and direct use)
  evaluateAttackImpact,
  evaluateCrossCuttingChanges,
  evaluateScopeExpansion,
  evaluateConsistencyViolations,
  evaluateEscapeHatch,
  determineStakeholders,
  determineReviewScope,
  // Schemas
  EscapeHatchTriggerSchema,
  TriggerEvaluationSchema,
  StakeholderSchema,
  ReviewScopeSchema,
  EscapeHatchResultSchema,
  EscapeHatchConfigSchema,
  EscapeHatchNodeResultSchema,
  // Types
  type EscapeHatchTrigger,
  type TriggerEvaluation,
  type Stakeholder,
  type ReviewScope,
  type EscapeHatchResult,
  type EscapeHatchConfig,
  type EscapeHatchNodeResult,
  type GraphStateWithEscapeHatch,
} from './escape-hatch.js'
