import { Client } from '@elastic/elasticsearch';

const ELASTIC_URL = process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200';
export const ES_INDEX = 'gallery_images';
export const MOC_INDEX = 'moc_instructions';
export const WISHLIST_INDEX = 'wishlist_items';

export const esClient = new Client({ node: ELASTIC_URL });

// Log connection status on startup
(async () => {
  try {
    const health = await esClient.cluster.health();
    console.log('Elasticsearch cluster health:', health.status);
  } catch (err: any) {
    console.warn('Elasticsearch not available:', err.message);
  }
})();

// --- IMAGE INDEXING ---
export async function indexImage(image: any) {
  try {
    await esClient.index({
      index: ES_INDEX,
      id: image.id,
      document: {
        ...image,
        type: 'image',
      },
    });
  } catch (err: any) {
    console.warn('Failed to index image in ES:', err.message);
  }
}

export async function updateImage(image: any) {
  try {
    await esClient.update({
      index: ES_INDEX,
      id: image.id,
      doc: {
        ...image,
        type: 'image',
      },
      doc_as_upsert: true,
    });
  } catch (err: any) {
    console.warn('Failed to update image in ES:', err.message);
  }
}

export async function deleteImage(id: string) {
  try {
    await esClient.delete({ index: ES_INDEX, id });
  } catch (err: any) {
    if (err.meta && err.meta.statusCode === 404) return; // Already gone
    console.warn('Failed to delete image from ES:', err.message);
  }
}

// --- ALBUM INDEXING ---
export async function indexAlbum(album: any) {
  try {
    await esClient.index({
      index: ES_INDEX,
      id: album.id,
      document: {
        ...album,
        type: 'album',
      },
    });
  } catch (err: any) {
    console.warn('Failed to index album in ES:', err.message);
  }
}

export async function updateAlbum(album: any) {
  try {
    await esClient.update({
      index: ES_INDEX,
      id: album.id,
      doc: {
        ...album,
        type: 'album',
      },
      doc_as_upsert: true,
    });
  } catch (err: any) {
    console.warn('Failed to update album in ES:', err.message);
  }
}

export async function deleteAlbum(id: string) {
  try {
    await esClient.delete({ index: ES_INDEX, id });
  } catch (err: any) {
    if (err.meta && err.meta.statusCode === 404) return;
    console.warn('Failed to delete album from ES:', err.message);
  }
}

// --- MOC INSTRUCTIONS INDEXING ---
export async function indexMoc(moc: any) {
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
    });
  } catch (err: any) {
    console.warn('Failed to index MOC in ES:', err.message);
  }
}

export async function updateMoc(moc: any) {
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
    });
  } catch (err: any) {
    console.warn('Failed to update MOC in ES:', err.message);
  }
}

export async function deleteMoc(id: string) {
  try {
    await esClient.delete({ index: MOC_INDEX, id });
  } catch (err: any) {
    if (err.meta && err.meta.statusCode === 404) return; // Already gone
    console.warn('Failed to delete MOC from ES:', err.message);
  }
}

// --- WISHLIST INDEXING ---
export async function indexWishlistItem(item: any) {
  try {
    await esClient.index({
      index: WISHLIST_INDEX,
      id: item.id,
      document: {
        ...item,
        type: 'wishlist',
      },
    });
  } catch (err: any) {
    console.warn('Failed to index wishlist item in ES:', err.message);
  }
}

export async function updateWishlistItem(item: any) {
  try {
    await esClient.update({
      index: WISHLIST_INDEX,
      id: item.id,
      doc: {
        ...item,
        type: 'wishlist',
      },
      doc_as_upsert: true,
    });
  } catch (err: any) {
    console.warn('Failed to update wishlist item in ES:', err.message);
  }
}

