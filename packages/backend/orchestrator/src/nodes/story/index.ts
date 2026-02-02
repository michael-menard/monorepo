/**
 * Story Nodes
 *
 * Nodes for story generation and management in the orchestrator workflow.
 */

export {
  // Main node
  storySeedNode,
  createStorySeedNode,
  createPrefilledStorySeedNode,
  // Helper functions (for testing and direct use)
  generateStoryId,
  extractConstraintsFromBaseline,
  extractAffectedFiles,
  generateInitialACs,
  estimateComplexity,
  generateStorySeed,
  // Schemas
  StoryRequestSchema,
  AcceptanceCriterionSchema,
  StoryStructureSchema,
  SeedConfigSchema,
  SeedResultSchema,
  // Types
  type StoryRequest,
  type AcceptanceCriterion,
  type StoryStructure,
  type SeedConfig,
  type SeedResult,
  type GraphStateWithStorySeed,
} from './seed.js'

export {
  // Main node
  fanoutPMNode,
  createFanoutPMNode,
  // Helper functions (for testing and direct use)
  analyzeScopeGaps,
  analyzeRequirementGaps,
  analyzeDependencyGaps,
  analyzePriorityGaps,
  generatePMGapAnalysis,
  // Schemas
  ScopeGapSchema,
  RequirementGapSchema,
  DependencyGapSchema,
  PriorityGapSchema,
  PMGapStructureSchema,
  FanoutPMResultSchema,
  FanoutPMConfigSchema,
  // Types
  type ScopeGap,
  type RequirementGap,
  type DependencyGap,
  type PriorityGap,
  type PMGapStructure,
  type FanoutPMResult,
  type FanoutPMConfig,
  type GraphStateWithPMGaps,
} from './fanout-pm.js'

export {
  // Main node (FLOW-025)
  storyFanoutUXNode,
  createStoryFanoutUXNode,
  // Helper functions (for testing and direct use)
  generateGapId,
  calculateGapSummary,
  determineUXReadiness,
  analyzeAccessibilityGaps,
  analyzeUsabilityGaps,
  analyzeDesignPatternGaps,
  analyzeUserFlowGaps,
  generateUXGapAnalysis,
  // Constants
  COMMON_WCAG_CRITERIA,
  USABILITY_HEURISTICS,
  // Schemas
  WCAGLevelSchema,
  WCAGCriterionSchema,
  GapSeveritySchema,
  BaseGapSchema,
  AccessibilityGapSchema,
  UsabilityGapSchema,
  DesignPatternGapSchema,
  UserFlowGapSchema,
  UXGapSchema,
  UXGapAnalysisSchema,
  FanoutUXConfigSchema,
  FanoutUXResultSchema,
  // Types
  type WCAGLevel,
  type WCAGCriterion,
  type GapSeverity,
  type BaseGap,
  type AccessibilityGap,
  type UsabilityGap,
  type DesignPatternGap,
  type UserFlowGap,
  type UXGap,
  type UXGapAnalysis,
  type FanoutUXConfig,
  type FanoutUXResult,
  type GraphStateWithUXAnalysis,
} from './fanout-ux.js'

export {
  // Main node (FLOW-026)
  storyFanoutQANode,
  createFanoutQANode,
  // Helper functions (for testing and direct use)
  analyzeAcClarity,
  identifyEdgeCases,
  identifyTestabilityGaps,
  identifyCoverageGaps,
  calculateTestabilityScore,
  generateKeyRisks,
  generateRecommendations as generateQARecommendations,
  generateSummary as generateQASummary,
  generateQAGapAnalysis,
  // Schemas
  TestabilityGapSchema,
  EdgeCaseGapSchema,
  AcClarityGapSchema,
  CoverageGapSchema,
  QAGapAnalysisSchema,
  FanoutQAConfigSchema,
  FanoutQAResultSchema,
  // Types
  type TestabilityGap,
  type EdgeCaseGap,
  type AcClarityGap,
  type CoverageGap,
  type QAGapAnalysis,
  type FanoutQAConfig,
  type FanoutQAResult,
  type GraphStateWithQAGaps,
} from './fanout-qa.js'

