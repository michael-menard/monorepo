/**
 * Search Utility Functions
 *
 * Provides search functionality for gallery images and wishlist items
 * using the generic @monorepo/search package with OpenSearch (primary)
 * and PostgreSQL (fallback) support.
 */

import { createSearchEngine, SearchEngine } from '@monorepo/search'
import type { SearchConfig, SearchOptions, SearchResult } from '@monorepo/search'
import { getOpenSearchClient } from './opensearch-client'
import { db } from '@/lib/db/client'
import { galleryImages, wishlistItems } from '@/db/schema'
import { logger } from '@/lib/utils/logger'

// Re-export types and utilities for convenience
export type { SearchResult, SearchOptions }

/**
 * Generate MD5 hash of search query for cache keys
 * Re-exported from @monorepo/search
 */
export const hashQuery = SearchEngine.hashQuery

/**
 * Gallery images search configuration
 */
const gallerySearchConfig: SearchConfig = {
  indexName: 'gallery_images',
  table: galleryImages,
  searchableFields: [
    { field: 'title', boost: 3, postgresColumn: galleryImages.title },
    { field: 'description', boost: 2, postgresColumn: galleryImages.description },
    { field: 'tags', boost: 1, postgresColumn: galleryImages.tags },
  ],
  userIdColumn: galleryImages.userId,
}

/**
 * Search gallery images via OpenSearch with PostgreSQL fallback
 *
 * Features:
 * - Multi-match search on title^3, description^2, tags
 * - Fuzzy matching for typo tolerance
 * - User isolation
 * - Relevance scoring
 * - PostgreSQL fallback on failure
 *
 * @param options - Search options (query, userId, page, limit)
 * @returns Search results with data, total count, source, and duration
 */
export async function searchGalleryImages(options: SearchOptions): Promise<
  SearchResult<{
    id: string
    userId: string
    title: string
    description: string | null
    tags: string[] | null
    imageUrl: string
    thumbnailUrl: string | null
    albumId: string | null
    flagged: boolean
    createdAt: Date
    lastUpdatedAt: Date
    score?: number
  }>
> {
  // Get OpenSearch client (may be null if not configured)
  let openSearchClient: Awaited<ReturnType<typeof getOpenSearchClient>> | null = null
  try {
    openSearchClient = await getOpenSearchClient()
  } catch (error) {
    logger.warn('OpenSearch client not available:', error)
  }

  // Create search engine instance
  const searchEngine = createSearchEngine(gallerySearchConfig, openSearchClient, db, logger)

  // Execute search
  return await searchEngine.search(options)
}

/**
 * Wishlist items search configuration
 */
const wishlistSearchConfig: SearchConfig = {
  indexName: 'wishlist_items',
  table: wishlistItems,
  searchableFields: [
    { field: 'title', boost: 3, postgresColumn: wishlistItems.title },
    { field: 'description', boost: 2, postgresColumn: wishlistItems.description },
    { field: 'category', boost: 1, postgresColumn: wishlistItems.category },
  ],
  userIdColumn: wishlistItems.userId,
  sortColumn: wishlistItems.sortOrder,
  sortDirection: 'asc',
}

/**
 * Search wishlist items via OpenSearch with PostgreSQL fallback
 *
 * Features:
 * - Multi-match search on title^3, description^2, category
 * - Fuzzy matching for typo tolerance
 * - User isolation
 * - Relevance scoring
 * - PostgreSQL fallback on failure with sortOrder preservation
 *
 * @param options - Search options (query, userId, page, limit)
 * @returns Search results with data, total count, source, and duration
 */
export async function searchWishlistItems(options: SearchOptions): Promise<
  SearchResult<{
    id: string
    userId: string
    title: string
    description: string | null
    productLink: string | null
    imageUrl: string | null
    imageWidth: number | null
    imageHeight: number | null
    category: string | null
    sortOrder: string
    createdAt: Date
    updatedAt: Date
    score?: number
  }>
> {
  // Get OpenSearch client (may be null if not configured)
  let openSearchClient: Awaited<ReturnType<typeof getOpenSearchClient>> | null = null
  try {
    openSearchClient = await getOpenSearchClient()
  } catch (error) {
    logger.warn('OpenSearch client not available:', error)
  }

  // Create search engine instance
  const searchEngine = createSearchEngine(wishlistSearchConfig, openSearchClient, db, logger)

  // Execute search
  return await searchEngine.search(options)
}
