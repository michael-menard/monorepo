/**
 * LangGraph Graphs
 *
 * Complete graph compositions for orchestrator workflows.
 */

// Metrics Collection Graph (FLOW-044)
export {
  // Graph factory and runner
  createMetricsGraph,
  runMetricsCollection,
  // Node adapters for workflow integration
  metricsCollectionNode,
  createMetricsCollectionNode,
  // Individual node factories
  createInitializeNode,
  createGapAnalyticsCollectorNode,
  createAggregationNode,
  createOutputNode,
  // Schemas
  MetricsTypeSchema,
  MetricsGraphConfigSchema,
  MetricEntrySchema,
  AggregatedMetricsSchema,
  MetricsReportSchema,
  // State annotation
  MetricsGraphStateAnnotation,
  // Types
  type MetricsType,
  type MetricsGraphConfig,
  type MetricEntry,
  type AggregatedMetrics,
  type MetricsReport,
  type MetricsGraphState,
  type GraphStateWithMetrics,
} from './metrics.js'

// Story Creation Graph (FLOW-042)
export {
  // Graph factory and runner
  createStoryCreationGraph,
  runStoryCreation,
  // Node adapters for workflow integration
  storyCreationNode,
  createStoryCreationNode,
  // Individual node factories (prefixed to avoid collision with metrics graph)
  createInitializeNode as createStoryCreationInitializeNode,
  createLoadBaselineNode as createStoryCreationLoadBaselineNode,
  createRetrieveContextNode as createStoryCreationRetrieveContextNode,
  createStorySeedNode as createStoryCreationSeedNode,
  createFanoutPMNode as createStoryCreationFanoutPMNode,
  createFanoutUXNode as createStoryCreationFanoutUXNode,
  createFanoutQANode as createStoryCreationFanoutQANode,
  createMergeFanoutNode as createStoryCreationMergeFanoutNode,
  createAttackNode as createStoryCreationAttackNode,
  createGapHygieneNode as createStoryCreationGapHygieneNode,
  createReadinessScoringNode as createStoryCreationReadinessScoringNode,
  createHiTLNode as createStoryCreationHiTLNode,
  createSynthesisNode as createStoryCreationSynthesisNode,
  createCompleteNode as createStoryCreationCompleteNode,
  // Schemas
  HiTLDecisionSchema,
  StoryCreationConfigSchema,
  WorkflowPhaseSchema,
  StoryCreationResultSchema,
  // State annotation
  StoryCreationStateAnnotation,
  // Types
  type HiTLDecision,
  type StoryCreationConfig,
  type WorkflowPhase,
  type StoryCreationResult,
  type StoryCreationState,
  type GraphStateWithStoryCreation,
} from './story-creation.js'

// Elaboration Graph (FLOW-043)
export {
  // Graph factory and runner
  createElaborationGraph,
  runElaboration,
  // Node adapters for workflow integration
  elaborationNode,
  createElaborationNode,
  // Individual node factories (prefixed to avoid collision)
  createInitializeNode as createElaborationInitializeNode,
  createLoadPreviousVersionNode as createElaborationLoadPreviousVersionNode,
  createDeltaDetectNode as createElaborationDeltaDetectNode,
  createDeltaReviewNode as createElaborationDeltaReviewNode,
  createEscapeHatchEvalNode as createElaborationEscapeHatchEvalNode,
  createTargetedReviewNode as createElaborationTargetedReviewNode,
  createAggregateNode as createElaborationAggregateNode,
  createUpdateReadinessNode as createElaborationUpdateReadinessNode,
  createCompleteNode as createElaborationCompleteNode,
  // Schemas
  ElaborationConfigSchema,
  ElaborationPhaseSchema,
  AggregatedFindingsSchema,
  ElaborationResultSchema,
  // State annotation
  ElaborationStateAnnotation,
  // Types
  type ElaborationConfig,
  type ElaborationPhase,
  type AggregatedFindings,
  type ElaborationResult,
  type ElaborationState,
  type GraphStateWithElaboration,
} from './elaboration.js'

// Code Audit Graph (FLOW-045)
export {
  // Graph factory and runner
  createCodeAuditGraph,
  runCodeAudit,
  // Node adapters for workflow integration
  codeAuditNode,
  createCodeAuditNode,
  // Schemas
  CodeAuditConfigSchema,
  // State annotation
  CodeAuditStateAnnotation,
  // Types
  type CodeAuditConfig,
  type CodeAuditState,
  type GraphStateWithCodeAudit,
} from './code-audit.js'

// Bootstrap Graph (WINT-9110, AC-1)
export {
  // Graph factory and runner
  createBootstrapGraph,
  runBootstrap,
  // Node adapters for workflow integration
  createBootstrapNode,
  // Individual node factories
  createBootstrapInitializeNode,
  createRunStoryCreationNode,
  createBootstrapCompleteNode,
  // Conditional edge functions (exported for test access — ARCH-002)
  afterBootstrapInitialize,
  afterRunStoryCreation,
  // Schemas
  BootstrapConfigSchema,
  BootstrapResultSchema,
  // State annotation
  BootstrapStateAnnotation,
  // Types
  type BootstrapConfig,
  type BootstrapResult,
  type BootstrapState,
  type GraphStateWithBootstrap,
} from './bootstrap.js'

