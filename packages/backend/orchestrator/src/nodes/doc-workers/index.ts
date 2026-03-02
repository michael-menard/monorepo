/**
 * Doc Workers Index
 *
 * Exports all 6 doc worker factories, node instances, and Zod schemas.
 * AC-13: All workers and schemas exported from this file.
 *
 * APIP-1040: Documentation Graph (Post-Merge)
 */

// ============================================================================
// API Docs Worker
// ============================================================================

export {
  ApiDocsWorkerNodeConfigSchema,
  apiDocsWorkerNode,
  createApiDocsWorkerNode,
  generateApiDocsChanges,
} from './api-docs-worker.js'
export type { ApiDocsWorkerNodeConfig } from './api-docs-worker.js'

// ============================================================================
// Component Docs Worker
// ============================================================================

export {
  ComponentDocsWorkerNodeConfigSchema,
  componentDocsWorkerNode,
  createComponentDocsWorkerNode,
  generateComponentDocsChanges,
} from './component-docs-worker.js'
export type { ComponentDocsWorkerNodeConfig } from './component-docs-worker.js'

// ============================================================================
// Architecture Docs Worker
// ============================================================================

export {
  ArchitectureDocsWorkerNodeConfigSchema,
  architectureDocsWorkerNode,
  createArchitectureDocsWorkerNode,
  generateArchitectureDocsChanges,
} from './architecture-docs-worker.js'
export type { ArchitectureDocsWorkerNodeConfig } from './architecture-docs-worker.js'

// ============================================================================
// README Guides Worker
// ============================================================================

export {
  ReadmeGuidesWorkerNodeConfigSchema,
  readmeGuidesWorkerNode,
  createReadmeGuidesWorkerNode,
  generateReadmeGuidesChanges,
} from './readme-guides-worker.js'
export type { ReadmeGuidesWorkerNodeConfig } from './readme-guides-worker.js'

// ============================================================================
// KB Sync Worker
// ============================================================================

export {
  KbSyncWorkerNodeConfigSchema,
  kbSyncWorkerNode,
  createKbSyncWorkerNode,
  generateKbSyncChanges,
} from './kb-sync-worker.js'
export type { KbSyncWorkerNodeConfig } from './kb-sync-worker.js'

// ============================================================================
// Changelog Worker
// ============================================================================

export {
  ChangelogWorkerNodeConfigSchema,
  changelogWorkerNode,
  createChangelogWorkerNode,
  generateChangelogChanges,
} from './changelog-worker.js'
export type { ChangelogWorkerNodeConfig } from './changelog-worker.js'

// ============================================================================
// Re-export doc-graph schemas for convenience (AC-13)
// ============================================================================

export {
  DocGraphConfigSchema,
  DocGraphStateAnnotation,
  DocWorkerNameSchema,
  MergeEventPayloadSchema,
  ProposedFileChangeSchema,
  DocWorkerResultSchema,
  DocWorkerConfigSchema,
  ApiDocsWorkerConfigSchema,
  ComponentDocsWorkerConfigSchema,
  ArchitectureDocsWorkerConfigSchema,
  ReadmeGuidesWorkerConfigSchema,
  KbSyncWorkerConfigSchema,
  ChangelogWorkerConfigSchema,
  DocReviewConfigSchema,
  DocReviewResultSchema,
  DocCommitResultSchema,
  createDocGraph,
  createDocGraphWithWorkers,
  createDispatchNode,
  createAggregateNode,
  createDocReviewNode,
  createLogBlockedNode,
  createCommitNode,
} from '../../graphs/doc-graph.js'
export type {
  DocGraphConfig,
  DocGraphState,
  DocWorkerName,
  MergeEventPayload,
  ProposedFileChange,
  DocWorkerResult,
  DocWorkerConfig,
  ApiDocsWorkerConfig,
  ComponentDocsWorkerConfig,
  ArchitectureDocsWorkerConfig,
  ReadmeGuidesWorkerConfig,
  KbSyncWorkerConfig,
  ChangelogWorkerConfig,
  DocReviewConfig,
  DocReviewResult,
  DocCommitResult,
} from '../../graphs/doc-graph.js'
