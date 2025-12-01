/**
 * Generic Search Engine
 *
 * Provides unified search functionality for any entity with:
 * - OpenSearch primary search with fuzzy matching
 * - PostgreSQL ILIKE fallback
 * - User isolation
 * - Performance tracking
 */

import { createHash } from 'crypto'
import type {
  SearchConfig,
  SearchOptions,
  SearchResult,
  OpenSearchClient,
  DatabaseClient,
  Logger,
} from './types'

/**
 * Generic Search Engine Class
 */
export class SearchEngine<TEntity = any> {
  constructor(
    private config: SearchConfig,
    private openSearchClient: OpenSearchClient | null,
    private db: DatabaseClient,
    private logger: Logger,
  ) {}

  /**
   * Execute search with OpenSearch (primary) or PostgreSQL (fallback)
   */
  async search(options: SearchOptions): Promise<SearchResult<TEntity>> {
    const startTime = Date.now()
    const from = (options.page - 1) * options.limit

    try {
      // Try OpenSearch first if available
      if (this.openSearchClient) {
        return await this.searchViaOpenSearch(options, from, startTime)
      } else {
        // No OpenSearch client, go straight to PostgreSQL
        this.logger.warn('OpenSearch client not configured, using PostgreSQL')
        return await this.searchViaPostgreSQL(options, from, startTime)
      }
    } catch (error) {
      this.logger.warn('OpenSearch search failed, falling back to PostgreSQL:', error)
      return await this.searchViaPostgreSQL(options, from, startTime)
    }
  }

  /**
   * Search via OpenSearch with multi-match and fuzzy matching
   */
  private async searchViaOpenSearch(
    options: SearchOptions,
    from: number,
    startTime: number,
  ): Promise<SearchResult<TEntity>> {
    const { query, userId, limit } = options

    // Build field list with boost factors
    const fields = this.config.searchableFields.map(field => {
      const boost = field.boost ?? 1
      return boost > 1 ? `${field.field}^${boost}` : field.field
    })

    // Build OpenSearch query with fuzzy matching
    const searchQuery = {
      bool: {
        must: [
          {
            multi_match: {
              query,
              fields,
              fuzziness: 'AUTO', // AUTO = 0 for 1-2 chars, 1 for 3-5 chars, 2 for >5 chars
              operator: 'or' as const,
            },
          },
          {
            term: { userId },
          },
        ],
      },
    }

    // Execute OpenSearch query
    const result = await this.openSearchClient!.search({
      index: this.config.indexName,
      body: {
        query: searchQuery,
        from,
        size: limit,
        sort: [{ _score: 'desc' }],
      },
    })

    const body = result.body
    const hits = body.hits.hits
    const total = body.hits.total.value

    // If no results from OpenSearch, return empty
    if (hits.length === 0) {
      const duration = Date.now() - startTime
      this.logger.info({
        type: 'search_performance',
        index: this.config.indexName,
        query,
        duration,
        resultCount: 0,
        totalHits: total,
        source: 'opensearch',
      })

      return {
        data: [],
        total,
        source: 'opensearch',
        duration,
      }
    }

    // Fetch full data from PostgreSQL
    const itemIds = hits.map(hit => hit._id)
    // Import drizzle-orm dynamically to avoid peer dependency issues
    const drizzleOrm = await import('drizzle-orm')
    const { eq, and, sql } = drizzleOrm

    const items = await this.db
      .select()
      .from(this.config.table)
      .where(
        and(eq(this.config.userIdColumn, userId), sql`${this.config.table.id} = ANY(${itemIds})`),
      )

    // Map scores to items
    const scoreMap = new Map(hits.map(hit => [hit._id, hit._score]))
    const itemsWithScores = items.map((item: any) => ({
      ...item,
      score: scoreMap.get(item.id) || 0,
    }))

    // Sort by score (maintain OpenSearch relevance order)
    itemsWithScores.sort((a, b) => (b.score || 0) - (a.score || 0))

    const duration = Date.now() - startTime

    this.logger.info({
      type: 'search_performance',
      index: this.config.indexName,
      query,
      duration,
      resultCount: itemsWithScores.length,
      totalHits: total,
      source: 'opensearch',
    })

    return {
      data: itemsWithScores,
      total,
      source: 'opensearch',
      duration,
    }
  }

  /**
   * Search via PostgreSQL with ILIKE fallback
   */
  private async searchViaPostgreSQL(
    options: SearchOptions,
    from: number,
    startTime: number,
  ): Promise<SearchResult<TEntity>> {
    const { query, userId, limit } = options
    const drizzleOrm = await import('drizzle-orm')
    const { eq, and, or, sql, asc, desc } = drizzleOrm

    const searchPattern = `%${query}%`

    // Build ILIKE conditions for all searchable fields
    const searchConditions = this.config.searchableFields.map(
      field => sql`${field.postgresColumn} ILIKE ${searchPattern}`,
    )

    // Build base query
    let queryBuilder = this.db
      .select()
      .from(this.config.table)
      .where(and(eq(this.config.userIdColumn, userId), or(...searchConditions)))

    // Apply sorting if configured
    if (this.config.sortColumn) {
      if (this.config.sortDirection === 'desc') {
        queryBuilder = queryBuilder.orderBy(desc(this.config.sortColumn))
      } else {
        queryBuilder = queryBuilder.orderBy(asc(this.config.sortColumn))
      }
    }

    // Execute query with pagination
    const items = await queryBuilder.limit(limit).offset(from)

    // Count total matches
    const countResult: any = await this.db
      .select({ total: sql`COUNT(*)` })
      .from(this.config.table)
      .where(and(eq(this.config.userIdColumn, userId), or(...searchConditions)))

    const total = Number(countResult[0]?.total) || 0

    const duration = Date.now() - startTime

    this.logger.info({
      type: 'search_performance',
      index: this.config.indexName,
      query,
      duration,
      resultCount: items.length,
      totalHits: total,
      source: 'postgres',
    })

    return {
      data: items,
      total,
      source: 'postgres',
      duration,
    }
  }

  /**
   * Generate MD5 hash of search query for cache keys
   */
  static hashQuery(query: string): string {
    return createHash('md5').update(query).digest('hex')
  }
}

/**
 * Factory function to create a search engine instance
 */
export function createSearchEngine<TEntity>(
  config: SearchConfig,
  openSearchClient: OpenSearchClient | null,
  db: DatabaseClient,
  logger: Logger,
): SearchEngine<TEntity> {
  return new SearchEngine(config, openSearchClient, db, logger)
}
