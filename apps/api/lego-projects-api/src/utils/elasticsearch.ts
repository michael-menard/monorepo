import { Client } from '@elastic/elasticsearch'
import { createLogger } from '../utils/logger'

const logger = createLogger('elasticsearch')

export const ES_INDEX = 'gallery_images'
export const MOC_INDEX = 'moc_instructions'
export const WISHLIST_INDEX = 'wishlist_items'

/**
 * Get Elasticsearch/OpenSearch configuration based on environment
 */
const getSearchConfig = () => {
  const isProd = process.env.NODE_ENV === 'production'
  const useAwsServices = process.env.USE_AWS_SERVICES === 'true' || isProd
  const searchDisabled = process.env.OPENSEARCH_DISABLED === 'true'

  if (searchDisabled) {
    logger.info('🔍 Search functionality is disabled')
    return null
  }

  if (useAwsServices) {
    // AWS OpenSearch configuration
    const opensearchEndpoint = process.env.OPENSEARCH_ENDPOINT
    if (!opensearchEndpoint) {
      logger.warn('🔍 OPENSEARCH_ENDPOINT not configured, search functionality disabled')
      return null
    }

    return {
      node: opensearchEndpoint,
      // AWS OpenSearch may require additional auth configuration
      // This would typically use AWS SDK credentials or IAM roles
    }
  } else {
    // Local Elasticsearch configuration
    return {
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200'
    }
  }
}

// Create client if search is enabled
const searchConfig = getSearchConfig()
export const esClient = searchConfig ? new Client(searchConfig) : null

// Log connection status on startup
if (esClient) {
  ;(async () => {
    try {
      const health = await esClient.cluster.health()
      logger.info({ status: health.status }, '🔍 Search cluster health')
    } catch (err: any) {
      logger.warn({ err: err.message }, '🔍 Search service not available')
    }
  })()
} else {
  logger.info('🔍 Search functionality is disabled')
}

/**
 * Check if search functionality is available
 */
export const isSearchAvailable = (): boolean => {
  return esClient !== null
}

// --- IMAGE INDEXING ---
export async function indexImage(image: any) {
  if (!esClient) {
    logger.info('🔍 Search indexing skipped - search service disabled')
    return
  }

  try {
    await esClient.index({
      index: ES_INDEX,
      id: image.id,
      document: {
        ...image,
        type: 'image',
      },
    })
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Failed to index image in ES')
  }
}

export async function updateImage(image: any) {
  if (!esClient) {
    logger.info('🔍 Search indexing skipped - search service disabled')
    return
  }

  try {
    await esClient.update({
      index: ES_INDEX,
      id: image.id,
      doc: {
        ...image,
        type: 'image',
      },
      doc_as_upsert: true,
    })
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Failed to update image in ES')
  }
}

export async function deleteImage(id: string) {
  if (!esClient) {
    logger.info('🔍 Search indexing skipped - search service disabled')
    return
  }

  try {
    await esClient.delete({ index: ES_INDEX, id })
  } catch (err: any) {
    if (err.meta && err.meta.statusCode === 404) return // Already gone
    logger.warn({ err: err.message }, 'Failed to delete image from ES')
  }
}

// --- ALBUM INDEXING ---
export async function indexAlbum(album: any) {
  if (!esClient) {
    logger.info('🔍 Search indexing skipped - search service disabled')
    return
  }

  try {
    await esClient.index({
      index: ES_INDEX,
      id: album.id,
      document: {
        ...album,
        type: 'album',
      },
    })
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Failed to index album in ES')
  }
}

export async function updateAlbum(album: any) {
  if (!esClient) {
    logger.info('🔍 Search indexing skipped - search service disabled')
    return
  }

  try {
    await esClient.update({
      index: ES_INDEX,
      id: album.id,
      doc: {
        ...album,
        type: 'album',
      },
      doc_as_upsert: true,
    })
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Failed to update album in ES')
  }
}

export async function deleteAlbum(id: string) {
  if (!esClient) {
    logger.info('🔍 Search indexing skipped - search service disabled')
    return
  }

  try {
    await esClient.delete({ index: ES_INDEX, id })
  } catch (err: any) {
    if (err.meta && err.meta.statusCode === 404) return
    logger.warn({ err: err.message }, 'Failed to delete album from ES')
  }
}

// --- MOC INSTRUCTIONS INDEXING ---
export async function indexMoc(moc: any) {
  if (!esClient) {
    logger.info('🔍 Search indexing skipped - search service disabled')
    return
  }

  try {
    await esClient.index({
      index: MOC_INDEX,
      id: moc.id,
      document: {
        ...moc,
        type: 'moc',
        // Ensure searchable fields are properly indexed
        title: moc.title,
        description: moc.description,
        tags: moc.tags || [],
        userId: moc.userId,
        createdAt: moc.createdAt,
        updatedAt: moc.updatedAt,
      },
    })
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Failed to index MOC in ES')
  }
}

