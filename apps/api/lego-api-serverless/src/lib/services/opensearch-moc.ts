/**
 * OpenSearch MOC Search Service
 *
 * Full-text search for MOC Instructions using OpenSearch.
 * Provides fuzzy matching, relevance scoring, and field boosting.
 *
 * This is a placeholder implementation for Story 2.2.
 * Full implementation will be completed in Story 2.8.
 */

import { getOpenSearchClient } from '@/lib/services/opensearch'
import type { MocInstruction } from '@/types/moc'
import { SearchError } from '@/lib/errors'
import { createLogger } from '../utils/logger'

const logger = createLogger('opensearch-moc')
const MOC_INDEX = 'moc_instructions'

/**
 * Search MOCs using OpenSearch multi-match query
 *
 * Features (Story 2.8):
 * - Multi-match across title^3, description, tags^2
 * - Fuzziness: AUTO for typo tolerance
 * - User ID filter (users can only search their own MOCs)
 * - Relevance sorting with updatedAt tiebreaker
 * - Tag filtering support
 *
 * @param userId - User ID from JWT claims
 * @param query - Search query string
 * @param from - Pagination offset
 * @param size - Number of results to return
 * @param tag - Optional tag filter
 */
export async function searchMocs(
  userId: string,
  query: string,
  from: number = 0,
  size: number = 20,
  tag?: string,
): Promise<{ mocs: MocInstruction[]; total: number }> {
  try {
    logger.info('OpenSearch MOC search initiated', { userId, query, from, size, tag })

    const client = getOpenSearchClient()

    // Build OpenSearch query
    const must: any[] = [
      {
        term: {
          userId: userId, // User can only search their own MOCs
        },
      },
      {
        multi_match: {
          query: query,
          fields: ['title^3', 'description', 'tags^2'], // Boost title and tags
          fuzziness: 'AUTO', // Typo tolerance
          type: 'best_fields',
        },
      },
    ]

    // Add tag filter if provided
    if (tag && tag.trim()) {
      must.push({
        term: {
          'tags.keyword': tag, // Exact match on tag
        },
      })
    }

    const searchBody = {
      query: {
        bool: {
          must,
        },
      },
      sort: [
        '_score', // Relevance first
        { updatedAt: { order: 'desc' } }, // Then by most recently updated
      ],
      from,
      size,
    }

    // Execute search
    const response = await client.search({
      index: MOC_INDEX,
      body: searchBody,
    })

    // Map results to MOC entities
    const hits = response.body.hits.hits
    const mocs: MocInstruction[] = hits.map((hit: any) => ({
      ...hit._source,
      // Convert date strings back to Date objects
      createdAt: new Date(hit._source.createdAt),
      updatedAt: new Date(hit._source.updatedAt),
      uploadedDate: hit._source.uploadedDate ? new Date(hit._source.uploadedDate) : null,
    }))

    const total = response.body.hits.total.value

    logger.info('OpenSearch query completed', {
      userId,
      query,
      mocsReturned: mocs.length,
      total,
    })

    return { mocs, total }
  } catch (error) {
    logger.error('OpenSearch search failed:', error)
    throw new SearchError('MOC search failed', {
      userId,
      query,
      error: (error as Error).message,
    })
  }
}

/**
 * Index a MOC document in OpenSearch
 * Called after MOC creation (Story 2.4)
 */
export async function indexMoc(moc: MocInstruction): Promise<void> {
  try {
    const client = getOpenSearchClient()

    await client.index({
      index: MOC_INDEX,
      id: moc.id,
      body: {
        ...moc,
        // Convert Date objects to ISO strings for indexing
        createdAt: moc.createdAt.toISOString(),
        updatedAt: moc.updatedAt.toISOString(),
        uploadedDate: moc.uploadedDate ? moc.uploadedDate.toISOString() : null,
      },
    })

    logger.info('MOC indexed in OpenSearch', { mocId: moc.id, userId: moc.userId })
  } catch (error) {
    logger.error('Failed to index MOC in OpenSearch:', error)
    // Don't throw - indexing failure shouldn't break the creation request
    // Search will fall back to PostgreSQL until re-indexed
  }
}

/**
 * Update MOC document in OpenSearch
 * Called after MOC update (Story 2.5)
 */
export async function updateMocIndex(moc: MocInstruction): Promise<void> {
  try {
    const client = getOpenSearchClient()

    await client.update({
      index: MOC_INDEX,
      id: moc.id,
      body: {
        doc: {
          ...moc,
          createdAt: moc.createdAt.toISOString(),
          updatedAt: moc.updatedAt.toISOString(),
          uploadedDate: moc.uploadedDate ? moc.uploadedDate.toISOString() : null,
        },
      },
    })

    logger.info('MOC updated in OpenSearch', { mocId: moc.id })
  } catch (error) {
    logger.error('Failed to update MOC in OpenSearch:', error)
    // Don't throw - indexing failure shouldn't break the update request
  }
}

/**
 * Delete MOC document from OpenSearch
 * Called after MOC deletion (Story 2.6)
 */
export async function deleteMocIndex(mocId: string): Promise<void> {
  try {
    const client = getOpenSearchClient()

    await client.delete({
      index: MOC_INDEX,
      id: mocId,
    })

    logger.info('MOC deleted from OpenSearch', { mocId })
  } catch (error) {
    logger.error('Failed to delete MOC from OpenSearch:', error)
    // Don't throw - indexing failure shouldn't break the delete request
  }
}

/**
 * Initialize MOC index with proper mappings
 * Called on application startup or first deployment
 */
export async function initializeMocIndex(): Promise<void> {
  try {
    const client = getOpenSearchClient()

    // Check if index exists
    const exists = await client.indices.exists({ index: MOC_INDEX })

    if (!exists.body) {
      // Create index with mappings
      await client.indices.create({
        index: MOC_INDEX,
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              userId: { type: 'keyword' },
              title: { type: 'text', analyzer: 'standard' },
              description: { type: 'text', analyzer: 'standard' },
              type: { type: 'keyword' },
              author: { type: 'text' },
              brand: { type: 'text' },
              theme: { type: 'keyword' },
              subtheme: { type: 'keyword' },
              setNumber: { type: 'keyword' },
              partsCount: { type: 'integer' },
              tags: {
                type: 'text',
                fields: {
                  keyword: { type: 'keyword' }, // For exact matching
                },
              },
              thumbnailUrl: { type: 'keyword' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' },
              uploadedDate: { type: 'date' },
            },
          },
        },
      })

      logger.info('MOC index created in OpenSearch')
    } else {
      logger.info('MOC index already exists in OpenSearch')
    }
  } catch (error) {
    logger.error('Failed to initialize MOC index:', error)
    // Don't throw - application should continue even if OpenSearch is unavailable
  }
}
