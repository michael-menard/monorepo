/**
 * Metrics Nodes
 *
 * Nodes for calculating system learning metrics in the orchestrator workflow.
 * These metrics are for improving system behavior, NOT for performance evaluation.
 */

export {
  // Main node (FLOW-041)
  gapAnalyticsNode,
  createGapAnalyticsNode,
  // Helper functions (for testing and direct use)
  calculateGapYield,
  calculateAcceptanceRates,
  calculateEvidenceRates,
  calculateResolutionTimes,
  generateGapAnalytics,
  // Schemas
  GapYieldMetricsSchema,
  AcceptanceRatesBySourceSchema,
  EvidenceMetricsSchema,
  ResolutionMetricsSchema,
  GapAnalyticsResultSchema,
  GapAnalyticsConfigSchema,
  // Types
  type GapYieldMetrics,
  type AcceptanceRatesBySource,
  type EvidenceMetrics,
  type ResolutionMetrics,
  type GapAnalyticsResult,
  type GapAnalyticsConfig,
  type GraphStateWithGapAnalytics,
} from './gap-analytics.js'

export {
  // Main node (FLOW-035)
  collectEventsNode,
  createCollectEventsNode,
  // Helper functions (for testing and direct use)
  createEvent,
  detectClarificationEvents,
  detectScopeChangeEvents,
  countEventsByType,
  determineCurrentPhase,
  collectEvents,
  // Schemas
  WorkflowPhaseSchema,
  EventTypeSchema,
  EventDetailsSchema,
  WorkflowEventSchema,
  EventCountsSchema,
  EventCollectionResultSchema,
  EventCollectionConfigSchema,
  ConversationMessageSchema,
  ConversationSchema,
  // Types
  type WorkflowPhase,
  type EventType,
  type EventDetails,
  type WorkflowEvent,
  type EventCounts,
  type EventCollectionResult,
  type EventCollectionConfig,
  type ConversationMessage,
  type Conversation,
  type GraphStateWithEventCollection,
} from './collect-events.js'

export {
  // Main node (FLOW-036)
  calcTTDCNode,
  createCalcTTDCNode,
  // Helper functions (for testing and direct use)
  extractTTDCDataPoints,
  calculateMedian,
  calculateVariance,
  identifyOutliers,
  calculateTTDCMetrics,
  // Schemas
  TTDCDataPointSchema,
  TTDCMetricsSchema,
  TTDCResultSchema,
  TTDCConfigSchema,
  // Types
  type TTDCDataPoint,
  type TTDCMetrics,
  type TTDCResult,
  type TTDCConfig,
  type GraphStateWithTTDC,
} from './calc-ttdc.js'

export {
  // Main node (FLOW-037)
  calcPCARNode,
  createCalcPCARNode,
  // Helper functions (for testing and direct use)
  filterPostCommitmentEvents,
  classifyAmbiguityEvent,
  calculatePCARRate,
  calculatePCARMetrics,
  generatePCARAnalysis,
  // Schemas
  AmbiguityEventTypeSchema,
  AmbiguityEventSchema,
  PCARMetricsSchema,
  PCARResultSchema,
  PCARConfigSchema,
  // Types
  type AmbiguityEventType,
  type AmbiguityEvent,
  type PCARMetrics,
  type PCARResult,
  type PCARConfig,
  type GraphStateWithPCAR,
} from './calc-pcar.js'

export {
  // Main node (FLOW-038)
  countTurnsNode,
  createCountTurnsNode,
  // Helper functions (for testing and direct use)
  filterPostCommitmentTurns,
  classifyStakeholderTurn,
  countTurnsByPair,
  calculateTurnMetrics,
  generateTurnCountAnalysis,
  // Schemas
  StakeholderTypeSchema,
  TurnTriggerSchema,
  TurnEventSchema,
  StakeholderPairSchema,
  TurnCountsByPairSchema,
  TurnCountsByTriggerSchema,
  TurnMetricsSchema,
  TurnCountResultSchema,
  TurnCountConfigSchema,
  // Types
  type StakeholderType,
  type TurnTrigger,
  type TurnEvent,
  type StakeholderPair,
  type TurnCountsByPair,
  type TurnCountsByTrigger,
  type TurnMetrics,
  type TurnCountResult,
  type TurnCountConfig,
  type GraphStateWithTurnCount,
} from './count-turns.js'

export {
  // Main node (FLOW-039)
  calcChurnNode,
  createCalcChurnNode,
  // Helper functions (for testing and direct use)
  mapToChurnPhase,
  identifyChurnEvents,
  classifyChurnByPhase,
  calculateDistribution,
  assessChurnHealthiness,
  calculateChurnIndex,
  // Schemas
  ChurnPhaseSchema,
  ChurnEventSchema,
  ChurnDistributionSchema,
  ChurnPlacementIndexSchema,
  ChurnResultSchema,
  ChurnConfigSchema,
  // Types
  type ChurnPhase,
  type ChurnEvent,
  type ChurnDistribution,
  type ChurnPlacementIndex,
  type ChurnResult,
  type ChurnConfig,
  type GraphStateWithChurn,
} from './calc-churn.js'

export {
  // Main node (FLOW-040)
  trackLeakageNode,
  createTrackLeakageNode,
  // Helper functions (for testing and direct use)
  detectUnknownLeakage,
  calculateLeakageMetrics,
  trackLeakage,
  // Schemas
  LeakageSeveritySchema,
  LeakageCategorySchema,
  LeakageEventSchema,
  LeakageMetricsSchema,
  LeakageResultSchema,
  KnownUnknownSchema,
  LeakageConfigSchema,
  // Types
  type LeakageSeverity,
  type LeakageCategory,
  type LeakageEvent,
  type LeakageMetrics,
  type LeakageResult,
  type KnownUnknown,
  type LeakageConfig,
  type GraphStateWithLeakage,
} from './track-leakage.js'
