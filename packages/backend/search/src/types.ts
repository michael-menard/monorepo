/**
 * Generic Search Types
 *
 * Type-safe search configuration for any entity with OpenSearch and PostgreSQL support
 */

/**
 * Search field configuration
 */
export interface SearchField {
  /** Field name in OpenSearch index */
  field: string
  /** Boost factor for relevance (default: 1, higher = more important) */
  boost?: number
  /** Column reference for PostgreSQL fallback (Drizzle column) */
  postgresColumn: any
}

/**
 * Generic search configuration for any entity
 */
export interface SearchConfig {
  /** OpenSearch index name */
  indexName: string

  /** Drizzle table reference for PostgreSQL fallback */
  table: any

  /** Fields to search with optional boost factors */
  searchableFields: SearchField[]

  /** Column for user ID filtering (for multi-tenant isolation) */
  userIdColumn: any

  /** Optional sort column for PostgreSQL fallback (e.g., wishlist sortOrder) */
  sortColumn?: any

  /** Optional sort direction for PostgreSQL fallback */
  sortDirection?: 'asc' | 'desc'
}

/**
 * Search options
 */
export interface SearchOptions {
  /** Search query string */
  query: string

  /** User ID for filtering (multi-tenant isolation) */
  userId: string

  /** Page number (1-indexed) */
  page: number

  /** Results per page */
  limit: number
}

/**
 * Search result with metadata
 */
export interface SearchResult<TEntity> {
  /** Search result data */
  data: Array<TEntity & { score?: number }>

  /** Total number of matching results */
  total: number

  /** Source of results ('opensearch' or 'postgres') */
  source: 'opensearch' | 'postgres'

  /** Search duration in milliseconds */
  duration: number
}

/**
 * OpenSearch client interface (minimal)
 */
export interface OpenSearchClient {
  search(params: {
    index: string
    body: {
      query: any
      from?: number
      size?: number
      sort?: any[]
    }
  }): Promise<{
    body: {
      hits: {
        total: { value: number }
        hits: Array<{
          _id: string
          _score: number
          _source: any
        }>
      }
    }
  }>
}

/**
 * Database client interface (minimal Drizzle-like)
 */
export interface DatabaseClient {
  select(): any
}

/**
 * Logger interface
 */
export interface Logger {
  info(message: string | object, ...args: any[]): void
  warn(message: string, error?: any): void
  error(message: string, error?: any): void
}
