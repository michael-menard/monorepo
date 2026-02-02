/**
 * LangGraph Nodes
 *
 * Domain-specific node implementations for orchestrator workflows.
 */

// Reality Intake Nodes
export {
  // Baseline loader (FLOW-021)
  loadBaselineRealityNode,
  createLoadBaselineNode,
  findBaselineFiles,
  parseMarkdownSections,
  extractListItems,
  parseBaselineFile,
  loadMostRecentBaseline,
  BaselineRealitySectionSchema,
  BaselineRealitySchema,
  LoadBaselineConfigSchema,
  LoadBaselineResultSchema,
  type BaselineReality,
  type BaselineRealitySection,
  type LoadBaselineConfig,
  type LoadBaselineResult,
  type GraphStateWithBaseline,
  // Context retrieval (FLOW-022)
  retrieveContextNode,
  createRetrieveContextNode,
  createScopedRetrieveContextNode,
  determineRelevantPatterns,
  shouldExcludeFile,
  matchesIncludePattern,
  walkDirectory,
  loadFileContent,
  retrieveContextForScope,
  ScopePatternSchema,
  StoryScopeSchema,
  FileContextSchema,
  RetrievedContextSchema,
  RetrieveContextConfigSchema,
  RetrieveContextResultSchema,
  type ScopePattern,
  type StoryScope,
  type FileContext,
  type RetrievedContext,
  type RetrieveContextConfig,
  type RetrieveContextResult,
  type GraphStateWithContext,
} from './reality/index.js'

// Story Nodes
export {
  // Story seed (FLOW-023)
  storySeedNode,
  createStorySeedNode,
  createPrefilledStorySeedNode,
  generateStoryId,
  extractConstraintsFromBaseline,
  extractAffectedFiles,
  generateInitialACs,
  estimateComplexity,
  generateStorySeed,
  StoryRequestSchema,
  AcceptanceCriterionSchema,
  StoryStructureSchema,
  SeedConfigSchema,
  SeedResultSchema,
  type StoryRequest,
  type AcceptanceCriterion,
  type StoryStructure,
  type SeedConfig,
  type SeedResult,
  type GraphStateWithStorySeed,
} from './story/index.js'

// Metrics Nodes
export {
  // Gap analytics (FLOW-041)
  gapAnalyticsNode,
  createGapAnalyticsNode,
  calculateGapYield,
  calculateAcceptanceRates,
  calculateEvidenceRates,
  calculateResolutionTimes,
  generateGapAnalytics,
  GapYieldMetricsSchema,
  AcceptanceRatesBySourceSchema,
  EvidenceMetricsSchema,
  ResolutionMetricsSchema,
  GapAnalyticsResultSchema,
  GapAnalyticsConfigSchema,
  type GapYieldMetrics,
  type AcceptanceRatesBySource,
  type EvidenceMetrics,
  type ResolutionMetrics,
  type GapAnalyticsResult,
  type GapAnalyticsConfig,
  type GraphStateWithGapAnalytics,
} from './metrics/index.js'

// Gate Nodes
export {
  // Commitment gate (FLOW-034)
  commitmentGateNode,
  createCommitmentGateNode,
  createCommitmentGateWithOverride,
  checkReadinessThreshold,
  checkBlockerCount,
  checkUnknownCount,
  generateGateSummary,
  createOverrideAudit,
  validateCommitmentReadiness,
  DEFAULT_GATE_THRESHOLDS,
  GateRequirementsSchema,
  GateCheckResultSchema,
  OverrideRequestSchema,
  OverrideAuditEntrySchema,
  CommitmentGateResultSchema,
  CommitmentGateConfigSchema,
  CommitmentGateNodeResultSchema,
  type GateRequirements,
  type GateCheckResult,
  type OverrideRequest,
  type OverrideAuditEntry,
  type CommitmentGateResult,
  type CommitmentGateConfig,
  type CommitmentGateNodeResult,
  type GraphStateWithCommitmentGate,
} from './gates/index.js'

// Elaboration Nodes
export {
  // Delta detection (FLOW-031)
  deltaDetectionNode,
  createDeltaDetectionNode,
  classifyChange,
  diffSections,
  detectDeltas,
  ChangeTypeSchema,
  SectionNameSchema,
  SectionChangeSchema,
  DeltaSummaryStatsSchema,
  DeltaDetectionResultSchema,
  DeltaDetectionConfigSchema,
  DeltaDetectionNodeResultSchema,
  type ChangeType,
  type SectionName,
  type SectionChange,
  type DeltaSummaryStats,
  type DeltaDetectionResult,
  type DeltaDetectionConfig,
  type DeltaDetectionNodeResult,
  type GraphStateWithDeltaDetection,
} from './elaboration/index.js'

// Persistence Nodes
export {
  // Load from DB
  loadFromDbNode,
  createLoadFromDbNode,
  loadFromDb,
  LoadFromDbConfigSchema,
  LoadFromDbResultSchema,
  type LoadFromDbConfig,
  type LoadFromDbResult,
  type GraphStateWithDbLoad,
  // Save to DB
  saveToDbNode,
  createSaveToDbNode,
  createSaveStoryStateNode,
  saveToDb,
  SaveToDbConfigSchema,
  SaveToDbResultSchema,
  type SaveToDbConfig,
  type SaveToDbResult,
  type GraphStateWithDbSave,
} from './persistence/index.js'

// Completion Nodes
export {
  // Persist learnings
  persistLearningsNode,
  createPersistLearningsNode,
  persistLearnings,
  extractLearnings,
  formatLearningContent,
  generateLearningTags,
  LearningCategorySchema,
  LearningSchema,
  PersistLearningsConfigSchema,
  PersistLearningsResultSchema,
  type Learning,
  type LearningCategory,
  type PersistLearningsConfig,
  type PersistLearningsResult,
  type GraphStateWithLearnings,
} from './completion/index.js'
