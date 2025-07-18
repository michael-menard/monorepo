import { Client } from '@elastic/elasticsearch';

const ELASTIC_URL = process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200';
export const ES_INDEX = 'gallery_images';

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
  const must: any[] = [ { term: { userId } } ];
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