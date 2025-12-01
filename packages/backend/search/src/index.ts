/**
 * @monorepo/search - Generic Search Engine
 *
 * Provides unified search functionality for any entity with:
 * - OpenSearch primary search with fuzzy matching and relevance scoring
 * - PostgreSQL ILIKE fallback for reliability
 * - User isolation for multi-tenant applications
 * - Performance tracking and logging
 * - Type-safe configuration
 *
 * @example
 * ```typescript
 * import { createSearchEngine, SearchConfig } from '@repo/search'
 *
 * // Configure search for gallery images
 * const galleryConfig: SearchConfig = {
 *   indexName: 'gallery_images',
 *   table: galleryImages,
 *   searchableFields: [
 *     { field: 'title', boost: 3, postgresColumn: galleryImages.title },
 *     { field: 'description', boost: 2, postgresColumn: galleryImages.description },
 *     { field: 'tags', boost: 1, postgresColumn: galleryImages.tags },
 *   ],
 *   userIdColumn: galleryImages.userId,
 * }
 *
 * // Create search engine
 * const searchEngine = createSearchEngine(
 *   galleryConfig,
 *   openSearchClient,
 *   db,
 *   logger
 * )
 *
 * // Execute search
 * const results = await searchEngine.search({
 *   query: 'lego castle',
 *   userId: 'user-123',
 *   page: 1,
 *   limit: 20,
 * })
 * ```
 */

export { SearchEngine, createSearchEngine } from './search-engine'
export type {
  SearchConfig,
  SearchOptions,
  SearchResult,
  SearchField,
  OpenSearchClient,
  DatabaseClient,
  Logger,
} from './types'
