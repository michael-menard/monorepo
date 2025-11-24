/**
 * OpenSearch Client for Full-Text Search (Story 5.3: X-Ray tracing ready)
 *
 * Provides configured OpenSearch client for indexing and searching.
 * Optimized for serverless with connection reuse across Lambda invocations.
 *
 * X-Ray Tracing:
 * - OpenSearch operations should be wrapped with traceSearch() for X-Ray subsegments
 * - Example: await traceSearch('searchImages', async (subsegment) => {
 *     subsegment?.addAnnotation('index', 'gallery_images')
 *     return await client.search(params)
 *   })
 *
 * @see {@link traceSearch} from '@/core/observability/tracing'
 */

import { Client } from '@opensearch-project/opensearch'
import { getEnv } from '@/core/utils/env'
import { createLogger } from '@/core/observability/logger'

const logger = createLogger('opensearch')
let _openSearchClient: Client | null = null

/**
 * Get or create OpenSearch client instance
 * - Client is reused across Lambda invocations
 * - Supports both SST environment variable and legacy OPENSEARCH_ENDPOINT
 */
export function getOpenSearchClient(): Client {
  if (!_openSearchClient) {
    const env = getEnv()

    // Try SST-linked endpoint first, fallback to legacy env var
    const openSearchEndpoint = process.env.LEGO_API_OPENSEARCH_ENDPOINT || env.OPENSEARCH_ENDPOINT

    if (!openSearchEndpoint) {
      throw new Error(
        'OpenSearch endpoint not configured (LEGO_API_OPENSEARCH_ENDPOINT or OPENSEARCH_ENDPOINT)',
      )
    }

    // Ensure endpoint has https protocol
    const endpoint = openSearchEndpoint.startsWith('https://')
      ? openSearchEndpoint
      : `https://${openSearchEndpoint}`

    _openSearchClient = new Client({
      node: endpoint,
      // For AWS OpenSearch with IAM authentication, credentials are handled automatically
      // via the Lambda execution role permissions
    })

    logger.info('OpenSearch client created', { endpoint })
  }

  return _openSearchClient
}

/**
 * Index document in OpenSearch
 */
export async function indexDocument(params: {
  index: string
  id: string
  body: Record<string, unknown>
}): Promise<void> {
  const client = getOpenSearchClient()

  await client.index({
    index: params.index,
    id: params.id,
    body: params.body,
    refresh: true, // Make immediately searchable
  })
}

/**
 * Delete document from OpenSearch
 */
export async function deleteDocument(params: { index: string; id: string }): Promise<void> {
  const client = getOpenSearchClient()

  try {
    await client.delete({
      index: params.index,
      id: params.id,
    })
  } catch (error) {
    // Ignore 404 errors (document doesn't exist)
    if (error && typeof error === 'object' && 'meta' in error) {
      const errorWithMeta = error as { meta?: { statusCode?: number } }
      if (errorWithMeta.meta?.statusCode !== 404) {
        throw error
      }
    } else {
      throw error
    }
  }
}

/**
 * Search documents in OpenSearch
 */
export async function searchDocuments(params: {
  index: string
  query: Record<string, unknown>
  from?: number
  size?: number
}): Promise<{ hits: { hits: Array<{ _source: Record<string, unknown> }> } }> {
  const client = getOpenSearchClient()

  const result = await client.search({
    index: params.index,
    body: {
      query: params.query,
      from: params.from || 0,
      size: params.size || 20,
    },
  })

  return result.body as { hits: { hits: Array<{ _source: Record<string, unknown> }> } }
}

/**
 * Test OpenSearch connectivity
 * - Used by health check Lambda
 * - Returns true if cluster is reachable and healthy
 */
export async function testOpenSearchConnection(): Promise<boolean> {
  try {
    const client = getOpenSearchClient()
    const health = await client.cluster.health()
    return health.body.status === 'green' || health.body.status === 'yellow'
  } catch (error) {
    logger.error('OpenSearch connection test failed:', error)
    return false
  }
}

/**
 * Get OpenSearch cluster health status
 */
export async function getOpenSearchHealth(): Promise<'green' | 'yellow' | 'red' | 'unknown'> {
  try {
    const client = getOpenSearchClient()
    const health = await client.cluster.health()
    return health.body.status as 'green' | 'yellow' | 'red'
  } catch (error) {
    logger.error('Failed to get OpenSearch health:', error)
    return 'unknown'
  }
}
