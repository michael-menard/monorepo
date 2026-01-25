/**
 * Search Module for Knowledge Base
 *
 * This module exports the hybrid search functionality:
 * - kb_search: Hybrid semantic + keyword search with RRF merging
 * - kb_get_related: Find related entries via parent/sibling/tag relationships
 *
 * @see KNOW-004 for implementation details and acceptance criteria
 *
 * @example
 * ```typescript
 * import {
 *   kb_search,
 *   kb_get_related,
 *   SearchInputSchema,
 *   GetRelatedInputSchema,
 * } from '@repo/knowledge-base/search'
 *
 * // Hybrid search
 * const searchResult = await kb_search(
 *   { query: 'route ordering', role: 'dev', limit: 10 },
 *   { db, embeddingClient }
 * )
 *
 * // Related entries
 * const relatedResult = await kb_get_related(
 *   { entry_id: '...', limit: 5 },
 *   { db }
 * )
 * ```
 */

// Main search functions
export { kb_search, type KbSearchDeps } from './kb-search.js'
export { kb_get_related, type KbGetRelatedDeps, findByTagOverlap } from './kb-get-related.js'

// Search components (for advanced use cases)
export { semanticSearch } from './semantic.js'
export { keywordSearch, hasKeywordMatches } from './keyword.js'
export {
  mergeWithRRF,
  keywordOnlyRanking,
  calculateRRFScore,
  type RRFConfig,
  DEFAULT_RRF_CONFIG,
} from './hybrid.js'

// Schemas and types
export {
  // Input schemas
  SearchInputSchema,
  GetRelatedInputSchema,
  SearchFiltersSchema,
  // Output schemas
  SearchResultSchema,
  SearchResultEntrySchema,
  SearchMetadataSchema,
  GetRelatedResultSchema,
  RelatedEntrySchema,
  // Internal schemas
  ScoredEntrySchema,
  RankedEntrySchema,
  // Error handling
  SearchErrorSchema,
  createSearchError,
  // Constants
  SEMANTIC_WEIGHT,
  KEYWORD_WEIGHT,
  RRF_K,
  SEMANTIC_SIMILARITY_THRESHOLD,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  MAX_RELATED_LIMIT,
  DEFAULT_RELATED_LIMIT,
  INTERNAL_FETCH_LIMIT,
  // Types
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
  type EntryType,
} from './schemas.js'
