/**
 * Search Module Schemas
 *
 * Zod schemas for search input/output validation and constants
 * for RRF (Reciprocal Rank Fusion) algorithm configuration.
 *
 * @see KNOW-004 for implementation details
 */

import { z } from 'zod'
import { KnowledgeRoleSchema } from '../__types__/index.js'

// ============================================================================
// Constants
// ============================================================================

/**
 * RRF (Reciprocal Rank Fusion) configuration constants.
 *
 * Reference: Cormack et al., 2009 - k=60 is the standard RRF constant
 * from information retrieval research.
 */
export const SEMANTIC_WEIGHT = 0.7
export const KEYWORD_WEIGHT = 0.3
export const RRF_K = 60

/**
 * Minimum cosine similarity threshold for semantic search results.
 * Results below this threshold are filtered out as low relevance.
 */
export const SEMANTIC_SIMILARITY_THRESHOLD = 0.3

/**
 * Default and maximum limits for search results.
 */
export const DEFAULT_LIMIT = 10
export const MAX_LIMIT = 50
export const MAX_RELATED_LIMIT = 20
export const DEFAULT_RELATED_LIMIT = 5

/**
 * Internal fetch limit for RRF merging.
 * Fetch more results than requested to enable proper ranking after merge.
 */
export const INTERNAL_FETCH_LIMIT = 100

// ============================================================================
// Entry Type Schema
// ============================================================================

/**
 * Valid entry types for knowledge entries.
 */
export const EntryTypeSchema = z.enum(['fact', 'summary', 'template'])
export type EntryType = z.infer<typeof EntryTypeSchema>

// ============================================================================
// Search Input/Output Schemas
// ============================================================================

/**
 * Schema for kb_search input.
 *
 * @example
 * ```typescript
 * const input = SearchInputSchema.parse({
 *   query: 'How to order routes in vercel.json',
 *   role: 'dev',
 *   limit: 10
 * })
 * ```
 */
export const SearchInputSchema = z.object({
  /** Natural language search query (required, non-empty) */
  query: z.string().min(1, 'Query must be non-empty'),

  /** Filter by role (optional) */
  role: KnowledgeRoleSchema.optional(),

  /** Filter by tags - OR logic (optional) */
  tags: z.array(z.string()).optional(),

  /** Filter by entry type (optional) */
  entry_type: EntryTypeSchema.optional(),

  /** Maximum results to return (default 10, max 50) */
  limit: z.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),

  /** Minimum confidence threshold (default 0.0) */
  min_confidence: z.number().min(0).max(1).default(0.0),

  /** Enable debug mode to include component scores (optional) */
  explain: z.boolean().optional(),
})

export type SearchInput = z.infer<typeof SearchInputSchema>

/**
 * Schema for individual search result entry.
 * Extends knowledge entry with relevance score.
 */
export const SearchResultEntrySchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  role: KnowledgeRoleSchema,
  tags: z.array(z.string()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  /** Combined RRF relevance score */
  relevance_score: z.number().optional(),
  /** Semantic similarity score (0-1) */
  semantic_score: z.number().optional(),
  /** Keyword match score */
  keyword_score: z.number().optional(),
})

export type SearchResultEntry = z.infer<typeof SearchResultEntrySchema>

/**
 * Schema for search metadata.
 */
export const SearchMetadataSchema = z.object({
  /** Total number of results before limit applied */
  total: z.number(),
  /** Whether fallback to keyword-only search was used */
  fallback_mode: z.boolean(),
  /** Total query execution time in milliseconds */
  query_time_ms: z.number(),
  /** Search modes used in this query */
  search_modes_used: z.array(z.enum(['semantic', 'keyword'])),
  /** Performance breakdown (only when explain=true) */
  debug_info: z
    .object({
      semantic_ms: z.number().optional(),
      keyword_ms: z.number().optional(),
      rrf_ms: z.number().optional(),
      embedding_ms: z.number().optional(),
    })
    .optional(),
})

export type SearchMetadata = z.infer<typeof SearchMetadataSchema>

/**
 * Schema for kb_search output.
 */
export const SearchResultSchema = z.object({
  results: z.array(SearchResultEntrySchema),
  metadata: SearchMetadataSchema,
})

export type SearchResult = z.infer<typeof SearchResultSchema>

// ============================================================================
// Get Related Input/Output Schemas
// ============================================================================

/**
 * Schema for kb_get_related input.
 */
