/**
 * Database Exports
 *
 * Re-exports client, schema, and types for convenient imports.
 */

export { getDbClient, closeDbClient, testConnection } from './client.js'
export {
  // Knowledge entries (public schema)
  knowledgeEntries,
  embeddingCache,
  vector,
  type KnowledgeEntry,
  type NewKnowledgeEntry,
  type EmbeddingCacheEntry,
  type NewEmbeddingCacheEntry,
  // Workflow schema tables (from schema.ts)
  workflowStories as stories,
  workflowStoryDependencies as storyDependencies,
  workflowStoryStateHistory as storyStateHistory,
  workflowWorktrees as worktrees,
  workflowExecutions,
  workflowCheckpoints,
  workflowAuditLog,
  // Story outcomes (telemetry)
  storyOutcomes,
  type StoryOutcome,
  type NewStoryOutcome,
} from './schema.js'
