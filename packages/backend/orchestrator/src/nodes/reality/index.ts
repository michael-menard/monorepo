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