export async function updateMoc(moc: any) {
  if (!esClient) {
    logger.info('🔍 Search indexing skipped - search service disabled')
    return
  }

  try {
    await esClient.update({
      index: MOC_INDEX,
      id: moc.id,
      doc: {
        ...moc,
        type: 'moc',
        // Ensure searchable fields are properly indexed
        title: moc.title,
        description: moc.description,
        tags: moc.tags || [],
        userId: moc.userId,
        updatedAt: moc.updatedAt,
      },
      doc_as_upsert: true,
    })
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Failed to update MOC in ES')
  }
}

export async function deleteMoc(id: string) {
  if (!esClient) {
    logger.info('🔍 Search indexing skipped - search service disabled')
    return
  }

  try {
    await esClient.delete({ index: MOC_INDEX, id })
  } catch (err: any) {
    if (err.meta && err.meta.statusCode === 404) return // Already gone
    logger.warn({ err: err.message }, 'Failed to delete MOC from ES')
  }
}

// --- WISHLIST INDEXING ---
export async function indexWishlistItem(item: any) {
  if (!esClient) {
    logger.info('🔍 Search indexing skipped - search service disabled')
    return
  }

  try {
    await esClient.index({
      index: WISHLIST_INDEX,
      id: item.id,
      document: {
        ...item,
        type: 'wishlist',
      },
    })
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Failed to index wishlist item in ES')
  }
}

export async function updateWishlistItem(item: any) {
  if (!esClient) {
    logger.info('🔍 Search indexing skipped - search service disabled')
    return
  }

  try {
    await esClient.update({
      index: WISHLIST_INDEX,
      id: item.id,
      doc: {
        ...item,
        type: 'wishlist',
      },
      doc_as_upsert: true,
    })
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Failed to update wishlist item in ES')
  }
}

export async function deleteWishlistItem(id: string) {
  if (!esClient) {
    logger.info('🔍 Search indexing skipped - search service disabled')
    return
  }

  try {
    await esClient.delete({ index: WISHLIST_INDEX, id })
  } catch (err: any) {
    if (err.meta && err.meta.statusCode === 404) return // Already gone
    logger.warn({ err: err.message }, 'Failed to delete wishlist item from ES')
  }
}

// --- UNIFIED SEARCH ---
export async function searchGalleryItems({
  userId,
  query,
  tag,
  albumId,
  flagged,
  type,
  from = 0,
  size = 20,
}: {
  userId: string
  query?: string
  tag?: string
  albumId?: string
  flagged?: boolean
  type?: 'album' | 'image' | 'all'
  from?: number
  size?: number
}) {
  if (!esClient) {
    logger.info('🔍 Search service disabled, falling back to database')
    return null
  }
  const must: any[] = [{ term: { userId } }]
  if (type && type !== 'all') {
    must.push({ term: { type } })
  }
  if (type !== 'album' && !albumId) {
    // Only show images with albumId=null (standalone images)
    must.push({
      bool: {
        should: [
          { bool: { must_not: { exists: { field: 'albumId' } } } },
          { term: { albumId: null } },
        ],
      },
    })
  }
  if (albumId) must.push({ term: { albumId } })
  if (flagged !== undefined) must.push({ term: { flagged } })
  if (tag) must.push({ term: { tags: tag } })
  if (query) {
    must.push({
      multi_match: {
        query,
        fields: ['title^3', 'description', 'tags'],
        fuzziness: 'AUTO',
      },
    })
  }
  try {
    const result = await esClient!.search({
      index: ES_INDEX,
      from,
      size,
      query: { bool: { must } },
      sort: [{ createdAt: { order: 'desc' } }],
    })
    return result.hits.hits.map((hit: any) => hit._source)
  } catch (err: any) {
    logger.warn({ err: err.message }, 'ES search failed, falling back to Postgres')
    return null
  }
}

// --- MOC SEARCH ---
export async function searchMocs({
  userId,
  query,
  tag,
  from = 0,
  size = 20,
}: {
  userId: string | null
  query?: string
  tag?: string
  from?: number
  size?: number
}) {
  if (!esClient) {
    logger.info('🔍 Search service disabled, falling back to database')
    return null
  }
  const must: any[] = []

  // Only filter by userId if provided (for authenticated users)
  if (userId) {
    must.push({ term: { userId } })
  }

  if (tag) {
    must.push({ term: { tags: tag } })
  }

  if (query) {
    must.push({
      multi_match: {
        query,
        fields: ['title^3', 'description', 'tags^2'],
        fuzziness: 'AUTO',
        type: 'best_fields',
      },
    })
  }

  try {
    const result = await esClient!.search({
      index: MOC_INDEX,
      from,
      size,
      query: { bool: { must } },
      sort: [{ updatedAt: { order: 'desc' } }],
      _source: [
        'id',
        'title',
        'description',
        'tags',
        'thumbnailUrl',
        'instructionFileUrl',
        'partsListFiles',
        'galleryImageIds',
        'createdAt',
        'updatedAt',
      ],
    })

    return {
      hits: result.hits.hits.map((hit: any) => hit._source),
      total: result.hits.total
        ? typeof result.hits.total === 'number'
          ? result.hits.total
          : result.hits.total.value
        : 0,
    }
  } catch (err: any) {
    logger.warn({ err: err.message }, 'MOC ES search failed, falling back to Postgres')
    return null
  }
}

