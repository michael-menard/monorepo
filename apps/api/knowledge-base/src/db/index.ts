/**
 * Database Exports
 *
 * Re-exports client, schema, and types for convenient imports.
 */

export { getDbClient, closeDbClient, testConnection } from './client.js'
export {
  knowledgeEntries,
  embeddingCache,
  vector,
  type KnowledgeEntry,
  type NewKnowledgeEntry,
  type EmbeddingCacheEntry,
  type NewEmbeddingCacheEntry,
} from './schema.js'