export {
  // Main node (FLOW-027)
  storyAttackNode,
  createAttackNode,
  // Helper functions (for testing and direct use)
  extractAssumptions,
  challengeAssumption,
  identifyEdgeCases as identifyAttackEdgeCases,
  rateRisk,
  generateAttackAnalysis,
  // Schemas
  ConfidenceLevelSchema,
  AssumptionSourceSchema,
  AssumptionSchema,
  ValidityAssessmentSchema,
  ChallengeResultSchema,
  EdgeCaseCategorySchema,
  LikelihoodSchema,
  ImpactSchema,
  AttackEdgeCaseSchema,
  AttackSummarySchema,
  LessonAppliedSchema,
  ADRCheckedSchema,
  AttackAnalysisSchema,
  AttackConfigSchema,
  AttackResultSchema,
  // Types
  type ConfidenceLevel,
  type AssumptionSource,
  type Assumption,
  type ValidityAssessment,
  type ChallengeResult,
  type EdgeCaseCategory,
  type Likelihood,
  type Impact,
  type AttackEdgeCase,
  type AttackSummary,
  type LessonApplied,
  type ADRChecked,
  type AttackAnalysis,
  type AttackConfig,
  type AttackResult,
  type GraphStateWithAttackAnalysis,
} from './attack.js'

export {
  // Main node (FLOW-028)
  storyGapHygieneNode,
  createGapHygieneNode,
  // Helper functions (for testing and direct use)
  calculateGapScore,
  categorizeGap,
  recordHistory,
  deduplicateGaps,
  rankGaps,
  generateHygieneAnalysis,
  // Schemas
  GapCategorySchema,
  GapSourceSchema,
  HistoryActionSchema,
  GapHistoryEntrySchema,
  GapHistorySchema,
  BaseRankedGapSchema,
  DeduplicationStatsSchema,
  CategoryCountsSchema,
  HygieneResultSchema,
  HygieneConfigSchema,
  GapHygieneResultSchema,
  // Types
  type GapCategory,
  type GapSource,
  type HistoryAction,
  type GapHistoryEntry,
  type GapHistory,
  type RankedGap,
  type DeduplicationStats,
  type CategoryCounts,
  type HygieneResult,
  type HygieneConfig,
  type GapHygieneResult,
  type GraphStateWithGapHygiene,
} from './gap-hygiene.js'

export {
  // Main node (FLOW-029)
  storyReadinessScoreNode,
  createReadinessScoreNode,
  // Helper functions (for testing and direct use)
  countBlockingGaps,
  countImportantGaps,
  countUnknowns,
  identifyKnownUnknowns,
  assessContextStrength,
  calculateReadinessScore,
  generateRecommendations,
  generateSummary as generateReadinessSummary,
  determineConfidence,
  generateReadinessAnalysis,
  // Constants
  READINESS_THRESHOLD,
  SCORING_DEDUCTIONS,
  SCORING_ADDITIONS,
  // Schemas
  ReadinessFactorsSchema,
  ScoreAdjustmentSchema,
  ScoreBreakdownSchema,
  RecommendationSeveritySchema,
  ReadinessRecommendationSchema,
  ReadinessResultSchema,
  ReadinessConfigSchema,
  ReadinessScoreResultSchema,
  // Types
  type ReadinessFactors,
  type ScoreAdjustment,
  type ScoreBreakdown,
  type RecommendationSeverity,
  type ReadinessRecommendation,
  type ReadinessResult,
  type ReadinessConfig,
  type ReadinessScoreResult,
  type GraphStateWithReadiness,
} from './readiness-score.js'

export {
  // Main node (FLOW-030)
  storySynthesizeNode,
  createSynthesizeNode,
  // Helper functions (for testing and direct use)
  consolidateInputs,
  generateFinalACs,
  generateNonGoals,
  generateTestHints,
  documentKnownUnknowns,
  createCommitmentBaseline,
  synthesizeStory,
  // Schemas
  FinalAcceptanceCriterionSchema,
  NonGoalSchema,
  TestHintSchema,
  KnownUnknownSchema,
  CommitmentBaselineSchema,
  SynthesizedStorySchema,
  SynthesizeConfigSchema,
  SynthesizeResultSchema,
  // Types
  type FinalAcceptanceCriterion,
  type NonGoal,
  type TestHint,
  type KnownUnknown,
  type CommitmentBaseline,
  type SynthesizedStory,
  type SynthesizeConfig,
  type SynthesizeResult,
  type GraphStateWithSynthesizedStory,
} from './synthesize.js'