// --- WISHLIST SEARCH ---
export async function searchWishlistItems({
  userId,
  query,
  category,
  from = 0,
  size = 20,
}: {
  userId: string
  query?: string
  category?: string
  from?: number
  size?: number
}) {
  if (!esClient) {
    logger.info('🔍 Search service disabled, falling back to database')
    return null
  }
  const must: any[] = [{ term: { userId } }]

  if (category) {
    must.push({ term: { category } })
  }

  if (query) {
    must.push({
      multi_match: {
        query,
        fields: ['title^3', 'description', 'category^2'],
        fuzziness: 'AUTO',
        type: 'best_fields',
      },
    })
  }

  try {
    const result = await esClient!.search({
      index: WISHLIST_INDEX,
      from,
      size,
      query: { bool: { must } },
      sort: [{ sortOrder: { order: 'asc' } }, { updatedAt: { order: 'desc' } }],
      _source: [
        'id',
        'title',
        'description',
        'productLink',
        'imageUrl',
        'category',
        'sortOrder',
        'createdAt',
        'updatedAt',
      ],
    })

    return {
      hits: result.hits.hits.map((hit: any) => hit._source),
      total: result.hits.total
        ? typeof result.hits.total === 'number'
          ? result.hits.total
          : result.hits.total.value
        : 0,
    }
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Wishlist ES search failed, falling back to Postgres')
    return null
  }
}

// --- INDEX INITIALIZATION ---
export async function initializeMocIndex() {
  if (!esClient) {
    logger.info('🔍 Search index initialization skipped - search service disabled')
    return
  }

  try {
    // Check if index exists
    const indexExists = await esClient!.indices.exists({ index: MOC_INDEX })

    if (!indexExists) {
      await esClient!.indices.create({
        index: MOC_INDEX,
        mappings: {
          properties: {
            id: { type: 'keyword' },
            userId: { type: 'keyword' },
            title: {
              type: 'text',
              analyzer: 'standard',
              fields: {
                keyword: { type: 'keyword' },
              },
            },
            description: {
              type: 'text',
              analyzer: 'standard',
            },
            tags: {
              type: 'keyword',
              fields: {
                text: { type: 'text', analyzer: 'standard' },
              },
            },
            thumbnailUrl: { type: 'keyword' },
            instructionFileUrl: { type: 'keyword' },
            partsListFiles: { type: 'keyword' },
            galleryImageIds: { type: 'keyword' },
            type: { type: 'keyword' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' },
          },
        },
        settings: {
          analysis: {
            analyzer: {
              standard: {
                type: 'standard',
                stopwords: '_english_',
              },
            },
          },
        },
      })
      logger.info({ index: MOC_INDEX }, 'Created Elasticsearch index')
    }
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Failed to initialize MOC index')
  }
}

// --- INDEX INITIALIZATION ---
export async function initializeWishlistIndex() {
  if (!esClient) {
    logger.info('🔍 Search index initialization skipped - search service disabled')
    return
  }

  try {
    // Check if index exists
    const indexExists = await esClient!.indices.exists({ index: WISHLIST_INDEX })

    if (!indexExists) {
      await esClient!.indices.create({
        index: WISHLIST_INDEX,
        mappings: {
          properties: {
            id: { type: 'keyword' },
            userId: { type: 'keyword' },
            title: {
              type: 'text',
              analyzer: 'standard',
              fields: {
                keyword: { type: 'keyword' },
              },
            },
            description: {
              type: 'text',
              analyzer: 'standard',
            },
            productLink: { type: 'keyword' },
            imageUrl: { type: 'keyword' },
            category: {
              type: 'keyword',
              fields: {
                text: { type: 'text', analyzer: 'standard' },
              },
            },
            sortOrder: { type: 'keyword' },
            type: { type: 'keyword' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' },
          },
        },
        settings: {
          analysis: {
            analyzer: {
              standard: {
                type: 'standard',
                stopwords: '_english_',
              },
            },
          },
        },
      })
      logger.info({ index: WISHLIST_INDEX }, 'Created Elasticsearch index')
    }
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Failed to initialize Wishlist index')
  }
}