export const GetRelatedInputSchema = z.object({
  /** UUID of the entry to find related entries for */
  entry_id: z.string().uuid('Invalid UUID format'),

  /** Maximum results to return (default 5, max 20) */
  limit: z.number().int().min(1).max(MAX_RELATED_LIMIT).default(DEFAULT_RELATED_LIMIT),
})

export type GetRelatedInput = z.infer<typeof GetRelatedInputSchema>

/**
 * Relationship types for related entries.
 */
export const RelationshipTypeSchema = z.enum(['parent', 'sibling', 'tag_overlap'])
export type RelationshipType = z.infer<typeof RelationshipTypeSchema>

/**
 * Schema for related entry with relationship type.
 */
export const RelatedEntrySchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  role: KnowledgeRoleSchema,
  tags: z.array(z.string()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  /** Type of relationship to the source entry */
  relationship: RelationshipTypeSchema,
  /** Number of shared tags (for tag_overlap type) */
  tag_overlap_count: z.number().optional(),
})

export type RelatedEntry = z.infer<typeof RelatedEntrySchema>

/**
 * Schema for kb_get_related output.
 */
export const GetRelatedResultSchema = z.object({
  results: z.array(RelatedEntrySchema),
  metadata: z.object({
    /** Total number of related entries found */
    total: z.number(),
    /** Types of relationships found */
    relationship_types: z.array(RelationshipTypeSchema),
  }),
})

export type GetRelatedResult = z.infer<typeof GetRelatedResultSchema>

// ============================================================================
// Internal Types
// ============================================================================

/**
 * Internal type for scored entries during ranking.
 */
export const ScoredEntrySchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  role: KnowledgeRoleSchema,
  tags: z.array(z.string()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  /** Score from the search method (similarity or keyword rank) */
  score: z.number(),
})

export type ScoredEntry = z.infer<typeof ScoredEntrySchema>

/**
 * Internal type for RRF-ranked entries.
 */
export const RankedEntrySchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  role: KnowledgeRoleSchema,
  tags: z.array(z.string()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  /** Combined RRF score */
  rrf_score: z.number(),
  /** Original semantic score (if available) */
  semantic_score: z.number().optional(),
  /** Original keyword score (if available) */
  keyword_score: z.number().optional(),
  /** Rank in semantic results (1-indexed, undefined if not in semantic results) */
  semantic_rank: z.number().optional(),
  /** Rank in keyword results (1-indexed, undefined if not in keyword results) */
  keyword_rank: z.number().optional(),
})

export type RankedEntry = z.infer<typeof RankedEntrySchema>

// ============================================================================
// Search Filter Types
// ============================================================================

/**
 * Common filter parameters for search queries.
 */
export const SearchFiltersSchema = z.object({
  role: KnowledgeRoleSchema.optional(),
  tags: z.array(z.string()).optional(),
  entry_type: EntryTypeSchema.optional(),
  min_confidence: z.number().min(0).max(1).optional(),
})

export type SearchFilters = z.infer<typeof SearchFiltersSchema>

// ============================================================================
// Error Response Schema
// ============================================================================

/**
 * Schema for consistent error responses.
 * Error messages are sanitized to avoid leaking sensitive information.
 */
export const SearchErrorSchema = z.object({
  error: z.string(),
  code: z.enum([
    'VALIDATION_ERROR',
    'DATABASE_ERROR',
    'EMBEDDING_ERROR',
    'NOT_FOUND',
    'INTERNAL_ERROR',
  ]),
  field: z.string().optional(),
  details: z.record(z.unknown()).optional(),
})

export type SearchError = z.infer<typeof SearchErrorSchema>

/**
 * Create a sanitized error response.
 * Removes SQL, connection strings, and other sensitive information.
 */
export function createSearchError(
  code: SearchError['code'],
  message: string,
  field?: string,
): SearchError {
  // Sanitize message - remove potential SQL or connection details
  let sanitized = message
    .replace(/password=[^\s&]+/gi, 'password=***')
    .replace(/:[^:@]+@/g, ':***@')
    .replace(/SELECT\s+.+\s+FROM/gi, '[SQL query]')
    .replace(/INSERT\s+INTO/gi, '[SQL query]')
    .replace(/UPDATE\s+.+\s+SET/gi, '[SQL query]')
    .replace(/DELETE\s+FROM/gi, '[SQL query]')

  // Limit message length
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200) + '...'
  }

  return {
    error: sanitized,
    code,
    ...(field && { field }),
  }
}
