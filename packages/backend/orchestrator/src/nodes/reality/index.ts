/**
 * Reality Intake Nodes
 *
 * Nodes for loading and processing reality baseline data.
 */

export {
  // Main node
  loadBaselineRealityNode,
  createLoadBaselineNode,
  // Helper functions (for testing and direct use)
  findBaselineFiles,
  parseMarkdownSections,
  extractListItems,
  parseBaselineFile,
  loadMostRecentBaseline,
  // Schemas
  BaselineRealitySectionSchema,
  BaselineRealitySchema,
  LoadBaselineConfigSchema,
  LoadBaselineResultSchema,
  // Types
  type BaselineReality,
  type BaselineRealitySection,
  type LoadBaselineConfig,
  type LoadBaselineResult,
  type GraphStateWithBaseline,
} from './load-baseline.js'

export {
  // Main node
  retrieveContextNode,
  createRetrieveContextNode,
  createScopedRetrieveContextNode,
  // Helper functions (for testing and direct use)
  determineRelevantPatterns,
  shouldExcludeFile,
  matchesIncludePattern,
  walkDirectory,
  loadFileContent,
  retrieveContextForScope,
  // Schemas
  ScopePatternSchema,
  StoryScopeSchema,
  FileContextSchema,
  RetrievedContextSchema,
  RetrieveContextConfigSchema,
  RetrieveContextResultSchema,
  // Types
  type ScopePattern,
  type StoryScope,
  type FileContext,
  type RetrievedContext,
  type RetrieveContextConfig,
  type RetrieveContextResult,
  type GraphStateWithContext,
} from './retrieve-context.js'

export {
  // Main node
  loadKnowledgeContextNode,
  createKnowledgeContextNode,
  // Helper functions (for testing and direct use)
  parseADRLog,
  filterRelevantADRs,
  extractADRConstraints,
  getHighCostOperations,
  getOptimizationPatterns,
  getDefaultLessonsLearned,
  loadKnowledgeContext,
  // Schemas
  LessonCategorySchema,
  RelevantLessonSchema,
  LessonsLearnedSchema,
  ADRStatusSchema,
  RelevantADRSchema,
  ADRConstraintsSchema,
  ArchitectureDecisionsSchema,
  HighCostOperationSchema,
  TokenOptimizationSchema,
  KnowledgeContextSchema,
  KnowledgeContextConfigSchema,
  KnowledgeContextResultSchema,
  // Types
  type LessonCategory,
  type RelevantLesson,
  type LessonsLearned,
  type ADRStatus,
  type RelevantADR,
  type ADRConstraints,
  type ArchitectureDecisions,
  type HighCostOperation,
  type TokenOptimization,
  type KnowledgeContext,
  type KnowledgeContextConfig,
  type KnowledgeContextResult,
  type GraphStateWithKnowledge,
} from './load-knowledge-context.js'
