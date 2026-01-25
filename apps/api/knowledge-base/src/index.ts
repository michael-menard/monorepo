/**
 * @repo/knowledge-base
 *
 * Knowledge Base MCP Server infrastructure package.
 * Provides PostgreSQL with pgvector for semantic search.
 *
 * @example
 * ```typescript
 * import { getDbClient, knowledgeEntries } from '@repo/knowledge-base'
 *
 * const db = getDbClient()
 * const entries = await db.select().from(knowledgeEntries)
 * ```
 *
 * @see README.md for setup instructions
 */

// Configuration exports (import first for fail-fast validation)
export {
  getConfig,
  resetConfig,
  EnvSchema,
  validateEnv,
  safeValidateEnv,
  type Env,
} from './config/index.js'

// Database exports
export { getDbClient, closeDbClient, testConnection } from './db/client.js'

export {
  knowledgeEntries,
  embeddingCache,
  vector,
  type KnowledgeEntry,
  type NewKnowledgeEntry,
  type EmbeddingCacheEntry,
  type NewEmbeddingCacheEntry,
} from './db/schema.js'

// Type exports
export {
  KnowledgeRoleSchema,
  EmbeddingSchema,
  KnowledgeEntrySchema,
  NewKnowledgeEntrySchema,
  UpdateKnowledgeEntrySchema,
  EmbeddingCacheEntrySchema,
  NewEmbeddingCacheEntrySchema,
  SimilaritySearchParamsSchema,
  SimilaritySearchResultSchema,
  validateKnowledgeEntry,
  validateEmbedding,
  safeValidateKnowledgeEntry,
  type KnowledgeRole,
  type Embedding,
  type KnowledgeEntryInput,
  type NewKnowledgeEntryInput,
  type UpdateKnowledgeEntryInput,
  type EmbeddingCacheEntryInput,
  type NewEmbeddingCacheEntryInput,
  type SimilaritySearchParams,
  type SimilaritySearchResult,
} from './__types__/index.js'

// Search exports
export {
  kb_search,
  kb_get_related,
  semanticSearch,
  keywordSearch,
  mergeWithRRF,
  keywordOnlyRanking,
  calculateRRFScore,
  findByTagOverlap,
  hasKeywordMatches,
  SearchInputSchema,
  GetRelatedInputSchema,
  SearchResultSchema,
  GetRelatedResultSchema,
  createSearchError,
  SEMANTIC_WEIGHT,
  KEYWORD_WEIGHT,
  RRF_K,
  SEMANTIC_SIMILARITY_THRESHOLD,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  type KbSearchDeps,
  type KbGetRelatedDeps,
  type SearchInput,
  type SearchResult,
  type SearchResultEntry,
  type SearchMetadata,
  type GetRelatedInput,
  type GetRelatedResult,
  type RelatedEntry,
  type RelationshipType,
  type ScoredEntry,
  type RankedEntry,
  type SearchFilters,
  type SearchError,
  type RRFConfig,
} from './search/index.js'