export async function deleteWishlistItem(id: string) {
  try {
    await esClient.delete({ index: WISHLIST_INDEX, id });
  } catch (err: any) {
    if (err.meta && err.meta.statusCode === 404) return; // Already gone
    console.warn('Failed to delete wishlist item from ES:', err.message);
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
  userId: string;
  query?: string;
  tag?: string;
  albumId?: string;
  flagged?: boolean;
  type?: 'album' | 'image' | 'all';
  from?: number;
  size?: number;
}) {
  const must: any[] = [{ term: { userId } }];
  if (type && type !== 'all') {
    must.push({ term: { type } });
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
    });
  }
  if (albumId) must.push({ term: { albumId } });
  if (flagged !== undefined) must.push({ term: { flagged } });
  if (tag) must.push({ term: { tags: tag } });
  if (query) {
    must.push({
      multi_match: {
        query,
        fields: ['title^3', 'description', 'tags'],
        fuzziness: 'AUTO',
      },
    });
  }
  try {
    const result = await esClient.search({
      index: ES_INDEX,
      from,
      size,
      query: { bool: { must } },
      sort: [{ createdAt: { order: 'desc' } }],
    });
    return result.hits.hits.map((hit: any) => hit._source);
  } catch (err: any) {
    console.warn('ES search failed, falling back to Postgres:', err.message);
    return null;
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
  userId: string | null;
  query?: string;
  tag?: string;
  from?: number;
  size?: number;
}) {
  const must: any[] = [];

  // Only filter by userId if provided (for authenticated users)
  if (userId) {
    must.push({ term: { userId } });
  }

  if (tag) {
    must.push({ term: { tags: tag } });
  }

  if (query) {
    must.push({
      multi_match: {
        query,
        fields: ['title^3', 'description', 'tags^2'],
        fuzziness: 'AUTO',
        type: 'best_fields',
      },
    });
  }

  try {
    const result = await esClient.search({
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
    });

    return {
      hits: result.hits.hits.map((hit: any) => hit._source),
      total: result.hits.total
        ? typeof result.hits.total === 'number'
          ? result.hits.total
          : result.hits.total.value
        : 0,
    };
  } catch (err: any) {
    console.warn('MOC ES search failed, falling back to Postgres:', err.message);
    return null;
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
  userId: string;
  query?: string;
  category?: string;
  from?: number;
  size?: number;
}) {
  const must: any[] = [{ term: { userId } }];

  if (category) {
    must.push({ term: { category } });
  }

  if (query) {
    must.push({
      multi_match: {
        query,
        fields: ['title^3', 'description', 'category^2'],
        fuzziness: 'AUTO',
        type: 'best_fields',
      },
    });
  }

  try {
    const result = await esClient.search({
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
    });

    return {
      hits: result.hits.hits.map((hit: any) => hit._source),
      total: result.hits.total
        ? typeof result.hits.total === 'number'
          ? result.hits.total
          : result.hits.total.value
        : 0,
    };
  } catch (err: any) {
    console.warn('Wishlist ES search failed, falling back to Postgres:', err.message);
    return null;
  }
}

// --- INDEX INITIALIZATION ---
export async function initializeMocIndex() {
  try {
    // Check if index exists
    const indexExists = await esClient.indices.exists({ index: MOC_INDEX });

    if (!indexExists) {
      await esClient.indices.create({
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
      });
      console.log(`Created Elasticsearch index: ${MOC_INDEX}`);
    }
  } catch (err: any) {
    console.warn('Failed to initialize MOC index:', err.message);
  }
}

// --- INDEX INITIALIZATION ---
export async function initializeWishlistIndex() {
  try {
    // Check if index exists
    const indexExists = await esClient.indices.exists({ index: WISHLIST_INDEX });

    if (!indexExists) {
      await esClient.indices.create({
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
      });
      console.log(`Created Elasticsearch index: ${WISHLIST_INDEX}`);
    }
  } catch (err: any) {
    console.warn('Failed to initialize Wishlist index:', err.message);
  }
}