// Elab Epic Graph — Send API fan-out (WINT-9110, AC-2)
export {
  // Graph factory and runner
  createElabEpicGraph,
  runElabEpic,
  // Node adapters for workflow integration
  createElabEpicNode,
  // Individual node factories
  createElabEpicDispatcher,
  createElabStoryWorkerNode,
  createElabEpicFanInNode,
  createElabEpicCompleteNode,
  // Conditional edge functions
  afterFanIn,
  // Schemas
  ElabEpicConfigSchema,
  ElabEpicResultSchema,
  StoryEntrySchema,
  // State annotation
  ElabEpicStateAnnotation,
  // Types
  type ElabEpicConfig,
  type ElabEpicResult,
  type ElabEpicState,
  type StoryEntry,
  type GraphStateWithElabEpic,
} from './elab-epic.js'

// Elab Story Graph — single-story elaboration wrapper (WINT-9110, AC-3)
export {
  // Graph factory and runner
  createElabStoryGraph,
  runElabStory,
  // Node adapters for workflow integration
  createElabStoryNode,
  // Individual node factories
  createElabStoryInitializeNode,
  createWorktreeSetupNode,
  createElaborationSubgraphNode,
  createWorktreeTeardownNode,
  createElabStoryCompleteNode,
  // Conditional edge functions
  afterElabStoryInitialize,
  afterElaborationSubgraph,
  afterWorktreeTeardown,
  // Schemas
  ElabStoryConfigSchema,
  ElabStoryResultSchema,
  // State annotation
  ElabStoryStateAnnotation,
  // Types
  type ElabStoryConfig,
  type ElabStoryResult,
  type ElabStoryState,
  type GraphStateWithElabStory,
} from './elab-story.js'

// Dev Implement Graph (WINT-9110, AC-4)
export {
  // Graph factory and runner
  createDevImplementGraph,
  runDevImplement,
  // Node adapters for workflow integration
  createDevImplementNode,
  // Individual node factories
  createDevImplementInitializeNode,
  createLoadPlanNode,
  createExecuteNode,
  createCollectEvidenceNode,
  createDevImplementSaveToDbNode,
  createDevImplementCompleteNode,
  // Conditional edge functions
  afterDevImplementInitialize,
  afterLoadPlan,
  afterExecute,
  afterReviewSubgraph,
  afterCollectEvidence,
  afterSaveToDb,
  // Schemas
  DevImplementConfigSchema,
  DevImplementResultSchema,
  // State annotation
  DevImplementStateAnnotation,
  // Types
  type DevImplementConfig,
  type DevImplementResult,
  type DevImplementState,
  type GraphStateWithDevImplement,
} from './dev-implement.js'

// QA Verify Graph (WINT-9110, AC-5)
export {
  // Graph factory and runner
  createQAVerifyGraph,
  runQAVerify,
  // Node adapters for workflow integration
  createQAVerifyNode,
  // Individual node factories
  createQAVerifyInitializeNode,
  createQAVerifyPreconditionsNode,
  createQASubgraphNode,
  createQAStateTransitionNode,
  createQAVerifyCompleteNode,
  // Conditional edge functions
  afterQAVerifyInitialize,
  afterQAVerifyPreconditions,
  afterQASubgraph,
  afterStateTransition,
  // Schemas
  QAVerifyConfigSchema,
  QAVerifyResultSchema,
  // State annotation
  QAVerifyStateAnnotation,
  // Types
  type QAVerifyConfig,
  type QAVerifyResult,
  type QAVerifyState,
  type GraphStateWithQAVerify,
} from './qa-verify.js'

// Backlog Review Graph (WINT-9110, AC-6)
export {
  // Graph factory and runner
  createBacklogReviewGraph,
  runBacklogReview,
  // Node adapters for workflow integration
  createBacklogReviewNode,
  // Individual node factories
  createBacklogReviewInitializeNode,
  createLoadBacklogNode,
  createMLScoreNode,
  createCuratorAnalyzeNode,
  createReorderNode,
  createBacklogPersistNode,
  createBacklogReviewCompleteNode,
  // Conditional edge functions
  afterBacklogReviewInitialize,
  afterLoadBacklog,
  afterMLScore,
  afterCuratorAnalyze,
  afterReorder,
  afterPersist,
  // Schemas
  BacklogReviewConfigSchema,
  BacklogReviewResultSchema,
  BacklogStorySchema,
  // State annotation
  BacklogReviewStateAnnotation,
  // Types
  type BacklogReviewConfig,
  type BacklogReviewResult,
  type BacklogReviewState,
  type BacklogStory,
  type GraphStateWithBacklogReview,
} from './backlog-review.js'

// Batch Process Graph — Send API fan-out (WINT-9060)
export {
  // Graph factory and runner
  createBatchProcessGraph,
  runBatchProcess,
  // Node adapters for workflow integration
  createBatchProcessNode,
  // Individual node factories
  createBatchProcessDispatcher,
  createBatchStoryWorkerNode,
  createBatchProcessFanInNode,
  createBatchProcessCompleteNode,
  // Conditional edge functions
  afterBatchFanIn,
  // Schemas
  BatchProcessConfigSchema,
  BatchProcessResultSchema,
  BatchWorkerResultSchema,
  // State annotation
  BatchProcessStateAnnotation,
  // Types
  type BatchProcessConfig,
  type BatchProcessResult,
  type BatchWorkerResult,
  type BatchProcessState,
  type GraphStateWithBatchProcess,
} from './batch-process.js'
